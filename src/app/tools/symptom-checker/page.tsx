import { CtaBand, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import { SymptomChecker } from "@/components/symptom-checker";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "What's Wrong With My Car? — Free Diagnostic Tool",
  description:
    "Not sure what service your vehicle needs? Use our free symptom checker to identify the issue and find the right mobile mechanic service in Spokane, WA.",
  path: "/tools/symptom-checker",
  keywords: [
    "car symptom checker",
    "what's wrong with my car",
    "car diagnostic tool",
    "car making noise Spokane",
    "check engine light Spokane",
    "car won't start Spokane",
    "mobile mechanic diagnostic Spokane",
  ],
});

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "My car is making a grinding noise — what could it be?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A grinding noise while braking usually means your brake pads are worn down to the metal backing plate and are now grinding against the rotor. This is an urgent issue that can damage rotors and reduce stopping power. A mobile brake inspection can confirm the cause and replace pads and rotors on site.",
      },
    },
    {
      "@type": "Question",
      name: "My check engine light is on — should I stop driving?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A steady check engine light usually means you can continue driving for a short time, but you should schedule a diagnostic visit soon. A flashing check engine light is more urgent and can indicate a misfire that may damage the catalytic converter. In either case, a mobile diagnostic visit with a code scan and context review is the right first step.",
      },
    },
    {
      "@type": "Question",
      name: "My car won't start and I hear clicking — is it the battery?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rapid clicking when you turn the key is one of the most common signs of a weak or dead battery. The starter motor is trying to engage but doesn't have enough power. A mobile battery test confirms whether the battery is the issue or if the problem is the starter or charging system, and replacement can happen on site if needed.",
      },
    },
  ],
};

export default function SymptomCheckerPage() {
  return (
    <>
      <StructuredData data={faqStructuredData} />
      <div className="pb-16">
        <section className="shell section-space">
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading
              eyebrow="Free Diagnostic Tool"
              title="What's wrong with my car?"
              copy="Not sure what service you need? Pick the symptom that best matches what your vehicle is doing, and we will point you to the right service lane and next step — whether that is a call right now or a scheduled appointment."
            />
          </div>
        </section>

        <section className="shell -mt-8 pb-16">
          <SymptomChecker />
        </section>

        <CtaBand
          title="Still not sure? Just tell us the symptom."
          copy="Send us the vehicle year, make, and model along with what it is doing. We will screen the job, explain what service lane fits, and give you a clean next step — no guesswork."
        />
      </div>
    </>
  );
}
