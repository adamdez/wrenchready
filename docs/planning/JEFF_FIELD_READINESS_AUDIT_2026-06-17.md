# Jeff Field Readiness Audit - 2026-06-17

Audit goal: evaluate Jeff v1 through field usability, wiring, source-of-truth, reliability, and long-term human fit. This review is intentionally skeptical of the current implementation. Passing lint/build is not treated as field readiness.

## Bottom Line

Jeff is a useful pilot skeleton, but it is not yet reliable enough to be Simon's operational field assistant for real jobs without supervision.

The strongest parts are the Vapi phone tool wiring, blocked purchasing guardrail, job workspace/event model, basic message UI, and operator review page. The weakest parts are durable media storage, parity between message and phone actions, inbound email attachment handling, active-job resolution, and the lack of a single readiness gate that tells Dez whether Jeff is actually safe to use today.

## Critical Findings

### 1. Field photos are not truly production-durable yet.

Photos uploaded through Message Jeff are registered as field photos before Google Drive upload runs. The field-photo record therefore relies on local photo storage, which resolves to `/tmp/wrenchready-jeff` in Vercel. That storage is not durable across deployments or serverless instances.

Evidence:
- `src/lib/jeff-field-assistant/app-chat.ts` calls `registerMessagePhotos(input)` before `saveAttachmentsToDrive(input.attachments)`.
- `src/lib/jeff-field-assistant/local-data.ts` uses `os.tmpdir()` on Vercel.
- Supabase migrations cover events, memory, conversations, and snapshots, but not photo/media objects.

Field impact:
Simon can send a photo, Jeff can say it is attached, and a later call or deploy may not be able to analyze the actual image.

Recommendation:
Make Google Drive or object storage the canonical media store before calling photos production-ready. Field-photo metadata should store permanent file ids/URLs, not local temp keys.

### 2. Message Jeff is not action-equivalent to Call Jeff.

The Vapi phone path supports full tool calls: job context, photo list/analysis, location-based parts stores, scheduling evaluation, recap email, memory candidates, and closeout. The `/jeff/messages` path mostly calls a text model and only auto-registers image attachments.

Evidence:
- `src/lib/jeff-field-assistant/vapi-server.ts` routes Vapi tool calls through `toolHandlers`.
- `src/lib/jeff-field-assistant/app-chat.ts` calls OpenAI directly in `askJeffTextModel()` without tool execution.

Field impact:
Simon may naturally type "find a parts store near me" or "send me the recap" and expect the same Jeff as phone. The UI says "Message Jeff," but the message channel is currently less capable.

Recommendation:
Move app messages onto the same tool-orchestration layer as Vapi. At minimum, message should support tool calls for current context, photo analysis, location, recap email, closeout, memory candidates, and parts-store search.

### 3. Inbound email can record that attachments exist, but does not ingest attachment bytes/content.

Gmail sync normalizes filenames and sizes, and generic inbound form parsing records file metadata. It does not fetch Gmail attachment bodies, upload them to Drive, parse PDFs, OCR screenshots, or connect scan-tool content to a job.

Evidence:
- `src/lib/google-workspace.ts` `collectGmailAttachments()` returns filename/content type/size only.
- `src/app/api/al/wrenchready/jeff/email/inbound/route.ts` converts form files to name/type/size only.
- `src/lib/jeff-field-assistant/email-ingest.ts` stores attachment metadata in source payload and summary.

Field impact:
If Simon's diagnostic reader emails Jeff a report, Jeff may know "an attachment arrived" but not know the codes/readings inside it.

Recommendation:
Implement real attachment ingestion: fetch bytes from Gmail/inbound provider, store in Drive/object storage, parse PDFs/images, extract DTCs/readings/VIN, and write a `scan_report_parsed` event.

### 4. Active job selection is too manual and fragile for field use.

Message Jeff defaults to "No job selected." Photos without a selected job remain message attachments and are not job field photos. Call/session job context exists, but app messages do not visibly inherit the latest active job by default.

Evidence:
- `src/components/jeff-messages-thread.tsx` initializes `selectedJobId` as empty.
- `src/lib/jeff-field-assistant/app-chat.ts` warns when images arrive without `input.jobId`.

Field impact:
Simon will forget to select a job while under time pressure. Jeff then may save a useful message/photo as unresolved instead of job truth.

Recommendation:
Add an "active job confidence" banner and default selection: latest on-site Simon job, active call job, or location-linked job. If confidence is low, force a quick confirmation chip before photos/actions.

### 5. Location is explicit and safe, but too easy to go stale silently.

Jeff only uses a fresh shared location and blocks stale location, which is good. But the UX relies on Simon tapping Share Location, and there is no background refresh or visible countdown in the message composer.

Evidence:
- `src/lib/jeff-field-assistant/location.ts` uses a 15-minute freshness window.
- `src/components/jeff-messages-thread.tsx` shows only a notice after sharing.

Field impact:
"Find the closest store" may fail during the exact moment Simon needs it because location expired and he did not realize it.

Recommendation:
Show location freshness persistently in Message Jeff: fresh/stale/never shared, age, and a one-tap refresh near the message box. Later, add an optional background PWA refresh pattern if acceptable.

### 6. Jeff's "memory" model is cautious but not yet operationally useful.

Candidate memories are saved and approved memories are injected. That avoids bad autopersistence, but there is no good memory review workflow for busy humans and no retrieval discipline beyond latest approved rows.

Evidence:
- `propose_core_memory_update` creates candidates only.
- `/ops/jeff` can approve/reject, but there is no clustering, expiry, contradiction handling, or "why this memory was used" display.
- `buildMemoryContext()` slices approved memories and puts them into the prompt.

Field impact:
Either memory is underused, or the review queue becomes burdensome and stale. Personal preferences like food deals are also outside Jeff's core field safety model and could become distracting.

Recommendation:
Split memory into three tiers: operational rules, technician preferences, and personal assistant preferences. Add automatic low-risk memory candidates, contradiction detection, expiry/review dates, and a "used memory" audit log.

### 7. Parts sourcing is only nearby-store search, not inventory/fitment/order workflow.

Jeff can rank nearby auto parts stores using Google Maps. It cannot verify inventory, fitment, price, core charge, account pricing, tax, pickup ETA, or buy/reserve.

Evidence:
- `find_nearby_parts_stores` policy says results do not prove inventory/fitment/price/purchase.
- `purchase_or_reserve_part` is intentionally blocked.

Field impact:
This is not yet the scenario Dez described: "find the correct starter, buy it, and tell Simon pickup time." It is only "here are stores to call/check."

Recommendation:
Build a parts workflow in stages: fitment facts required, vendor search/draft cart, human approval, then limited delegated purchase. Do not jump straight to buying.

### 8. Ops review exists, but it is not yet a true command center.

`/ops/jeff` shows statuses, review queues, field files, memory candidates, and latest location. But it lacks operator actions for unresolved conversations, attaching messages/emails/photos to jobs, retrying failed emails, or resolving blocked follow-ups.

Evidence:
- `/ops/jeff` displays unresolved/follow-up data and memory approval buttons.
- There are no equivalent actions to attach unresolved conversations to a job, retry recap email, or resolve location/media issues.

Field impact:
Adam/Dez can see problems but still have to manually repair a lot of them through code/tools.

Recommendation:
Add operator workflows: attach to job, mark as personal/admin, retry/send recap, promote email attachment to scan report, approve memory, archive noise, and open job timeline.

### 9. Test coverage is useful but misses field-friction scenarios.

Existing scripts check auth gates, tool catalog, blocked purchases, scenario notes, session photo inbox, and transcript phrase red flags. They do not test the newer Message Jeff flow end to end or production media durability.

Missing scenario tests:
- Message with photo and no job selected.
- Message asks Jeff to send recap.
- Message asks for nearby parts store after location share.
- Gmail report with actual attachment content.
- Photo stored in Drive and later analyzed after process reset.
- Active job inferred from current call then used by Message Jeff.
- Failed OpenAI/Vapi/Google/Supabase responses with user-friendly recovery.

Recommendation:
Add these as required smoke tests before more feature expansion.

### 10. Auth is acceptable for pilot, not for long-term sensitive field operations.

Field app PIN and ops Basic Auth are workable pilot controls, but the system will hold customer data, location, job notes, photos, email, and payment-related facts.

Evidence:
- `/jeff/messages` uses a shared app PIN.
- `/ops/jeff` uses Basic Auth with configured password candidates.
- `/jeff/photo-drop?jobId=...` can render a job if a valid active job id is provided.

Field impact:
Shared secrets are hard to revoke per person/device and do not provide a good audit trail.

Recommendation:
Move to user/device identity for Simon, Adam, and Dez before Jeff handles high-value actions, payment links, purchasing, or broader customer records.

## What Is Working

- The Jeff phone path is tool-aware and has a real server callback.
- Purchasing is blocked instead of fake-functional.
- Vapi config exposes a single WrenchReady tool catalog.
- Field event, memory, and conversation data can persist to Supabase.
- The Message Jeff UI now matches Simon's phone behavior better than a separate photo uploader.
- `/ops/jeff` gives a useful first operator view.
- Google Workspace integration has separate readiness checks for Gmail, Calendar, and Drive.
- Location-sensitive parts-store search blocks when location is missing or stale.
- Noindex headers are configured for Jeff routes.
- Lint and TypeScript pass for the reviewed Jeff files.

## Recommended Next Build Order

1. Make media durable first.
   - Upload message/photos/PDFs to Drive or object storage before field-photo registration.
   - Add a Supabase `wrenchready_jeff_media` table with job id, conversation id, Drive file id, content type, source channel, labels, parse status, and review status.
   - Update photo analysis to use canonical stored media.

2. Make Message Jeff action-capable.
   - Reuse the same tool registry used by Vapi.
   - Let text messages call tools and return compact tool-backed answers.
   - Keep all tool results in the job workspace.

3. Fix active job UX.
   - Default to inferred active job when confidence is high.
   - Show a visible confidence banner.
   - Force one-tap confirmation before job-specific photo/action writes when confidence is medium or low.

4. Build real email attachment ingestion.
   - Fetch Gmail attachment bytes.
   - Store attachments durably.
   - Parse/OCR scan reports.
   - Attach extracted DTCs/readings/VIN to the correct job or unresolved review queue.

5. Upgrade `/ops/jeff` from dashboard to workbench.
   - Add attach-to-job, classify, retry recap, approve/archive, and resolve actions.
   - Put unresolved conversations and failed follow-ups at the top.

6. Add field-friction scenario tests.
   - Test the 8-10 real failure cases listed above.
   - Treat these as release gates before giving Simon more capability.

7. Only then expand parts and purchasing.
   - Start with fitment requirements and draft carts.
   - Add vendor/account integration after resellers permit/vendor accounts are ready.
   - Keep purchase gates and readback until real audit logs exist.

## Human Expert Red-Team Notes

Field tech perspective:
Simon needs one tap, low reading load, obvious job context, obvious photo status, and no surprise "I lost the image" moments. He will not carefully manage job dropdowns on every driveway.

Mechanic perspective:
Jeff must stay test-first, ask for readings/photos at the right moment, and never turn symptoms into parts recommendations without proof. Exact service data must come from verified sources.

AI assistant builder perspective:
The app needs one tool/runtime path for voice and message. Splitting Vapi tool logic from app text logic will create inconsistent behavior and support confusion.

Backend reliability perspective:
Local `/tmp` media is the biggest operational risk. Every important event needs idempotency, durable storage, retry status, and a visible failure state.

Operator/business perspective:
Jeff should save Dez and Adam time, not create a hidden review backlog. The review queue needs quick actions and prioritization.

Security/privacy perspective:
PIN and Basic Auth are fine for a controlled pilot. They are not enough once Jeff handles broader customer records, location, purchases, or payment workflows.

## Release Gate For Simon

Jeff should not be treated as field-ready beyond supervised pilot until:

- Message photos survive deployment/process reset and remain analyzable.
- Message Jeff can use the same action tools as phone Jeff.
- Active job selection is visible and low-friction.
- Email attachments are actually ingested and parsed.
- `/ops/jeff` can resolve the common review cases without code.
- A field-friction test suite passes against production or a production-like environment.
