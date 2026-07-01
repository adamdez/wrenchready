"use client";

import { useEffect } from "react";
import { ExternalLink, Star } from "lucide-react";

type ReviewRedirectCardProps = {
  googleReviewUrl: string;
};

export function ReviewRedirectCard({ googleReviewUrl }: ReviewRedirectCardProps) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.assign(googleReviewUrl);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [googleReviewUrl]);

  return (
    <main className="shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--wr-teal)]/30 bg-[var(--wr-teal)]/10 text-[var(--wr-teal-soft)]">
            <Star className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wr-teal)]">
              WrenchReady Mobile
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">
              Opening Google review
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          You should land on Google&apos;s star rating and review form. If it does not open,
          use the button below.
        </p>

        <a
          className="mt-6 flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[var(--wr-teal)]/40 bg-[var(--wr-teal)]/10 px-5 py-3 text-sm font-semibold text-[var(--wr-teal-soft)] transition-colors hover:bg-[var(--wr-teal)]/20"
          href={googleReviewUrl}
          rel="noreferrer"
        >
          Leave a Google review
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </main>
  );
}
