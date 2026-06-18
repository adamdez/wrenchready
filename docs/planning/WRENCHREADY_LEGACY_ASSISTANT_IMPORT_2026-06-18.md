# WrenchReady Legacy Assistant Import - 2026-06-18

Purpose: import useful durable rules from the legacy `../WrenchReady Assistant` folder into the active WrenchReady source of truth.

Imported from:

- `../WrenchReady Assistant/work/memory/pricing-rules.md`
- `../WrenchReady Assistant/work/playbooks/diagnostic-quote.md`
- `../WrenchReady Assistant/work/playbooks/oreilly-cart.md`

Status: reviewed enough to inform Jeff operating context, but not a substitute for live CRM, approval, payment, vendor, tax, or fitment proof.

## Pricing And Approval Rules

- Standard diagnostic quote defaults to `$145.00` unless Dez gives a different amount.
- Battery diagnostic / no-power diagnostic covers basic battery terminal checks and basic battery swap labor only when the battery is confirmed as the fix.
- Repair, parts, additional testing, or work beyond the approved diagnostic must be separately approved unless Dez explicitly combines it into one invoice.
- WrenchReady still needs a full rate card for added labor, extended diagnostics, electrical troubleshooting, standard repair labor, trip fees, shop supplies, taxes/fees, and common menu services.
- Missing labor rate, tax treatment, shop supplies, or markup rules should be treated as money-blocking questions, not guessed by Jeff or Codex.

## Invoice Math Rules

- Always write line-item math before Stripe or customer send.
- Customer-facing totals must match the line-item equation exactly.
- Do not infer taxes, markup, labor, or shop supplies unless Dez provides the rule or approves the calculation.
- If a correction changes any line item or total, redo invoice text, payment link state, job ledger/state, and QA from the corrected math.

## Parts And Margin Rules

- O'Reilly cart totals can include van-stock or optional parts; only approved/used customer parts should appear on customer invoices.
- If markup is requested, show it only in the customer-facing invoice if Dez wants it disclosed as a line. Otherwise present the approved customer price cleanly.
- WrenchReady needs reseller permit / resale setup and vendor accounts so parts can be purchased at mechanic pricing where available.
- Parts margin goal: buy at vendor/mechanic cost, sell at the approved customer-facing parts price or MSRP when appropriate, and protect gross margin.
- Until reseller/vendor setup is complete, flag parts margin risk internally when retail part cost makes the job thin.
- Do not guess resale, sales tax, or permit compliance rules. Treat those as ops/legal/accounting follow-up.

## Diagnostic Quote Playbook

Trigger:

- Diagnostic quote, inspection quote, battery check quote, no-start/no-power quote, or dispatch packet with a diagnostic amount.

Required inputs:

- Customer.
- Concern.
- Diagnostic amount.
- Vehicle/VIN if available.
- Address/appointment if available.
- Contact rules.

Workflow:

- Update the job state with concern, scope, appointment, contact rules, and diagnostic amount.
- Update invoice/payment status with diagnostic line item and payment-link status.
- Draft customer quote in the WrenchReady customer template.
- Draft Simon/internal packet with diagnostic path, tools, stop points, and photo checklist.
- Update the job ledger/state.

QA:

- Diagnostic amount matches intake.
- Payment-link status is present.
- Contact rules are exact.
- Customer packet excludes internal uncertainty unless it is needed for approval.
- Do not imply repairs are approved.
- Do not bill parts unless approved.
- Do not use old payment links.

## O'Reilly Cart / Parts Playbook

Trigger:

- Sourcing parts, checking O'Reilly availability, building a cart, or separating customer parts from van stock.

Required inputs:

- Vehicle year/make/model or VIN.
- Pickup store.
- Requested parts.
- Customer-approved versus optional/van-stock status.

Workflow:

- Record pickup store.
- Set or verify vehicle fitment by year/make/model and VIN when available.
- Build or review cart.
- Separate customer-approved parts from van-stock/optional parts.
- Record part numbers, quantities, prices, core charges, tax/fees if confirmed, and availability.
- For voice-to-action purchasing, read back selected vendor, store, part number, fitment status, total, core charge, pickup ETA, and approval status before purchase.
- Update the job parts plan, invoice when approved parts affect billing, Simon/internal packet, and job ledger/state.

QA:

- Store is recorded.
- Fitment status is recorded.
- Customer-billed parts are separated from van stock.
- Open approval questions are explicit.
- Voice purchase confirmation is recorded when an order is placed from the field.

Do not:

- Bill van-stock unless approved/used.
- Trust availability before store and fitment are set.
- Expose cart ambiguity in a customer PDF unless customer approval depends on it.
- Purchase from voice alone without fitment check, price/core readback, pickup store, and explicit approval.
