import { ContactPageClient } from "@/components/contact-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Schedule an Appointment",
  description:
    "Start a Wrench Ready Mobile appointment request with your vehicle details, service request, and Spokane-area location.",
  path: "/contact",
  keywords: [
    "schedule mobile mechanic appointment Spokane",
    "book mobile mechanic Spokane",
    "contact mobile auto repair Spokane",
  ],
});

export default function ContactPage() {
  return <ContactPageClient />;
}
