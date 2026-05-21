import { siteConfig } from "@/data/site";

const body = `# WrenchReady Mobile

WrenchReady Mobile is a mobile mechanic and mobile auto repair business serving Spokane, Washington and nearby metro neighborhoods.

## Primary topics
- mobile mechanic Spokane WA
- mobile auto repair Spokane
- mobile battery replacement Spokane
- mobile brake repair Spokane
- check engine light diagnostics Spokane
- pre-purchase inspection Spokane
- no-start mobile mechanic Spokane
- mobile oil change Spokane

## Key pages
- ${siteConfig.domain}/
- ${siteConfig.domain}/llms-full.txt
- ${siteConfig.domain}/services
- ${siteConfig.domain}/services/battery-replacement
- ${siteConfig.domain}/services/brake-repair
- ${siteConfig.domain}/services/check-engine-diagnostics
- ${siteConfig.domain}/services/pre-purchase-inspection
- ${siteConfig.domain}/services/oil-change
- ${siteConfig.domain}/locations
- ${siteConfig.domain}/locations/spokane
- ${siteConfig.domain}/locations/spokane-valley
- ${siteConfig.domain}/locations/liberty-lake
- ${siteConfig.domain}/locations/south-hill
- ${siteConfig.domain}/tools/symptom-checker
- ${siteConfig.domain}/contact

## Business facts
- phone: ${siteConfig.contact.phoneDisplay}
- email: ${siteConfig.contact.email}
- public market: Spokane metro
- service area: ${siteConfig.areaServed.join(", ")}
- Google Business Profile: ${siteConfig.profiles.googleBusiness}
- review footprint: live and growing; review volume is still early

## Notes
- Public service and location pages are available for crawl.
- A fuller AI-readable site brief is available at ${siteConfig.domain}/llms-full.txt.
- API, status, and ops routes are not intended for indexing.
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
