import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareShare, Send, TimerReset } from "lucide-react";
import { OutboundActionForm } from "@/components/outbound-action-form";
import { getOutboundQueueSnapshot } from "@/lib/promise-crm/server";
import type { OutboundQueueItem } from "@/lib/promise-crm/types";

export const metadata: Metadata = {
  title: "Outbound Queue",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function channelLabel(value: OutboundQueueItem["channelType"]) {
  if (value === "review-ask") return "Review ask";
  if (value === "maintenance-reminder") return "Maintenance reminder";
  return "Customer recap";
}

function formatBoardTime(value?: string) {
  if (!value) return "No due time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function QueueCard({ item }: { item: OutboundQueueItem }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/ops/promises/${item.promiseId}`}
            className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            {item.customerName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.serviceScope} / {item.territory}
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {item.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {channelLabel(item.channelType)}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {item.preferredChannel}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          Due {formatBoardTime(item.dueAt)}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">{item.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.reason}</p>

      {item.subject ? (
        <p className="mt-3 text-xs text-muted-foreground">Subject: {item.subject}</p>
      ) : null}

      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border/70 bg-card/50 p-3 text-sm text-muted-foreground">
        {item.body}
      </pre>

      <OutboundActionForm item={item} />
    </div>
  );
}

export default async function OutboundQueuePage() {
  const snapshot = await getOutboundQueueSnapshot();
  const sendReady = snapshot.items.filter((item) => item.status === "send-ready");
  const drafts = snapshot.items.filter((item) => item.status === "draft");

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
          <Send className="h-3.5 w-3.5" />
          Outbound Queue
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Turn recap, reviews, and reminders into owned outbound work.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This queue is the send layer on top of closeout. It keeps the next message visible instead of assuming someone will remember it.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Total queued</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Send-ready</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.sendReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Draft-only</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.draftOnly}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Sent today</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.sentToday}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recaps</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{snapshot.summary.recapReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review asks</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{snapshot.summary.reviewReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Reminder seeds</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{snapshot.summary.reminderReady}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareShare className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Send-ready now</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                These items are ready to go through the webhook delivery path right now.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {sendReady.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {sendReady.length > 0 ? (
              sendReady.map((item) => <QueueCard key={`${item.promiseId}-${item.channelType}`} item={item} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No send-ready outbound items right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TimerReset className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Drafts waiting on ops</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                These still need cleaner closeout, a ready state, or a send decision.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {drafts.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {drafts.length > 0 ? (
              drafts.map((item) => <QueueCard key={`${item.promiseId}-${item.channelType}`} item={item} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No draft-only outbound items right now.
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
