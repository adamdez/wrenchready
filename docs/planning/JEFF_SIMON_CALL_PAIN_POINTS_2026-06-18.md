# Jeff Simon Call Pain Points - 2026-06-18

## Sources Checked

- Production Supabase `wrenchready_jeff_conversation`
- Production Supabase `wrenchready_jeff_conversation_summary`
- Production Supabase `wrenchready_jeff_field_event`
- Production Supabase `wrenchready_jeff_memory`
- Local `.data/jeff` mirror

Local mirror is mostly smoke/red-team fixture data. The useful real-use signals are in production Supabase conversations and app-message transcripts. Phone numbers and exact GPS coordinates were not copied into this note.

## Strongest Pain Signals

### 1. Parts search is the urgent field pain, not purchasing

Evidence:

- `jeff-app-message-1781751315416-4qkx5j`
  - Simon: "No jeff this is for a different job I need to know NOW! I need to buy a astro van fuel pump ASAP tell me where someone has one I can go buy"
  - Jeff replied that it cannot check inventories or direct buys, then asked for Share Location.
- `jeff-app-message-1781751355152-nq19m0`
  - Jeff returned nearby stores, but not phone/address/action buttons in the captured answer.
- `jeff-app-message-1781751899156-y1k035`
  - Simon directly asked whether Jeff can look through store stock online.

Problem:

Jeff's current day-one behavior is technically honest, but it is still too weak for Simon's actual field need. Simon was not asking for a philosophical limitation; he needed a fast path to "who likely has the part, how do I confirm, where do I go."

Likely fix:

- Build a parts workbench that is allowed to operate without an active CRM job.
- Treat "different job" as a context switch, not an error.
- Default nearby store responses to include store name, distance/time, phone, address, map link, and exact inventory question.
- Add a background parts-search worker for live vendor web/API lookup when possible.
- Keep buy/reserve/pay blocked until approvals/payment/writeback exist.

### 2. Jeff is over-attached to the selected job

Evidence:

- Simon asked for a 2001 Chevy Astro fuel pump while the app context was `Stuart Grossman / 2021 Ford E-450`.
- Jeff repeatedly pulled the answer back toward the E-450 approval path.

Problem:

In the field, Simon's active problem may not match the selected UI job. The app cannot assume the selected job is the user's current mental context.

Likely fix:

- Add explicit conversation mode: `current job`, `different job`, `personal`, `admin`, `parts-only`.
- If Simon says "different job," Jeff should ask only for the minimum vehicle/part facts and continue.
- App messages should have a quick context chip: "Use selected job" / "Different job" / "No job."

### 3. Jeff still narrates internal lookup behavior

Evidence:

- `jeff-conversation-019ed864-8e62-7aac-b40b-de63817b782d`
  - Jeff said it was checking job context.
  - User reacted: "Oh, you're confused already."

Problem:

This phrase makes Jeff sound slow and uncertain. It also confirms Adam's concern that guardrails can make Jeff feel mechanical.

Likely fix:

- Make the voice prompt even stricter: no "checking context," "one moment," or setup narration unless a tool is truly taking more than a couple seconds.
- Make the first response answer the user immediately, then silently use context if needed.
- Add transcript-review detection for banned phrases.

### 4. Personal/non-job calls need a first-class workspace

Evidence:

- `jeff-conversation-019ed695-a8b2-7551-b6bd-fddbb407f626`
  - Simon discussed a personal 1987 Ford F-150 that starts and dies.
  - Jeff gave useful diagnostic guidance.
  - When Simon asked for an email, Jeff first said it needed an active job.
  - The record later shows follow-up status `sent`, but the call experience still had friction.

Problem:

Jeff can be useful without a WrenchReady job. Personal/admin/ad-hoc calls should not feel like a broken job lookup.

Likely fix:

- Create a "personal/ad-hoc workspace" path for calls and emails.
- `send_simon_recap_email` should not require job context if Simon is the recipient and the call is personal/admin.
- Ops should show these separately from unresolved job calls.

### 5. Photo/text instructions are ambiguous

Evidence:

- `jeff-conversation-019ed899-c006-7000-9a03-016d346b34d6`
  - Simon asked whether he could text the number for customer photos and job info.
  - Jeff said yes, then also said photo upload should happen in the app.

Problem:

Simon needs one obvious media behavior. If the Vapi phone number is not a real MMS inbox, Jeff should not imply that texting the number is reliable for photos.

Likely fix:

- Decide the canonical media surface now.
- If app upload is canonical: Jeff says "Use Message Jeff in the app for photos/files."
- If SMS/MMS is desired: wire it deliberately through Twilio or another inbound media route and show those messages in the same thread.

### 6. Short calls are polluting the review queue

Evidence:

- Several calls only contain Jeff's greeting:
  - `019ed64b-5bc5-7000-9e7f-23d67dbc54a7`
  - `019ed854-2b40-777d-8984-570038d6967d`
  - `019ed858-3df1-7448-b13f-263731270ee7`
  - `019ed858-a7e8-7771-a902-07dca7947ee1`
  - `019ed85a-17cb-7bb3-8ef6-41d2d5bfabfd`

Problem:

These are likely unanswered, hangup, or failed-start calls. They currently become unresolved workspace/review clutter.

Likely fix:

- Classify calls under a minimum user-speech threshold as `missed_or_no_answer`.
- Keep them in a separate call-log bucket, not the work review queue.
- Track answer rate and average useful-call duration separately.

### 7. Simon works alone; instructions need solo-mechanic ergonomics

Evidence:

- `jeff-app-message-1781750979281-4lcltr`
  - Simon: "I am by myself how am I suppose to listen at the front of the car while I turn the wheel?"

Problem:

Jeff gave a reasonable diagnostic sequence, but did not initially account for one-person field constraints.

Likely fix:

- Add a standing field assumption: Simon is usually solo unless he says otherwise.
- Give one test at a time.
- Prefer tests that can be performed safely by one person.

### 8. Summaries are too noisy for ops review

Evidence:

- Conversation summaries turn internal phrases like "checking job context" into known facts, tests, proof needed, and next actions.
- Some transcripts contain "ranch ready" instead of WrenchReady.

Problem:

The ops page will be hard to trust if summaries preserve filler, transcript errors, and internal mechanics as operational facts.

Likely fix:

- Add a post-call cleanup step that filters filler and internal assistant narration.
- Separate raw transcript, cleaned transcript, extracted facts, and operator recommendations.
- Add transcript QA flags for brand misrecognition, filler phrases, and summary extraction failures.

### 9. Memory queue is cluttered

Evidence:

- Many duplicate candidate memories say Simon wants concise field answers.
- A real-looking Tammy Wilson parasitic draw recap is stored as a candidate memory, not as a clearly attached job/personal workspace record.

Problem:

Memory review will become burdensome if duplicates and job notes mix together.

Likely fix:

- Deduplicate memory candidates by normalized text/category/subject.
- Keep job notes in job/ad-hoc workspace, not the durable personal-memory approval lane.
- Only ask for approval on facts that should influence future behavior.

### 10. Jeff implies actions it cannot perform

Evidence:

- `jeff-app-message-1781751038924-uc0ato`
  - Simon asked Jeff to make a demo job.
  - Jeff replied that it would prep the demo job, but there is no evidence of a real create-job tool completing that action.

Problem:

This is the same trust failure as fake purchasing, just lower stakes.

Likely fix:

- If Jeff cannot create/update a CRM job, it should say so and log the request.
- Or build the create-demo-job/create-ad-hoc-job tool.

## Immediate Build Priorities From Call Evidence

1. Ad-hoc conversation/workspace mode for non-job, personal, admin, and different-job calls.
2. Parts-search workbench with fresh location, vehicle/part parsing, vendor-ready inventory questions, and store contact/map links.
3. Missed/short-call classification so failed starts do not pollute review.
4. Cleaner voice behavior: no internal lookup narration; answer first.
5. Media-channel clarity: one canonical way for photos/files, or real MMS wiring.
6. Better summary extraction for ops: raw transcript separate from cleaned facts and action recommendations.
7. Memory dedupe and job-note separation.

