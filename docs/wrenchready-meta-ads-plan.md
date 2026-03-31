# Wrench Ready Mobile - Meta Ads Plan
### Spokane mobile mechanic lead generation - 2026

---

## What this plan is for

This plan adapts the useful parts of the Dominion Meta ads strategy to Wrench Ready Mobile.

It is built for a local mobile mechanic business, not a housing advertiser.

That means:

- no Housing Special Ad Category restrictions
- no real-estate investor targeting logic
- no "motivated seller" persona language
- much heavier emphasis on calls, urgent service intent, and speed-to-lead

The goal is simple:

- generate qualified calls and appointment requests in Spokane County
- prioritize high-intent jobs Wrench Ready can actually service profitably
- build a reliable Meta acquisition channel that complements Google search

---

## Strategic reality

Meta works differently for Wrench Ready than Google does.

Google captures existing demand:

- "mobile mechanic Spokane"
- "battery replacement at home"
- "brakes squeaking Spokane"
- "car won't start mobile mechanic"

Meta creates and harvests nearby demand before the person searches.

That makes Meta best for:

- urgent but not yet searched problems
- convenience-driven maintenance
- trust-building for a new local brand
- retargeting visitors who did not book the first time

Meta is weaker than Google for pure bottom-funnel demand.

Meta is stronger than Google at:

- repeated local exposure
- visual before/after and driveway convenience storytelling
- getting the phone to ring from people who had not searched yet

The right mental model is:

- Google wins the "I need help now" search
- Meta warms, filters, and repeatedly surfaces Wrench Ready in-market

---

## Business fit

Wrench Ready's current offer and site positioning suggest four lead buckets:

1. Urgent no-start / battery
2. Brake problems
3. Check-engine / diagnostic uncertainty
4. Routine maintenance and inspection

Of those, Meta is likely to perform best on:

- battery / no-start
- brakes
- convenience maintenance

Diagnostics can work, but it needs especially trust-heavy creative.

Routine oil change traffic may be cheaper but can produce lower average ticket value unless route density and repeat-booking are strong.

---

## What to optimize for

Do not treat all conversions as equal.

For Wrench Ready, the rough priority order should be:

1. Answered phone calls
2. Appointment requests with vehicle + service details
3. SMS intent
4. Page visits

That means Meta setup should aim toward two primary outcomes:

- call intent during staffed or answerable hours
- completed appointment request submissions from the website

---

## Recommended account structure

Start simpler than most agencies would pitch.

### Month 1 structure

Run one primary Meta campaign to start.

Recommended setup:

- Objective: `Leads`
- Optimization path: website leads first, calls as a parallel creative/placement test if the account supports it cleanly
- Geography: Spokane County core service area plus close surrounding density only
- Age: broad adult audience
- Audience: broad with light exclusions only

Do not over-segment early.

Use 2 ad sets max:

### Ad Set 1 - Urgent Service

Hooks:

- car will not start
- battery is dead
- brakes are grinding
- warning light came on
- do not want to tow the car

Best pages:

- `/services/battery-replacement`
- `/services/brake-repair`
- `/services/check-engine-diagnostics`

### Ad Set 2 - Convenience Maintenance

Hooks:

- oil change at home
- mobile maintenance while at work
- pre-purchase inspection
- avoid the shop drop-off

Best pages:

- `/services/oil-change`
- `/services/pre-purchase-inspection`
- `/contact`

If budget is tight, start with only Ad Set 1.

---

## Budget guidance

Reasonable starting range:

- ` $20-$35/day ` if testing cautiously
- ` $40-$60/day ` if you want meaningful signal faster

Suggested split:

- 65% urgent service
- 35% convenience maintenance

Do not launch four or five ad sets on a small budget.

For a local service business in a medium-size market, too much structure creates fake sophistication and starves delivery.

---

## Creative strategy

Meta still rewards creative variety, but Wrench Ready does not need 15 to 50 creatives on day one.

Start with 4 to 6 genuinely different creatives per ad set.

They should differ by angle, not by tiny visual edits.

### Best creative angles for Wrench Ready

1. Problem-first urgency
2. Convenience-first lifestyle
3. Trust and professionalism
4. "We come to you" route clarity
5. Social proof / proof of work

### Recommended creative formats

1. Static driveway photo
   Real vehicle, real driveway, no stock-photo look.

2. Simon talking to camera
   Short vertical video: who he is, what jobs he handles, where he works.

3. Vehicle problem close-up
   Brake wear, dead battery scene, scan tool, hood open at home or work.

4. Convenience explainer
   "You stay home or stay at work. We service the car where it already sits."

5. Testimonial screenshot or review card
   Clean formatting, believable, no fake-overdesigned ad feel.

6. Service lane graphic
   "Brakes. Batteries. Diagnostics. Oil changes. Spokane County."

### What not to do

- generic wrench stock photos
- ads that make Wrench Ready look like a giant chain
- vague "best mechanic in town" claims
- too many services in one ad
- anything that implies every repair is mobile-capable

---

## Copy angles

### Battery / no-start

Headline ideas:

- Car won't start at home?
- Dead battery in Spokane?
- Skip the tow for a no-start visit.

Body direction:

- on-site battery testing
- replacement where the vehicle already sits
- clear answer before guessing at parts

### Brakes

Headline ideas:

- Hearing brake noise?
- Grinding brakes but no time for a shop?
- Brake service without the drop-off.

Body direction:

- inspection-first language
- safety and clarity
- home or workplace convenience

### Diagnostics

Headline ideas:

- Check-engine light on?
- Start with a real first answer.
- Car acting up but not sure why?

Body direction:

- symptom-first
- no part-swapping hype
- explanation in plain language

### Oil change / maintenance

Headline ideas:

- Oil change at home in Spokane
- Stay at work. We handle the service.
- Routine maintenance without the waiting room.

Body direction:

- convenience
- inspection notes
- repeat-booking and family vehicle practicality

---

## Funnel recommendation

For Wrench Ready, do not begin with Meta Instant Forms as the primary funnel.

Start with the website.

Why:

- the site already has a working appointment request form
- the business benefits from richer qualification data
- calls and web forms can be tracked together
- the current site already has service-specific landing pages

### Primary funnel

Ad -> service page or contact page -> appointment request form -> follow-up

Preferred destinations:

- urgent ads -> service pages
- maintenance ads -> service pages or `/contact`
- broad local-brand ads -> homepage or `/contact`

### Secondary funnel

Ad -> tap to call

Use this when:

- calls can be answered live
- the ad is explicitly urgent
- you want fewer, higher-intent interactions

### Retargeting funnel

Retarget:

- site visitors who hit `/services/*` or `/contact`
- users who clicked call but did not submit
- users who started the form but did not complete it, if event tracking is added

---

## Tracking plan

This is where the biggest work still needs to happen.

### Current state in the Wrench Ready site

Right now the site:

- has a working form in `src/components/launch-request-form.tsx`
- submits to `src/app/api/appointments/route.ts`
- fires a client-side `generate_lead` event if `gtag` exists

Right now the site does not appear to include:

- Meta Pixel
- Meta Conversions API
- call-click event instrumentation for Meta
- deduplicated browser + server lead events for Meta

### What should be implemented before serious spend

#### Browser events

- `PageView` on all pages
- `ViewContent` on `/services/*` and `/contact`
- `Lead` on successful form submit
- optional custom event for `ContactIntent` on `tel:` and `sms:` clicks

#### Server-side Conversions API

When `/api/appointments` accepts a valid request, send Meta a server-side `Lead` event with:

- `event_name`
- `event_time`
- `event_id`
- hashed phone if present
- hashed email if present
- client IP address
- client user agent
- event source URL

The `event_id` matters because browser and server events should be deduplicated.

### Recommended event priority

Use one true primary Meta optimization event at first:

- `Lead`

Do not create several competing primary conversion events on day one.

---

## Operational requirements

Meta leads will usually be softer than Google leads.

That means response speed matters even more.

### Minimum service-level agreement

- auto-text or acknowledgment within 1 to 2 minutes
- live call-back within 5 minutes when possible
- same-business-window follow-up for all web leads

For Wrench Ready specifically, the best workflow is:

1. instant webhook notification to Simon or admin
2. same-thread SMS acknowledgement
3. phone call if the request sounds urgent
4. booking confirmation or screening reply

The recent Twilio forwarding setup helps here because ad-driven calls can already route to Simon directly.

---

## Best first campaign

If I were launching this from scratch, I would start here:

### Campaign: Spokane urgent mobile mechanic

- Objective: Leads
- Budget: ` $30-$40/day `
- Geography: Spokane core market
- Ad Set count: 1
- Focus: battery, no-start, brakes, diagnostics
- Destination mix:
  - 70% website/service-page traffic optimized for `Lead`
  - 30% call-focused ads if call handling is dependable

### Creative package

- 2 static images
- 2 short talking-head videos
- 1 proof/testimonial card
- 1 service-lane summary creative

### Success metrics for the first 30 days

- cost per website lead
- number of answered calls
- lead-to-conversation rate
- conversation-to-booking rate
- booked jobs by service type

Do not judge Meta only by form fills.

If Meta creates more calls and more booked brake, battery, or diagnostic jobs, it is doing its job.

---

## What to test after the first 30 days

Once the account has real data, test one variable at a time:

1. urgent-only versus urgent + maintenance
2. service-page destination versus contact-page destination
3. call ad versus website lead ad
4. Simon video versus static driveway imagery
5. convenience angle versus problem angle

Do not test all of these simultaneously in a low-budget account.

---

## Benchmarks to use carefully

There is no reliable universal CPL benchmark for a business like this that you should trust blindly.

A more useful benchmark stack is:

- can leads be contacted?
- do they describe real vehicles and real service needs?
- do they book?
- what job value are they tied to?

For Wrench Ready, a "cheap" lead that never answers is worse than an expensive lead tied to a brake job or battery replacement.

Judge the channel by:

- booked jobs
- route-fit jobs
- gross margin by acquired job
- repeat-customer creation

---

## Final recommendation

Yes, Meta is doable for Wrench Ready.

But the right version is:

- simpler than the Dominion plan
- phone-first
- website-funnel aware
- built around urgent local service demand
- supported by proper Meta browser + server tracking

The wrong version would be:

- copying the real-estate structure directly
- overbuilding ad sets
- relying on unsupported instant-form "pixel training" theories
- optimizing for cheap leads instead of booked jobs

---

## Immediate next steps

1. Add Meta Pixel to the site.
2. Add Meta CAPI to `src/app/api/appointments/route.ts`.
3. Add deduplicated `Lead` event firing with an `event_id`.
4. Track `tel:` and `sms:` clicks for Meta and GA.
5. Build 5 to 6 local-service creatives.
6. Launch one urgent-service campaign first.
7. Review booked-job quality after the first 2 to 3 weeks before expanding.
