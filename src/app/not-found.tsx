import { LinkButton, SectionHeading } from "@/components/marketing";

export default function NotFound() {
  return (
    <section className="shell section-space">
      <div className="panel rounded-[2.5rem] p-10 sm:p-12">
        <SectionHeading
          eyebrow="404"
          title="That page is not part of the launch route."
          copy="Head back to the homepage, services, or contact page and we will keep moving."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/">Homepage</LinkButton>
          <LinkButton href="/services" variant="secondary">
            Services
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
