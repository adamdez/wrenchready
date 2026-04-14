/**
 * DEMO TESTIMONIALS — INTERNAL STAFF UNVEILING ONLY
 *
 * These are fabricated testimonial cards for the internal site demo.
 * They must NOT appear in any public / production deployment.
 *
 * Gate: process.env.NEXT_PUBLIC_SHOW_DEMO_TESTIMONIALS === "true"
 *
 * Before launch, replace this file with real customer testimonials
 * collected via the review intake template in docs/review-intake-template.md.
 */

export type DemoTestimonial = {
  id: string;
  name: string;
  neighborhood: string;
  vehicle: string;
  service: string;
  headline: string;
  quote: string;
  stars: number;
};

export const SHOW_DEMO_TESTIMONIALS =
  process.env.NEXT_PUBLIC_SHOW_DEMO_TESTIMONIALS === "true";

export const demoTestimonials: DemoTestimonial[] = [
  {
    id: "sarah-m",
    name: "Sarah M.",
    neighborhood: "5 Mile",
    vehicle: "2018 Honda CR-V",
    service: "Battery service",
    headline: "Dead battery, clear answer",
    quote:
      "Car was dead in the driveway before work. He tested it first, explained why the battery was the issue, and had it swapped without turning it into a bigger deal. The part I appreciated most was getting a straight answer fast.",
    stars: 5,
  },
  {
    id: "kevin-r",
    name: "Kevin R.",
    neighborhood: "N. Spokane",
    vehicle: "2017 Toyota Highlander",
    service: "Front brake service",
    headline: "Inspection first, no guessing",
    quote:
      "I called about brake noise and expected a vague estimate. Instead I got an inspection, photos of what was worn, and a clear explanation of what needed to be done that day and what could wait. Easy to work with.",
    stars: 5,
  },
  {
    id: "melissa-t",
    name: "Melissa T.",
    neighborhood: "Indian Trail",
    vehicle: "2016 Subaru Outback",
    service: "Check engine diagnostics",
    headline: "Normal-language explanation",
    quote:
      "The check engine light had me assuming the worst. He scanned it, explained the code in normal language, and told me what was actually worth fixing now. That alone saved me from guessing or throwing parts at it.",
    stars: 5,
  },
  {
    id: "aaron-d",
    name: "Aaron D.",
    neighborhood: "Shadle",
    vehicle: "2015 Ford F-150",
    service: "Pre-purchase inspection",
    headline: "Useful before buying",
    quote:
      "I had him look at a used truck before I bought it. He was calm, thorough, and pointed out a few things I would have missed. The summary made it easy to decide what I could negotiate and what was not worth ignoring.",
    stars: 5,
  },
  {
    id: "priya-l",
    name: "Priya L.",
    neighborhood: "5 Mile",
    vehicle: "2020 Toyota RAV4",
    service: "Oil change + cabin filter",
    headline: "Convenient without pressure",
    quote:
      "Needed routine service but did not want to lose half a day at a shop. The oil change was straightforward, he showed me the cabin filter before replacing it, and there was zero pressure to add work I did not ask for.",
    stars: 5,
  },
  {
    id: "jason-b",
    name: "Jason B.",
    neighborhood: "Whitworth",
    vehicle: "2014 Ford Escape",
    service: "No-start diagnostic",
    headline: "Tested before replacing anything",
    quote:
      "The battery turned out not to be the real problem, which is exactly why I am glad he tested before replacing anything. He explained the likely starting issue clearly and did not try to sell me the wrong part just because it was the fastest answer.",
    stars: 5,
  },
];
