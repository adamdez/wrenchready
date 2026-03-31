import { ServicesPageClient } from "@/components/services-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Auto Repair Services in Spokane",
  description:
    "Explore Wrench Ready Mobile service lines for Spokane drivers: oil changes, brake work, battery replacement, diagnostics, and pre-purchase inspections.",
  path: "/services",
  keywords: [
    "mobile auto repair Spokane",
    "mobile oil change Spokane",
    "mobile brake repair Spokane",
    "mobile battery replacement Spokane",
  ],
});

export default function ServicesPage() {
  return <ServicesPageClient />;
}
