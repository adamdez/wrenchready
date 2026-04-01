import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
const IS_PROD = process.env.NODE_ENV === "production";

export function Analytics() {
  if (!IS_PROD) return null;
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
      <Script id="auto-track-clicks" strategy="afterInteractive">
        {`
          (function(){
            var adsId = '${ADS_ID || ""}';
            var convLabel = '${ADS_CONVERSION_LABEL || ""}';
            document.addEventListener('click', function(e) {
              var link = e.target.closest('a[href]');
              if (!link) return;
              var href = link.getAttribute('href') || '';
              if (typeof gtag !== 'function') return;
              if (href.indexOf('tel:') === 0) {
                gtag('event', 'conversion', {
                  send_to: adsId && convLabel ? adsId + '/' + convLabel : undefined,
                  event_category: 'engagement',
                  event_label: 'phone_click'
                });
              } else if (href.indexOf('sms:') === 0) {
                gtag('event', 'conversion', {
                  send_to: adsId ? adsId + '/sms_click' : undefined,
                  event_category: 'engagement',
                  event_label: 'sms_click'
                });
              }
            });
          })();
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
  const sendTo =
    ADS_ID && ADS_CONVERSION_LABEL
      ? `${ADS_ID}/${ADS_CONVERSION_LABEL}`
      : undefined;
  trackEvent("conversion", {
    ...(sendTo ? { send_to: sendTo } : {}),
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
    ...(ADS_ID ? { send_to: `${ADS_ID}/sms_click` } : {}),
    event_category: "engagement",
    event_label: "sms_click",
  });
}
