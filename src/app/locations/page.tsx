import { LocationsPageClient } from "@/components/locations-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic Service Areas in Spokane County",
  description:
    "See where Wrench Ready Mobile plans to serve drivers across Spokane County, including Spokane, Spokane Valley, Liberty Lake, and South Hill.",
  path: "/locations",
  keywords: [
    "mobile mechanic Spokane Valley",
    "mobile mechanic Liberty Lake",
    "mobile mechanic South Hill Spokane",
    "Spokane mobile auto repair",
  ],
});

export default function LocationsPage() {
  return <LocationsPageClient />;
}
