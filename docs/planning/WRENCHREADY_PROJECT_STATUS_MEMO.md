# WrenchReady Project Status Memo

## Purpose

This memo is the current checkpoint for the WrenchReady build.

It captures:

- where we started
- what we learned
- what is now built
- what is still blocked
- what we are optimizing for next

## Where we started

The original question looked like a product and website problem:

- what should the site feel like?
- what should the app look like?
- what do competitors do?
- what would make WrenchReady attractive to PE?

The deeper work showed that WrenchReady is not mainly a booking site problem.

It is a promise-control problem.

## Core operating thesis

WrenchReady should be built as a promise-keeping mobile vehicle service business.

The core loop is:

1. get demand
2. qualify inbound
3. make a clear promise
4. keep the promise visibly
5. follow through after the visit
6. turn trust into repeat, referral, and recurring revenue

That thesis now drives both the strategy and the software.

## What we learned

### Customer experience

The best benchmark companies win by reducing uncertainty.

That includes:

- Uber
- Domino's
- Airbnb
- Vrbo
- DoorDash
- Grubhub
- Instacart

The common thread is not the industry. It is visible promise-keeping:

- a clear offer
- confidence in what happens next
- progress visibility
- clear recovery when the promise is at risk
- easy repeat use

### Business model

WrenchReady will not become valuable by doing every possible job.

It becomes valuable by designing a machine that favors:

- profitable service mix
- better route density
- stronger pricing discipline
- lower admin drag
- better repeat and deferred work
- recurring fleet or account revenue

### Commercial doctrine

The biggest strategic refinement was this:

what we market is not the same as what we should dispatch, and neither is the same as what we hope to convert into.

That led to the three-layer model:

1. marketing offer
2. dispatch tier
3. follow-on path

This is now the right commercial lens for WrenchReady.

## What is built now

### Promise CRM backbone

The app now has a real internal operating backbone:

- inbound records
- promise records
- Promise Board
- inbound detail
- promise detail
- manual inbound creation
- promote inbound to promise
- risk and follow-through states

### Database

Supabase is live and verified.

Current project:

- `Al Boreland`
- `https://tsisorwqxmizndrcidub.supabase.co`

Live tables:

- `wrenchready_inbound`
- `wrenchready_promise`

Website intake now writes real inbound records into Supabase.

### Intake doctrine

Every inbound can now carry:

- normalized service
- service lane
- readiness risk
- promise fit
- service class
- acceptance policy
- pricing guardrails
- marketing offer
- marketing role
- dispatch tier
- follow-on path

This means the CRM now tracks both operating fit and commercial intent.

### Twilio readiness

Twilio voice, SMS, and voicemail routes are built and verified at the app layer.

Internal SMS alerts are intentionally gated behind configuration and should stay off until 10DLC approval is complete.

### Public intake

Website requests are now evaluated before they become operating records.

That means public demand is no longer just "a contact form."

It is the start of a qualified operating record.

### Commercial reporting

The CRM now stores:

- promise-level economics
- net profit estimates
- marketing-offer performance
- commercial outcomes such as approved repair, deferred work, diagnostic-only, and declined
- a dedicated follow-through worklist for approved next steps, deferred work, diagnostic recap, and open follow-through
- explicit follow-through resolution metadata so ops can close the loop intentionally and see how it was resolved
- owner-level execution cockpits so Dez and Simon can run their own inbound, promises, follow-through, and profit signal from one page
- a generated "do these first today" brief on each owner cockpit so the day starts with the highest-leverage actions instead of scanning the whole system
- a customer-facing promise-status page tied to each promise record, including visible timeline states, quote approval, and recap/next-step context
- a repeat-use request path from the customer status page that creates a fresh inbound for the recommended next service
- a tomorrow-readiness layer that shows whether customer certainty, parts, route, and payment are actually ready before the visit day starts
- a structured closeout-and-recapture spine so every finished visit can store Now / Soon / Monitor recap items, deferred-work value, review-request state, maintenance reminder seed, and the next probable visit
- lane-aware follow-through resolution so review, reminder, deferred-work, and open-closeout tasks can progress in sequence instead of one action blanking the whole promise
- expanded operator playbooks for review asks and reminder seeds, not just intake and quote language

The ops layer can now answer not just what came in, but what happened after we made the promise.

## What is still blocked

The original blockers were Supabase and the ops webhook handoff.

Those are now cleared.

Current status:

- Supabase: live
- Promise CRM: live
- Twilio: ready at the app layer
- Ops webhook / n8n: live
- Ops SMS alerts: intentionally disabled until 10DLC approval

The next blockers are no longer infrastructure blockers.
They are operating-design blockers:

- automation depth
- net-profit reporting breadth
- better conversion and follow-through measurement

## What changed in this phase

In addition to the earlier Promise CRM build, this phase folded the commercial doctrine into the app.

The CRM now reflects:

- what attracted the customer
- how hard we should screen the job
- what profitable outcome we want to earn from the visit

This matters because WrenchReady should be able to market:

- check engine light help
- no-start help
- brake inspection
- oil changes

without pretending that all of those offers deserve the same standalone dispatch treatment.

This phase also added:

- net profit language in place of EBITDA across the ops UI
- an offer-performance insights page
- promise-level economics capture
- promise-level commercial outcome capture
- a follow-through worklist page and API
- inline follow-through resolution actions from the queue itself
- owner overview and owner-specific cockpit pages plus an owner snapshot API
- a live owner daily-priority layer that turns queue state into first-three execution guidance
- a public customer-status route backed by the same promise record, plus a customer approval action that writes back into ops and commercial outcome data
- a customer re-request path that turns approved or recommended next steps into a new screened inbound instead of dropping customers back on a generic form
- a dedicated tomorrow-readiness view and API so the team can see what is still soft before tomorrow becomes chaos
- a structured closeout flow on promise records, plus follow-through logic that can turn a finished visit into a review ask, a maintenance reminder seed, and a next probable visit instead of a dead end
- an operator playbook layer covering dispatch decisions, quote language, honest driveway add-on plays, review ask scripts, and reminder seed plays so the human side of the machine is more consistent too
- SMS alert gating so no live ops texting is expected until 10DLC approval is complete
- staged follow-through behavior where a review ask can be logged, then a reminder can surface, then the next unresolved commercial lane can stay visible instead of disappearing behind one blanket resolution
- a proof-capture layer inside closeout so each finished visit can store why the customer booked, what promise mattered most, customer relief language, and proof assets worth keeping
- generated outbound drafts on each promise for closeout recap, review ask, and maintenance reminder so the operator can act from the same record instead of inventing wording every time
- follow-through history on promise detail so review, reminder, and deferred-work resolutions are visible as a sequence instead of only the latest action
- a dedicated outbound queue so recap, review, and reminder sends are owned work instead of implied future work
- webhook-backed outbound send actions that update review / recap / reminder state after delivery is requested
- closeout reporting now includes recap-ready, recap-sent, and proof-captured counts in addition to review and reminder metrics

## What we are optimizing for

The next stage is not "more features."

It is a tighter operating machine.

The immediate optimization goals are:

- better inbound qualification
- cleaner promise creation
- earlier detection of tomorrow risk
- follow-through discipline
- better closeout discipline after the visit
- clearer review capture and proof generation
- more consistent quoting and dispatch language
- stronger add-on and deferred-work discipline in the field
- visibility into which offers create profitable work
- faster owner execution without scanning across unrelated queues
- direct customer visibility into promise status and approvals so trust is felt, not just tracked internally
- easier repeat use so the next visit starts from existing trust, not from zero
- explicit day-readiness discipline so promised work is believable before the route starts

## Still-relevant operating layers now folded into the plan

The separate `wrenchready-next-moves.md` note still contains useful execution work.
Those ideas are now part of the active plan rather than a side list.

### Already built in structure, but not finished operationally

- review request state on the promise record
- follow-up and retention structure through closeout, reminder seed, and next probable visit
- dispatcher doctrine through service class, acceptance policy, dispatch tier, and follow-on path
- weekly operator visibility through Promise Board, Insights, Follow-through, Tomorrow, and Owner cockpits

### Still needed as next layers

- actual review send flow and wording
- tighter review and reminder automation depth on top of the now-live lane-aware follow-through queue
- proof asset collection process for photos, recap summaries, and customer permissioned proof
- KPI hardening so weekly review becomes a habit, not a dashboard that looks nice
- simple fleet / B2B starter lane as a parallel business-development motion

## Immediate next builds

### 1. Deepen webhook automation

The webhook is now live and the app can already send internal alerts in code.

Next, deepen the external automation flows:

- high-risk inbound alert
- tomorrow-at-risk briefing
- follow-through reminder
- review-ready trigger
- maintenance-reminder trigger

### 2. Improve commercial reporting

The CRM now stores both economics and commercial outcomes.
The next layer is cleaner reporting that helps us answer:

- which offers create approved repair
- which offers mainly create deferred work
- which offers should be screened harder
- which offers should be marketed harder
- how many completed visits actually get closeout finished
- how many review asks are ready, sent, and completed
- how many next probable visits become real inbound or real scheduled work

### 3. Deepen the closeout-and-recapture machine

The structured closeout spine is live.
The next step is to make it more automatic and more measurable:

- move review asks from ready to sent with cleaner automation
- turn reminder seeds into real recurring follow-up
- keep review, reminder, deferred-work, and open-closeout lanes visible in the right order instead of treating follow-through like one generic bucket
- measure closeout completion rate and next-visit conversion
- use finished jobs to prove repeatability and retention, not just one-off revenue
- standardize same-day recap language by service lane
- make Now / Soon / Monitor the default post-visit operating habit
- tie deferred-work and add-on offers more tightly to the field playbook
- turn the new generated outbound drafts into real send or copy actions instead of operator-only reference
- capture completion on outbound delivery channels so queued, sent, responded, and converted become measurable states

### 4. Standardize quoting and field conversion

The system now knows what kind of job it is.
The next gap is more human than technical:

- quote script library for battery, brakes, diagnostics, starter, and alternator
- simple dispatch decision script for book now / quote later / paid diagnostic / bundle only / decline
- driveway add-on playbook so good next-step offers feel honest and consistent
- review ask and reminder seed scripts that match the same promise doctrine

### 5. Build the proof and trust asset loop

The review system should not be the only trust engine.
The business also needs a repeatable proof collection habit:

- job photos
- before / after examples
- permissioned customer text screenshots
- plain-language visit recap examples
- proof assets that can later feed the site, ads, service pages, and fleet outreach

### 6. Tighten the public site against the operating doctrine

The website should keep supporting demand capture, but it should never overpromise what ops should still screen.

### 7. Start the recurring-account lane

This is not the next product build, but it is part of the active business plan:

- one fleet / B2B starter offer
- one outreach script
- one follow-up pattern
- one landing page or simple proof surface when ready

## Success definition for the next 30 days

WrenchReady should be able to answer these questions clearly:

- what came in today?
- what offers are driving demand?
- what became real promises?
- what is at risk tomorrow?
- what follow-through is still due?
- what kinds of inbound are turning into profitable work?

If the system can answer those questions reliably, WrenchReady starts looking less like a local hustle and more like a real operating platform.
