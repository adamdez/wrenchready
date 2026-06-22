# Jeff Live Test Readiness Audit

Date: 2026-06-21

Purpose: identify fragile Jeff wiring before Simon does more live field testing, with special attention to OpenAI usage visibility, budget guardrails, and workflow gaps that could surprise the business.

## What Is Now Instrumented

- Message Jeff text replies log backend-owned OpenAI usage through `src/lib/jeff-field-assistant/openai-usage.ts`.
- Field/session photo analysis logs backend-owned OpenAI usage through the same path.
- Usage entries are written to the Jeff local data store as `openai-usage.json`.
- Each Message Jeff conversation now carries usage and budget metadata in `sourcePayload` and summary metadata.
- Budget checks are warning-first by default and only block calls when `JEFF_OPENAI_BUDGET_MODE=block` and a daily token or call budget is configured.
- `npm run eval:jeff` is deterministic-only by default. The LLM judge is now opt-in with `npm run eval:jeff:judge` or `npm run eval:jeff -- --judge`.
- `npm run audit:jeff:live` inspects the local wiring without calling OpenAI, Vapi, Twilio, or Stripe.

## Budget Environment

Use these to control Jeff-owned OpenAI usage:

- `JEFF_OPENAI_DAILY_TOKEN_BUDGET`
- `JEFF_OPENAI_DAILY_CALL_BUDGET`
- `JEFF_OPENAI_BUDGET_MODE=warn|block`
- `JEFF_OPENAI_WARN_RATIO=0.8`

Recommended pilot posture: set a daily token or call budget before Simon tests. Use `warn` for supervised dry runs where Dez is watching the output; use `block` for aggressive testing or any session where a hard local cap matters.

## Remaining Fragile Gaps

1. Vapi voice model usage is still not visible to this backend.
   The backend receives Vapi tool calls and end-of-call reports, but not the OpenAI token usage from Vapi-managed conversation turns. Check Vapi/OpenAI dashboards until a Vapi usage feed is wired.

2. Jeff pilot stores are not durable production truth unless configured.
   `getJeffLocalDataPath()` writes to `.data/jeff` locally and `/tmp/wrenchready-jeff` on Vercel unless `JEFF_LOCAL_DATA_DIR` is set. That affects usage logs, vehicle specs, and pilot transcript reviews.

3. Text Jeff still defaults to `gpt-5.5`.
   That is quality-first. For normal field text, consider a cheaper default with escalation only for hard diagnostic/spec/vision cases.

4. Saved eval results are still pilot-grade, not trust-and-forget.
   The latest saved full eval was 65% good overall, with failures clustered around draft-first handoffs, scheduling/money wording, exact-spec discipline, context leaks, and diagnostic tree exits. New eval JSON includes timestamp and git commit metadata so the audit can warn on stale snapshots.

5. Vapi transcript review is heuristic.
   The broad `safe to drive` check was narrowed to avoid false positives on "not safe to drive," but transcript review is still regex-based and should not be treated as a perfect safety evaluator.

6. Verified vehicle spec storage is local-first.
   VIN decode is useful, and the saved spec store is the right direction, but exact service data should not become a local-only pilot artifact. Durable Supabase-backed specs should happen before relying on it as shared shop memory.

## Before More Simon Live Testing

- Run `npm run audit:jeff:live`.
- Run `npm run eval:jeff -- --quick` for cheap behavior smoke testing.
- Use `npm run eval:jeff:judge -- --quick` only when an LLM judge is worth the spend.
- Set at least one daily budget env var before live testing; set `JEFF_OPENAI_BUDGET_MODE=block` when you want a hard local cap.
- Keep the live pilot narrow: one field workflow at a time, then inspect usage, transcript review, and saved job facts.
