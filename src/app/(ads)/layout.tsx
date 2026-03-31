import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";
import "../globals.css";

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
  applicationName: siteConfig.name,
  robots: { index: false, follow: false },
};

export default function AdsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(displayFont.variable, bodyFont.variable, "dark")}>
      <body className="noise-bg">
        <Analytics />

        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="shell flex items-center justify-between py-3">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Wrench Ready<span className="text-primary">.</span>
            </span>
            <a
              href={siteConfig.contact.phoneHref}
              className="flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:brightness-110"
            >
              {siteConfig.contact.phoneDisplay}
            </a>
          </div>
        </header>

        <main>{children}</main>

        <div className="h-20" />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="shell flex items-center justify-center gap-3 py-3">
            <a
              href={siteConfig.contact.phoneHref}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Call Now
            </a>
            <a
              href="#request-form"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
            >
              Book Now
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
