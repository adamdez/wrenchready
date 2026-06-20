# Closing the Loops — Action Plan

Your system is better than it feels. It captures almost everything Jeff and your customers do — notes, photos, calls, quotes, closeouts — and most of it lands in clean, organized storage. The problem is what happens *next*: several of these threads of work get stored quietly and then just sit there. They never pop up on a screen you're looking at, and they never turn into a "do this next" task. So even though the work is recorded, *you* still have to go digging for it, remember it, and act on it by hand. That's the heaviness you feel. This plan walks each thread from start to finish, shows the exact spot where it goes quiet, and gives the smallest change that makes it surface and ask for action on its own. Closing these gaps is how the system starts keeping its promise to *you*, not just to your records.

## The loops, ranked by pain

Each thread is captured well; the pain is concentrated at the moment it should become something you see or do. All six rank near the top because each one currently forces you to chase work by hand.

| Journey | Where it breaks (stage + one line) | Pain (1-5) | Smallest fix |
| --- | --- | --- | --- |
| Inbound customer (call or web lead) | **Persist** — an *answered* phone call leaves zero trace; only missed calls get recorded. | 4 | Save a record on answered calls, not just missed ones (twilio/voice/fallback completed-status branch). |
| A quote becomes an approved, paid job | **Action** — Jeff drafts the quote but there's no "approve & send" button, so it never reaches the customer. | 4 | Add one owner-approved "send" action that arms the quote and shows it to the customer (quote-packet.ts:603, status/[token]/page.tsx:241). |
| Closeout → review → next visit | **Persist** — Jeff's field closeout only logs a note; it never saves the review ask or next-visit. | 4 | Make `start_closeout` save real closeout state, not just an event (tools.ts:4466). |
| A photo the mechanic drops for Jeff | **Surface** — dropped photos are stored but never analyzed, so the finding never appears. | 4 | Auto-analyze each photo on upload and show the result (route.ts:83, tools.ts:3611, page.tsx:1379). |
| A field note Jeff captures | **Action** — a clean note is stored but creates no task or alert. | 4 | Turn meaningful field notes into an operator task (tools.ts:2065). |
| Operator-task / blocker pileup (30 blocked, showing 4) | **Surface** — the board fetches 30 tasks but only shows 4. | 4 | Delete the 4-item cap so you see the whole list (ops/jeff/page.tsx:420). |

## Fix in this order

### This week (highest pain, smallest fix — quick wins that remove manual load)

- **Show all your tasks, not 4 of 30.** The board already pulls every open task, then hides all but four (ops/jeff/page.tsx:420). Remove that cap. *Why this helps you:* every blocker becomes visible at once with its Done/Working buttons already attached — no more guessing what's behind the "showing 4 of 30."
- **Turn a field note into a next action.** When Jeff saves a meaningful note (a reading, a suspected cause, a customer decision), create a task on the board you already watch (tools.ts:2065). *Why this helps you:* what Jeff reports from the field lands on your worklist instead of waiting for you to open a panel and eyeball it.
- **Auto-read every dropped photo.** Right now a photo is filed but never looked at unless someone asks. Run the analysis automatically when a photo arrives on a job, and show the finding (route.ts:83 / tools.ts:3611, then display it at page.tsx:1379). *Why this helps you:* the photo tells you what it shows without you remembering to ask Jeff to check it.

### This month

- **Record answered calls, not just missed ones.** Today only a missed call that rolls to voicemail creates a record; a customer who calls and gets through leaves nothing (twilio/voice/fallback completed-status branch — mirror voicemail/complete/route.ts:98). *Why this helps you:* your most common and most promise-critical contact stops living only in your phone's call log and starts showing up in "New Requests" for follow-through.
- **Build the "approve & send" button for quotes.** Jeff drafts a solid quote, but there's no action that finishes your review and sends it; the customer never sees the real number (quote-packet.ts:603 to mark it sent, status/[token]/page.tsx:241 to show it). *Why this helps you:* you stop copying quotes out by hand, and the Stripe payment flow you already have takes it from there.
- **Make Jeff's field closeout actually stick, then send the ask.** Have `start_closeout` save the review request and next-visit (tools.ts:4466), flip the quick-closeout form off its hardcoded "not-ready" (quick-closeout-form.tsx:92), and add one send action on /ops/outbound. *Why this helps you:* a finished job automatically produces a review ask and a scheduled next visit instead of a card telling you to redo the closeout by hand.

### Foundational (the persistence/force-load changes everything else depends on)

- **Make every captured thing become structured, surfaced state that triggers an action — automatically, not on a keyword or a click.** The field-note, photo, and closeout paths all stop short the same way: they store data but never wire it to the task board, never auto-run analysis, never force the next step (tools.ts:2065, tools.ts:3611, tools.ts:4466). *Why this helps you:* once capture always feeds the board and the board always shows everything, the system surfaces work *to* you instead of waiting to be asked — which is the whole point.
- **Force job context into Jeff instead of hoping he remembers.** Several breaks trace back to logic that only fires when a job is already attached or a keyword matches. Loading job/SOP/state up front (per the rule the code already sets for itself, operating-context.ts:62) closes those gaps at the root. *Why this helps you:* fewer notes and photos slip through because Jeff didn't have the job in hand at the moment of capture.

## The one root cause

There is a single structural pattern under all six leaks: **work gets captured, but it isn't consistently turned into structured state that surfaces on its own and pushes the next action.** When a note, photo, quote, or closeout is saved, the system has the pieces to make it actionable — a real task table, a board you watch, an analysis function, a follow-through engine — but it doesn't *wire the save to those pieces*. So the data exists and then waits for you to go find it. In a couple of cases (closeout, quotes) it's worse: the work is even buried as a prefixed string inside a shared notes blob instead of its own fields, so it's hard to surface cleanly.

Your own code already names this rule and commits to it: **"The backend must force context loading. Do not rely on the AI to remember to retrieve important job, SOP, price, or action state."** (operating-context.ts:62). The same principle is exactly what's being violated on the *output* side — the backend isn't forcing captured work into surfaced, action-triggering state; it's relying on a human (you) to remember to go look. Fix that one habit — *every meaningful save writes a structured row, lands on the board, and is loaded with job context up front* — and four of the six loops close on the same change. That's why the quick wins this week (un-cap the board, route notes to tasks, auto-analyze photos) feel so small individually but add up to the system finally working *for* you.

## What already works

A lot, and it's worth saying plainly so you know what you're building on:

- **Capture is solid almost everywhere.** Voice and text both reach real tools, photos have two working upload paths, and web/SMS leads flow in cleanly.
- **Your storage is genuinely good in most loops.** Field events, photos/media, inbound leads, and operator tasks all land in real, typed Supabase tables — not loose prose. The operator-task table even has proper indexes and de-duplicates re-runs so blockers never pile up twice.
- **Inbound and follow-through *surfacing* is already right.** New leads show up uncapped on the Promise Board, and the follow-through engine turns a real closeout into ranked, owner-assigned cards with "what to do next" built in.
- **The money rails are excellent.** Once a checkout link exists, Stripe handles deposits, balances, and refunds and writes the result straight back onto the job. You just need the human "send" action in front of it.

The machine is mostly built. What's missing is the wiring between "captured" and "surfaced as your next action" — and that's a handful of small, high-leverage edits, not a rebuild.
