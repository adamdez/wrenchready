# WrenchReady Outbound Proof

Use this packet to inspect closeout recap, review request, and maintenance reminder drafts without sending anything.

```powershell
node scripts/wrenchready-outbound-proof.mjs --markdown
```

For local proof against this branch:

```powershell
npm run build
npm run start -- -p 3123
node scripts/wrenchready-outbound-proof.mjs --base-url "http://127.0.0.1:3123" --markdown
```

The script calls:

```text
GET /api/al/wrenchready/outbound
```

It reports:

- total outbound draft queue count
- send-ready, draft-only, and held counts
- recap-ready, review-ready, and reminder-ready counts
- recent delivered/responded/converted/failed counts
- first visible outbound draft items and transport next step

This packet is read-only. It must not call `POST` or `PATCH`, send customer messages, send review requests, create payment requests, update records, or fire webhooks.
