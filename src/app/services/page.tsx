import { StructuredData } from "@/components/structured-data";
import { ServicesPageClient } from "@/components/services-page-client";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic Services in Spokane, WA | Batteries, Brakes and More",
  description:
    "See WrenchReady's Spokane mobile mechanic services for batteries, brakes, paid diagnostics, pre-purchase inspections, and routine maintenance at your driveway or workplace.",
  path: "/services",
  keywords: [
    "mobile auto repair Spokane",
    "mobile battery replacement Spokane",
    "mobile brake repair Spokane",
    "check engine light diagnostic Spokane",
  ],
});

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: absoluteUrl("/"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Services",
      item: absoluteUrl("/services"),
    },
  ],
};

export default function ServicesPage() {
  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ServicesPageClient />
    </>
  );
}
