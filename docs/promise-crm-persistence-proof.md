# Promise CRM Persistence Proof

Use this when deciding whether WrenchReady Promise CRM is live Supabase storage or only demo/runtime fallback.

## Proof Command

```bash
node scripts/promise-crm-persistence-proof.mjs --markdown
```

The script calls:

```text
GET /api/al/wrenchready/persistence-proof
```

## What Counts As Live

Promise CRM should be treated as live storage only when the packet says:

- `Mode: live-supabase`
- `Credential kind: service-role` or `Credential kind: secret`
- both `wrenchready_inbound` and `wrenchready_promise` are reachable

Anything else is not enough proof for customer-facing operations:

- `demo-fallback`: Supabase URL or credential is missing.
- `configured-unreachable`: env exists, but the tables are missing or not reachable.
- `read-only-supabase-risk`: tables can be read, but only anon/publishable credentials are visible; do not trust writes.

## Guardrails

This proof is read-only. It must not create, update, migrate, delete, message customers, charge cards, or change live records.

Before relying on live customer operations, run one supervised non-customer test record after Adam approves the exact test.
