import { ContactPageClient } from "@/components/contact-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Request Screening",
  description:
    "Start a screened WrenchReady Mobile request with your vehicle details, service request, parking notes, and Spokane-area location.",
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
