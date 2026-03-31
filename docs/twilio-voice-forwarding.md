# Twilio voice forwarding

This app exposes a Twilio voice webhook at `/api/twilio/voice`.

## What it does

- Routes inbound calls from the Wrench Ready Twilio number to Simon's cell phone
- Presents the forwarded call from the Wrench Ready business number instead of the original caller's number
- Falls back to a short unavailable message if forwarding is not configured yet

## Environment variables

Add these in Vercel for Production:

- `TWILIO_FORWARD_TO_PHONE`
  Simon's cell phone in E.164 format, for example `+15095551234`
- `TWILIO_CALLER_ID_NUMBER`
  Optional override for the caller ID Twilio uses when it dials Simon. If omitted, the app falls back to the public Wrench Ready phone number from `siteConfig`.
- `TWILIO_FORWARD_TIMEOUT_SECONDS`
  Optional ring timeout before Twilio stops trying the forwarded leg. Defaults to `20`.

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
