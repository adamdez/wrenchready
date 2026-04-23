import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
const IS_PROD = process.env.NODE_ENV === "production";

type LeadTrackingOptions = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  zipCode?: string;
};

type EnhancedConversionAddress = {
  first_name?: string;
  last_name?: string;
  street?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

type EnhancedConversionUserData = {
  email?: string;
  phone_number?: string;
  address?: EnhancedConversionAddress;
};

export function Analytics() {
  if (!IS_PROD) return null;
  if (!GA_ID && !ADS_ID) return null;

  const tagId = ADS_ID || GA_ID;

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
          window.gtag = gtag;
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

function formatE164(phoneNumber?: string) {
  const digits = phoneNumber?.replace(/\D/g, "") || "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return undefined;
}

function splitFullName(fullName?: string) {
  const trimmed = fullName?.trim();
  if (!trimmed) return {};
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: firstName || undefined,
    lastName: rest.length ? rest.join(" ") : undefined,
  };
}

function buildUserData(options: LeadTrackingOptions): EnhancedConversionUserData | null {
  const email = options.email?.trim().toLowerCase() || undefined;
  const phone = formatE164(options.phoneNumber);
  const postalCode = options.zipCode?.trim().match(/\d{5}(?:-\d{4})?/)?.[0];
  const { firstName, lastName } = splitFullName(options.fullName);
  const street = options.address?.trim() || undefined;

  const address: EnhancedConversionAddress = {
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(street ? { street } : {}),
    ...(postalCode ? { postal_code: postalCode } : {}),
    ...(street || postalCode ? { region: "WA", country: "US" } : {}),
  };

  const userData: EnhancedConversionUserData = {
    ...(email ? { email } : {}),
    ...(phone ? { phone_number: phone } : {}),
    ...(Object.keys(address).length ? { address } : {}),
  };

  return Object.keys(userData).length ? userData : null;
}

export function setAdsUserData(options: LeadTrackingOptions) {
  const userData = buildUserData(options);
  if (!userData) return;

  if (typeof window !== "undefined" && "gtag" in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
      "set",
      "user_data",
      userData,
    );
  }
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

export function trackFormSubmit(options: LeadTrackingOptions = {}) {
  setAdsUserData(options);
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
