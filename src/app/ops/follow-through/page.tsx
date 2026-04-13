import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, Clock3, HandCoins, Wrench } from "lucide-react";
import { FollowThroughActionForm } from "@/components/follow-through-action-form";
import { getFollowThroughWorklist } from "@/lib/promise-crm/server";
import type { FollowThroughTask } from "@/lib/promise-crm/types";

export const metadata: Metadata = {
  title: "Follow-through Worklist",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatCurrency(value?: number) {
  if (value === undefined || value <= 0) return "Not captured";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBoardTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function urgencyClasses(value: FollowThroughTask["urgency"]) {
  if (value === "overdue") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (value === "due-now") return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function urgencyLabel(value: FollowThroughTask["urgency"]) {
  if (value === "overdue") return "Overdue";
  if (value === "due-now") return "Due now";
  return "Queued";
}

function reasonLabel(value: FollowThroughTask["reason"]) {
  if (value === "approved-next-step") return "Approved next step";
  if (value === "deferred-work") return "Deferred work";
  if (value === "diagnostic-recap") return "Diagnostic recap";
  if (value === "review-request") return "Review request";
  if (value === "maintenance-reminder") return "Maintenance reminder";
  return "Open follow-through";
}

function reasonDescription(value: FollowThroughTask["reason"]) {
  if (value === "approved-next-step") {
    return "A customer said yes. The machine should now turn that yes into a real scheduled job.";
  }
  if (value === "deferred-work") {
    return "Value exists, but it is still floating. Someone needs to own the re-contact and close-the-loop path.";
  }
  if (value === "diagnostic-recap") {
    return "The inspection happened, but the economic story still needs to be made clear to the customer.";
  }
  if (value === "review-request") {
    return "A good finished visit should become a trust signal. Do not leave the review ask floating.";
  }
  if (value === "maintenance-reminder") {
    return "Completed work should seed the next maintenance touch, not just disappear into history.";
  }
  return "This promise still needs a recap, schedule lock, or explicit next step.";
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TaskCard({ task }: { task: FollowThroughTask }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/ops/promises/${task.promiseId}`}
            className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            {task.customerName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {task.marketingOffer || "Needs offer"} / {task.territory}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${urgencyClasses(task.urgency)}`}
        >
          {urgencyLabel(task.urgency)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {reasonLabel(task.reason)}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {task.owner}
        </span>
        {task.dueAt ? (
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            Due {formatBoardTime(task.dueAt)}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">{task.serviceScope}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.summary}</p>

      <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          What to do next
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {task.recommendedAction}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Converted service
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {task.convertedService || "No converted service recorded"}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Value signal
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Deferred {formatCurrency(task.deferredValueAmount)} / Net profit {formatCurrency(task.netProfitEstimateAmount)}
          </p>
        </div>
      </div>

      <FollowThroughActionForm task={task} />
    </div>
  );
}

export default async function FollowThroughPage() {
  const snapshot = await getFollowThroughWorklist();
  const approved = snapshot.tasks.filter((task) => task.reason === "approved-next-step");
  const deferred = snapshot.tasks.filter((task) => task.reason === "deferred-work");
  const recap = snapshot.tasks.filter((task) => task.reason === "diagnostic-recap");
  const reviews = snapshot.tasks.filter((task) => task.reason === "review-request");
  const reminders = snapshot.tasks.filter((task) => task.reason === "maintenance-reminder");
  const open = snapshot.tasks.filter((task) => task.reason === "open-follow-through");

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <HandCoins className="h-3.5 w-3.5" />
              Follow-through Worklist
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Close the value after the visit, not just the visit itself.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              This queue turns approved next steps, deferred work, and diagnostic recap tasks into owned work instead of quiet leakage.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Snapshot generated {formatBoardTime(snapshot.generatedAt)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open follow-through"
            value={snapshot.summary.total}
            description="Total promises that still need a real next step or close-the-loop action."
          />
          <StatCard
            label="Overdue"
            value={snapshot.summary.overdue}
            description="Items that should already have been re-contacted, scheduled, or resolved."
          />
          <StatCard
            label="Due now"
            value={snapshot.summary.dueNow}
            description="Live work that should be actively owned today."
          />
          <StatCard
            label="Deferred value"
            value={formatCurrency(snapshot.summary.deferredValueTotal)}
            description="Visible value still sitting in deferred recommendations."
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Approved next step"
            value={snapshot.summary.approvedNextStep}
            description="Customers who already said yes and still need the next visit locked."
          />
          <StatCard
            label="Deferred work"
            value={snapshot.summary.deferredWork}
            description="Work that still needs a re-contact and a cleaner next-step path."
          />
          <StatCard
            label="Diagnostic recap"
            value={snapshot.summary.diagnosticRecap}
            description="Diagnostic visits that need a tighter summary, pricing, or repair path."
          />
          <StatCard
            label="Review request"
            value={snapshot.summary.reviewRequest}
            description="Finished visits that should trigger or confirm a review ask."
          />
          <StatCard
            label="Reminder seed"
            value={snapshot.summary.maintenanceReminder}
            description="Completed visits that already know the next maintenance touch."
          />
          <StatCard
            label="Open follow-through"
            value={snapshot.summary.openFollowThrough}
            description="Promises that still need recap or scheduling even without a recorded commercial outcome."
          />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          What this page is for: make sure value does not die between &ldquo;we found it&rdquo; and &ldquo;we closed it.&rdquo;
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {[
          {
            title: "Approved next step",
            icon: <Wrench className="h-5 w-5" />,
            description: reasonDescription("approved-next-step"),
            tasks: approved,
          },
          {
            title: "Deferred work",
            icon: <HandCoins className="h-5 w-5" />,
            description: reasonDescription("deferred-work"),
            tasks: deferred,
          },
          {
            title: "Diagnostic recap",
            icon: <CircleAlert className="h-5 w-5" />,
            description: reasonDescription("diagnostic-recap"),
            tasks: recap,
          },
          {
            title: "Review request",
            icon: <HandCoins className="h-5 w-5" />,
            description: reasonDescription("review-request"),
            tasks: reviews,
          },
          {
            title: "Maintenance reminder",
            icon: <Clock3 className="h-5 w-5" />,
            description: reasonDescription("maintenance-reminder"),
            tasks: reminders,
          },
          {
            title: "Open follow-through",
            icon: <Clock3 className="h-5 w-5" />,
            description: reasonDescription("open-follow-through"),
            tasks: open,
          },
        ].map((section) => (
          <section key={section.title} className="rounded-3xl border border-border bg-card/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {section.icon}
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </div>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
                {section.tasks.length}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {section.tasks.length > 0 ? (
                section.tasks.map((task) => <TaskCard key={task.promiseId} task={task} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No live items in this lane right now.
                </div>
              )}
            </div>
          </section>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">How to use this queue</h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>Use approved-next-step items to turn customer yeses into real calendar commitments.</p>
          <p>Use deferred-work items to keep valuable recommendations from quietly dying after the first visit.</p>
          <p>Use diagnostic recap items to tighten the summary, pricing, and recommendation path while the pain is still fresh.</p>
          <p>Use open follow-through items to make sure &ldquo;completed&rdquo; never means &ldquo;nobody owned what happened next.&rdquo;</p>
        </div>
        <Link
          href="/ops/promises"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          Back to execution
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
