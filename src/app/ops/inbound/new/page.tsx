import type { Metadata } from "next";
import { OpsInboundForm } from "@/components/ops-inbound-form";

export const metadata: Metadata = {
  title: "New Inbound",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewInboundPage() {
  return (
    <div className="shell py-10 sm:py-14">
      <OpsInboundForm />
    </div>
  );
}
