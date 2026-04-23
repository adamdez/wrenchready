import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CarFront,
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CustomerNextStepRequest } from "@/components/customer-next-step-request";
import { CustomerBalanceCheckout } from "@/components/customer-balance-checkout";
import { CustomerDepositCheckout } from "@/components/customer-deposit-checkout";
import { CustomerPromiseApproval } from "@/components/customer-promise-approval";
import {
  getCloseoutRecapItems,
  getNextProbableVisit,
} from "@/lib/promise-crm/closeout-recapture";
import { buildCustomerStatusView } from "@/lib/promise-crm/customer-view";
import { computePromiseEconomics } from "@/lib/promise-crm/economics";
import { getPromiseRecordByCustomerToken } from "@/lib/promise-crm/server";
import { siteConfig } from "@/data/site";

type CustomerStatusPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "WrenchReady Service Status",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatCurrency(value?: number) {
  if (value === undefined) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "We will update this as soon as timing is locked.";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function timelineStateClasses(state: "complete" | "current" | "upcoming") {
  if (state === "complete") return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
  if (state === "current") return "border-primary/20 bg-primary/10 text-primary";
  return "border-border bg-background/60 text-muted-foreground";
}

function toneClasses(tone: ReturnType<typeof buildCustomerStatusView>["tone"]) {
  if (tone === "risk") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (tone === "attention") return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  if (tone === "follow-through") return "border-primary/20 bg-primary/10 text-primary";
  if (tone === "complete") return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
  return "border-primary/20 bg-primary/10 text-primary";
}

export default async function CustomerStatusPage({
  params,
  searchParams,
}: CustomerStatusPageProps) {
  const { token } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const promise = await getPromiseRecordByCustomerToken(token);

  if (!promise) {
    notFound();
  }

  const view = buildCustomerStatusView(promise);
  const economics = computePromiseEconomics(promise.economics);
  const recap = getCloseoutRecapItems(promise.closeout);
  const nextProbableVisit = getNextProbableVisit(promise);
  const recommendedService =
    nextProbableVisit?.service ||
    promise.customerApproval.requestedService ||
    promise.commercialOutcome?.convertedService ||
    promise.serviceScope;
  const depositState =
    typeof resolvedSearchParams.deposit === "string" ? resolvedSearchParams.deposit : undefined;
  const balanceState =
    typeof resolvedSearchParams.balance === "string" ? resolvedSearchParams.balance : undefined;

  return (
    <div className="shell py-10 sm:py-14">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              WrenchReady Service Status
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {view.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {view.message}
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses(view.tone)}`}>
            {promise.scheduledWindow.label}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CarFront className="h-4 w-4 text-primary" />
              Vehicle
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {promise.vehicle.year} {promise.vehicle.make} {promise.vehicle.model}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {promise.vehicle.mileage
                ? `${promise.vehicle.mileage.toLocaleString()} miles`
                : "Mileage not recorded"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-primary" />
              Service
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{promise.serviceScope}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Coordinator: {promise.owner}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{promise.location.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{promise.location.territory}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Phone className="h-4 w-4 text-primary" />
              Contact
            </div>
            <a
              className="mt-3 inline-flex text-sm text-muted-foreground hover:text-foreground"
              href={siteConfig.contact.phoneHref}
            >
              {siteConfig.contact.phoneDisplay}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">
              Preferred updates by {promise.customer.preferredContact}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {depositState || balanceState ? (
            <div
              className={`rounded-3xl border p-5 text-sm ${
                (depositState || balanceState) === "success"
                  ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
                  : "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]"
              }`}
            >
              {depositState === "success"
                ? "Your secure deposit checkout completed. WrenchReady will update the visit record as payment settles."
                : balanceState === "success"
                  ? "Your remaining-balance checkout completed. WrenchReady will update the visit record as payment settles."
                  : depositState === "cancelled"
                    ? "Deposit checkout was cancelled before payment completed. You can reopen it anytime from this page."
                    : "Balance checkout was cancelled before payment completed. You can reopen it anytime from this page."}
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">What happens next</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  This is the live promise timeline for your visit. We keep this page updated so you
                  can see where things stand without guessing.
                </p>
              </div>
              <Clock3 className="h-6 w-6 text-primary" />
            </div>

            <div className="mt-6 space-y-4">
              {view.timeline.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 ${timelineStateClasses(item.state)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.state === "complete" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : item.state === "current" ? (
                        <CircleAlert className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-sm leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <CustomerPromiseApproval token={token} approval={promise.customerApproval} />
          <CustomerDepositCheckout
            token={token}
            amount={promise.paymentCollection?.depositRequestedAmount}
            alreadyCollected={promise.paymentCollection?.amountCollected}
            status={promise.paymentCollection?.status}
          />
          <CustomerBalanceCheckout
            token={token}
            balanceDueAmount={promise.paymentCollection?.balanceDueAmount}
            status={promise.paymentCollection?.status}
          />
          <CustomerNextStepRequest
            token={token}
            recommendedService={recommendedService}
          />

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-2xl font-bold text-foreground">Visit recap</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              When the visit changes, this recap is where we keep the outcome and next-step story clear.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Outcome
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.closeout?.workPerformedSummary ||
                    promise.commercialOutcome?.convertedService ||
                    promise.customerApproval.requestedService ||
                    "No repair outcome recorded yet"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.closeout?.customerConditionSummary ||
                    promise.commercialOutcome?.outcomeSummary ||
                    promise.customerApproval.summary ||
                    promise.nextAction}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Next-step value
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.requestedAmount !== undefined
                    ? `${formatCurrency(promise.customerApproval.requestedAmount)} awaiting your decision`
                    : promise.commercialOutcome?.deferredValueAmount !== undefined
                      ? `${formatCurrency(promise.commercialOutcome.deferredValueAmount)} still open`
                      : "No additional amount recorded yet"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.customerMessage ||
                    promise.closeout?.reviewRequest?.summary ||
                    "If we recommend a next step, it will be recorded here clearly."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {[
                ["Now", recap.now],
                ["Soon", recap.soon],
                ["Monitor", recap.monitor],
              ].map(([label, items]) => (
                <div
                  key={label as string}
                  className="rounded-2xl border border-border bg-background/60 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {label as string}
                  </p>
                  {Array.isArray(items) && items.length > 0 ? (
                    <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                      {items.map((item) => (
                        <li key={`${label}-${item.title}`}>
                          <span className="font-medium text-foreground">{item.title}</span>
                          {item.detail ? ` - ${item.detail}` : ""}
                          {item.estimatedAmount !== undefined
                            ? ` (${formatCurrency(item.estimatedAmount)})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No {String(label).toLowerCase()} items recorded yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              Timing and contact
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Scheduled window
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{promise.scheduledWindow.label}</p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Follow-up due
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateTime(promise.followThroughDueAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Best way to reach us
                </p>
                <a
                  className="mt-2 inline-flex text-sm text-muted-foreground hover:text-foreground"
                  href={siteConfig.contact.phoneHref}
                >
                  {siteConfig.contact.phoneDisplay}
                </a>
                <p className="mt-2 text-sm text-muted-foreground">
                  {siteConfig.contact.email}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-2xl font-bold text-foreground">Pricing snapshot</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We show any captured quote or invoice detail here so the next-step story stays clear.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Quote or final invoice
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(
                    promise.customerApproval.requestedAmount ??
                      promise.economics?.finalInvoiceAmount ??
                      promise.economics?.quotedAmount,
                  )}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.status === "awaiting-approval"
                    ? "This is the amount currently awaiting your decision."
                    : "Captured pricing or the next probable visit amount will appear here when it is available."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Current recap
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.customerMessage ||
                    promise.closeout?.customerConditionSummary ||
                    promise.commercialOutcome?.outcomeSummary ||
                    promise.readinessSummary}
                </p>
              </div>

              {economics ? (
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Recorded invoice
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Final invoice: {formatCurrency(economics.revenue)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-2xl font-bold text-foreground">Keep this vehicle on track</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              WrenchReady should become easier to come back to than starting over. This card keeps the
              next logical service visible.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Recommended next service
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{recommendedService}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {nextProbableVisit?.reason ||
                    promise.customerApproval.summary ||
                    promise.commercialOutcome?.outcomeSummary ||
                    promise.nextAction}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Review and reminder
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review:{" "}
                  {promise.closeout?.reviewRequest?.status === "ready"
                    ? "Ready to send"
                    : promise.closeout?.reviewRequest?.status === "sent"
                      ? "Sent"
                      : "Not queued yet"}
                </p>
                {promise.closeout?.reviewRequest?.reviewUrl ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review link:{" "}
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={promise.closeout.reviewRequest.reviewUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open Google review
                    </a>
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  Reminder:{" "}
                  {promise.closeout?.maintenanceReminder?.dueLabel ||
                    promise.closeout?.maintenanceReminder?.summary ||
                    "No maintenance reminder seeded yet"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Need something corrected?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              If anything on this page looks wrong, call or email us and reference your current
              service status page.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                href={siteConfig.contact.phoneHref}
              >
                Call {siteConfig.contact.phoneDisplay}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/70 px-5 py-2.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
                href={`mailto:${siteConfig.contact.email}`}
              >
                Email support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
