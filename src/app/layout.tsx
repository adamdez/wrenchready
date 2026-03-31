import type { Metadata } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { siteConfig } from "@/data/site";
import "./globals.css";

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: {
    default: "Mobile Mechanic in Spokane, WA",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.globalKeywords],
  applicationName: siteConfig.name,
  category: "Automotive",
  alternates: {
    canonical: siteConfig.domain,
  },
  openGraph: {
    title: "Mobile Mechanic in Spokane, WA",
    description: siteConfig.description,
    url: siteConfig.domain,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile Mechanic in Spokane, WA",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
