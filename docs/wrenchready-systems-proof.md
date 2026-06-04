# WrenchReady Systems Proof

Use this packet before treating review capture, internal alerts, payments, text, or the Promise CRM spine as live.

## Proof Command

```bash
node scripts/wrenchready-systems-proof.mjs --markdown
```

The systems route reads server-side app env. To verify the Google review destination before production env is updated, run the local app server with the verified public review URL, then point this proof script at that local server.

```powershell
$env:WR_GOOGLE_REVIEW_URL="https://www.google.com/search?kgmid=/g/11nblfp_kv&q=WrenchReady+Mobile#lrd=0xa91da132a44e7325:0x5931ba3271921a7d,3,,,,"
$env:NEXT_PUBLIC_WR_GOOGLE_REVIEW_URL=$env:WR_GOOGLE_REVIEW_URL
npm run build
npm run start -- -p 3121
node scripts/wrenchready-systems-proof.mjs --base-url "http://127.0.0.1:3121" --markdown
```

The script calls:

```text
GET /api/al/wrenchready/systems
```

## What It Proves

- whether Promise CRM storage and the ops webhook spine are ready
- whether text outbound is held or ready
- whether email outbound has a configured delivery path
- whether the Google review destination URL is configured
- whether internal Slack alerts are enabled with a webhook target
- whether payment and BNPL surfaces need provisioning

## Guardrails

This packet is read-only. It must not send Slack alerts, review requests, customer messages, payment requests, or webhook events.

Treat Slack as internal review-packet and urgent-ops visibility only until Adam approves a specific target channel and behavior.

For deeper internal alert proof, run `node scripts/wrenchready-alert-proof.mjs --markdown`. That packet validates sample alert text and held/ready state without sending Slack, SMS, or webhook events.

Treat the review loop as configured only when the packet says `Google review destination` is `ready`. Do not invent or guess a review URL.

Verified review destination as of 2026-06-04:

```text
https://www.google.com/search?kgmid=/g/11nblfp_kv&q=WrenchReady+Mobile#lrd=0xa91da132a44e7325:0x5931ba3271921a7d,3,,,,
```

Evidence: Chrome-loaded Google Business Profile for `WrenchReady Mobile` showed `3 Google reviews`, phone `(509) 309-0617`, Maps profile CID `0x5931ba3271921a7d` / `ludocid=6427122869050940029`, and clicking `Write a review` changed the profile URL to the `#lrd=0xa91da132a44e7325:0x5931ba3271921a7d,3,,,,` review form target.

Local proof on 2026-06-04:

- `npm run build` succeeded after clearing stale `.next` output.
- `node scripts/wrenchready-systems-proof.mjs --base-url "http://127.0.0.1:3121" --markdown` returned `READY Google review destination` when the local server was started with the verified review URL env.
