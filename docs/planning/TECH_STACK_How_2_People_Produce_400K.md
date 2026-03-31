
TECH STACK
How 2 People Produce $400K

8 force multipliers that eliminate the need for a third hire
AI voice • Automation engine • AI estimates • AI inspections • Route intelligence
Deferred-work engine • Repeat booking • Ops mirror database

Mobile Auto Repair  •  Spokane County, WA  •  March 2026

Total stack cost: $600–$1,600/month.
Revenue impact: +$100K–$150K/year from the same two people.

1. The Problem This Stack Must Solve
This tech stack serves two purposes. First, it makes a 2-person founding team produce $400K in Spokane by eliminating the bottlenecks that would otherwise require a third hire. Second, it creates the data infrastructure, automation patterns, and centralized operations capability that allow the company to scale across 5–6 Pacific Northwest markets with minimal admin drag per active wrench.
Stage 1 (Spokane): 2 people, $400K
$400K/year = 41 jobs/week at $200 ARO. One mechanic doing 4–5 jobs/day can produce $4,000–$6,000/week. The gap between what one mechanic can wrench and $8,250/week is closed by higher ARO, better route density, and automation that lets Dez handle the admin of 40+ jobs/week.
Stage 5 (Pacific Northwest): 40 techs, $10M
$10M/year = 178 jobs/day across 36–40 technicians in 5–6 markets. The control tower handles intake, estimates, scheduling, follow-up, and reporting centrally at a coordinator-to-tech ratio of 1:6 to 1:8. Every tool below is classified by when it matters:
Every tool below is tagged with its tier. Day-1 tools ship this week. R&D tools are built during Spokane. Control Tower tools are built when the second market opens.


2. The Complete Stack

Total monthly tech cost (steady state): $310–$720 + ad spend. Annual: $3,700–$8,640 + ads.
Annual ad spend (if working): $3,600–$10,800 ($300–$900/month).
Total tech + ads investment: $7,300–$19,440/year to support $400K in revenue. That’s a 20–55× return.


3. The 8 Force Multipliers
Force Multiplier 1: AI Voice Receptionist
Problem: Every missed call is a $200–$600 job lost. Small businesses miss 62% of incoming calls on average. If Simon is under a car and Dez is on another call, the next customer dials the competitor.
Solution: AI voice receptionist (Goodcall at $59/mo or Rosie at $49/mo) answers every call 24/7. It captures name, vehicle Y/M/M, symptom, address, and urgency. It can check calendar availability and book simple appointments. It texts a structured intake summary to Dez for review.
How it works in practice
Customer calls at 2:15 PM while Dez is on another line. AI answers: “Hi, thanks for calling [Business]. I can help you get set up. What’s the year, make, and model of your vehicle?”
AI collects Y/M/M, symptom (“my brakes are squealing”), address, and preferred day.
AI texts Dez: “New lead: 2019 Honda CR-V, front brakes squealing, 4512 E 29th Ave, prefers Saturday. Customer: Sarah M, 509-555-1234.”
Dez reviews, confirms the job fits the zone and service lane, and calls Sarah back within 15 minutes to book.
After hours: AI answers, captures the same data, tells the customer “someone will call you back first thing tomorrow morning.”
Time saved for Dez: 10–15 minutes per lead on initial intake. At 5–10 leads/day, that’s 50–150 minutes/day.
Revenue protected: At 2–3 captured calls/day that would have been missed = $400–$1,800/day in potential revenue saved.
Guardrail: AI does NOT approve work, commit to prices, or make promises about timing. It captures information and hands off to Dez. Human review on every lead before booking.

Force Multiplier 2: n8n Automation Engine
Problem: Dez manually sends review requests, manually texts follow-ups, manually triggers deferred-work reminders, manually builds the daily schedule briefing. These are predictable, rule-based tasks that consume 60–90 minutes/day.
Solution: n8n (self-hosted, free) automates every triggered workflow: review request fires 10 min after job completion, deferred-work reminder fires at 30/60/90 days, maintenance reminder fires at the interval, nightly route briefing compiles and texts to Simon, weekly KPI dashboard auto-generates.
Workflows Dez should build in the first 30 days
Auto review request: job marked complete in system of record → n8n fires text with direct Google review link within 10 minutes.
Deferred-work reminder: SOON item logged with follow-up date → n8n fires personalized text at 30 days: “Hi [Name], when we serviced your [Vehicle] last month, we noted [finding]. Ready to get that taken care of?”
Maintenance reminder: oil change completed → n8n calculates next service date → fires reminder text at the interval.
Nightly briefing: n8n compiles tomorrow’s appointments, addresses, customer notes, parts status → texts to Simon by 8 PM.
Missed-call recovery: if AI receptionist captures a lead and Dez hasn’t responded within 30 minutes, n8n sends Dez an escalation alert.
Weekly KPI email: n8n pulls data from the ops mirror database → generates a summary of jobs, ARO, reviews, deferred pipeline, ad CPL.
Time saved for Dez: 60–90 minutes/day on triggered tasks that now happen automatically.
Guardrail: n8n is the orchestration layer, not the source of truth. All data originates from and returns to the system of record. If n8n goes down, Dez does these tasks manually until it’s fixed. The business never stops because of an automation failure.

Force Multiplier 3: AI-Powered Estimate Drafting
Problem: Writing a detailed, RCW 46.71-compliant estimate from scratch takes 15–30 minutes. If Simon does it, that’s wrench time lost. If Dez does it manually for 4–6 jobs/day, that’s 60–180 minutes/day.
Solution: Simon leaves a 30-second voice note after diagnosing: “2019 CR-V, front brakes, pads and rotors, one caliper pin boot torn, about 1.5 hours.” Whisper (or the phone’s built-in transcription) converts to text. Claude or GPT drafts a formatted estimate from the transcription + vehicle-class pricing matrix + estimate templates. Dez reviews for accuracy (2–3 minutes) and sends.
How this works in practice
Simon finishes inspection. Records 30-second voice note on his phone.
Voice note auto-transcribes (Whisper via n8n, or built-in phone transcription).
n8n sends transcription + vehicle info to Claude API with the prompt: “Draft an estimate for this vehicle and service. Use the pricing matrix. Format as itemized parts + labor.”
Claude drafts the estimate. n8n sends the draft to Dez via text or Slack.
Dez reviews (2–3 min), adjusts if needed, sends to customer from the shop management system.
Time saved: Simon: 15–30 min/job (no longer writing estimates). Dez: estimate review drops from 20 min to 3 min per job. Net: 45–120 minutes/day saved across both.
Guardrail: AI drafts estimates. Dez reviews and sends. AI never sends an estimate directly to a customer without human review. Unusual or high-ticket estimates (>$500) get Simon’s approval before sending.

Force Multiplier 4: AI-Powered DVI Summaries
Problem: Raw DVI data (“front pads 3mm, RF slide pin dry, brake fluid 4.2% moisture”) means nothing to customers. Someone must translate it into plain language. This takes 5–10 minutes per job manually.
Solution: DVI checklist data flows from the shop management system. Claude converts it into a customer-friendly Now/Soon/Monitor summary with plain-language descriptions and approximate pricing. Dez reviews and sends.
Example output
“Hi Sarah, here’s what we found during your service today:
✅ NOW (recommended today): Your front brake pads are at 3mm — they’re safe to drive on briefly but should be replaced soon to avoid rotor damage. We can do this for approximately $320–$380.
⏳ SOON (within 60 days): Your brake fluid tested at 4.2% moisture. A flush would protect your brake system. Approximately $120.
🟢 MONITOR (next service): Rear brakes at 5mm — still have life. We’ll recheck at your next oil change.
No rush on any of this. Let me know if you’d like to schedule the brake pads.”
Time saved: 5–10 min/job × 4–6 jobs/day = 20–60 minutes/day. Plus: better summaries = higher deferred-work conversion = more revenue from existing customers.

Force Multiplier 5: Route Intelligence
Problem: Every minute Simon drives between jobs is a minute he’s not billing. At $140/hr, 30 min of excess drive time/day = $70/day = $17,500/year lost.
Solution: Phase 1 (Week 1): Google Maps multi-stop. Dez manually sequences jobs by geography. Phase 2 (Month 3+): OptimoRoute or VROOM (open-source) optimizes daily routes automatically. Phase 3: n8n auto-generates route suggestions based on tomorrow’s bookings + appointment durations + zone rules.
Revenue impact: Reducing average drive time from 25 min to 15 min between jobs = one extra job/day = $200–$300/day = $50K–$75K/year.

Force Multiplier 6: Deferred-Work Revenue Engine
Problem: Every SOON finding that goes unfollowed-up is a pre-qualified job that dies. If the average SOON item is worth $250 and you lose 3/week, that’s $37,500/year in abandoned revenue.
Solution: n8n automated follow-up sequence: text at 30 days, text at 60 days, final text at 90 days. Each message references the specific finding, vehicle, and approximate cost. If the customer responds, Dez books the job. If no response after 3 texts, the item moves to a 6-month MONITOR reminder.
Revenue impact: Converting 25–40% of SOON items = $20K–$40K/year in revenue from work customers already know they need, with zero marketing cost.

Force Multiplier 7: Repeat Booking Automation
Problem: Oil change customers who aren’t reminded will go to Jiffy Lube or forget. At 300 oil-change customers/year, a 10% loss rate = 30 lost repeat visits = $4,500–$6,000 in direct revenue plus downstream deferred-work opportunity.
Solution: n8n tracks service dates and mileage estimates. Auto-sends maintenance reminders at the calculated interval: “Hi [Name], your [Vehicle] is coming due for its next oil service. Ready to schedule? Reply YES.” Customer replies YES → Dez books it.
Revenue impact: Improving repeat rate from 25% to 45% = 60 additional repeat visits/year = $6K–$12K/year from existing customers.

Force Multiplier 8: Ops Mirror Database
Problem: The shop management system holds job records but doesn’t give you analytics on route efficiency, deferred-work conversion rates, customer lifetime value, or technician performance. Without clean data, pricing gets sloppy, follow-up gets generic, and you can’t prove the model works to investors or a future tech hire.
Solution: Supabase (free tier) or Postgres instance. n8n mirrors key events from the system of record into structured tables: leads, appointments, jobs, inspections, deferred work, reviews, route data, fleet activity. This becomes the analytics layer and the seed of any future marketplace control plane.
Key tables: Customers, Vehicles, Appointments, Estimates, Jobs, Inspections, DeferredWork, Reviews, RouteEvents, FleetAccounts, TechnicianMetrics.
This is the moat. A competitor who just uses AutoLeap can run a repair business. A competitor who also has a clean event database can build a platform. You don’t have to build the platform now. You just have to capture the data now so you have the option later.


4. What AI Should NOT Do
These guardrails prevent the tech stack from creating more problems than it solves.
AI should NOT approve repairs or authorize work. Customer authorization must be documented in the system of record by a human.
AI should NOT send estimates to customers without Dez reviewing first. Draft ≠ send.
AI should NOT commit to prices on non-standard work. Standard menu prices are fine. Custom quotes require human judgment.
AI should NOT replace Simon’s diagnostic judgment. AI can suggest differentials and surface TSBs. Simon makes the call.
AI should NOT message customers with unlimited autonomy. Pre-approved templates (review requests, reminders) are fine. Anything custom gets human review.
AI should NOT become the legal system of record. All approvals, invoices, and warranty terms live in AutoLeap/Tekmetric, not in n8n or Supabase.
AI voice receptionist should NOT make scheduling commitments. It captures information and hands off. Dez confirms every booking.
If the automation breaks, the business runs manually. n8n going down is an inconvenience, not a crisis. The system of record is the only tool whose failure stops the business.


5. Build Order: What Gets Built When

Total Dez build hours in the first 90 days: approximately 80–120 hours of tech work, spread across 12 weeks at 7–10 hrs/week. This fits inside Dez’s 70 hrs/week with plenty of room for daily operations.


6. How the Stack Scales: From 1 Route to 40 Routes
Every force multiplier above works for Spokane. The question is whether they scale to 5–6 markets with 36–40 technicians. Here is how each one evolves.

The ops mirror database is the most important scaling asset. At 1 route, it is useful analytics. At 40 routes, it is the difference between a manageable regional business and an unmanageable collection of local operations. Start capturing clean data from day 1, even if you only query it monthly at first.

7. Impact Summary
At Spokane scale (2 people), the stack adds $100K–$150K/year in additional revenue. At regional scale (40 techs), the stack saves 3–5 coordinator salaries ($120K–$250K/year), improves route economics by $500K–$1M/year through density optimization, and recovers $1M–$2M/year in deferred-work and repeat revenue that would otherwise be lost to silence.

Revenue impact summary
Captured calls that would have been missed: +$30K–$60K/year. Deferred-work conversion improvement: +$20K–$40K/year. Repeat booking improvement: +$6K–$12K/year. Route optimization (one extra job/day): +$50K–$75K/year. Simon admin time recovered (4–8 hrs/week → wrench time): +$25K–$45K/year.
Conservative combined impact: +$100K–$150K/year in additional revenue from the same two people. That is the difference between a $250K business that needs a third hire and a $400K business that doesn’t.


8. Monthly Cost Summary

At $400K gross revenue, the tech stack costs 1.8–4.8% of revenue. This is the cheapest “employee” you will ever hire. The stack does the work of 2–3 additional people at 5% of the cost.


9. The One Rule for Every Tech Decision

Does this tool add a billable wrench-hour to Simon’s day
or remove 15+ minutes of admin from Dez’s week?
If yes, build it now. If no, put it in the backlog.
If you can’t measure the impact in wrench-hours or admin-minutes,
it’s a vanity project.