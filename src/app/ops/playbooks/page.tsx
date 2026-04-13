import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  dispatchDecisionRules,
  drivewayAddOnPlays,
  proofCaptureChecklist,
  quoteScripts,
  reminderSeedPlays,
  reviewAskScripts,
} from "@/lib/promise-crm/playbooks";

export const metadata: Metadata = {
  title: "Ops Playbooks",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function decisionLabel(value: string) {
  if (value === "book-now") return "Book now";
  if (value === "quote-and-book-later") return "Quote and book later";
  if (value === "paid-diagnostic-first") return "Paid diagnostic first";
  if (value === "bundle-only") return "Bundle only";
  return "Decline";
}

export default function OpsPlaybooksPage() {
  return (
    <div className="shell py-10 sm:py-14">
      <Link
        href="/ops/promises"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Promise Board
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <BookOpenText className="h-3.5 w-3.5" />
          WrenchReady Operator Playbooks
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Standardize the language before the day gets fuzzy.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The machine already knows service class, dispatch tier, and follow-on path. This page is
          the human layer: how to decide, how to talk, and how to earn the next visit without
          sounding vague or salesy.
        </p>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Dispatcher decision framework</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Use these rules to decide whether the next move is book now, quote later, diagnostic
            first, bundle only, or decline. This is where route quality and promise quality stay
            protected.
          </p>

          <div className="mt-6 space-y-4">
            {dispatchDecisionRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rule.lane}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">
                      {decisionLabel(rule.recommendedDecision)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    First promise
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {rule.firstPromise}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Use when
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {rule.useWhen.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--wr-teal]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Avoid when
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {rule.avoidWhen.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--wr-gold]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Pricing posture
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {rule.pricingPosture.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Quote script library</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            These scripts are here so phone and text language feels calm, consistent, and honest
            across the core lanes.
          </p>

          <div className="mt-6 space-y-4">
            {quoteScripts.map((script) => (
              <div key={script.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{script.lane}</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Opener
                    </p>
                    <p className="mt-1 leading-relaxed">{script.opener}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      First step
                    </p>
                    <p className="mt-1 leading-relaxed">{script.firstStep}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Pricing language
                    </p>
                    <p className="mt-1 leading-relaxed">{script.pricingLanguage}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      What happens next
                    </p>
                    <p className="mt-1 leading-relaxed">{script.whatHappensNext}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Do not say
                    </p>
                    <ul className="mt-1 space-y-2">
                      {script.doNotSay.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--wr-gold]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Driveway add-on playbook</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The point is not surprise upsells. The point is turning the completed visit into the
            honest next step that fits what was already found.
          </p>

          <div className="mt-6 space-y-4">
            {drivewayAddOnPlays.map((play) => (
              <div key={play.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{play.sourceLane}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Trigger: {play.trigger}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Honest offer
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{play.honestOffer}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{play.whyItFits}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Customer words
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {play.customerWords}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Closeout seed: {play.closeoutSeed}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Proof capture checklist</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every strong job should leave behind trust assets, not just an invoice.
          </p>

          <div className="mt-6 space-y-4">
            {proofCaptureChecklist.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.whyItMatters}</p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Review ask scripts</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The ask should sound like a natural extension of the promise you kept, not a generic
            plea for stars.
          </p>

          <div className="mt-6 space-y-4">
            {reviewAskScripts.map((script) => (
              <div key={script.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{script.lane}</p>
                <p className="mt-2 text-sm text-muted-foreground">Use when: {script.useWhen}</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Ask
                    </p>
                    <p className="mt-1 leading-relaxed">{script.ask}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Follow-up note
                    </p>
                    <p className="mt-1 leading-relaxed">{script.followUpNote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Reminder seed plays</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A seeded reminder should make the next visit more likely, not just create admin noise.
          </p>

          <div className="mt-6 space-y-4">
            {reminderSeedPlays.map((play) => (
              <div key={play.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{play.lane}</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Seed when
                    </p>
                    <p className="mt-1 leading-relaxed">{play.seedWhen}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Message
                    </p>
                    <p className="mt-1 leading-relaxed">{play.message}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Timing logic
                    </p>
                    <p className="mt-1 leading-relaxed">{play.timingLogic}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
