## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Twilio voice forwarding

The incoming-call webhook for the business phone number lives at `/api/twilio/voice`.

Setup details are documented in `docs/twilio-voice-forwarding.md`.

## Deploy on Vercel

Deploy through the linked Vercel project for `wrenchreadymobile.com`, then point the Twilio number's voice webhook to the production `/api/twilio/voice` endpoint.
