import type { Metadata } from "next";
import Link from "next/link";
import { Archive } from "lucide-react";
import { OpsPageHeader } from "@/components/ops-page-header";
import { PromiseArchiveButton } from "@/components/promise-archive-button";
import { getPromiseRecords } from "@/lib/promise-crm/server";
import { isPromiseArchived } from "@/lib/promise-crm/promise-archive";

export const metadata: Metadata = {
  title: "Archived promises",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ArchivedPromisesPage() {
  const promises = await getPromiseRecords();
  const archived = promises.filter(isPromiseArchived);

  return (
    <div className="shell py-10 sm:py-14">
      <OpsPageHeader
        eyebrow="Archived"
        icon={Archive}
        title="Archived promises"
        description="Junk, test, and retired records — hidden from every active view but never deleted. Restore any one to bring it back."
      />

      <section className="mt-6 space-y-3">
        {archived.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-sm text-muted-foreground">
            Nothing is archived. Use “Archive (junk / test)” on any promise to clear it out of your active views.
          </p>
        ) : (
          archived.map((promise) => {
            const vehicle = [promise.vehicle.year || undefined, promise.vehicle.make, promise.vehicle.model]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={promise.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/50 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/ops/promises/${promise.id}`}
                    className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {promise.customer.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {[vehicle, promise.serviceScope].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <PromiseArchiveButton promiseId={promise.id} archived />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
