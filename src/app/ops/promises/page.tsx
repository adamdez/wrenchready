import type { Metadata } from "next";
import { PromiseBoard } from "@/components/promise-board";
import { getIntegrationSnapshot } from "@/lib/promise-crm/integrations";
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
  const snapshot = await getPromiseBoardSnapshot();
  const integrations = await getIntegrationSnapshot();

  return (
    <div className="shell py-10 sm:py-14">
      <PromiseBoard {...snapshot} integrations={integrations} />
    </div>
  );
}
