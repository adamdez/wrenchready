import { StructuredData } from "@/components/structured-data";
import { LocationsPageClient } from "@/components/locations-page-client";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Where We Work in Spokane | Mobile Mechanic Service Areas",
  description:
    "See where WrenchReady works across Spokane and nearby metro neighborhoods, including Spokane, Spokane Valley, Liberty Lake, and South Hill, with focused routes and honest screening.",
  path: "/locations",
  keywords: [
    "mobile mechanic Spokane Valley",
    "mobile mechanic Liberty Lake",
    "mobile mechanic South Hill Spokane",
    "Spokane mobile auto repair",
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
      name: "Locations",
      item: absoluteUrl("/locations"),
    },
  ],
};

export default function LocationsPage() {
  return (
    <>
      <StructuredData data={breadcrumbData} />
      <LocationsPageClient />
    </>
  );
}
