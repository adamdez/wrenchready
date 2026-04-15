# WrenchReady Next Moves

This note is no longer a standalone plan.

The useful parts have now been folded into the active operating plan in:

- [WRENCHREADY_PROJECT_STATUS_MEMO.md](C:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\docs\planning\WRENCHREADY_PROJECT_STATUS_MEMO.md)

Use this file as a supporting checklist for what still matters, especially where the software spine now exists but the operating habit, scripts, proof loop, or automation depth still need to catch up.

## What Still Matters Most

### 1. Review Capture System

This is still one of the biggest public trust gaps.

Every completed job should trigger a review ask when appropriate.

The business should define:
- when the ask happens
- who sends it
- what wording gets used
- what happens if the customer says yes but does not leave one

Why it matters:
- stronger public trust
- better local SEO
- better conversion on the site
- more proof without fake filler

Current status:
- partly built in the Promise CRM through `reviewRequest` inside closeout
- review ask wording and queue actions are now built in the operator playbooks and follow-through queue
- generated review ask drafts are now live on promise detail
- outbound queue plus send request is now live
- direct email transport is now wired through Resend when configured
- delivered/responded/converted/failed result tracking is now live on the promise record and outbound queue
- transport policy is now live, so text outbound is honestly held until compliance/transport are truly ready and email can now be first-party instead of webhook-only
- still needs deeper production-channel automation and weekly review discipline

### 2. Follow-Up and Retention System

The real win is not one job.
It is the next job.

Every completed visit should create a clear next touchpoint when relevant.

Best sequence:
- same-day recap
- deferred-work reminder
- 30-day follow-up if needed
- seasonal or mileage-based rebook reminder

Why it matters:
- higher repeat rate
- higher lifetime value
- more natural add-on and maintenance revenue
- stronger customer experience

Current status:
- structurally built through closeout, follow-through, maintenance reminder seed, and next probable visit
- lane-aware queue progression now lets review, reminder, deferred-work, and open-closeout work advance in sequence
- generated recap and reminder drafts are now live on promise detail
- outbound queue now lets recap and reminder drafts become owned send work
- outbound results are now measurable through delivered/responded/converted history and recent activity
- weekly recapture scorecard is now live as an operator surface
- weekly recapture now also measures deposit collection, callback resolution, and recurring-account progression
- still needs deeper automation and cleaner weekly measurement

### 3. Dispatcher Decision Framework

The business still needs a simple internal rule set for what gets booked and what does not.

The decision options should be:
- book now
- quote and book later
- paid diagnostic first
- bundle only
- decline

Why it matters:
- protects profit
- protects route quality
- protects trust
- keeps bad-fit jobs from poisoning the schedule

Current status:
- partly built through `serviceClass`, `acceptancePolicy`, `dispatchTier`, and `follow-on path`
- still needs cleaner operator language, training, and enforcement

### 4. Quote Script Library

The phone and text quoting language should be standardized for the core service lanes.

At minimum:
- battery
- brakes
- diagnostics
- starter
- alternator

Each script should explain:
- the first step
- what is included
- how pricing works
- what happens next

Why it matters:
- calmer customer conversations
- more consistent conversion
- less awkward or vague pricing language
- better brand feel

Current status:
- now built in the operator playbooks for the core lanes plus pre-purchase and fleet
- still needs training use, iteration, and evidence from real conversations

### 5. Driveway Add-On Playbook

This is not about shady upsells.
It is about natural, honest next-step offers that fit the job already being done.

Examples:
- battery job -> charging-system note
- brake job -> rear brake status or tire wear note
- oil change -> quick inspection and next maintenance note
- diagnostic visit -> approved repair or referral next step

Why it matters:
- higher average ticket
- more helpful visits
- less missed revenue
- better follow-up clarity

Current status:
- now built into the operator playbooks and reinforced by closeout / recapture structure
- still needs field habit and measurement

### 5A. Review Ask Scripts

The business now needs lane-specific review language, not one generic message.

Examples:
- same-day rescue review ask
- brake trust review ask
- diagnostic clarity review ask
- pre-purchase decision-help review ask

Why it matters:
- reviews feel earned, not spammy
- the wording matches the promise actually kept
- review asks become part of the machine instead of an afterthought

Current status:
- now built inside the operator playbooks
- outbound request plus result tracking is now live
- still needs real production-channel send automation and measurement habit

### 5B. Reminder Seed Plays

The system now seeds reminders, but those seeds need consistent operator language and timing.

Examples:
- charging-system retest after a battery/no-start job
- rear brake or fluid follow-up after brake work
- bundled maintenance reminder after routine service
- account-level repeatability reminder for fleet work

Why it matters:
- turns next probable visit into an actual next touch
- keeps deferred value from cooling off
- makes reminder logic feel purposeful instead of generic

Current status:
- now built inside the operator playbooks
- outbound request plus result tracking is now live
- still needs recurring send automation

### 6. Real Proof Asset Library

The site now has a better trust frame.
It still needs real assets.

Build a folder and process for collecting:
- job photos
- before/after examples
- customer text screenshots if permission is granted
- plain-language post-visit summaries
- real customer wording that can later become reviews or case studies

Why it matters:
- makes the site more believable
- supports review capture
- supports social content
- supports future ads and service pages

Current status:
- structurally built into closeout through booking reason, promise that mattered most, customer relief quote, and proof assets
- proof discipline page is now live and scoring proof gaps on completed visits
- should be treated as an operating process, not just a marketing wish

### 6A. Deposit and modern payment surface

This is now part of the active operating spine, not a later website extra.

Why it matters:
- deposits make the promise financially real
- modern wallets reduce friction on mobile
- approval should be able to become payment without a manual side process

Current status:
- Stripe is now the chosen payment rail in code
- customer status now has a deposit checkout card
- customer status now also has a remaining-balance checkout card
- Stripe checkout session creation is now wired off the promise record
- Stripe webhook capture is now wired back into the same promise record for both deposit and remaining-balance completion
- Stripe test-mode keys and webhook are now live on the deployed app
- duplicate deposit sessions are now blocked once a deposit is collected
- duplicate Stripe completion events now resolve as duplicates instead of double-counting the payment
- collections queue now has inline actions for status, method, invoice reference, write-off reason, and notes
- still needs live-mode Stripe keys before real customer charges should go through

### 7. Fleet / B2B Starter Offer

This does not need to be a huge expansion yet.

A simple starter package is enough:
- one fleet page
- one outreach script
- one follow-up message
- one clear offer for small contractor or property-management fleets

Why it matters:
- opens a second revenue lane
- can increase route density
- creates recurring work
- makes the business look more established

Current status:
- now live as a starter lane in ops with one offer, one opener, one follow-up, and live candidate detection
- now upgraded with a real execution worklist, due and overdue next touches, account detail, and logged activity on tracked promises
- still needs real outreach habit, trial conversions, and actual account wins

### 8. Weekly Operator Dashboard

The business should track a small set of metrics every week.

At minimum:
- jobs completed
- average ticket
- add-on rate
- quote approval rate
- repeat customer rate
- review asks sent
- reviews received
- no-show rate

Why it matters:
- makes decisions easier
- exposes weak points fast
- turns growth into a weekly operating habit

Current status:
- partly built already through Promise Board, Insights, Follow-through, Tomorrow, and Owner cockpits
- still needs KPI hardening and weekly review discipline

## Priority Order

If only a few things get layered on top of the current spine next, do them in this order:

1. Production outbound transport for recap, review, and reminder
2. Weekly recapture scorecard with real result tracking
3. Real proof asset collection and closeout proof discipline
4. Fleet outreach starter pack

### What is now added on top of that

- weekly operating cadence so the why, the standard, and the first actions stay explicit
- systems readiness so the team can see what is live, what is held, and what likely needs vendor purchase or provisioning next
- job-stage truth so promise-board buckets and actual execution phase do not get conflated
- field-execution packets, collections, warranty/comeback, and recurring-account health as live operating surfaces

### Why this is the current top 4

These are the best next moves because the app spine is now strong enough to:

- generate and track outbound
- store proof and closeout
- measure next-step conversion

So the next compounding gains come from:

- getting the messages out through the right channels
- reviewing the result states every week
- collecting proof that makes the site and sales story stronger
- adding one narrow recurring-account lane instead of waiting for a perfect future version

These four layers are now built in structure.
What remains is depth, habit, and channel execution.

## Bottom Line

The site is better now.

The next compounding gains still come from:
- proof
- follow-up
- operational consistency

Not from endlessly rewriting the homepage.

If WrenchReady wants to feel more established fast, the strongest path is:
- get the real reviews
- get the post-visit follow-up right
- make booking and quoting more consistent
- turn every completed visit into the next one
