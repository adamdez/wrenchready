import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react";
import { InboundTriageForm } from "@/components/inbound-triage-form";
import { PromoteInboundForm } from "@/components/promote-inbound-form";
import { getPlaybookRecommendation } from "@/lib/promise-crm/playbooks";
import { getInboundRecord } from "@/lib/promise-crm/server";

type InboundDetailPageProps = {
  params: Promise<{ id: string }>;
};

type InboundDetailRecord = Awaited<ReturnType<typeof getInboundRecord>>;

function formatVehicle(record: NonNullable<InboundDetailRecord>) {
  return `${record.vehicle.year} ${record.vehicle.make} ${record.vehicle.model}`;
}

function serviceClassLabel(value?: NonNullable<InboundDetailRecord>["serviceClass"]) {
  if (value === "hero-core") return "Hero / core";
  if (value === "selective") return "Selective";
  if (value === "never-standalone") return "Never standalone";
  return "Needs policy";
}

function acceptancePolicyLabel(value?: NonNullable<InboundDetailRecord>["acceptancePolicy"]) {
  if (value === "dispatch-first") return "Dispatch first";
  if (value === "screen-hard") return "Screen hard";
  if (value === "accept-if-bundled") return "Accept if bundled";
  if (value === "decline-if-standalone") return "Decline if standalone";
  return "Human call";
}

function marketingRoleLabel(value?: NonNullable<InboundDetailRecord>["marketingRole"]) {
  if (value === "hero") return "Hero";
  if (value === "demand-capture") return "Demand capture";
  if (value === "hero-b2b") return "Hero for B2B";
  return "Needs role";
}

function dispatchTierLabel(value?: NonNullable<InboundDetailRecord>["dispatchTier"]) {
  if (value === "dispatch-first") return "Dispatch first";
  if (value === "selective-screening") return "Selective screening";
  if (value === "bundle-only") return "Bundle only";
  if (value === "decline-standalone") return "Decline standalone";
  return "Needs tier";
}

export const metadata: Metadata = {
  title: "Inbound Detail",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InboundDetailPage({ params }: InboundDetailPageProps) {
  const { id } = await params;
  const inbound = await getInboundRecord(id);

  if (!inbound) {
    notFound();
  }

  const playbook = getPlaybookRecommendation(
    `${inbound.requestedService} ${inbound.symptomSummary} ${inbound.marketingOffer || ""}`,
  );

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
          <ClipboardCheck className="h-3.5 w-3.5" />
          Inbound Detail
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground">
          {inbound.customer.name}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{inbound.requestedService}</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound className="h-4 w-4 text-primary" />
              Customer
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{inbound.customer.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{inbound.customer.phone}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-primary" />
              Vehicle
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{formatVehicle(inbound)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {inbound.vehicle.mileage?.toLocaleString()} miles
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Worksite
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{inbound.location.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {inbound.location.accessNotes || inbound.location.territory}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Phone className="h-4 w-4 text-primary" />
              Ownership
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{inbound.owner}</p>
            <p className="mt-1 text-sm text-muted-foreground">Risk: {inbound.readinessRisk}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Policy: {acceptancePolicyLabel(inbound.acceptancePolicy)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">What the customer said</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {inbound.symptomSummary}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Preferred window
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{inbound.preferredWindow.label}</p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Service class
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {serviceClassLabel(inbound.serviceClass)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{inbound.serviceLane}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Promise fit
                </p>
                <p className="mt-2 text-sm capitalize text-muted-foreground">
                  {inbound.promiseFit || "review"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {acceptancePolicyLabel(inbound.acceptancePolicy)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Marketing role
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {marketingRoleLabel(inbound.marketingRole)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {inbound.marketingOffer || inbound.requestedService}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Dispatch tier
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {dispatchTierLabel(inbound.dispatchTier)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Keep marketing and dispatch logic separate.
                </p>
              </div>
            </div>

            {inbound.wedgePromise || inbound.dispatchGate ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Wedge promise
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {inbound.wedgePromise || "This lane still needs a sharper promise."}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Dispatch gate
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {inbound.dispatchGate || "Human screening should hold this until the promise is believable."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Operator notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {inbound.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {note}
                </li>
              ))}
            </ul>
          </div>

          {inbound.pricingGuardrails?.length ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <h2 className="text-xl font-bold text-foreground">Pricing guardrails</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {inbound.pricingGuardrails.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {inbound.screeningQuestions?.length ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <h2 className="text-xl font-bold text-foreground">Wedge screening questions</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {inbound.screeningQuestions.map((question) => (
                  <li key={question} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {inbound.redFlagTriggers?.length ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <h2 className="text-xl font-bold text-foreground">Red flags before dispatch</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {inbound.redFlagTriggers.map((trigger) => (
                  <li key={trigger} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {trigger}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {inbound.followOnPath?.length ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <h2 className="text-xl font-bold text-foreground">Follow-on path</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {inbound.followOnPath.map((path) => (
                  <li key={path} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {path}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <InboundTriageForm inbound={inbound} />

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Next best move</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{inbound.nextAction}</p>
          </div>

          {(playbook.dispatchRule || playbook.quoteScript || playbook.addOnPlays.length > 0) ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground">Relevant playbook</h2>
                <Link
                  href="/ops/playbooks"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Open full playbooks
                </Link>
              </div>

              {playbook.dispatchRule ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Dispatch decision
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.dispatchRule.lane}: {playbook.dispatchRule.firstPromise}
                  </p>
                </div>
              ) : null}

              {playbook.quoteScript ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Quote opener
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.quoteScript.opener}
                  </p>
                </div>
              ) : null}

              {playbook.addOnPlays[0] ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Honest next-step offer
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.addOnPlays[0].honestOffer}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.addOnPlays[0].customerWords}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Qualification reminder</h2>
            <div className="mt-4 flex gap-2 text-sm text-muted-foreground">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Do not turn this into a promise until the location, scope, owner, and window are
              clear enough to keep.
            </div>
          </div>

          <PromoteInboundForm inbound={inbound} />
        </div>
      </section>
    </div>
  );
}
