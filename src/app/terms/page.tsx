import { buildMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Terms and Conditions for Wrench Ready Mobile Mechanic, including SMS messaging terms of service.",
  path: "/terms",
  keywords: ["terms and conditions", "SMS terms", "Wrench Ready Mobile"],
});

export default function TermsPage() {
  return (
    <div className="shell py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: April 2, 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of
            the Wrench Ready Mobile LLC (&quot;Wrench Ready,&quot;
            &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) website at
            wrenchreadymobile.com and any related services, including text
            message (SMS) communications.
          </p>

          <h2>Services</h2>
          <p>
            Wrench Ready Mobile provides mobile auto repair and maintenance
            services in the Spokane, Washington area. Service requests submitted
            through our website are not guaranteed appointments until confirmed
            by our team.
          </p>

          <h2>SMS Messaging Terms</h2>
          <p>
            <strong>Program name:</strong> Wrench Ready Mobile Alerts
          </p>
          <p>
            <strong>Program description:</strong> When you opt in to text
            messages from Wrench Ready Mobile, you may receive messages related
            to appointment confirmations, service updates, scheduling
            follow-ups, voicemail notifications, and general customer care
            communications.
          </p>
          <p>
            <strong>Message and data rates may apply.</strong> Message frequency
            varies based on your service interactions. Typically you will
            receive 1&ndash;5 messages per service appointment.
          </p>

          <h3>Opting In</h3>
          <p>
            You may opt in to receive text messages by checking the SMS consent
            checkbox on our appointment request form at{" "}
            <Link href="/contact" className="text-primary hover:underline">
              wrenchreadymobile.com/contact
            </Link>
            . Providing your phone number alone does not constitute consent to
            receive text messages. Consent is not required as a condition of
            purchasing any goods or services.
          </p>

          <h3>Opting Out</h3>
          <p>
            You can opt out of receiving text messages at any time by replying{" "}
            <strong>STOP</strong> to any message you receive from us. After
            opting out, you will receive a one-time confirmation message and no
            further texts will be sent.
          </p>

          <h3>Getting Help</h3>
          <p>
            For help with our text messaging program, reply <strong>HELP</strong>{" "}
            to any message, or contact us at{" "}
            <a
              href="mailto:admin@wrenchreadymobile.com"
              className="text-primary hover:underline"
            >
              admin@wrenchreadymobile.com
            </a>{" "}
            or{" "}
            <a
              href="tel:+15093090617"
              className="text-primary hover:underline"
            >
              (509) 309-0617
            </a>
            .
          </p>

          <h3>Carrier Disclaimer</h3>
          <p>
            Carriers are not liable for any delayed or undelivered messages.
          </p>

          <h2>Use of the Website</h2>
          <p>
            You agree to use this website only for lawful purposes. You may not
            use the site in any way that could damage, disable, or impair the
            site or interfere with other users.
          </p>

          <h2>Appointment Requests</h2>
          <p>
            Submitting an appointment request through our website does not
            guarantee service. All appointments are subject to availability,
            location eligibility, and confirmation by our team. We reserve the
            right to decline any service request.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            Wrench Ready Mobile provides this website and its content on an
            &quot;as is&quot; basis. We make no warranties regarding the
            accuracy or completeness of the information on this site. To the
            fullest extent permitted by law, Wrench Ready Mobile shall not be
            liable for any indirect, incidental, or consequential damages
            arising from your use of this website.
          </p>

          <h2>Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes will be posted
            on this page with a revised &quot;Last updated&quot; date. Your
            continued use of the website after changes are posted constitutes
            acceptance of the updated Terms.
          </p>

          <h2>Privacy</h2>
          <p>
            Your use of our website and services is also governed by our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your personal
            information including information related to SMS messaging.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about these Terms, contact us at:
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
                href="tel:+15093090617"
                className="text-primary hover:underline"
              >
                (509) 309-0617
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
