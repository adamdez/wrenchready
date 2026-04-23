import { buildMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for WrenchReady Mobile Mechanic. How we collect, use, and protect your personal information.",
  path: "/privacy",
  keywords: ["privacy policy", "data protection", "WrenchReady Mobile"],
});

export default function PrivacyPage() {
  return (
    <div className="shell py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: April 2, 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          <p>
            WrenchReady Mobile LLC (&quot;WrenchReady,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) operates the website
            wrenchreadymobile.com and the mobile mechanic services described on
            it. This Privacy Policy explains what information we collect, how we
            use it, and your choices regarding that information.
          </p>

          <h2>Information We Collect</h2>
          <p>We may collect the following types of personal information:</p>
          <ul>
            <li>
              <strong>Contact information:</strong> name, phone number, email
              address
            </li>
            <li>
              <strong>Vehicle information:</strong> year, make, model, mileage,
              and service concerns you provide when requesting an appointment
            </li>
            <li>
              <strong>Location information:</strong> the Spokane-area address or
              general location where you request service
            </li>
            <li>
              <strong>Usage data:</strong> standard web analytics data such as
              pages visited, referring source, and browser type (collected via
              Google Analytics)
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Schedule and confirm mobile mechanic appointments</li>
            <li>
              Communicate with you about your service request via phone call,
              text message, or email
            </li>
            <li>
              Send voicemail notifications to our team when a customer call is
              missed
            </li>
            <li>Improve our website and services</li>
            <li>Respond to your questions or feedback</li>
          </ul>

          <h2>Text Messaging (SMS)</h2>
          <p>
            If you opt in to receive text messages from WrenchReady Mobile, we
            may send you messages related to your appointment, service updates,
            or follow-up communication. Message and data rates may apply.
            Message frequency varies based on your interaction with our
            services.
          </p>
          <p>
            You can opt out of text messages at any time by replying{" "}
            <strong>STOP</strong> to any message. Reply <strong>HELP</strong>{" "}
            for assistance. For additional support, contact us at{" "}
            <a
              href="mailto:admin@wrenchreadymobile.com"
              className="text-primary hover:underline"
            >
              admin@wrenchreadymobile.com
            </a>{" "}
            or call{" "}
            <a
                    href="tel:+15095907091"
              className="text-primary hover:underline"
            >
                    (509) 590-7091
            </a>
            .
          </p>

          <h2>Sharing of Information</h2>
          <p>
            We do not sell, rent, or trade your personal information to third
            parties for marketing or promotional purposes.
          </p>
          <p>
            We may share limited information with trusted service providers who
            help us operate our business (for example, our scheduling platform
            or analytics provider), but only to the extent necessary to provide
            our services to you.
          </p>
          <p>
            <strong>
              All the above categories exclude text messaging originator opt-in
              data and consent; this information will not be shared with any
              third parties.
            </strong>
          </p>

          <h2>Data Security</h2>
          <p>
            We take reasonable measures to protect your personal information
            from unauthorized access, use, or disclosure. However, no method of
            transmission over the Internet or electronic storage is completely
            secure.
          </p>

          <h2>Cookies and Tracking</h2>
          <p>
            Our website uses Google Analytics to understand how visitors
            interact with our site. This service may use cookies and similar
            technologies to collect usage data. You can manage cookie
            preferences through your browser settings.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request access to the personal information we hold about you</li>
            <li>Request correction or deletion of your personal information</li>
            <li>
              Opt out of text messages at any time by replying STOP
            </li>
          </ul>

          <h2>Children&apos;s Privacy</h2>
          <p>
            Our services are not directed at individuals under the age of 18.
            We do not knowingly collect personal information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will
            be posted on this page with a revised &quot;Last updated&quot; date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at:
          </p>
          <ul>
            <li>
              Email:{" "}
              <a
                href="mailto:admin@wrenchreadymobile.com"
                className="text-primary hover:underline"
              >
                admin@wrenchreadymobile.com
              </a>
            </li>
            <li>
              Phone:{" "}
              <a
                    href="tel:+15095907091"
                className="text-primary hover:underline"
              >
                    (509) 590-7091
              </a>
            </li>
          </ul>

          <p className="text-sm">
            See also our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
