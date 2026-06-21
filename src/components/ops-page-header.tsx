import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Standard ops dashboard header. Replaces the per-page hand-rolled
 * "eyebrow pill + big h1" blocks so every cockpit page shares one
 * consistent header. The back-to-board link the pages used to carry is
 * intentionally dropped — the ops shell sidebar now owns navigation.
 */
export function OpsPageHeader({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
