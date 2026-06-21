"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  Camera,
  ChevronDown,
  DollarSign,
  Inbox,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Menu,
  MessageSquare,
  Package,
  Radio,
  Repeat,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Wrench,
  X,
  Zap,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// Consolidated information architecture: the ~22 ops dashboards grouped by the
// daily operating flow — run the day, lean on Jeff, get paid, grow, run the shop.
const NAV: NavGroup[] = [
  {
    label: "Dispatch",
    items: [
      { href: "/ops/promises", label: "Board", icon: LayoutDashboard },
      { href: "/ops/inbound", label: "Inbound", icon: Inbox },
      { href: "/ops/tomorrow", label: "Tomorrow", icon: CalendarClock },
      { href: "/ops/field", label: "Field", icon: Wrench },
    ],
  },
  {
    label: "Jeff",
    items: [
      { href: "/ops/jeff", label: "Triage", icon: Radio },
      { href: "/ops/field-assistant", label: "Field assistant", icon: MessageSquare },
      { href: "/ops/parts", label: "Parts", icon: Package },
      { href: "/ops/proof", label: "Proof", icon: Camera },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/ops/collections", label: "Collections", icon: DollarSign },
      { href: "/ops/insights", label: "Insights", icon: TrendingUp },
      { href: "/ops/warranty", label: "Warranty", icon: ShieldCheck },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/ops/follow-through", label: "Follow-through", icon: ListChecks },
      { href: "/ops/recapture", label: "Recapture", icon: Repeat },
      { href: "/ops/outbound", label: "Outbound", icon: Send },
      { href: "/ops/accounts", label: "Accounts", icon: Building2 },
    ],
  },
  {
    label: "Run",
    items: [
      { href: "/ops/owners", label: "Owners", icon: UserCog },
      { href: "/ops/cadence", label: "Cadence", icon: CalendarDays },
      { href: "/ops/playbooks", label: "Playbooks", icon: BookOpen },
      { href: "/ops/management", label: "Management", icon: BarChart3 },
      { href: "/ops/wedges", label: "Wedges", icon: Zap },
      { href: "/ops/systems", label: "Systems", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  if (href === "/ops/promises") {
    // Board owns the index redirect and the promise detail pages.
    return pathname === "/ops" || pathname === href || pathname.startsWith("/ops/promises");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentLabel(pathname: string) {
  const match = [...ALL_ITEMS]
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Operations";
}

function NavLinks({
  pathname,
  counts,
  onNavigate,
}: {
  pathname: string;
  counts: Record<string, number>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.label}
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = counts[item.href] ?? 0;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--wr-glow)] text-foreground"
                      : "text-muted-foreground hover:bg-[var(--wr-surface-bright)] hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-[var(--wr-blue)]" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {count > 0 ? (
                    <span
                      className={`ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        item.href === "/ops/jeff"
                          ? "bg-[var(--wr-amber)]/15 text-[var(--wr-gold-soft)]"
                          : "bg-[var(--wr-blue)]/15 text-[var(--wr-blue-soft)]"
                      }`}
                    >
                      {count}
                    </span>
                  ) : active ? (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--wr-blue)]" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <Link href="/ops/promises" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--wr-blue)]/15 text-sm font-black text-[var(--wr-blue)]">
        WR
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold text-foreground">WrenchReady</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Ops
        </span>
      </span>
    </Link>
  );
}

export function OpsShell({
  children,
  counts = {},
}: {
  children: React.ReactNode;
  counts?: Record<string, number>;
}) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sectionLabel = currentLabel(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-[var(--wr-surface-raised)] lg:flex lg:sticky lg:top-0 lg:h-screen">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-none">
          <NavLinks pathname={pathname} counts={counts} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-r border-border bg-[var(--wr-surface-raised)]">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--wr-surface-bright)] hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-none">
              <NavLinks pathname={pathname} counts={counts} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-[var(--wr-surface-bright)] hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--wr-teal)]">
              Operations
            </span>
            <span className="truncate text-sm font-bold text-foreground">{sectionLabel}</span>
          </div>

          {/* Technician filter — foundation for per-tech grouping (wired with the roster model) */}
          <button
            type="button"
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-[var(--wr-surface-bright)] hover:text-foreground"
            title="Filter by technician (coming with the technician roster)"
          >
            <UserCog className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All technicians</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
