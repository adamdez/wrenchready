import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldAlert,
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

type InboundDetailRecord = NonNullable<Awaited<ReturnType<typeof getInboundRecord>>>;

export const metadata: Metadata = {
  title: "Inbound Detail",
  robots: {
    index: false,
    follow: false,
  },
};

function formatVehicle(record: InboundDetailRecord) {
  return [record.vehicle.year, record.vehicle.make, record.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function phoneHref(phone?: string) {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function smsHref(phone?: string) {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}` : undefined;
}

function statusLabel(record: InboundDetailRecord) {
  if (record.qualificationStatus === "promoted") return "Promoted to promise";
  if (record.qualificationStatus === "screening") return "Screening";
  return "New request";
}

function isPromised(record: InboundDetailRecord) {
  return record.qualificationStatus === "promoted";
}

function isMissingTiming(label?: string) {
  const normalized = (label || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "no timing selected" ||
    normalized.includes("not selected") ||
    normalized.includes("tbd")
  );
}

function riskClasses(record: InboundDetailRecord) {
  if (record.readinessRisk === "high") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (record.readinessRisk === "medium") {
    return "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }
  return "border-[--wr-teal]/30 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function sourceLabel(source: InboundDetailRecord["source"]) {
  if (source === "voicemail") return "Voicemail";
  if (source === "phone") return "Phone call";
  if (source === "text") return "Text";
  if (source === "manual") return "Manual";
  return "Website";
}

function sourceClasses(source: InboundDetailRecord["source"]) {
  if (source === "voicemail") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (source === "phone") {
    return "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }
  if (source === "text") return "border-primary/25 bg-primary/10 text-primary";
  return "border-border bg-background text-muted-foreground";
}

function isVoiceLead(record: InboundDetailRecord) {
  return record.source === "voicemail" || record.source === "phone";
}

function findRecordingUrl(record: InboundDetailRecord) {
  const searchable = [
    record.symptomSummary,
    record.location.accessNotes,
    ...record.notes,
  ].filter(Boolean);

  for (const value of searchable) {
    const match = String(value).match(/https?:\/\/\S+/);
    if (match && /recording|voicemail|\.mp3/i.test(String(value))) {
      return match[0].replace(/[),.]+$/, "");
    }
  }

  return undefined;
}

function DataUnavailable({ message }: { message: string }) {
  return (
    <div className="shell py-10 sm:py-14">
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-100 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Promise CRM unavailable
        </p>
        <h1 className="mt-4 text-3xl font-bold text-foreground">Inbound record cannot load live data.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-red-100">
          WrenchReady is not showing demo or fallback CRM data. Check Supabase before using this
          page for appointment decisions.
        </p>
        <p className="mt-4 text-xs text-red-100/80">{message}</p>
      </section>
    </div>
  );
}

function FactCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items?: string[];
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/50 p-6">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {items?.length ? (
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export default async function InboundDetailPage({ params }: InboundDetailPageProps) {
  const { id } = await params;
  let inbound: InboundDetailRecord | undefined;

  try {
    inbound = (await getInboundRecord(id)) || undefined;
  } catch (error) {
    return (
      <DataUnavailable
        message={error instanceof Error ? error.message : "Unknown inbound read failure."}
      />
    );
  }

  if (!inbound) {
    notFound();
  }

  const playbook = getPlaybookRecommendation(
    `${inbound.requestedService} ${inbound.symptomSummary} ${inbound.marketingOffer || ""}`,
  );
  const promised = isPromised(inbound);
  const timingMissing = isMissingTiming(inbound.preferredWindow.label);
  const callHref = phoneHref(inbound.customer.phone);
  const textHref = smsHref(inbound.customer.phone);
  const recordingUrl = findRecordingUrl(inbound);
  const voiceLead = isVoiceLead(inbound);

  return (
    <div className="shell py-10 sm:py-14">
      <Link
        href="/ops/promises"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Today Queue
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Inbound request
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  promised
                    ? "border-[--wr-teal]/30 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
                    : "border-red-500/30 bg-red-500/10 text-red-200"
                }`}
              >
                {promised ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {promised ? "Promise exists" : "No appointment promised yet"}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${sourceClasses(inbound.source)}`}
              >
                {inbound.source === "text" ? (
                  <MessageSquareText className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                {sourceLabel(inbound.source)}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {inbound.customer.name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {inbound.requestedService} · {formatVehicle(inbound)}
            </p>
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Next action
              </p>
              <p className="mt-2 text-base leading-relaxed text-foreground">{inbound.nextAction}</p>
            </div>
            {voiceLead ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200">
                  Missed call / voicemail action
                </p>
                <p className="mt-2 text-sm leading-relaxed text-red-100">
                  Call back first. Confirm the request, vehicle, worksite, timing, and whether this
                  should become a promised appointment.
                </p>
                {recordingUrl ? (
                  <a
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-100 transition-all hover:bg-red-500/15"
                    href={recordingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Phone className="h-4 w-4" />
                    Open voicemail recording
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-card/50 p-4 xl:w-[22rem]">
            <p className="text-sm font-semibold text-foreground">Contact now</p>
            <p className="mt-1 text-sm text-muted-foreground">Preferred: {inbound.customer.preferredContact}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {callHref ? (
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                  href={callHref}
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : null}
              {textHref ? (
                <a
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
                  href={textHref}
                >
                  Text
                </a>
              ) : null}
              {inbound.customer.email ? (
                <a
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
                  href={`mailto:${inbound.customer.email}`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              ) : null}
            </div>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>{inbound.customer.phone}</p>
              {inbound.customer.email ? <p>{inbound.customer.email}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FactCard icon={<UserRound className="h-4 w-4 text-primary" />} label="Status">
            <p className="font-semibold text-foreground">{statusLabel(inbound)}</p>
            <p className="mt-1">{inbound.owner}</p>
            <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClasses(inbound)}`}>
              {inbound.readinessRisk} risk
            </span>
          </FactCard>

          <FactCard icon={<Wrench className="h-4 w-4 text-primary" />} label="Vehicle">
            <p>{formatVehicle(inbound)}</p>
            <p className="mt-1">
              {inbound.vehicle.mileage
                ? `${inbound.vehicle.mileage.toLocaleString()} miles`
                : "Mileage not recorded"}
            </p>
          </FactCard>

          <FactCard icon={<MapPin className="h-4 w-4 text-primary" />} label="Where">
            <p>{inbound.location.label}</p>
            <p className="mt-1">{inbound.location.accessNotes || inbound.location.territory}</p>
          </FactCard>

          <FactCard icon={<CalendarClock className="h-4 w-4 text-primary" />} label="Timing">
            <p className={timingMissing ? "font-semibold text-red-200" : "text-muted-foreground"}>
              {inbound.preferredWindow.label}
            </p>
            {timingMissing ? <p className="mt-1 text-red-100">Timing must be confirmed before promise.</p> : null}
          </FactCard>
        </div>
      </header>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">What the customer said</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {inbound.symptomSummary || inbound.requestedService}
            </p>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Service lane
                </dt>
                <dd className="mt-2 text-sm text-muted-foreground">{inbound.serviceLane}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Dispatch gate
                </dt>
                <dd className="mt-2 text-sm text-muted-foreground">
                  {inbound.dispatchGate || "Human screening decides whether this becomes a promise."}
                </dd>
              </div>
            </dl>
          </section>

          <ListBlock
            title="Screen before promising"
            items={inbound.screeningQuestions}
            empty="No screening questions were generated for this inbound request."
          />

          <ListBlock
            title="Pricing and dispatch guardrails"
            items={inbound.pricingGuardrails}
            empty="No pricing guardrails were generated for this inbound request."
          />

          <ListBlock
            title="Slow down if you hear"
            items={inbound.redFlagTriggers}
            empty="No red flags were generated for this inbound request."
          />

          <ListBlock title="Operator notes" items={inbound.notes} empty="No operator notes recorded." />
        </div>

        <aside className="space-y-6">
          <InboundTriageForm inbound={inbound} />

          {(playbook.dispatchRule || playbook.quoteScript || playbook.addOnPlays.length > 0) ? (
            <section className="rounded-3xl border border-border bg-card/50 p-6">
              <h2 className="text-xl font-bold text-foreground">Relevant playbook</h2>
              {playbook.dispatchRule ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Dispatch decision
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {playbook.dispatchRule.lane}: {playbook.dispatchRule.firstPromise}
                  </p>
                </div>
              ) : null}
              {playbook.quoteScript ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Quote opener
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {playbook.quoteScript.opener}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Promise reminder</h2>
            <div className="mt-4 flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Do not promote until the customer, scope, timing, owner, and price expectation are
              clear enough to say back to the customer in one sentence.
            </div>
            {!promised ? (
              <div className="mt-4 flex gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-relaxed text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This request is still not an appointment.
              </div>
            ) : null}
          </section>

          <PromoteInboundForm inbound={inbound} />
        </aside>
      </section>
    </div>
  );
}
