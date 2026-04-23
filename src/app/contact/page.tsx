import { ContactPageClient } from "@/components/contact-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Request Mobile Mechanic Service in Spokane",
  description:
    "Request Spokane mobile mechanic service from WrenchReady with your vehicle details, parking notes, and service request so we can screen the right next step.",
  path: "/contact",
  keywords: [
    "request mobile mechanic Spokane",
    "screen mobile auto repair Spokane",
    "mobile mechanic contact Spokane",
  ],
});

export default function ContactPage() {
  return <ContactPageClient />;
}
