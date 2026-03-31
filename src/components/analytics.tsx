import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export function Analytics() {
  if (!GA_ID && !ADS_ID) return null;

  const tagId = GA_ID || ADS_ID;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${GA_ID ? `gtag('config', '${GA_ID}', { send_page_view: true });` : ""}
          ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}

export function trackEvent(name: string, params?: Record<string, string>) {
  if (typeof window !== "undefined" && "gtag" in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
      "event",
      name,
      params,
    );
  }
}

export function trackPhoneCall() {
  trackEvent("conversion", {
    send_to: `${ADS_ID}/phone_call`,
    event_category: "engagement",
    event_label: "phone_click",
  });
}

export function trackFormSubmit() {
  trackEvent("generate_lead", {
    event_category: "conversion",
    event_label: "appointment_form",
  });
}

export function trackSmsClick() {
  trackEvent("conversion", {
    send_to: `${ADS_ID}/sms_click`,
    event_category: "engagement",
    event_label: "sms_click",
  });
}
