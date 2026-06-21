import Link from "next/link";
import type { ReactNode } from "react";

const opsLinks = [
  { href: "/ops", label: "Board" },
  { href: "/ops/inbound", label: "Inbound" },
  { href: "/ops/tomorrow", label: "Tomorrow" },
  { href: "/ops/parts", label: "Parts" },
  { href: "/ops/field", label: "Field" },
  { href: "/ops/owners", label: "Owners" },
  { href: "/ops/systems", label: "Systems" },
];

export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <nav className="shell flex items-center gap-2 overflow-x-auto py-3 text-sm scrollbar-none">
          {opsLinks.map((link) => (
            <Link
              className="inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-card/60 px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
