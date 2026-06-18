# Simon AI Tech Expert Line

## Purpose

Simon needs a callable AI tech expert and WrenchReady knowledge expert he can talk to while actively working in the field.

This is not just a mobile dashboard. It is a voice support line that helps Simon reason through vehicle problems, stay inside the authorized scope, capture proof, and close the job cleanly.

Build sequence and review gates are tracked in `docs/planning/JEFF_FIELD_ASSISTANT_BUILD_PLAN.md`.

## Human Friction Standard

This project is successful only if it reduces field friction for Simon.

Clean code, working APIs, nice architecture, or a clever Vapi demo do not count as success by themselves. The system works only when a human technician can use it while tired, interrupted, standing outside, dealing with tools, customers, noise, bad signal, and time pressure.

Every build decision should be judged against these questions:

- Can Simon use it without stopping the job?
- Does Jeff ask for less typing, not more?
- Does Jeff remember what came in by call, text, photo, email, and invoice status?
- Does Jeff give the next physical action, not a long explanation?
- Does the system prevent admin cleanup later?
- Does it make the customer handoff easier?
- Does it reduce Simon's cognitive load?

If the answer is no, the implementation is not done, even if the code is technically clean.

## Field Acceptance Tests

Before calling a version ready, test it with real field-style scenarios:

1. Simon is under a hood and can only talk.
2. Simon sends a blurry photo and needs Jeff to ask for the right retake.
3. Simon emails a scan-tool report and expects Jeff to notice it during the same call.
4. Simon asks for a part and Jeff must verify fitment, approval, and pickup without wandering.
5. Simon is interrupted and resumes the call later; Jeff must know the latest job state.
6. Dez changes invoice/payment status while Simon is in the field; Jeff must not be stale.
7. A conflict appears between VIN, scan report, and job record; Jeff must stop and verify.

These tests matter more than abstract feature completion.

## Core Job

When Simon calls, the assistant should be able to:

- Identify the active job or ask for enough detail to find it.
- Summarize the customer, vehicle, concern, authorization, parts status, invoice status, and payment status.
- Ask Simon what he sees, what tests he has done, and what changed.
- Recommend the next diagnostic step in plain mechanic language.
- Tell Simon when exact service data, wiring diagrams, torque specs, or OEM procedure must be verified before continuing.
- Flag approval stop points before extra labor, parts replacement, or customer promises.
- Tell Simon what photos or evidence to capture before leaving.
- Turn field conversations into controlled actions: source parts, prepare carts, request approvals, log notes, and start closeout.
- Help trigger invoice/payment closeout when the work is complete.

## Knowledge Sources

The voice expert should combine:

- WrenchReady job folder context.
- `job-state.md`, `simon-internal.md`, `parts.md`, `invoice.md`, and `stripe.md`.
- WrenchReady operating rules, pricing rules, customer communication rules, and field-ops lessons.
- General automotive diagnostic reasoning.
- Verified service data when available.

## Guardrails

- Do not invent exact vehicle specs, wiring colors, torque specs, relearn procedures, or service manual facts.
- Do not authorize extra work, extra parts, or price changes without the approval path.
- Do not tell Simon to replace parts before testable evidence supports it.
- If the issue is safety-critical or outside WrenchReady scope, advise stopping and escalating.
- If customer money is involved, confirm invoice math and Stripe status before customer-facing language.
- Do not purchase parts, place orders, or make irreversible external changes unless the action is inside delegated authority and Simon or Dez gives explicit confirmation.
- Before any part purchase, verify fitment, store, price, core charge, pickup timing, customer authorization, and margin impact.

## Minimum Viable Workflow

1. Simon calls the WrenchReady tech expert number.
2. The assistant identifies the job by caller, customer, vehicle, or open schedule.
3. The assistant reads a short job brief.
4. Simon describes the current problem.
5. The assistant asks one or two targeted diagnostic questions.
6. The assistant gives the next test, stop point, and evidence to capture.
7. If a part is needed, the assistant can source the part, present options, and prepare or place the order according to approval rules.
8. If the job is complete, the assistant prompts invoice/payment closeout.

## Simon Field UI

Simon's primary UI should be the phone call. That is the fastest, safest field interface when his hands are occupied.

But Jeff also needs a companion text/photo channel:

1. Phone call: hands-free diagnostic conversation.
2. Text box / SMS: quick typed notes, part numbers, VINs, readings, and confirmations.
3. Photo upload: pictures of VIN, battery terminals, fuse box, scan tool screen, failed part, part label, odometer, and completed repair.
4. Email intake: diagnostic scanner reports, PDFs, screenshots, and longer notes sent to a Jeff/WrenchReady address.
5. Optional field link: a mobile web page with larger photo upload, job details, and closeout buttons when SMS/MMS is too cramped.

The best MVP is:

- Simon calls Jeff.
- Jeff says, "Send that in Message Jeff."
- Simon opens `/jeff/messages`, types or dictates a message, takes one or more photos, labels them in the message, and sends them against the active job.
- If Simon's diagnostic reader can email results, he sends the report to Jeff's inbound address.
- WrenchReady backend stores the image against the active job.
- Jeff uses the latest photo/report in the call context and says, "I see the label. That part number cross-references to..." or "The scanner report shows P0335 current and P0562 history; let's verify crank signal and charging voltage."

The voice assistant should not rely on Vapi alone for images or diagnostic-reader files. Use Twilio messaging/MMS, a WrenchReady upload page, and inbound email parsing to receive field media, then pass those files into the OpenAI vision/document layer and job record.

Day-one message/photo path:

- route: `/jeff/messages`
- backup upload route: `/jeff/photo-drop`
- backend upload endpoint: `POST /api/al/wrenchready/jeff/photos/upload`
- tool endpoint: `POST /api/al/wrenchready/jeff/tools/record-field-photo-upload`
- list endpoint: `POST /api/al/wrenchready/jeff/tools/get-field-photos`
- vision endpoint: `POST /api/al/wrenchready/jeff/tools/analyze-field-photo`

The pilot stores photo image data in runtime memory so Jeff can see it during the test workflow. Production needs durable object storage before this is treated as a reliable archive.

### Jeff Email Intake

Jeff should eventually have an address such as:

- `jeff@wrenchreadymobile.com`
- `diagnostics@wrenchreadymobile.com`
- or job-specific aliases like `jeff+tammy-chrysler@wrenchreadymobile.com`

Use cases:

- scan tool emails a PDF report
- diagnostic reader emails screenshots or code summaries
- Simon forwards a parts/vendor confirmation
- Simon sends longer notes that are annoying by SMS
- customer forwards prior repair records

Email should be treated as an attachment intake channel, not the live conversation channel. Jeff should acknowledge receipt by voice or text: "Got it. I attached the scan report to Tammy's job. It shows P0562 and low-voltage history."

Implementation options:

- inbound email provider webhook, such as Postmark Inbound, SendGrid Inbound Parse, Mailgun routes, or any comparable inbound parser
- Google Workspace/Gmail forwarding into an inbound parser address
- direct mailbox connector later, if a Gmail integration is preferred

The key requirement is that inbound email must parse sender, subject, body, attachments, and any plus-address/job token, then attach the files to the right WrenchReady job.

## Unified Field Context

Jeff must never have separate channel memories.

Phone calls, Vapi transcripts, SMS/MMS, upload-link photos, diagnostic-reader emails, vendor confirmations, approval messages, parts orders, invoice status, and closeout notes must all write into one job context before Jeff answers Simon.

The rule:

- channels are inputs
- the WrenchReady job record is the source of truth
- Jeff reads the latest job context before giving advice or taking action

### Field Event Timeline

Every incoming or outgoing item should become a field event:

- `voice_call_started`
- `voice_transcript_note`
- `sms_received`
- `mms_photo_received`
- `field_upload_received`
- `photo_analysis_completed`
- `diagnostic_email_received`
- `scan_report_parsed`
- `part_search_completed`
- `cart_prepared`
- `purchase_blocked`
- `approval_requested`
- `approval_received`
- `invoice_updated`
- `payment_link_ready`
- `closeout_started`

Each field event should include:

- event id
- job id
- channel
- timestamp
- sender
- summary
- raw source link or attachment reference
- extracted vehicle/job facts
- whether it changes the source-of-truth fields
- confidence / needs-review flag

### Current Context Packet

Before Jeff responds, the backend should assemble a current context packet:

- customer and vehicle
- authorized scope and stop points
- latest concern
- latest test results/readings
- latest scan-tool codes or report summary
- latest photos/media summaries
- parts status and open carts/orders
- invoice/payment status
- open approvals and blockers
- last 5-10 field events

Jeff should answer from that packet, not from memory of only the active phone call.

### Conflict Handling

If channels conflict, Jeff should not guess.

Examples:

- Simon says the customer approved a starter, but no written approval exists.
- Email report has a different VIN than the active job.
- SMS says "2017 Subaru" but job record says "2010 Chrysler."
- Photo label does not match the part being ordered.

Jeff should say the conflict plainly and route to verification:

"I have a mismatch. The scan report VIN does not match Tammy's Chrysler job. I am not using this report until we confirm which vehicle it belongs to."

### System Of Record

For the MVP, the source of truth can be:

- WrenchReady job files plus generated records, while Codex is still operating the assistant workspace.

For production, the source of truth should move to:

- Supabase / Promise CRM job records
- object storage for photos, PDFs, and diagnostic reports
- event timeline table for every field interaction

The file-based job folders can remain the durable document/archive layer, but Jeff's live context should eventually come from the database.

## Likely Implementation Path

- Voice front end: Vapi for the assistant conversation layer, connected to a Twilio phone number.
- Reasoning layer: OpenAI voice/agent model for diagnostic reasoning, tool use, and WrenchReady policy judgment.
- Job context: WrenchReady job files first, Promise CRM/Supabase when field jobs are fully represented there.
- Tooling: job lookup, field brief generation, invoice/payment status lookup, closeout action creation.
- Escalation: send Dez a concise note when approval, money, parts purchase, or customer promise is needed.

## Stack Decision

Dez has Vapi and Twilio accounts, so the preferred MVP is:

1. Twilio owns the phone number and telephony.
2. Vapi answers the field tech line and manages the live voice conversation.
3. OpenAI provides the mechanic reasoning brain and tool-calling behavior.
4. WrenchReady backend tools provide job context and controlled actions.
5. Codex/ChatGPT mobile remains the back-office assistant path for invoices, packets, job files, and follow-up work.

Use Vapi first because it removes most raw telephony plumbing and lets WrenchReady focus on the actual tech-support workflow. Use raw Twilio Media Streams / OpenAI Realtime later only if Vapi becomes too limiting on latency, tool control, cost, or observability.

Brain rule:

- OpenAI is Jeff's assistant brain.
- Vapi and Twilio are phone/audio transport, not the source of truth.
- WrenchReady backend tools are the action layer.
- Avoid extra agent routers, automation hops, or no-code middle layers in the live conversation path unless a measured field test proves they are worth the latency.

Configured model intent:

- live voice: `JEFF_FIELD_REALTIME_MODEL`, default `gpt-realtime-2`
- reasoning/tools: `JEFF_FIELD_REASONING_MODEL`, default `gpt-5.5`
- photo/vision: `JEFF_FIELD_VISION_MODEL`, default `gpt-5.5`
- Vapi-managed fallback model: `VAPI_JEFF_OPENAI_MODEL`, default `gpt-4o`

## Non-Coder Setup Path

Dez does not need to code or personally wire the systems together.

The right operating split is:

### Codex / engineering handles

- build the WrenchReady backend endpoints
- write the Vapi tool schemas
- write the Jeff system prompt and guardrails
- connect job lookup, field brief, notes, escalation, and closeout tools
- update `.env.example` with required settings
- test locally and in production
- provide exact dashboard click-paths for Twilio, Vapi, OpenAI, Vercel, and vendor accounts
- create a launch checklist and rollback path

### Dez handles

- own the accounts
- create or approve API keys
- add secrets to Vercel / hosting when prompted
- pick the Twilio number
- approve when a dashboard needs business identity, payment method, or phone verification
- define purchasing authority limits
- test the first calls with Simon

### What Dez should not have to do

- write code
- understand webhooks
- write JSON tool schemas by hand
- debug API errors
- figure out Vapi/Twilio/OpenAI routing alone
- manually keep job context synced once the backend tools exist

## Setup Order For A Non-Coder

1. Choose the first MVP scope: voice advice + job lookup + field notes, no purchasing.
2. Codex builds a tiny WrenchReady API layer for Vapi tools.
3. Dez provides the needed account access/secrets through approved dashboards, not in chat.
4. Codex creates the Vapi assistant and Twilio routing instructions.
5. Dez or Simon places test calls from a real phone.
6. Codex fixes prompt/tool behavior from transcripts.
7. Add unified field event timeline and current context packet.
8. Add parts sourcing as draft-only.
9. Add approval-gated purchasing only after vendor account flow is proven.

The safest promise is: "Jeff can talk and log quickly; Jeff can buy only after the rails are proven."

## MVP Tools Vapi Should Call

### `get_active_field_job`

Inputs:

- caller phone number
- optional customer name
- optional vehicle
- optional job id

Returns:

- matching job id
- customer
- vehicle
- current concern
- authorized scope
- field quick view
- open blockers

### `get_current_field_context`

Inputs:

- job id
- caller phone number
- active channel

Returns:

- current context packet
- latest field events
- open conflicts
- open approvals
- safe next actions

### `get_field_brief`

Inputs:

- job id

Returns:

- symptoms reported
- tests already planned or completed
- diagnostic path
- parts status
- invoice/payment status
- stop points
- photo/evidence checklist

### `record_field_note`

Inputs:

- job id
- note
- symptoms observed
- tests performed
- readings
- suspected cause
- next action

Returns:

- saved note id
- updated open questions
- whether approval is needed

### `record_field_event`

Inputs:

- job id
- channel
- event type
- sender
- summary
- raw source reference
- extracted facts
- attachments
- confidence

Returns:

- field event id
- source-of-truth update status
- needs-review status

### `record_field_photo_upload`

Inputs:

- job id
- customer name or vehicle if job id is not known
- photo data or URL
- label
- Simon note

Returns:

- saved photo ids
- field event id
- job record update status
- storage warning if the photo is only in pilot runtime memory

### `get_field_photos`

Inputs:

- job id
- optional include-image-data flag

Returns:

- latest field photos
- labels and notes
- whether image data is available to the backend

### `analyze_field_photo`

Inputs:

- job id
- optional photo id
- Simon's specific question

Returns:

- concise mechanic-relevant photo observations
- uncertainty/retake warnings
- next physical check

### `record_inbound_email_report`

Inputs:

- inbound email id
- sender
- subject
- body
- attachments
- job id or matching hints

Returns:

- saved report id
- matched job id
- parsed diagnostic summary
- unmatched/needs-review status

### `request_approval_or_escalation`

Inputs:

- job id
- reason
- money impact
- parts impact
- customer promise impact
- recommended message to Dez

Returns:

- escalation status
- message sent or draft created

### `start_closeout`

Inputs:

- job id
- work completed
- parts used
- final amount if known
- payment status

Returns:

- closeout checklist
- invoice readiness
- payment-link readiness
- customer message draft status

### `find_nearby_parts`

Inputs:

- job id
- confirmed or suspected part needed
- VIN or vehicle year/make/model/engine
- current Simon location or job location
- preferred vendors
- urgency

Returns:

- vendor options sorted by distance and pickup time
- fitment confidence
- part numbers
- brand/quality tier
- price
- core charge
- warranty notes
- pickup ETA
- margin notes
- reasons any option is unsafe or unverified

### `prepare_parts_cart`

Inputs:

- job id
- selected vendor
- selected part number
- quantity
- customer-approved vs van-stock status

Returns:

- cart id or draft cart status
- final price if available
- core charge
- taxes/fees if available
- pickup store
- pickup readiness
- open approval questions

### `purchase_or_reserve_part`

Inputs:

- job id
- cart id or vendor/part selection
- approving person
- spoken confirmation text
- maximum approved total
- payment method token or vendor account reference

Returns:

- order status
- confirmation number
- pickup store
- pickup ETA
- receipt details
- job record update status

This tool must be approval-gated. If delegated purchasing rules are not configured, it should create a ready-to-buy draft and escalate to Dez instead of completing the purchase.

## Prompt Posture

The assistant should sound like a calm senior mechanic in Simon's ear:

- practical
- brief
- test-first
- explicit about uncertainty
- willing to say "stop and verify"
- aware of WrenchReady approval and payment rules

It should avoid long lectures. In the field, every answer should end with the next test, the stop point, or the evidence to capture.

When the assistant takes an action, it should sound precise and calm:

- "I found two starters that fit this VIN."
- "The closest verified option is O'Reilly on Sprague, part number X, total Y plus core, ready in about 20 minutes."
- "Before I buy it, confirm: this repair is customer-approved and the max parts total is Y."
- "Ordered. Confirmation number X. Pickup at Y. I logged it to the job."

## Voice-To-Action Example

Simon: "I confirmed battery voltage is good, start signal is present, and the starter only clicks. What part do I need?"

Jeff: "That points to a failed starter, assuming grounds and voltage drop are clean. Before replacing it, confirm voltage drop on the starter feed and ground while cranking."

Simon: "Voltage drop is good. Find a starter close to me, buy it, and I'll pick it up."

Jeff:

1. Checks the active job vehicle/VIN.
2. Verifies starter fitment.
3. Searches nearby vendors.
4. Compares distance, pickup time, price, core, and warranty.
5. Reads back the selected part and total.
6. Confirms customer authorization and Simon/Dez purchasing authority.
7. Places or prepares the order.
8. Logs the order, pickup details, and invoice impact.

Jeff: "Ordered. O'Reilly on Division has the verified-fit starter, part number X, total Y with a Z core. Pickup should be ready in about 20 minutes. I logged it to the job and marked the core return."

## Action Authority Ladder

Use the least risky action level that gets the job moving:

1. Advice only: diagnostic coaching, no external changes.
2. Draft action: find parts, draft cart, draft customer/Dez message.
3. Approval-gated action: place order only after explicit confirmation and readback.
4. Delegated action: place orders under preconfigured limits without Dez live approval, only when customer authorization, fitment, price cap, and vendor rules are all satisfied.

The MVP should start at levels 1-3. Level 4 requires written WrenchReady purchasing rules.

## Reliability Plan

The setup can be reliable if the system is built as a controlled action pipeline, not as a voice bot clicking around the internet.

### Fast And Reliable Now

These can be made reliable quickly:

- Simon calls a Twilio number.
- Vapi answers as Jeff.
- Jeff identifies the job.
- Jeff gives diagnostic coaching.
- Jeff reads WrenchReady stop points.
- Jeff logs field notes.
- Jeff drafts escalation messages.
- Jeff drafts invoice/payment closeout tasks.

These actions are mostly internal, reversible, and easy to audit.

### Reliable After Backend Tools

These are reliable once WrenchReady backend endpoints exist:

- active job lookup
- field brief lookup
- parts status lookup
- invoice/payment status lookup
- closeout readiness
- Dez approval request
- SMS-ready customer message draft

The backend should be the source of truth. Vapi should only call tools and read back the result.

### Reliable Parts Purchasing Requirements

Parts purchasing is reliable only when all of these are true:

- vendor account is configured
- fitment can be verified from VIN or exact vehicle configuration
- store inventory/pickup time is available from a stable source
- price, core charge, tax/fees, and warranty are captured
- customer authorization is recorded
- WrenchReady delegated purchase authority is configured
- the tool can write the result back to the job record
- the assistant reads back the purchase before committing

If any one of these is missing, Jeff should prepare the cart and escalate instead of buying.

### What Not To Depend On

Do not make mission-critical purchasing depend only on fragile browser automation against a retail website. Browser automation may be acceptable as a temporary operator-assisted bridge, but production reliability needs a stable vendor account flow, API, EDI, approved marketplace integration, or a human-confirmed order step.

### Production Gates

Before Jeff can place real orders unattended, WrenchReady needs:

1. A written delegated authority policy.
2. A vendor account/payment method that can be used safely.
3. A tested fitment check for common jobs.
4. A maximum spend limit.
5. A required readback before purchase.
6. A job-record writeback after purchase.
7. A failure fallback: draft cart plus notify Dez.

## First Build Sequence

1. Create a private Vapi assistant named `WrenchReady Simon Tech Expert`.
2. Connect a Twilio number dedicated to internal field support.
3. Add the WrenchReady field prompt and guardrails.
4. Start with static knowledge from WrenchReady memory/playbooks.
5. Add backend tool endpoints for active job lookup and field brief.
6. Add unified field event timeline and current context packet.
7. Test against recent jobs: Ryan Ram no-power, Tammy Chrysler battery/no-start, Kendra Subaru battery.
8. Add field-note capture and Dez escalation.
9. Add closeout/invoice/payment readiness once job lookup is reliable.
10. Add parts sourcing as draft-only: search, compare, and prepare cart without purchase.
11. Add purchase gating once fitment, vendor account, payment method, and delegated authority rules are proven.
12. Add companion photo/text channel: Twilio MMS intake or a WrenchReady field upload link tied to the active job.
13. Add Jeff email intake for scan-tool reports and forwarded diagnostic attachments.
