# Webhooks And Integrations

## What webhooks are for

Webhooks are event handoffs.

They let one system tell another system that something just happened, right when it happens.

For WrenchReady, they matter because the business will break down if:

- website requests live in one place
- phone calls live in Twilio
- texts live in Twilio
- reminders live in n8n
- ops visibility lives somewhere else

Webhooks are how those systems stay in sync without manual copy-paste.

## What they should do in this stack

At WrenchReady, webhooks should be used to:

- push new website requests into the ops workflow
- push Twilio texts and voicemail callbacks into the same inbound queue
- notify n8n when a new inbound or promise event happens
- trigger confirmation texts, follow-up tasks, and internal alerts
- keep AL and ops dashboards updated without making humans re-enter data

## Current state

There is now enough structure to support real webhook-driven operations, but not enough environment configuration yet to call it fully live.

### Already in place

- website request intake posts to `/api/appointments`
- intake is evaluated for service lane, territory, readiness risk, and promise fit
- inbound records can be created in the Promise CRM
- manual inbound creation exists
- inbound can be promoted into a promise
- inbound and promise records can now be updated from the ops UI
- Twilio voice forwarding exists
- Twilio voicemail handling exists
- Twilio SMS inbound route now exists at `/api/twilio/sms`
- voicemail completion now creates inbound records too
- a structured ops webhook sender exists in code

### Still needed to be fully live

- real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `wrenchready_inbound` and `wrenchready_promise` tables applied in Supabase
- `WR_OPS_WEBHOOK_URL` pointed at an n8n webhook or equivalent ops endpoint
- Twilio number configured for both voice and messaging webhooks
- decision on whether `APPOINTMENT_WEBHOOK_URL` is legacy-only or should be retired
- later: auth and permissions for internal ops routes

## Recommended webhook map

### Website

- public request form
  - endpoint: `/api/appointments`
  - creates inbound record
  - returns intake evaluation to UI
  - notifies ops webhook with event `website_appointment_request`

### Twilio messaging

- inbound SMS webhook
  - endpoint: `/api/twilio/sms`
  - creates inbound record with source `text`
  - sends ops webhook event `twilio_sms_inbound`

### Twilio voice

- voice webhook
  - endpoint: `/api/twilio/voice`
  - forwards call to operator phone with private press-to-accept screening
  - routes missed or unaccepted calls to customer-facing Jeff when `TWILIO_JEFF_FALLBACK_PHONE` is configured
  - falls back to WrenchReady voicemail only if Jeff fallback is not configured or cannot answer

- voicemail complete webhook
  - endpoint: `/api/twilio/voicemail/complete`
  - sends SMS notification
  - creates inbound record with source `voicemail`
  - sends ops webhook event `twilio_voicemail_received`

### Internal ops

- manual inbound creation
  - endpoint: `/api/al/wrenchready/inbound`
  - sends ops webhook event `manual_inbound_created`

- promise creation from inbound
  - endpoint: `/api/al/wrenchready/promises`
  - sends ops webhook event `promise_created`

- inbound updates from ops
  - endpoint: `/api/al/wrenchready/inbound/[id]`
  - sends ops webhook event `inbound_updated`

- promise updates from ops
  - endpoint: `/api/al/wrenchready/promises/[id]`
  - sends ops webhook event `promise_updated`

## Recommended event payload examples

### Website request

```json
{
  "event": "website_appointment_request",
  "business": "wrenchready",
  "payload": {
    "fullName": "Taylor Cole",
    "phone": "+15095550111",
    "vehicle": "2017 Honda Civic",
    "serviceNeeded": "Check engine light diagnostic",
    "intakeEvaluation": {
      "serviceLane": "Check-engine / diagnostic evaluation",
      "territory": "South Hill",
      "readinessRisk": "high",
      "promiseFit": "review"
    }
  }
}
```

### Twilio SMS

```json
{
  "event": "twilio_sms_inbound",
  "business": "wrenchready",
  "payload": {
    "from": "+15095550111",
    "body": "Battery dead at my office parking lot",
    "inboundId": "uuid"
  }
}
```

### Promise update

```json
{
  "event": "promise_updated",
  "business": "wrenchready",
  "payload": {
    "promiseId": "uuid",
    "owner": "Dez",
    "status": "tomorrow-at-risk",
    "readinessRisk": "high",
    "followThroughDueAt": "2026-04-13T18:00:00-07:00"
  }
}
```

## Recommended n8n usage

Point `WR_OPS_WEBHOOK_URL` to n8n when ready.

That lets n8n:

- alert Dez when a high-risk inbound arrives
- create follow-up tasks
- send confirmation texts
- create daily briefings
- escalate if no one touches a high-risk inbound quickly

The rule:

- system of record owns the truth
- webhook automation reacts to the truth
- n8n should orchestrate, not become the source of truth

### Jeff field assistant

The Simon/Jeff field assistant must follow the same rule.

- phone calls, texts, photos, uploads, diagnostic emails, vendor confirmations, approvals, part orders, invoice updates, and payment events are channels
- all of them must write into the same WrenchReady job record and field event timeline
- Jeff should read the current field context packet before replying to Simon
- if channel facts conflict, Jeff should pause and ask for verification instead of guessing

This prevents Jeff from being aware of the phone conversation but blind to the scan-tool email, or aware of an MMS photo but blind to the latest invoice/payment status.

Phase 2 Jeff tool endpoints now live under:

- `GET /api/al/wrenchready/jeff/vapi/config`
- `POST /api/al/wrenchready/jeff/vapi/server`
- `GET /api/al/wrenchready/jeff/pilot/reviews`
- `GET /api/al/wrenchready/jeff/session`
- `POST /api/al/wrenchready/jeff/session`
- `GET /api/al/wrenchready/jeff/session/current`
- `GET /api/al/wrenchready/jeff/tools`
- `POST /api/al/wrenchready/jeff/tools/get-active-field-job`
- `POST /api/al/wrenchready/jeff/tools/get-current-field-context`
- `POST /api/al/wrenchready/jeff/tools/get-field-brief`
- `POST /api/al/wrenchready/jeff/tools/record-field-note`
- `POST /api/al/wrenchready/jeff/tools/record-field-event`
- `POST /api/al/wrenchready/jeff/tools/propose-core-memory-update`
- `POST /api/al/wrenchready/jeff/tools/record-field-photo-upload`
- `POST /api/al/wrenchready/jeff/tools/get-field-photos`
- `POST /api/al/wrenchready/jeff/tools/analyze-field-photo`
- `POST /api/al/wrenchready/jeff/tools/get-schedule-context`
- `POST /api/al/wrenchready/jeff/tools/evaluate-booking-request`
- `POST /api/al/wrenchready/jeff/tools/request-approval-or-escalation`
- `POST /api/al/wrenchready/jeff/tools/start-closeout`
- `POST /api/al/wrenchready/jeff/tools/purchase-or-reserve-part`
- `GET /api/al/wrenchready/jeff/sync`
- `POST /api/al/wrenchready/jeff/sync`
- `GET /api/al/wrenchready/jeff/files`
- `GET /api/al/wrenchready/jeff/files/[jobId]`
- `GET /ops/jeff`
- `GET /jeff`
- `GET /jeff/docs`
- `GET /jeff/photo-drop`
- `POST /api/al/wrenchready/jeff/photos/upload`

`purchase-or-reserve-part` is intentionally blocked in the MVP. It exists so Jeff can safely refuse buying requests and explain the approval gates instead of improvising.

The `/jeff` surface is Simon's installable phone hub. It links to Jeff's call number, session-aware Photo Drop, and quick internal field references. Vapi call callbacks create a short-lived live Jeff session; Photo Drop can attach uploads to that session first and the job second. If the job is unknown, the photo stays in a session inbox until Jeff or Simon confirms the job.

The Photo Drop upload path is the day-one field media path. MMS can come later after 10DLC/messaging setup is approved; it should not block Simon from sending pictures during the first Jeff pilot.

Photo Drop image bytes are stored locally at `.data/jeff/photos`, with metadata in `.data/jeff/photos/index.json`. Live Jeff sessions, Vapi call-review summaries, and local fallback field events are stored at `.data/jeff/sessions.json`, `.data/jeff/pilot-reviews.json`, and `.data/jeff/field-events.json`. This makes the local pilot survive process restarts better than runtime memory. The local root can be overridden with `JEFF_LOCAL_DATA_DIR`.

Jeff field events are now local-first with a Supabase mirror when `SUPABASE_URL` and a write-capable Supabase key are configured. Every field-event write updates the local `.data/jeff/field-events.json` mirror when running locally. On Vercel serverless, the fallback mirror uses `/tmp/wrenchready-jeff` so routes do not fail on a read-only app filesystem; that Vercel fallback is not durable across deployments or instances. Reads pull Supabase events back into the local mirror, and `/api/al/wrenchready/jeff/sync` pushes local-only events back to Supabase. The Supabase migrations are `supabase/migrations/20260617143001_create_wrenchready_jeff_field_event.sql` and `supabase/migrations/20260617143023_create_wrenchready_jeff_durable_memory.sql`. A daily Vercel Cron repair run calls the sync route; set `CRON_SECRET` in production so Vercel Cron can authenticate. Local/Codex repair runs can call `npm run sync:jeff -- http://localhost:3001` while the local dev server is running.

Production still needs real object storage for field photo bytes and database-backed session/call review storage before field photos, call transcripts, and session state should be treated as durable across deployments or serverless instances.

The Jeff field file path is the day-one operator review path. Jeff writes a visible note back to the Promise CRM record and is now shaped to write structured events into `public.wrenchready_jeff_field_event`; apply `docs/planning/WRENCHREADY_JEFF_FIELD_EVENT_SUPABASE.sql` before treating the event timeline as durable in production.

The real-call pilot setup and call scripts live in `docs/planning/JEFF_REAL_CALL_PILOT_RUNBOOK.md`.

## Bottom line

Yes, there is enough set up now to move into live webhook-driven operations.

No, it is not fully live until:

- Supabase is configured
- Twilio is pointed at the new message and voicemail routes
- n8n has a real ops webhook destination configured
