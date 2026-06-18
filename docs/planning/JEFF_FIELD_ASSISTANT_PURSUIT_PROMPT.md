# Jeff Field Assistant Pursue Goal Prompt

## Goal

Build Jeff Field Assistant MVP through Phase 2 with day-one Photo Drop.

Jeff should become a callable WrenchReady field assistant for Simon that can read the current job context, accept field photos, talk through diagnostic problems, log field notes, and draft escalation or closeout actions. The first build must not purchase parts, authorize new work, promise customer-facing price changes, or move money.

## Operating Principle

Treat Jeff as a field operations product, not a voice demo.

The build is successful only if Simon can use it while actively working in the field. Clean APIs and neat code are not enough. The system must reduce typing, reduce repeated context, avoid stale job facts, and leave a better job record after the call.

## Scope For This Goal

Build:

- field event and current context structures
- active job lookup for field support
- current field context assembly
- field brief generation
- field note logging
- Jeff Photo Drop mobile upload page
- field photo upload/list/analyze tools
- approval/escalation draft creation
- closeout draft creation
- Vapi-compatible tool endpoints
- Jeff prompt and guardrails for the Vapi assistant
- local test fixtures for recent WrenchReady field scenarios
- verification that purchasing is blocked

Do not build:

- autonomous parts purchasing
- live vendor cart checkout
- direct customer price authorization
- automatic invoice creation without review
- raw Twilio Media Streams replacement for Vapi
- production-only vendor integrations

## Required Behavior

When Simon calls, Jeff should:

1. Identify the active job or ask for enough detail to select one.
2. Read the current field context before advising.
3. Summarize customer, vehicle, concern, authorized scope, stop points, parts status, invoice/payment status, and blockers.
4. Ask one or two targeted diagnostic questions.
5. Give a short next physical test or stop point.
6. Log the field note or call summary.
7. Ask for a Photo Drop upload when a visual detail matters, then read or inspect the latest attached photo.
8. Draft an escalation when approval, money, safety, fitment, or customer promise risk appears.
9. Draft closeout when Simon says the work is done.
10. Refuse purchase requests and explain that parts purchasing is approval-gated for a later phase.

## Source Of Truth

All channels must feed one job context.

For this MVP, file-backed fixtures and generated records are acceptable. The implementation should be shaped so the live source can later move to Supabase / Promise CRM records, object storage, and an event timeline table.

Every field interaction should become a field event with:

- id
- job id
- type
- channel
- timestamp
- sender
- summary
- extracted facts
- raw source reference
- confidence
- needs-review flag

## Minimum Tool Endpoints

Expose Vapi-compatible endpoints for:

- `get_active_field_job`
- `get_current_field_context`
- `get_field_brief`
- `record_field_note`
- `record_field_event`
- `record_field_photo_upload`
- `get_field_photos`
- `analyze_field_photo`
- `request_approval_or_escalation`
- `start_closeout`

Each endpoint should return JSON that a voice assistant can read back plainly.

## Guardrails

Jeff must not:

- invent exact vehicle specs, wiring colors, torque specs, or OEM procedures
- tell Simon to replace parts without testable evidence
- authorize extra work or price changes
- claim customer approval without written approval in context
- purchase, reserve, or order parts in this phase
- give customer-facing invoice/payment language without checking current status

If uncertain, Jeff should stop, state the uncertainty, and route to verification.

## Test Scenarios

Use recent WrenchReady-style scenarios:

- Ryan Ram no-power / electrical diagnostic
- Tammy Chrysler battery or no-start
- Kendra Subaru battery

Verify:

- active job lookup works
- current context includes invoice/payment and stop points
- field notes write into the timeline
- conflicting facts create review flags
- closeout drafts identify missing invoice/proof facts
- photo upload attaches an image to the current context
- purchase requests are refused

## Definition Of Done

The first build is done when:

- the pursuit prompt exists in repo docs
- Vapi tool endpoint specs are implemented as route handlers
- field context can be read and updated through local tests
- Simon has a mobile Photo Drop path at `/jeff/photo-drop`
- Simon's call flow can be simulated through API requests
- Jeff produces safe, short, field-usable responses
- purchasing is blocked by design
- the plan docs point to the new build artifacts

## Build Artifacts

- Assistant config and tool catalog: `GET /api/al/wrenchready/jeff/tools`
- Active job lookup: `POST /api/al/wrenchready/jeff/tools/get-active-field-job`
- Current context packet: `POST /api/al/wrenchready/jeff/tools/get-current-field-context`
- Field brief: `POST /api/al/wrenchready/jeff/tools/get-field-brief`
- Field note logging: `POST /api/al/wrenchready/jeff/tools/record-field-note`
- Generic field event logging: `POST /api/al/wrenchready/jeff/tools/record-field-event`
- Jeff Photo Drop: `GET /jeff/photo-drop`
- Field photo upload: `POST /api/al/wrenchready/jeff/photos/upload`
- Field photo tool upload: `POST /api/al/wrenchready/jeff/tools/record-field-photo-upload`
- Field photo list: `POST /api/al/wrenchready/jeff/tools/get-field-photos`
- Field photo analysis: `POST /api/al/wrenchready/jeff/tools/analyze-field-photo`
- Approval/escalation draft: `POST /api/al/wrenchready/jeff/tools/request-approval-or-escalation`
- Closeout draft: `POST /api/al/wrenchready/jeff/tools/start-closeout`
- Purchase block: `POST /api/al/wrenchready/jeff/tools/purchase-or-reserve-part`

## Smoke Test

After the Next app is running locally, run:

```bash
npm run verify:jeff
npm run verify:jeff:vapi
```

The smoke test checks:

- Jeff tool catalog loads
- Tammy Chrysler active-job lookup works
- a spoken field note writes into the timeline
- a field photo upload writes into the timeline and current context
- a conflicting scan report vehicle is flagged
- the current context sees the latest events
- parts purchasing returns blocked status
- the Vapi server URL handles `assistant-request`, `tool-calls`, and transcript review payloads
