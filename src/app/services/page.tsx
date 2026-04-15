import { ServicesPageClient } from "@/components/services-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Auto Repair Services in Spokane, WA | WrenchReady",
  description:
    "WrenchReady Mobile handles batteries, brakes, paid diagnostics, pre-purchase inspections, and routine maintenance for Spokane drivers — at your driveway or workplace.",
  path: "/services",
  keywords: [
    "mobile auto repair Spokane",
    "mobile battery replacement Spokane",
    "mobile brake repair Spokane",
    "check engine light diagnostic Spokane",
  ],
});

export default function ServicesPage() {
  return <ServicesPageClient />;
}
