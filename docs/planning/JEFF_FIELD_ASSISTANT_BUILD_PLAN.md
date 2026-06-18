# Jeff Field Assistant Build Plan

## Best Approach

Build Jeff as a field operations product, not as a voice demo.

The right path is:

1. Plan the human workflow first.
2. Review the plan against real field friction.
3. Build in small phases with review gates.
4. Let Jeff take real-world actions only after the source of truth, approvals, and rollback paths are proven.

The first reliable win is not autonomous buying. The first reliable win is that Simon can call Jeff, talk through a problem, have Jeff read the current job context, log the field note, and tee up closeout without Simon typing a long update.

## Product Standard

Jeff is successful only if Simon can use it while actively working.

Clean code is not enough. A successful version must:

- reduce Simon's typing
- avoid making Simon repeat context
- keep phone, SMS, MMS, upload, diagnostic email, vendor, approval, invoice, and payment facts in one job record
- give short next physical actions
- stop before money, approval, safety, or fitment risks
- leave Dez and Simon with a cleaner job record than they had before the call

## Tooling Gaps To Close

- Install and authenticate Google Cloud CLI (`gcloud`) for the WrenchReady Google account/project so future API enablement, API-key audits, IAM checks, and deployment diagnostics can be done from repeatable commands instead of fragile browser-only setup.
- Keep browser access as a fallback for payment, account-activation, and consent screens that require human review.

## Phase 0: Plan And Field Review

Goal:

Create the operating plan before building irreversible systems.

Outputs:

- confirmed Simon field scenarios
- confirmed Jeff channel map
- confirmed source-of-truth rule
- confirmed action authority ladder
- confirmed purchasing policy draft
- confirmed field acceptance tests

Review questions:

- What does Simon do when his hands are occupied?
- What can Simon say in one sentence that should become structured job data?
- What should Jeff never do without Dez or customer approval?
- Which facts must Jeff read back before any part order?
- What counts as "good enough" for a first field test?

Do not build purchasing in this phase.

## Phase 1: Core Field Context

Goal:

Build the shared context layer that all channels write into and Jeff reads from.

Build:

- field event timeline
- current context packet
- active job lookup
- field note logging
- field brief generation
- conflict flags

Minimum tools:

- `get_active_field_job`
- `get_current_field_context`
- `get_field_brief`
- `record_field_note`
- `record_field_event`

Acceptance tests:

- A simulated phone note appears in the job timeline.
- A simulated payment/invoice update appears before Jeff answers.
- A conflicting vehicle fact is flagged instead of guessed through.
- Jeff can summarize customer, vehicle, concern, authorization, stop points, parts status, and payment status in under 30 seconds.

Review gate:

Simon should not have to remember what came in from another channel.

## Phase 2: Voice MVP

Goal:

Make Jeff callable from a real phone, with a day-one photo path Simon can use during the call.

Build:

- Twilio field support number
- Vapi assistant
- Jeff prompt and guardrails
- OpenAI reasoning layer
- tool calls into WrenchReady backend
- call transcript capture
- note logging from the call
- Jeff Photo Drop at `/jeff/photo-drop`
- photo upload, photo listing, and photo analysis tools
- Dez escalation draft when approval is needed

What Jeff can do:

- answer Simon
- identify the active job
- read a job brief
- talk through diagnostic reasoning
- tell Simon the next test or stop point
- log a field note
- prepare an escalation or closeout draft

What Jeff cannot do yet:

- buy parts
- promise customer price changes
- authorize extra work
- bypass service-data verification for exact specs

Acceptance tests:

- Simon can call from his phone and reach Jeff.
- Jeff can find the active test job.
- Jeff gives one or two targeted diagnostic questions, not a lecture.
- Jeff logs the call summary to the job.
- Simon can upload a photo from his phone and Jeff sees it in current context.
- Jeff refuses or escalates when asked to exceed authority.

Review gate:

The voice call plus Photo Drop must feel faster than texting Dez a messy update.

## Phase 3: Text, Photo, Upload, And Email Intake

Goal:

Let Simon send Jeff the evidence that voice cannot carry.

Status note:

The Jeff Message page is now the primary companion surface because it matches normal phone behavior: type, dictate, attach/take photos, attach reports, and share location from one place. Photo Drop remains as a backup/deep-link upload path. Phase 3 still owns optional carrier SMS/MMS, inbound email parsing, durable media storage, and richer report processing.

Build:

- Twilio SMS intake
- Twilio MMS photo intake
- field upload link
- inbound email parser for scanner reports and forwarded attachments
- media/report attachment records
- image/report summaries in the context packet

What Jeff can do:

- ask Simon to text a photo
- send a one-tap upload link
- recognize that a scan-tool email arrived
- summarize the latest photo/report in the next call response
- flag bad photos, mismatched VINs, or unclear attachments

Acceptance tests:

- Simon texts a photo and Jeff sees it on the next response.
- Simon emails a scan report and Jeff sees it during the same field workflow.
- A blurry photo gets a useful retake request.
- A report with the wrong VIN is quarantined for review.

Review gate:

Jeff must not have separate memories for phone, text, photos, and email.

## Phase 4: Closeout, Invoice, And Payment Readiness

Goal:

Turn the field call into a near-instant closeout path.

Build:

- closeout readiness tool
- invoice-readiness checklist
- Stripe/payment-link status lookup
- customer closeout message draft
- Dez notification when invoice/payment is blocked

What Jeff can do:

- ask Simon for final work completed
- capture parts used and proof needed
- identify missing invoice facts
- tell Simon whether payment link is ready
- draft the final closeout message

Acceptance tests:

- Simon says "job done" and Jeff starts closeout.
- Jeff identifies missing labor/parts/proof before invoice generation.
- Jeff knows whether the customer has a deposit, balance, or unpaid invoice.
- Payment status changes are visible before Jeff speaks to Simon again.

Review gate:

The system should make "I'll send the invoice later" rare.

## Phase 5: Parts Sourcing, Draft Only

Goal:

Let Jeff find and compare parts without placing orders.

Build:

- nearby parts search
- fitment confidence record
- vendor/store comparison
- draft cart or ready-to-buy summary
- margin impact note

What Jeff can do:

- identify likely part needed from diagnostic evidence
- verify vehicle fitment where data is available
- compare nearby vendors
- prepare a cart or order summary
- read back part number, store, price, core charge, pickup estimate, and risk

What Jeff cannot do yet:

- complete the purchase

Acceptance tests:

- Jeff can produce two or three part options with confidence notes.
- Jeff refuses to source from incomplete vehicle data.
- Jeff flags margin risk when retail parts cost makes the job weak.
- Jeff creates a ready-to-approve summary for Dez or Simon.

Review gate:

Jeff should move the order closer, but not create financial risk.

## Phase 6: Approval-Gated Purchasing

Goal:

Allow Jeff to reserve or buy parts only inside written rules.

Prerequisites:

- reseller permit or vendor account path confirmed
- vendor payment method configured safely
- fitment check proven
- customer authorization captured
- maximum spend policy written
- delegated authority policy written
- readback language tested
- job-record writeback tested

Build:

- `prepare_parts_cart`
- `purchase_or_reserve_part`
- confirmation writeback
- failure fallback to Dez

Required readback:

- customer/job
- vehicle/VIN or exact configuration
- vendor and pickup store
- part name and part number
- fitment confidence
- total price, tax/fees, and core charge
- pickup estimate
- customer authorization status
- purchase authority and maximum approved amount

Acceptance tests:

- Jeff refuses purchase if customer authorization is missing.
- Jeff refuses purchase if fitment confidence is low.
- Jeff refuses purchase if the total exceeds delegated authority.
- Jeff logs the confirmation number, receipt, core charge, pickup store, and invoice impact.

Review gate:

No real money moves unless Jeff can prove why it was allowed.

## Review Plan

Use these reviewers before full production use:

- Simon, as the field technician: tests whether the call flow actually helps under pressure.
- Dez, as operator/owner: tests approval, pricing, customer promises, and business risk.
- Senior mechanic advisor: checks diagnostic posture, unsafe advice, and when service data is required.
- Service writer or shop manager: checks estimate, authorization, closeout, and payment workflow.
- Parts/vendor advisor: checks fitment, core charges, pickup realities, reseller permit, and margin discipline.
- Voice AI engineer: checks Vapi/Twilio latency, call routing, tool failure handling, and transcript quality.
- Backend/source-of-truth engineer: checks event timeline, context packet, idempotency, logging, and audit trails.
- Accounting/tax advisor: checks reseller permit, sales tax handling, parts markup, and invoice requirements.
- Security/privacy reviewer: checks customer data, call transcripts, payment boundaries, and tool permissions.

Likely expert suggestions:

- start with advice and logging before purchasing
- keep one job record as the source of truth
- make every action reversible until authority is proven
- require readback before money moves
- record why Jeff chose a diagnostic path or refused action
- separate "find the part" from "buy the part"
- test on real recent jobs before adding more channels
- measure whether Simon actually uses it without cleanup

## Failure Modes To Watch

- Jeff sounds smart but cannot see the latest job state.
- Simon has to repeat facts from text, email, or photos.
- Jeff gives a long explanation instead of a next test.
- Jeff treats uncertain fitment as confirmed fitment.
- Jeff creates invoices or payment links with stale numbers.
- Jeff buys parts without written authorization or margin awareness.
- Dez has to manually reconcile transcripts, photos, reports, and invoices after the job.

If these happen, the build should pause and the plan should be corrected before adding more automation.

## Pursue Goal Build-Out

Once this plan is approved, the first build goal should be:

Build Jeff Field Assistant MVP through Phase 2, with Phase 1 source-of-truth tools and a callable Vapi/Twilio voice assistant that can identify a test job, read current context, provide diagnostic coaching, log field notes, and draft escalation/closeout actions without purchasing.

Do not include autonomous parts purchasing in the first goal.

Suggested first implementation tasks:

1. Add field event and context packet data structures.
2. Add WrenchReady API endpoints for active job, field brief, current context, and field note logging.
3. Add Vapi tool schemas and Jeff system prompt.
4. Wire Twilio/Vapi field number instructions.
5. Add local test fixtures for Ryan Ram, Tammy Chrysler, and Kendra Subaru field scenarios.
6. Run simulated calls/tool calls before a real Simon test.
7. Review transcripts and revise prompt/tools.

## Definition Of Done For The First Build

The first build is done when:

- Simon can call Jeff from a phone.
- Jeff can identify or ask for the active job.
- Jeff reads the current job context before advising.
- Jeff gives short diagnostic next steps.
- Jeff logs the call summary and field notes.
- Jeff drafts escalation or closeout actions when needed.
- Jeff refuses money, approval, and purchase actions outside authority.
- Dez can review what happened without reconstructing it from scattered channels.

## MVP Build Artifacts

The Phase 2 build contract is captured in `docs/planning/JEFF_FIELD_ASSISTANT_PURSUIT_PROMPT.md`.

The Vapi-compatible tool catalog is exposed at:

- `GET /api/al/wrenchready/jeff/tools`

Tool endpoints live under:

- `/api/al/wrenchready/jeff/tools/get-active-field-job`
- `/api/al/wrenchready/jeff/tools/get-current-field-context`
- `/api/al/wrenchready/jeff/tools/get-field-brief`
- `/api/al/wrenchready/jeff/tools/record-field-note`
- `/api/al/wrenchready/jeff/tools/record-field-event`
- `/api/al/wrenchready/jeff/tools/record-field-photo-upload`
- `/api/al/wrenchready/jeff/tools/get-field-photos`
- `/api/al/wrenchready/jeff/tools/analyze-field-photo`
- `/api/al/wrenchready/jeff/tools/request-approval-or-escalation`
- `/api/al/wrenchready/jeff/tools/start-closeout`
- `/api/al/wrenchready/jeff/tools/purchase-or-reserve-part`

`purchase-or-reserve-part` is intentionally blocked in this MVP so Vapi can refuse real buying requests instead of improvising.

The Simon mobile photo surface is:

- `/jeff/photo-drop`

The multipart phone upload endpoint is:

- `POST /api/al/wrenchready/jeff/photos/upload`

Photo Drop works as a field pilot path now. Durable production storage for photos/PDFs still needs to be added before this becomes the long-term archive.

Run `npm run verify:jeff` against a running local app to exercise the Phase 2 tool flow.

The real-phone pilot runbook lives in `docs/planning/JEFF_REAL_CALL_PILOT_RUNBOOK.md`.
