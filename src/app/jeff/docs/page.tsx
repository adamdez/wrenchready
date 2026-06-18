import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Gauge,
  ShieldAlert,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Jeff Field Docs",
  robots: { index: false, follow: false },
};

const docs = [
  {
    title: "Diagnostic Rule",
    icon: Gauge,
    body: "Name what is known, what is suspected, and the next physical test. Do not sell a part from symptoms alone.",
  },
  {
    title: "Photo Checklist",
    icon: Camera,
    body: "Capture the failed area, proof reading, VIN or label when relevant, before state, and after state.",
  },
  {
    title: "Approval Stop",
    icon: ShieldAlert,
    body: "Extra work, replacement parts, customer price promises, and purchases require approval before action.",
  },
  {
    title: "Closeout",
    icon: ClipboardCheck,
    body: "Record work completed, parts used or no-parts confirmation, final amount, proof photos, and payment status.",
  },
  {
    title: "Exact Specs",
    icon: Wrench,
    body: "Torque specs, wiring diagrams, immobilizer steps, and OEM procedures must be verified outside Jeff.",
  },
];

export default function JeffDocsPage() {
  return (
    <main className="min-h-dvh bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto w-full max-w-md">
        <Link href="/jeff" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Jeff
        </Link>

        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Field docs</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Simon quick reference</h1>
        </header>

        <section className="mt-5 grid gap-3">
          {docs.map((doc) => {
            const Icon = doc.icon;
            return (
              <article key={doc.title} className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{doc.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{doc.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
