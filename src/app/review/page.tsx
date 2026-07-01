import type { Metadata } from "next";
import { ReviewRedirectCard } from "@/components/review-redirect-card";
import { siteConfig } from "@/data/site";
import { getGoogleReviewUrl } from "@/lib/review-destination";

const reviewOgImageUrl = `${siteConfig.domain}/review/opengraph-image?v=logo-1`;

export const metadata: Metadata = {
  title: "Leave a Google Review for WrenchReady Mobile",
  description:
    "Leave a Google review for WrenchReady Mobile after your mobile auto service visit.",
  alternates: {
    canonical: `${siteConfig.domain}/review`,
  },
  openGraph: {
    title: "Leave a Google Review for WrenchReady Mobile",
    description: "Tap to open Google's star rating and review form for WrenchReady Mobile.",
    url: `${siteConfig.domain}/review`,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [
      {
        url: reviewOgImageUrl,
        width: 1200,
        height: 630,
        alt: "Leave a Google Review for WrenchReady Mobile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leave a Google Review for WrenchReady Mobile",
    description: "Tap to open Google's star rating and review form for WrenchReady Mobile.",
    images: [reviewOgImageUrl],
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReviewPage() {
  return <ReviewRedirectCard googleReviewUrl={getGoogleReviewUrl()} />;
}
