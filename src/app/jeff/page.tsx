import type { Metadata } from "next";
import {
  BookOpenText,
  Camera,
  ChevronRight,
  MessageCircle,
  Phone,
  Radio,
  ShieldAlert,
} from "lucide-react";
import {
  getActiveJeffLiveSession,
  getJeffFieldPhoneHref,
  getJeffFieldPhoneNumber,
} from "@/lib/jeff-field-assistant";

export const metadata: Metadata = {
  title: "Jeff",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatSessionTime(value?: string) {
  if (!value) return "No live call";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function JeffMobileHubPage() {
  const liveSession = getActiveJeffLiveSession();
  const photoHref = liveSession
    ? `/jeff/photo-drop?session=${encodeURIComponent(liveSession.id)}`
    : "/jeff/photo-drop";

  return (
    <main className="min-h-dvh bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">WrenchReady</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Jeff</h1>
          </div>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Current session
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {liveSession ? "Live Jeff call" : "No live call"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {liveSession
                  ? `${liveSession.status} / updated ${formatSessionTime(liveSession.updatedAt)}`
                  : "Message or call Jeff."}
              </p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${
              liveSession
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-300"
            }`}>
              {liveSession ? "ready" : "idle"}
            </span>
          </div>
        </section>

        <section className="grid gap-3">
          <a
            className="flex min-h-20 items-center justify-between rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 transition-colors hover:bg-sky-500/15"
            href="/jeff/messages"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400 text-sky-950">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-semibold text-foreground">Message Jeff</span>
                <span className="block text-sm text-muted-foreground">Text, mic, photos, files</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </a>

          <a
            className="flex min-h-20 items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 transition-colors hover:bg-emerald-500/15"
            href={getJeffFieldPhoneHref()}
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
                <Phone className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-semibold text-foreground">Call Jeff</span>
                <span className="block text-sm text-muted-foreground">{getJeffFieldPhoneNumber()}</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </a>

          <a
            className="flex min-h-20 items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15"
            href="/jeff/docs"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300 text-amber-950">
                <BookOpenText className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-semibold text-foreground">Field Docs</span>
                <span className="block text-sm text-muted-foreground">Rules, checklists, closeout</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </a>

          <a
            className="flex min-h-16 items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
            href={photoHref}
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Camera className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">Photo Drop Backup</span>
                <span className="block text-xs text-muted-foreground">
                  {liveSession ? "Uses current Jeff call" : "Upload-only fallback"}
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </a>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-red-200" />
            <div>
              <p className="text-sm font-semibold text-foreground">Parts purchases stay blocked</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jeff can identify next checks and draft escalations. Real orders need approval gates.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
