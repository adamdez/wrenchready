# Jeff Red Team Review

Date: 2026-06-17

Scope: Jeff mobile hub, Photo Drop, Vapi server callback, tool routes, local pilot storage, field files, scheduling guardrails, parts/purchase guardrails, transcript review, and field UX.

## Red Team Roles Simulated

- Senior diagnostic mechanic
- Mobile field operator
- Service advisor / shop ops
- AI voice-agent engineer
- Security and privacy engineer
- Integration and reliability engineer
- Field UX reviewer
- Payments and invoicing operator
- Compliance reviewer
- Adversarial QA tester

## Findings And Mitigations Completed

1. Protected Jeff tool and Vapi routes failed open when `JEFF_FIELD_ASSISTANT_TOOL_SECRET` was missing.
   - Mitigation: production now fails closed if the tool secret is missing.
   - Mitigation: secret comparison now uses timing-safe comparison.

2. Photo Drop could become a public unauthenticated upload endpoint in production if the PIN was missing.
   - Mitigation: production now fails closed if `JEFF_FIELD_PHOTO_UPLOAD_PIN` is missing.
   - Mitigation: wrong PIN is covered by red-team verification.

3. Public Jeff hub and direct Photo Drop leaked active job/customer names.
   - Mitigation: `/jeff` no longer renders the active job list or active job label.
   - Mitigation: direct `/jeff/photo-drop` no longer renders all active jobs. It only receives a specific job from a valid job link or active session context.

4. Field photos had durable image bytes but incomplete durable metadata coverage.
   - Mitigation: local photo metadata index is stored at `.data/jeff/photos/index.json`.
   - Mitigation: image data is rehydrated from local storage when `includeImageData` is requested.

5. Live sessions and Vapi call review summaries were runtime-only.
   - Mitigation: live sessions are stored at `.data/jeff/sessions.json`.
   - Mitigation: Vapi end-of-call reviews are stored at `.data/jeff/pilot-reviews.json`.

6. Field events and notes were runtime-only for local pilot / fixture jobs and when Supabase was unavailable.
   - Mitigation: field events now use local fallback storage at `.data/jeff/field-events.json`.
   - Mitigation: the field file API reports `local-file` when local fallback storage is used.
   - Mitigation: field events now sync local-first with Supabase when configured. Reads pull Supabase into the local mirror, and `/api/al/wrenchready/jeff/sync` can push local-only events back up.

7. Transcript review checks were too narrow.
   - Mitigation: review now flags completed purchase/order language, pickup promises, exact service data claims, schedule promises, and unsafe drivability reassurance.

8. Vapi tool-call parsing and ordering were fragile.
   - Mitigation: stringified JSON function parameters are parsed.
   - Mitigation: Vapi tool calls execute sequentially so stateful session updates happen in order.

9. Stale or invalid sessions could attach photos to the wrong active session.
   - Mitigation: explicit invalid/stale session IDs do not fall back to latest active session.
   - Mitigation: active sessions require active status and a recent update window.

10. Parts purchasing was a high-risk tool surface.
    - Mitigation: `purchase_or_reserve_part` remains blocked.
    - Mitigation: purchase-block behavior is covered by smoke, scenario, and red-team verification.

11. Scheduling could create customer promise risk.
    - Mitigation: high-uncertainty booking and parts-pickup scenarios are forced into review/hold decisions.
    - Mitigation: unverified schedule-promise transcript language fails review.

12. Closeout/invoice workflow could become customer-ready too early.
    - Mitigation: closeout stays blocked until work completed, proof/photos, parts status, final amount, and payment status are present.

13. Jeff Job Workspace can become a false sense of continuity if call transcripts are not compacted into a durable job layer.
    - Mitigation: Vapi end-of-call reports now persist the raw transcript, compacted conversation summary, and latest job workspace snapshot.
    - Mitigation: Jeff field files now pull the latest compacted call summaries and workspace snapshot into the same context packet used by tools and field views.

14. Calls that cannot be attached to a job can quietly disappear into backend storage.
    - Mitigation: unresolved calls are marked `needs_review` and surfaced on `/ops/jeff` as a review queue.
    - Remaining gap: ops still needs a one-click attach/resolution workflow so Dez is not forced to reconcile records manually.

15. The Jeff ops page exposed customer/job context with only `robots: noindex`.
    - Mitigation: `/ops/jeff` is now protected by HTTP Basic auth in production and uses `WR_OPS_AUTH_USER` / `WR_OPS_AUTH_PASSWORD` when set, then `WR_OPS_BASIC_PASSWORD`, with `JEFF_FIELD_ASSISTANT_TOOL_SECRET` as the emergency fallback.
    - Remaining gap: broader `/ops/*` pages should get a real owner/admin auth layer before the system is used as a daily operations console.

## Verification

Run against local server:

```bash
npm run verify:jeff -- http://localhost:3001
npm run verify:jeff:vapi -- http://localhost:3001
npm run verify:jeff:scenarios -- http://localhost:3001
npm run verify:jeff:red-team -- http://localhost:3001
npm run verify:jeff:production-workspace -- https://wrenchreadymobile.com
npm run sync:jeff -- http://localhost:3001
npm run lint
npm run build
```

## Remaining Production Requirements

- Move field photo bytes, live sessions, and Vapi call-review summaries from local `.data/jeff/*` pilot storage into production database/object storage before relying on multi-instance or serverless durability.
- Move field photo bytes and live sessions from local `.data/jeff/*` pilot storage into production database/object storage before relying on multi-instance or serverless durability.
- Set `CRON_SECRET` in production so the daily Vercel Cron sync repair route can authenticate.
- Apply `supabase/migrations/20260617143001_create_wrenchready_jeff_field_event.sql` and `supabase/migrations/20260617143023_create_wrenchready_jeff_durable_memory.sql` before treating Supabase as the durable job timeline and approved Jeff memory store.
- Add real authentication for broader `/ops/*` surfaces before exposing operator pages outside a trusted environment.
- Add a job-attach/resolution action for unresolved Jeff calls so the review queue does not create long-term operator drag.
- Confirm Vapi recording/transcript retention settings and call-recording consent flow before broad real-customer use.
- Keep purchasing/order placement blocked until delegated authority, readback, approval, vendor, tax/core, and audit-log gates exist.
