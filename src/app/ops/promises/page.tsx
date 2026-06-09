import type { Metadata } from "next";
import { PromiseBoard } from "@/components/promise-board";
import { getPromiseBoardSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Promise Board",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PromiseBoardPage() {
  let snapshot: Awaited<ReturnType<typeof getPromiseBoardSnapshot>> | null = null;
  let loadError: unknown = null;

  try {
    snapshot = await getPromiseBoardSnapshot();
  } catch (error) {
    loadError = error;
  }

  if (!snapshot) {
    return (
      <div className="shell py-10 sm:py-14">
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-100 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
            Promise CRM unavailable
          </p>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Today Queue cannot load live records.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-red-100">
            WrenchReady is not showing demo or fallback CRM data. Check Supabase and the
            production environment before using this page for appointment decisions.
          </p>
          <p className="mt-4 text-xs text-red-100/80">
            {loadError instanceof Error ? loadError.message : "Unknown Promise CRM read failure."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="shell py-10 sm:py-14">
      <PromiseBoard {...snapshot} />
    </div>
  );
}
