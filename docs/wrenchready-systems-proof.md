# WrenchReady Systems Proof

Use this packet before treating review capture, internal alerts, payments, text, or the Promise CRM spine as live.

## Proof Command

```bash
node scripts/wrenchready-systems-proof.mjs --markdown
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

Treat the review loop as configured only when the packet says `Google review destination` is `ready`. Do not invent or guess a review URL.
