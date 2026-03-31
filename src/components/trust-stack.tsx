const trustSignals = [
  {
    label: "Response Time",
    title: "< 15 min first response window",
    copy: "Requests are acknowledged fast so you know someone is actually working on your scheduling, not ignoring the message.",
  },
  {
    label: "Service Area",
    title: "Spokane County coverage with focused routes",
    copy: "Tight route density means arrival windows stay realistic instead of vague, and your appointment stays on schedule.",
  },
  {
    label: "Licensed & Insured",
    title: "Fully insured mobile auto service",
    copy: "Liability coverage and professional standards protect both the vehicle and the property where service happens.",
  },
  {
    label: "Transparent Pricing",
    title: "Upfront quotes before any work begins",
    copy: "You see the price and scope before anything starts. No surprise line items after the hood is already open.",
  },
  {
    label: "Customer Satisfaction",
    title: "Photo-backed findings and written recommendations",
    copy: "Every visit produces clear documentation so you can make informed decisions now and revisit the findings later.",
  },
  {
    label: "Warranty",
    title: "Parts and labor backed by service commitment",
    copy: "Work is performed with quality parts and careful procedure, backed by a commitment to make it right.",
  },
] as const;

export function TrustStack() {
  return (
    <section className="shell section-space">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {trustSignals.map((signal) => (
          <article key={signal.label} className="panel rounded-[1.8rem] p-6">
            <p className="eyebrow">{signal.label}</p>
            <h3 className="mt-3 text-2xl text-[var(--foreground)]">{signal.title}</h3>
            <p className="mt-3 text-base leading-7 text-muted">{signal.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
