import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { Analytics } from "@/components/analytics";
import { siteConfig } from "@/data/site";
import "./globals.css";
import { cn } from "@/lib/utils";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: {
    default: "Mobile Mechanic in Spokane, WA | WrenchReady",
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
    <html lang="en" className={cn(displayFont.variable, bodyFont.variable, "dark")}>
      <body className="noise-bg">
        <Analytics />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
