# WrenchReady Alert Proof

Use this packet before treating internal Slack or SMS alerts as live.

```powershell
node scripts/wrenchready-alert-proof.mjs --markdown
```

For local proof against this branch:

```powershell
npm run build
npm run start -- -p 3122
node scripts/wrenchready-alert-proof.mjs --base-url "http://127.0.0.1:3122" --markdown
```

The script calls:

```text
GET /api/al/wrenchready/alert-proof
```

It verifies:

- sample new-appointment alert text can be generated
- sample high-risk inbound alert text can be generated
- sample tomorrow-at-risk promise alert text can be generated
- Slack alert delivery is configured or held
- SMS alert delivery is configured or held

This packet is read-only. It must not send Slack alerts, SMS alerts, customer messages, review requests, payment requests, or webhook events.

Slack and SMS alerts should stay internal only. Enable them only after Adam approves the exact channel/webhook/phone target and one supervised test alert.
