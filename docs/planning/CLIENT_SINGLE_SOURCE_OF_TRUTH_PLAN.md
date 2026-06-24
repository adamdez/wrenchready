# Plan — One Single Source of Truth for Clients

**Status:** Design pass for approval. No code until signed off. Branch base: `crm-promise-redesign`.
**Goal (user's words):** "one single source of truth for all client files."

---

## The problem (verified in code + live DB)
There is no Client entity. `CustomerContact { name, phone, email?, preferredContact }` is **copied** onto the InboundRecord (`types.ts:495`) and onto **every** PromiseRecord (`types.ts:527`). A website form always creates a fresh orphan card with its own copy; a repeat customer becomes several unlinked records with drifting contact info.

**The live data proves the cost** (project `tsisorwqxmizndrcidub`, ~75 rows, ~15–18 real clients):
- "Stuart Grossman" is split across `509-939-8914` (21 records) and `5099398914` (2) — same person, two formats, treated as strangers. Normalizing both → `+15099398914` collapses them to **one** client with 23 records.
- **73% of rows have no email** → phone is the only identity signal.
- Phone fan-out is messy: one key with 22 distinct names (a test harness), one real key with 3 names, two keys with 2 names, plus cross-key conflicts (one email across multiple phones, one phone across multiple emails).

## The principle
Apply the same move we just shipped for *job state* (`resolvePromiseState` → everything is a projection of one state) to *client identity*: **a `Client` row owns identity once; every lead, job, payment, and file references it.** A new form is still a new **request card** (you must act on it) — but *matched* to the client, not mistaken for a new person.

---

## ⭐ The single most important rule
**Do NOT auto-merge during backfill. Identity resolution PROPOSES; a human CONFIRMS before any `client_id` is written to a pre-existing row.** At 15–18 clients, auto-merge saves ~10 minutes but risks silently fusing two real customers' lifetime files — the worst possible failure for a "single source of truth." Everything else is shape; this is the one that bites.

---

## Key design decisions (corrected by the live-DB critique)

1. **`wrenchready_client` table** — one identity row. `id`, `display_name`, `primary_phone` (+`alt_phones[]`), `primary_email` (+`alt_emails[]`), `preferred_contact`, lifetime rollups (`job_count`, `revenue_cents`, `first_seen_at`, `last_seen_at`), `merged_into` (soft-merge pointer — merges are reversible), audit fields. A companion `wrenchready_client_identifier` table holds the normalized phone/email keys for matching.

2. **Additive, nullable `client_id` FK** on `wrenchready_inbound` and `wrenchready_promise` (mirrors the existing `promise.inbound_id` precedent). Nothing reads it at first → the board behaves identically → fully reversible.

3. **Drop the "read cache" idea (critique correction).** Earlier lenses kept the embedded `customer_*` columns as a denormalized cache — at **75 rows that's unjustified and re-creates the drift we're killing.** Instead: after backfill, hydrate identity in `mapInboundRow`/`mapPromiseRow` via a **join** to the client row (one source). Keep the embedded columns only as a **frozen "as-captured" snapshot** for provenance ("called from a different number on 3/4"), never as a live source.

4. **One normalizer — replacing what exists (critique correction).** It is **not** true that there's "no phone normalization" — there are already **two divergent `normalizePhone` functions** (`twilio.ts`, `twilio-voice.ts`). The new `src/lib/promise-crm/identity.ts#normalizePhone` must **replace both** (they import it) and be **byte-identical** to a Postgres generated-column expression, or the same person fragments across code paths. Pure, dependency-free, unit-tested — same discipline as `promise-state.ts`.

5. **Matching = three tiers, never phone-only auto-link (critique correction).** Phone-key match **AND** fuzzy-name agreement → **auto-link**. Any phone key with ≥2 distinct names → **suggest/review queue**, never auto-assigned. No match → **new client**. The resolver `resolveClientMatch(contact)` is wired into `createInboundRecord` (`storage.ts:1598`) — the single intake chokepoint that covers every channel.

6. **New form → new card, matched.** Resolve `client_id` *before* the insert; the new request is always its own actionable card, FK-attached to the matched client, badged **"Returning customer — N prior jobs."**

7. **Merge / un-merge are first-class, logged, reversible** — behind the `/ops` auth gate, with an actor+audit log on every merge/un-merge and full-file read (PII blast-radius).

8. **Client file view** — new route `/ops/clients/[id]`: identity header (once), lifetime stats strip, open-vs-closed work (+ "Start new job for this client"), and one unified timeline that's a pure projection (union of every job's timeline + all files). `/ops/clients` is a searchable index. **Board cards link *up* to the client; the client file links *down* to each job.** The per-job promise page stays the unchanged "work surface"; the client file is the "relationship surface."

9. **Lifetime rollups gated behind a "fully reconciled" flag** — during the phased migration, show "history may be incomplete" rather than a wrong "returning" count.

---

## Phased migration (each phase reversible, board never breaks)
- **Phase 0 — Expand:** ship `wrenchready_client` (+identifier table) + nullable `client_id`. Pure additive DDL, zero reads change. *Verify:* board identical. *Rollback:* drop columns.
- **Phase 1 — Backfill (PROPOSE only):** idempotent, **dry-run-first** job clusters existing rows by normalized identity into a **review queue with an audit table**; a human confirms each cluster before `client_id` is stamped. Run in **small off-shift batches** — `client_id` stamps are UPDATEs that bump `updated_at`, which is the optimistic-concurrency CAS token (`storage.ts:2250/2522`); running mid-shift would spuriously fail operator edits. Handle the 22 test/red-team rows (cluster as junk, exclude from board).
- **Phase 2 — Flip writes:** `createInboundRecord` + promotion resolve-or-create `client_id`. Reads unchanged.
- **Phase 3 — Flip reads + ship the client file:** identity hydrated from the client row (join); `/ops/clients/[id]` live; returning-customer badges on.
- **Phase 4 — Cleanup:** make `client_id` NOT NULL only after measured ~100% linkage; freeze embedded columns as the at-capture snapshot.

---

## Decisions I need from you before building
1. **Auto-link policy** — confirm: **phone + name agreement to auto-link; phone-only ambiguity → human review** (recommended; the data demands it). ✅/adjust
2. **Shared phones** (spouse / shop landline / fleet) — treat a multi-name number as a **"household" grouping**, or force review each time? (Note: B2B fleet accounts are already modeled separately on `/ops/accounts`.)
3. **Vehicles** — a client owns multiple vehicles, and `VehicleSummary` is *also* copied per record (`types.ts:70`) — the next identical bug. **Decide now** even if we build later: reserve the FK shape so a `wrenchready_vehicle(client_id)` slots in without a second live-table migration. Build vehicle-as-entity now, or reserve-and-defer? (recommend: reserve + defer)
4. **End state** — reference-via-join only (recommended), or keep embedded columns permanently?

---

## What's NOT in this (deliberately)
Vehicle-as-entity build, B2B/household grouping UI, and any auto-merge. Those are either deferred or explicitly rejected.
