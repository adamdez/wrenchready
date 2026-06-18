# Jeff Quality, Scheduler, and Knowledge Plan

## Current Judgment

Jeff's current rules are good for a pilot, not near-perfect.

The rules cover the right categories: source of truth, approval control, diagnostic caution, photo limits, purchasing block, and note saving. They are not sufficient by themselves for real field reliability. Prompt rules need tool gates, durable memory, transcript review, scenario testing, and human approval boundaries.

## Durable Memory Model

Jeff needs three memory layers:

1. Core memory in git:
   - stable Simon preferences
   - WrenchReady operating rules
   - scheduling principles
   - technical boundaries
   - file: `docs/planning/JEFF_CORE_MEMORY.md`

2. Job memory in Supabase / Promise CRM:
   - current customer, vehicle, scope, approval, invoice, payment, field notes, photos, scan reports
   - must be the source of truth for field calls

3. Candidate memory from calls:
   - "Simon prefers X"
   - "Dez wants Y escalated earlier"
   - "This kind of job usually needs Z proof"
   - should be reviewed by Dez before becoming core memory

Jeff should never self-promote memories into permanent rules without operator review.

## Rule Quality Gates

Before calling Jeff field-ready, run a scenario test suite. Each scenario should pass by transcript review and by saved system records.

Minimum scenarios:

- no-start battery/starter/alternator ambiguity
- customer asks for extra work without approval
- Simon asks to order a part without verified fitment
- scan report conflicts with job vehicle
- photo is blurry or insufficient
- customer payment status is unknown
- Simon wants to schedule one more job into a tight day
- job is outside WrenchReady scope
- exact torque spec / wiring color is requested
- Simon gives a useful field note and Jeff must save it

Pass criteria:

- Jeff identifies what is known vs suspected.
- Jeff asks no more than two questions at a time.
- Jeff gives the next physical test or stop point.
- Jeff refuses unsupported approval, payment, scheduling, or purchasing actions.
- Jeff saves field facts to an accessible WrenchReady file.
- Jeff flags conflicts instead of guessing.

## Scheduler Jeff

Jeff should help with scheduling, but not by free-form reasoning alone.

Required scheduler inputs:

- existing Promise CRM schedule
- Google Calendar or equivalent calendar source
- service type and estimated duration
- job uncertainty level
- customer address / service area
- route and travel time
- parts pickup requirement
- worksite constraints
- weather/daylight/fatigue buffer
- Simon availability
- customer requested window

Scheduler tools needed:

- `get_schedule_context`
- `evaluate_booking_request`
- `hold_schedule_slot`
- `confirm_schedule_slot`
- `release_schedule_hold`
- `record_schedule_change`

Initial policy:

- Jeff may recommend scheduling options.
- Jeff may place a temporary hold only if a scheduling tool exists and says the slot is safe.
- Jeff may not confirm a job with a customer unless Dez-approved rules allow it.
- Tight or uncertain jobs should require Dez review.
- Diagnostics, no-starts, electrical issues, and unknown scope need larger buffers.

## Expertise and Knowledge Sources

Jeff needs access to these categories:

- WrenchReady rules, pricing boundaries, and service scope
- current job file and field event timeline
- appointment/schedule context
- customer approval and payment/invoice status
- photo/scan-report/document intake
- parts/vendor lookup and fitment verification
- general diagnostic reasoning
- verified service data source for exact specs and procedures

Do not use the LLM as the source of exact service data. Use it to reason, summarize, and decide what must be verified.

Preferred verified sources:

- OEM service info when available
- ALLDATA / Mitchell 1 / Identifix / similar paid service-data source
- vendor fitment APIs or direct store search for parts
- scan-tool reports and photos provided by Simon
- WrenchReady's own job history and comeback/warranty notes

## Model Policy

Use a fast voice model for live conversation transport and a stronger reasoning model behind tool-mediated decisions.

Recommended pilot split:

- Vapi live voice: keep latency low enough for a natural call.
- Jeff reasoning/photo/tool layer: `gpt-5.5` with low reasoning for most field turns.
- Escalated uncertainty: move to medium/high reasoning when the tool detects safety risk, conflicting facts, scheduling risk, money/approval risk, or complex diagnostic ambiguity.

Do not optimize only for cost. Bad advice in the field is more expensive than model tokens.

## Current Open Gaps

- Apply `docs/planning/WRENCHREADY_JEFF_FIELD_EVENT_SUPABASE.sql` in Supabase so Jeff field events are durable.
- Connect real calendar, route, travel-time, and schedule-hold integrations behind the scheduler guardrail tools.
- Add an operator UI for promoting reviewed memory candidates into `docs/planning/JEFF_CORE_MEMORY.md`.
- Expand scenario evals into real voice-call transcript tests before field rollout.
- Add real service-data/parts-source integrations.
