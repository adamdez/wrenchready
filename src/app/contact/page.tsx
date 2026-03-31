import { LaunchRequestForm } from "@/components/launch-request-form";
import { PageHero, SectionHeading } from "@/components/marketing";
import { siteConfig } from "@/data/site";
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
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Schedule Appointment"
        title="Schedule your appointment with the details that make routing and screening faster."
        copy="A strong appointment request includes the vehicle, the symptom or service, where the car is parked, and when you want it handled. That is usually enough to qualify most mobile jobs quickly."
        primaryLink={{ href: "#launch-request", label: "Open the request form" }}
        secondaryLink={{
          href: siteConfig.contact.phoneHref,
          label: `Call ${siteConfig.contact.phoneDisplay}`,
        }}
        panelTitle="What to include first"
        panelItems={[
          "Year, make, model, and engine when known",
          "Exact symptom or the repair you think you need",
          "Address plus parking, gate, or apartment notes",
          "Preferred time window and best callback method",
        ]}
      />

      <section className="shell section-space" id="launch-request">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="panel rounded-[1.9rem] p-6 sm:p-8">
            <SectionHeading
              eyebrow="Booking Workflow"
              title="This page is built to reduce back-and-forth, not create more of it."
              copy="The more complete the first message is, the faster Wrench Ready can screen the job, choose the right service lane, and decide whether the route makes sense."
            />
            <div className="mt-8 space-y-5 text-base leading-7 text-muted">
              <p>
                Call or text:{" "}
                <a className="font-semibold text-[var(--accent-soft)]" href={siteConfig.contact.phoneHref}>
                  {siteConfig.contact.phoneDisplay}
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  className="font-semibold text-[var(--accent-soft)]"
                  href={`mailto:${siteConfig.contact.email}`}
                >
                  {siteConfig.contact.email}
                </a>
              </p>
              <p>Scheduling window: {siteConfig.contact.schedule}</p>
              <p>
                Submit the form on the right, or call and text directly.
                We will screen the job and follow up within the next business window.
              </p>
            </div>
          </article>

          <LaunchRequestForm />
        </div>
      </section>
    </div>
  );
}
