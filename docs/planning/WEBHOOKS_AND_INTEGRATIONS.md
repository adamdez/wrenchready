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
  - forwards call to operator phone

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

## Bottom line

Yes, there is enough set up now to move into live webhook-driven operations.

No, it is not fully live until:

- Supabase is configured
- Twilio is pointed at the new message and voicemail routes
- n8n has a real ops webhook destination configured
