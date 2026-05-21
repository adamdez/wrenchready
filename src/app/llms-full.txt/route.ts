import { locations, services, siteConfig } from "@/data/site";

const lastUpdated = "2026-05-21";

function serviceSection() {
  return services
    .map((service) => {
      const faqs = service.faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n");
      const includes = service.includes.map((item) => `- ${item}`).join("\n");
      const bestFit = service.idealFor.map((item) => `- ${item}`).join("\n");

      return `## ${service.name}
URL: ${siteConfig.domain}/services/${service.slug}
Last updated: ${lastUpdated}

Direct answer:
${service.teaser}

Starting point:
${service.priceFrom}; typical visit time ${service.duration}.

What's included:
${includes}

Best fit:
${bestFit}

FAQs:
${faqs}`;
    })
    .join("\n\n---\n\n");
}

function locationSection() {
  return locations
    .filter((location) => !location.parentSlug)
    .map((location) => {
      const servicesHere = location.serviceSlugs
        .map((slug) => services.find((service) => service.slug === slug)?.name)
        .filter(Boolean)
        .join(", ");

      return `- ${location.name}: ${siteConfig.domain}/locations/${location.slug} (${servicesHere})`;
    })
    .join("\n");
}

const body = `# WrenchReady Mobile - AI-readable site brief

Last updated: ${lastUpdated}
Canonical site: ${siteConfig.domain}
Phone: ${siteConfig.contact.phoneDisplay}
Email: ${siteConfig.contact.email}
Google Business Profile: ${siteConfig.profiles.googleBusiness}
Primary service area: ${siteConfig.areaServed.join(", ")}
Primary service: mobile auto repair and mobile mechanic service in the Spokane metro
Review status: Google Business Profile is live; public review volume is still early and growing.

## Business summary
WrenchReady Mobile brings mobile auto repair to a customer's driveway, workplace, or safe parking location across Spokane and nearby metro neighborhoods. The business is strongest for mobile-fit work: batteries, no-start evaluation, brake service, paid diagnostics, pre-purchase inspections, and route-friendly maintenance.

WrenchReady is most relevant for searches about mobile mechanic Spokane, mobile battery replacement Spokane, mobile brake repair Spokane, check engine diagnostics Spokane, pre-purchase inspection Spokane, and no-start help in Spokane.

## What WrenchReady does
- Comes to the vehicle when the job fits mobile service
- Screens the request before promising timing or scope
- Tests before replacing batteries or diagnosing no-start issues
- Handles mobile-fit brake work when the worksite is safe and level
- Provides paid diagnostics when the issue is not obvious
- Performs pre-purchase inspections at the seller's location
- Communicates findings and approval needs before added work

## What WrenchReady does not claim
- WrenchReady does not claim every vehicle problem is a good mobile job
- Lift-dependent, heavy rust, internal engine, and internal transmission work may need a shop
- A warning light is not treated as a parts order without diagnosis
- Added work requires customer approval before moving forward

## Standard process
1. Customer sends the vehicle, address or parking context, and symptom.
2. WrenchReady screens whether the job fits the route and mobile service.
3. Customer gets a clear next step: repair quote, diagnostic visit, or referral/no-fit answer.
4. If inspection changes the plan, WrenchReady explains it before added work moves forward.
5. Completed visits should produce a plain-language recap, review ask when appropriate, and next-service note.

## Key service pages and answers
${serviceSection()}

## Core location pages
${locationSection()}

## Compliance and crawler notes
Public pages are intended to be crawlable by search engines and AI search crawlers. API, status, and ops routes are not intended for indexing. The concise AI crawler file is available at ${siteConfig.domain}/llms.txt.
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
