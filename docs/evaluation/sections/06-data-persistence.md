## 6. Data Layer, Persistence & Scheduling

**Verdict.** The Jeff field-assistant tables are genuinely well-designed — disciplined CHECK constraints, sensible partial indexes, and a thoughtful dual-write/mirror pattern with graceful Supabase→local fallback. But the data layer as a whole is held together by conventions rather than by the database: the entire Promise CRM (the system of record for jobs, money, and schedule) runs **unmigrated**, **mutates by lost-update-prone read-modify-write**, and smuggles a dozen structured domain objects through a free-text `notes` JSONB array. RLS is enabled on every table but **zero policies exist** (verified live), so the only thing protecting production data is the service-role key — on a **shared multi-tenant "Al Boreland" database** that also holds other businesses' constitutions, vault documents, and memories. The scheduling engine is the strongest single file here, but its double-booking guard is effectively blind because 50 of 51 live promises carry no structured time window. The public `/api/appointments` writer targets a table that **does not exist**.

**Score: 4.5 / 10**

### What's here

Two persistence regimes coexist:

1. **Jeff field assistant** (`src/lib/jeff-field-assistant/persistence.ts`, 1393 LOC) — migration-managed Supabase tables (`wrenchready_jeff_field_event`, `_memory`, `_conversation`, `_conversation_summary`, `_job_workspace_snapshot`, `_media`, `wrenchready_operator_task`) with a `.data/jeff/*.json` local mirror (`local-data.ts`). Every write goes to Supabase *and* the local file; reads prefer Supabase and fall back to local on error.

2. **Promise CRM** (`src/lib/promise-crm/storage.ts`, 4029 LOC) — Supabase tables `wrenchready_promise` and `wrenchready_inbound`, **with no migration in the repo**. The fallback is an in-process `globalThis` runtime cache plus static `mock-data.ts`, gated behind `WR_ENABLE_PROMISE_CRM_DEMO_FALLBACK`.

Both regimes reach Postgres through one thin REST helper, `src/lib/promise-crm/supabase.ts`, which selects a credential (`SUPABASE_SERVICE_ROLE_KEY` > `SUPABASE_SECRET_KEY` > anon) and refuses writes unless a service-role/secret key is present (`supabase.ts:84`).

The scheduling engine (`src/lib/scheduling/engine.ts`, 471 LOC) computes availability from `BUSINESS_HOURS`, Google Calendar busy blocks, and internal Promise CRM windows, with timezone-correct slot math.

**Live database facts (verified via Supabase MCP against project `tsisorwqxmizndrcidub`, "Al Boreland"):** 51 promises, 18 inbound, 517 field events, 220 conversations, 75 memories, 39 media rows, 48 operator tasks. RLS enabled on all WrenchReady tables; **no policies on any of them**. The database is shared with non-WrenchReady tables (`constitutions`, `trajectories`, `vault_documents`, `al_memories`, `cost_events`, `security_events`, `al_jobs`).

### Strengths

- **Strong declarative constraints on the Jeff tables.** Every enum-like column is a real `CHECK` (e.g. 18 event types in `wrenchready_jeff_field_event`, migration `20260617143001...sql:6-27`), and `wrenchready_jeff_memory.memory` is length-bounded `char_length(memory) between 3 and 1200` (`20260617143023...sql:18`). This is verified live in the DB, not just in the file.
- **Purposeful indexing, including partial indexes.** e.g. `wrenchready_jeff_memory_candidate_idx ... where status = 'candidate'` (`20260617143023...sql:59-61`) and `wrenchready_jeff_conversation_call_id_idx` is a *unique* partial index preventing duplicate call ingestion (`20260617153121...sql:39-41`). The composite `(job_id, timestamp desc)` indexes match the actual query shapes in `persistence.ts`.
- **A real FK with cascade** between conversation summaries and conversations (`20260617153121...sql:52`, `on delete cascade`), confirmed live.
- **Disciplined credential gating.** Writes are blocked at the REST layer unless a privileged key is configured (`supabase.ts:82-86`), and the connection-status type distinguishes `service-role`/`secret`/`anon`/`none` (`supabase.ts:6`).
- **Genuinely correct timezone math in scheduling.** `makeZonedDate`/`getZonedDateParts` (`engine.ts:19-67`) derive the zone offset via `Intl.DateTimeFormat` round-tripping rather than hardcoding, so DST transitions in `America/Los_Angeles` are handled. Slot generation respects per-service duration and before/after buffers (`engine.ts:252-274`) and a 120-minute minimum lead time (`engine.ts:17,231,260`).
- **Conservative availability posture.** Customer slots are only offered when calendar reads succeed, writes are enabled, route truth is ready, and the territory matches — otherwise it degrades to "Dez confirms manually" (`engine.ts:431-462`). It fails safe.
- **Fallback never silently drops Jeff data.** On Supabase failure, every Jeff write still lands in the local mirror and surfaces a warning string (`persistence.ts:1079-1085, 1138-1144`).

### Findings

**1. RLS enabled on every table but zero policies — production data protected only by the service-role key**
*Severity: High.* *Location:* all `supabase/migrations/*` (e.g. `20260617143001...sql:58`), live advisor `rls_enabled_no_policy` × 10 WrenchReady tables.
*Evidence:* Every migration does `enable row level security` then grants CRUD only to `service_role`; no `create policy` exists anywhere in the repo. The live security advisor returns `rls_enabled_no_policy` for `wrenchready_promise`, `wrenchready_inbound`, `wrenchready_jeff_*` (all), and `wrenchready_operator_task`. Effectively this is default-deny for anon/authenticated roles, which is *safe today* only because the app always connects with the service-role key (`supabase.ts:26`).
*Why it matters:* There is no defense-in-depth. If an `anon`/`authenticated` Supabase key is ever exposed client-side (and the codebase already reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `supabase.ts:22-24`), the *intended* deny is real, but the moment anyone adds a permissive policy or a public read path, customer PII (names, phones, emails, addresses in `wrenchready_promise`/`_inbound`) is exposed with no row scoping. RLS-with-no-policy is a latent trap: it reads as "secured" in dashboards while providing no actual authorization logic.
*Recommendation:* Either (a) keep service-role-only access but document explicitly that these tables are server-only and add a CI assertion that no `NEXT_PUBLIC_SUPABASE_*` key can perform writes, or (b) add explicit `service_role`-scoped policies and, if any client access is ever needed, real per-row policies. Do not leave RLS "on" with no policies as the security model.

**2. WrenchReady runs on a shared multi-tenant database with no schema isolation**
*Severity: High.* *Location:* `.env.local` `SUPABASE_URL=https://tsisorwqxmizndrcidub.supabase.co` (project "Al Boreland"); live `list_tables`.
*Evidence:* The same Postgres instance and the same service-role credential serve `public.constitutions`, `public.trajectories` (223 rows), `public.vault_documents` (118 rows), `public.al_memories`, `public.cost_events`, `public.security_events`, and `public.al_jobs` alongside the WrenchReady tables. Migration `20260617225155_drop_stale_al_boreland_schema.sql` explicitly drops an `al_boreland` schema "not used by the WrenchReady app," confirming the environments are entangled.
*Why it matters:* One leaked/over-scoped service-role key compromises *every* business on the instance, not just WrenchReady. There is no blast-radius containment, noisy-neighbor protection, independent backup/restore, or per-tenant rate limiting. For "the operating system of a real dispatch business" with customer PII, sharing a DB with unrelated AI-agent doctrine tables is an avoidable structural risk.
*Recommendation:* Move WrenchReady to its own Supabase project (or at minimum a dedicated `wrenchready` schema with a scoped role whose grants exclude the other tables). Rotate the service-role key on separation.

**3. Promise CRM tables (`wrenchready_promise`, `wrenchready_inbound`) have no migration — schema drift between code and DB**
*Severity: High.* *Location:* `supabase/migrations/` (no file references `wrenchready_promise`); live schema exists with 51/18 rows.
*Evidence:* `grep -rln "wrenchready_promise" supabase/migrations/` returns nothing, yet the tables exist in production with CHECK constraints (`owner = ANY ('Dez','Simon','Unassigned')`, `status = ANY (...)`), a FK `wrenchready_promise_inbound_id_fkey`, and `notes`/`raw_payload`/`top_risks` as `jsonb`. The migration list shows no DDL for them. There is even an orphaned function `set_wrenchready_promise_updated_at` in the DB (security advisor `function_search_path_mutable`) with **no trigger attached** (`pg_trigger` returns empty for these tables) — evidence the schema was hand-edited in the dashboard, intentions half-applied.
*Why it matters:* The system of record for jobs, customer PII, and scheduling cannot be reproduced from the repo. A new environment, a restore, or a teammate's local stack will be missing the core tables. The TypeScript row types in `storage.ts` (e.g. `SupabasePromiseRow`) are the only "schema," and nothing keeps them in sync with the live table.
*Recommendation:* Reverse-engineer the live `wrenchready_promise`/`wrenchready_inbound` definitions into checked-in migrations (Supabase CLI `db pull`), wire or delete the orphaned `updated_at` function, and treat dashboard DDL as forbidden going forward.

**4. Read-modify-write updates are lost-update races (no optimistic concurrency)**
*Severity: High.* *Location:* `storage.ts:updatePromiseRecord` (~line 2300) and `updateInboundRecord` (~line 2156).
*Evidence:* Every mutation does `const current = await getPromiseRecord(id)` → build a fully merged record in app memory → `PATCH wrenchready_promise?id=eq.${id}` with the whole `notes` array and derived fields. There is no `If-Match`, no version column, no conditional `updated_at` predicate. Two concurrent writers (e.g. the cron sync, Jeff's voice tools, and an ops user on `/ops/promises/[id]`) each read the same base and the second PATCH overwrites the first.
*Why it matters:* The `notes` JSONB array is the dumping ground for economics, closeout, outbound history, follow-through, quote packets, etc. (see Finding 5). A lost update here silently erases financial/closeout state, not just a label. With multiple techs and an AI agent writing concurrently, this *will* corrupt records.
*Recommendation:* Add an `updated_at`/`version` column and make PATCH conditional (`...&updated_at=eq.<read-time>`), retry on zero-rows-affected; or push the merge into the DB with `jsonb` operators / an RPC so the read-modify-write is atomic.

**5. Structured domain state is serialized into a free-text `notes` array**
*Severity: Medium.* *Location:* `storage.ts:497-528` (extract chain), `storage.ts:2335-2412` (merge chain); supporting modules `economics.ts`, `closeout-recapture.ts`, `quote-packet.ts`, `outbound-history.ts`, `follow-through-resolution.ts`, `execution-ops.ts`, `promise-readiness.ts`.
*Evidence:* On read, a row's `notes` is run through `extractPromiseEconomics → extractCommercialOutcome → extractPromiseExecutionOps → extractFollowThrough... → extractPromiseCloseout → extractPromiseOutboundHistory → extractPromiseReadinessState → extractPromiseQuotePacket`, each peeling its object out of the note strings and returning `visibleNotes`. On write the inverse `mergePromiseNotesWith*` chain re-encodes them. At least nine structured objects (including money: economics, quote packet, payment collection) live inside one `jsonb` text array.
*Why it matters:* None of this is queryable, constrained, or indexable at the DB level — you cannot `WHERE economics.total > x` or enforce that a quote packet is well-formed. Parsing is brittle string-matching; a malformed note silently yields a default object. It also amplifies Finding 4: the entire blob is rewritten on every update. This is a schema-design smell that will not scale to 7 techs and real reporting.
*Recommendation:* Promote the high-value structured objects (economics, quote packet, payment, closeout) to typed columns or child tables with their own constraints; keep `notes` for genuine free text only.

**6. Internal double-booking guard is blind — 50 of 51 live promises have no structured time window**
*Severity: Medium.* *Location:* `engine.ts:293-305` (`internalScheduleBusyBlocks`) vs `storage.ts:updatePromiseRecord` patch body.
*Evidence:* The engine builds internal busy blocks from `record.scheduledWindow.startIso/endIso` (`engine.ts:298-300`). But the promise PATCH body sets only `scheduled_window_label` — it never includes `scheduled_window_start`/`scheduled_window_end` (verified: the `patch` object at `storage.ts:2328-2376` has no structured-window keys). Live query: `count(*) where scheduled_window_start is not null = 1` out of 51. So `internalScheduleBusyBlocks` returns essentially one block; the rest of the schedule is invisible to conflict detection. Buffer/overlap math itself is correct (`intervalsOverlap`, `engine.ts:193-195`), but it has almost no data to act on.
*Why it matters:* The product's headline promise is conflict-free dispatch. Today the internal calendar contributes no protection against double-booking; only Google Calendar busy blocks do. As tech count grows, slots will be offered over existing internal commitments.
*Recommendation:* Persist structured `scheduled_window_start/end` on every schedule update (parse the chosen slot's ISO bounds), and backfill the 50 label-only promises. Consider a DB exclusion constraint (`tstzrange` + `EXCLUDE USING gist`) per technician to make double-booking impossible at the data layer.

**7. Public `/api/appointments` writes to a non-existent table using the anon key**
*Severity: Medium.* *Location:* `src/app/api/appointments/route.ts:44-72`.
*Evidence:* `storeToSupabase` POSTs to `${url}/rest/v1/appointments` with `SUPABASE_ANON_KEY` (route:46), bypassing the `supabase.ts` helper entirely. Live check: `to_regclass('public.appointments')` is `null` — the table does not exist. On failure the function logs `"Supabase insert failed:"` and returns `null`; the route continues.
*Why it matters:* The customer-facing booking surface's persistence is dead. Bookings are not stored in this path (they presumably survive only via the calendar-hold / Promise CRM flow, if at all). It also demonstrates a second, divergent Supabase access pattern with its own (anon) credential and no shared timeout/error handling.
*Recommendation:* Delete the dead path or point it at a real, migrated table through the shared `supabaseRestRequest` helper with a privileged key; add a smoke test asserting the insert returns a row.

**8. Local `.data` mirror drift and non-durable Vercel fallback**
*Severity: Medium.* *Location:* `local-data.ts:9-29`, `persistence.ts:1063-1120, 1010-1061`.
*Evidence:* On Vercel the local mirror root is `os.tmpdir()/wrenchready-jeff` and `getJeffLocalDataRootStatus()` reports `durableAcrossDeployments: false` (`local-data.ts:13-14, 27`). Reads for field events go through `syncJeffFieldEventMirror` which pulls Supabase→local and pushes local→Supabase by id-diff (`persistence.ts:1024-1037`), but **memory/conversation/workspace writes mirror locally with no reconciliation** — if a Supabase write succeeds but the local write is from an older deploy's tmp dir, the two stores diverge. The mirror is "last-writer per file, top-500/1000 by recency" (`local-data.ts` slices in `persistence.ts:595, 612, 547-552`), so older rows silently age out of the local copy.
*Why it matters:* Per-serverless-instance tmp dirs mean the "mirror" is really per-lambda scratch, not a coherent second store. The fallback-to-local-on-read path (`persistence.ts:1113-1118`) can serve a *stale or truncated* view during a Supabase blip and present it as authoritative.
*Recommendation:* Treat Supabase as the single source of truth in production; disable the local mirror on Vercel (or make it read-through cache only), and reconcile memory/conversation/workspace the same way field events are, or not at all.

**9. `wrenchready_promise.updated_at` is never updated**
*Severity: Low.* *Location:* `storage.ts` patch body (no `updated_at` key); live `pg_trigger` empty for the table.
*Evidence:* The PATCH body for promise updates omits `updated_at`, and there is no DB trigger maintaining it (the `set_wrenchready_promise_updated_at` function is orphaned — Finding 3). `updated_at` therefore stays at the insert default `now()`.
*Why it matters:* Any logic or reporting that relies on `updated_at` (staleness detection, sync ordering, "tomorrow at risk" recency) is using a frozen value. Several Jeff tables order by `updated_at desc` for *their* tables; if the same assumption leaks to promises it is wrong.
*Recommendation:* Attach the existing function as a `BEFORE UPDATE` trigger (and set its `search_path`), or include `updated_at: new Date().toISOString()` in the patch.

**10. `function_search_path_mutable` on five SECURITY-relevant functions**
*Severity: Low.* *Location:* live security advisor.
*Evidence:* `set_wrenchready_promise_updated_at`, `match_al_memories_text/_vector`, `match_vault_documents_text/_vector` all have role-mutable `search_path`.
*Why it matters:* Mutable `search_path` on functions is a standard privilege-escalation vector (schema shadowing). Low impact here because the WrenchReady ones aren't `SECURITY DEFINER` and the match functions belong to the co-tenant, but it's flagged on the same instance the app trusts.
*Recommendation:* `ALTER FUNCTION ... SET search_path = ''` (or an explicit schema) on all of them.

### Score rationale

The Jeff subsystem alone would score ~7: it is migration-managed, constraint-rich, well-indexed, and fails safe. The scheduling engine's timezone handling is the best code in this dimension. But the Promise CRM — which holds the money, the customers, and the schedule — drags the score down hard: it is **unmigrated** (Finding 3), **race-prone** (Finding 4), **schema-smells structured data into free text** (Finding 5), and its **double-booking guard is non-functional in production** (Finding 6, proven: 1/51 rows). Layer on a **shared multi-tenant DB** (Finding 2), **RLS-with-no-policies as the entire authz model** (Finding 1), and a **dead public booking writer** (Finding 7), and the durability/integrity story is weak for a system meant to run a real business. Nothing here is unrecoverable — these are fixable with migrations, optimistic concurrency, structured columns, and a dedicated project — but as it stands the data layer is "works in the pilot, will bite at scale." **4.5 / 10.**
