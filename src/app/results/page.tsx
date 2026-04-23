import { SectionHeading } from "@/components/marketing";
import { getPublicProofSnapshot } from "@/lib/promise-crm/server";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Real Mobile Mechanic Results in Spokane",
  description:
    "See real WrenchReady visit results in Spokane with permission-safe proof, recap detail, and the next-step clarity customers actually received.",
  path: "/results",
});

export default async function ResultsPage() {
  const publicProof = await getPublicProofSnapshot();

  return (
    <main className="border-t border-border">
      <section className="shell section-space">
        <SectionHeading
          eyebrow="Real Results"
          title="Proof from completed visits, not marketing theater."
          copy="These stories only appear when the visit has permission-safe proof attached to the same promise record."
          tint="gold"
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--wr-gold]">
              Public stories
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {publicProof.summary.publicStories}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--wr-gold]">
              Permission-safe assets
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {publicProof.summary.permissionSafeAssets}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--wr-gold]">
              Completed visits reviewed
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {publicProof.summary.completedVisits}
            </p>
          </div>
        </div>

        {publicProof.stories.length > 0 ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {publicProof.stories.map((story) => (
              <article
                key={story.promiseId}
                className="rounded-3xl border border-border bg-card/50 p-7"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--wr-gold]">
                  {story.promiseThatMatteredMost}
                </p>
                <h2 className="mt-3 text-xl font-bold text-foreground">{story.headline}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-foreground">Customer:</span> {story.customerLabel}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Territory:</span> {story.territoryLabel}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Vehicle:</span> {story.vehicleLabel}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Visit:</span> {story.serviceLabel}
                  </p>
                </div>
                {story.bookingReason ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Why they booked:</span> {story.bookingReason}
                  </p>
                ) : null}
                {story.nextVisitLabel ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Next likely visit:</span> {story.nextVisitLabel}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-border bg-card/50 p-7">
            <p className="text-sm font-semibold text-foreground">
              Public stories will appear here as permission-safe proof is approved.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The CRM is already capturing recap depth, proof assets, and next-step value. This page only uses stories with explicit approval status so the trust layer stays honest.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
