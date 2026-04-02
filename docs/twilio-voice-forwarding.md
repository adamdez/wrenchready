# Twilio voice forwarding + voicemail

This app exposes Twilio voice webhooks for call forwarding and voicemail.

## What it does

- Routes inbound calls from the Wrench Ready Twilio number to Simon's cell phone
- Presents the forwarded call from the Wrench Ready business number instead of the original caller's number
- Falls back to a short unavailable message if forwarding is not configured yet
- **Voicemail:** If Simon doesn't answer, the caller hears a greeting and can leave a message (up to 2 minutes). The recording link is sent via SMS to all configured notify phones.

## Endpoints

- `/api/twilio/voice` — Main voice webhook (configured in Twilio console)
- `/api/twilio/voicemail` — Dial action handler (plays greeting, records voicemail)
- `/api/twilio/voicemail/complete` — Recording callback (sends SMS notifications)

## Environment variables

Add these in Vercel for Production:

- `TWILIO_FORWARD_TO_PHONE`
  Simon's cell phone in E.164 format, for example `+15095551234`
- `TWILIO_CALLER_ID_NUMBER`
  Optional override for the caller ID Twilio uses when it dials Simon. If omitted, the app falls back to the public Wrench Ready phone number from `siteConfig`.
- `TWILIO_FORWARD_TIMEOUT_SECONDS`
  Optional ring timeout before Twilio stops trying the forwarded leg. Defaults to `20`.
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

## Caller ID note

For forwarded PSTN calls, Twilio can control the phone number used as caller ID on the forwarded leg, but not arbitrary text like `WrenchReady` directly from this app.

Reliable options:

- Save the Twilio number in Simon's contacts as `WrenchReady`
- Use Twilio Branded Calling or CNAM if you want carrier-supported business name presentation
