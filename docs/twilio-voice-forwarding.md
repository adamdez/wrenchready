# Twilio voice forwarding + Jeff fallback

This app exposes Twilio voice webhooks for screened call forwarding, Jeff fallback, and last-resort voicemail.

## What it does

- Routes inbound calls from the Wrench Ready Twilio number to Adam or the configured operator phone
- Presents the forwarded call from the Wrench Ready business number instead of the original caller's number
- Privately asks the operator to press a key before the customer is connected
- Prevents the operator's personal voicemail from answering WrenchReady customer calls
- If the operator does not answer or does not press a key, routes the caller to Jeff when `TWILIO_JEFF_FALLBACK_PHONE` is configured
- Falls back to a short unavailable message if forwarding is not configured yet
- **Last-resort voicemail:** If Jeff fallback is not configured or cannot answer, the caller hears a WrenchReady voicemail greeting and can leave a message. The recording link is sent via SMS to all configured notify phones.

## Endpoints

- `/api/twilio/voice` — Main voice webhook (configured in Twilio console)
- `/api/twilio/voice/screen` — Private operator call-screen prompt
- `/api/twilio/voice/screen/accept` — Operator accepted-call callback
- `/api/twilio/voice/fallback` — Routes missed/unaccepted calls to Jeff or last-resort voicemail
- `/api/twilio/voicemail` — Last-resort voicemail handler
- `/api/twilio/voicemail/complete` — Recording callback (sends SMS notifications)

## Environment variables

Add these in Vercel for Production:

- `TWILIO_FORWARD_TO_PHONE`
  Adam/operator cell phone in E.164 format, for example `+15095551234`.
- `TWILIO_CALLER_ID_NUMBER`
  Optional override for the caller ID Twilio uses when it dials the operator or Jeff. If omitted, the app falls back to the public Wrench Ready phone number from `siteConfig`.
- `TWILIO_FORWARD_TIMEOUT_SECONDS`
  Optional ring timeout before Twilio stops trying the operator leg. Defaults to `18`.
- `TWILIO_FORWARD_SCREENING_ENABLED`
  Optional. Defaults to `true`. When enabled, the operator must press a key before Twilio connects the caller. Leave this enabled to avoid the operator's personal voicemail taking customer calls.
- `TWILIO_FORWARD_SCREEN_TIMEOUT_SECONDS`
  Optional. Seconds the operator has to press a key after answering. Defaults to `4`.
- `TWILIO_JEFF_FALLBACK_PHONE`
  Dedicated customer-facing Jeff/Vapi phone number in E.164 format. When set, missed or unaccepted calls go to Jeff instead of personal voicemail.
- `TWILIO_JEFF_FALLBACK_TIMEOUT_SECONDS`
  Optional timeout for the Jeff fallback leg. Defaults to `55`.
- `TWILIO_ACCOUNT_SID`
  Twilio Account SID (required for voicemail SMS notifications).
- `TWILIO_AUTH_TOKEN`
  Twilio Auth Token (required for voicemail SMS notifications).
- `TWILIO_VOICEMAIL_NOTIFY_PHONES`
  Comma-separated list of phone numbers to receive voicemail SMS notifications, in E.164 format. Example: `+15099511874,+15098225460`

## Twilio console setup

In the Twilio number configuration:

1. Open the Wrench Ready phone number.
2. Under voice configuration, set the incoming call webhook to:
   `https://wrenchreadymobile.com/api/twilio/voice`
3. Use HTTP `POST`.
4. Save the number configuration.

## Live test checklist

1. Confirm `TWILIO_FORWARD_TO_PHONE` is Adam's cell.
2. Confirm `TWILIO_FORWARD_SCREENING_ENABLED=true`.
3. Confirm `TWILIO_JEFF_FALLBACK_PHONE` is the dedicated customer-facing Jeff/Vapi number, not the internal Simon tech line unless that is intentionally being tested.
4. Call the public WrenchReady number from a non-operator phone.
5. Let Adam's phone ring through without pressing a key. The caller should hear the normal ringback, then the Jeff handoff message, then Jeff should answer.
6. Repeat the call and press a key on Adam's phone. The customer should connect to Adam and should not reach Jeff.
7. Temporarily unset or misconfigure `TWILIO_JEFF_FALLBACK_PHONE` only in a non-production test if you need to verify last-resort voicemail.

## Caller ID note

For forwarded PSTN calls, Twilio can control the phone number used as caller ID on the forwarded leg, but not arbitrary text like `WrenchReady` directly from this app.

Reliable options:

- Save the Twilio number in Simon's contacts as `WrenchReady`
- Use Twilio Branded Calling or CNAM if you want carrier-supported business name presentation
