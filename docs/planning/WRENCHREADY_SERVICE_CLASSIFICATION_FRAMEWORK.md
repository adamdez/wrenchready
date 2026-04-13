# WrenchReady Service Classification Framework

## Why this exists

WrenchReady should not force one label to do three different jobs.

For a mobile service business, these are different questions:

- What attracts the customer?
- What should we actually dispatch as a standalone job?
- What do we hope to convert the visit into?

Those are not the same thing.

The right model is:

1. marketing offer
2. dispatch tier
3. follow-on path

This lets WrenchReady market high-demand entry offers without pretending every lead is equally good as a standalone dispatch.

## The three-layer model

### 1. Marketing Offer

This is what gets the call, text, or form submission.

Use this layer to maximize:

- search intent
- urgency
- customer clarity
- low-friction language

Examples:

- check engine light evaluation
- no-start help
- battery replacement
- brake inspection
- mobile oil change
- pre-purchase inspection

### 2. Dispatch Tier

This is the operating decision.

Use this layer to decide:

- should we dispatch this standalone?
- should we require paid diagnosis?
- should we only take it when bundled?
- should we only take it when route-dense or fleet-adjacent?
- should we decline it unless economics improve?

Recommended dispatch tiers:

- `dispatch-first`
- `selective-screening`
- `bundle-only`
- `decline-standalone`

### 3. Follow-On Path

This is the economic destination.

Use this layer to define what the business is really trying to earn from the visit.

Examples:

- check engine light -> diagnosis -> approved repair
- no-start -> battery / starter / alternator / cable work
- oil change -> inspection -> filters / deferred maintenance / brakes
- brake inspection -> pads / rotors / calipers / fluid
- pre-purchase inspection -> repair list / deferred work / repeat maintenance

## Classification table

| Entry Offer | Marketing Role | Dispatch Tier | Follow-On Path | Notes |
|---|---|---|---|---|
| Check engine light evaluation | Hero | selective-screening | sensors, ignition, EVAP, emissions, deeper diag | Great demand capture. Must stay paid and scoped. |
| No-start evaluation | Hero | selective-screening | battery, starter, alternator, cables | Great pain-based offer. High conversion potential. |
| Battery replacement | Hero | dispatch-first | battery terminal, cable, charging follow-up | Clear, urgent, field-friendly. |
| Brake inspection | Hero | selective-screening | pads, rotors, calipers, fluid | Good trust-builder. Must convert. |
| Front brake pads | Hero | dispatch-first | rotors, fluid, calipers | Strong standalone repair. |
| Front pads + rotors | Hero | dispatch-first | fluid, calipers, rear brakes | Strong ARO repair lane. |
| Alternator replacement | Hero | dispatch-first | belt/tensioner, charging cleanup | High-ticket, high-clarity job. |
| Starter replacement | Hero | dispatch-first | battery/cable/charging follow-up | Strong no-start monetization lane. |
| Synthetic oil change | Demand capture | bundle-only | inspection, filters, wipers, deferred maintenance | Fine to market. Bad as isolated cheap dispatch. |
| Pre-purchase inspection | Hero | selective-screening | deferred work, follow-up repairs | Strong labor economics if scope is clear. |
| Fleet intake inspection | Hero for B2B | selective-screening | recurring PM, repair program, route density | Great account-opening offer. |
| Battery/charging system evaluation | Hero | selective-screening | battery, alternator, cable work | Entry diagnostic, not cheap free advice. |

## Rules by layer

### Marketing rules

- Market what customers search for and understand quickly.
- Do not require marketing to mirror the highest-margin final service.
- Use plain-English pain language.
- Let entry offers do the job of demand capture.

### Dispatch rules

- A marketing hero can still be a selective dispatch.
- A lead should not become a promise until the economics and readiness are acceptable.
- The rate card protects the route, not the ad copy.
- Bundle-only offers should not be allowed to masquerade as great standalone jobs.

### Conversion rules

- Every entry offer should have an intentional economic destination.
- If an offer generates leads but rarely converts into profitable work, tighten it.
- If an offer is operationally clean and converts well, invest more in it.
- The follow-on path should be trained, measured, and visible in ops.

## What this means for the workbook

The workbook should stop trying to make one tier label carry all meaning.

Recommended columns:

- `Marketing Role`
- `Dispatch Tier`
- `Follow-On Path`

Example:

- `Check engine light evaluation`
  - Marketing Role: Hero
  - Dispatch Tier: selective-screening
  - Follow-On Path: approved diagnostic repair

- `Synthetic oil change`
  - Marketing Role: Demand capture
  - Dispatch Tier: bundle-only
  - Follow-On Path: inspection + maintenance upsell

## What this means for the website

The website should market the offer that gets the customer to act.

That means it can absolutely feature:

- check engine light help
- no-start help
- brake inspection
- mobile oil change

But the site should not imply:

- every offer is equal as a standalone dispatch
- every diagnostic ends with an instant cheap answer
- every low-ticket lead deserves a truck roll

The website's job is demand capture and trust.
The ops system's job is qualification and promise control.

## What this means for the Promise CRM

Every inbound should eventually carry:

- acquisition offer
- normalized service
- service lane
- dispatch tier
- acceptance policy
- likely follow-on path

This allows WrenchReady to measure:

- what marketing offers drive demand
- what offers convert into real promises
- what offers convert into high-value repairs
- what offers create repeat or deferred work

## WrenchReady operating thesis

WrenchReady should market whatever gets the right customer to raise their hand.

Then it should use pricing, dispatch policy, and promise control to decide what to carry and how to convert the visit into profitable, honest work.

That is not manipulation.
That is how a disciplined service business turns demand into EBITDA instead of chaos.
