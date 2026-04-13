import { ServicesPageClient } from "@/components/services-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Service Lanes in Spokane",
  description:
    "Explore WrenchReady Mobile service lanes for Spokane drivers: no-start and battery work, brakes, paid diagnostics, pre-purchase inspections, and routine maintenance when it fits the route.",
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
