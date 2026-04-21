"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { AuthGate } from "@/components/AuthGate";
import { PractitionerMark } from "@/components/PractitionerMark";

/**
 * Dashboard shell. Sidebar nav on desktop, horizontal chip nav on
 * mobile. All auth checks happen in <AuthGate>; this layout assumes
 * a user is present.
 */

const NAV_ITEMS: { href: string; label: string; roles: ("reader" | "practitioner" | "both")[] }[] = [
  { href: "/dashboard", label: "Overview", roles: ["reader", "practitioner", "both"] },
  { href: "/dashboard/profile", label: "Profile", roles: ["reader", "practitioner", "both"] },
  { href: "/dashboard/credits", label: "Credits", roles: ["reader", "practitioner", "both"] },
  { href: "/dashboard/saved", label: "Saved", roles: ["reader", "practitioner", "both"] },
  { href: "/dashboard/submits", label: "Submits", roles: ["practitioner", "both"] },
  { href: "/dashboard/reviews", label: "Reader notes", roles: ["reader", "practitioner", "both"] },
  { href: "/dashboard/sold", label: "Engagements", roles: ["practitioner", "both"] },
  { href: "/dashboard/settings", label: "Settings", roles: ["reader", "practitioner", "both"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <DashboardShell>{children}</DashboardShell>
    </AuthGate>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <main id="main" className="min-h-screen">
      <TopBar />
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 lg:gap-14">
        <aside className="min-w-0">
          <div className="flex items-start gap-3 pb-6 border-b border-[color:var(--color-border)] mb-6">
            <PractitionerMark name={user.display_name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] text-lg leading-tight truncate">
                {user.display_name}
              </p>
              <p className="text-xs text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em] mt-1 truncate">
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
          <nav aria-label="Dashboard" className="flex lg:block gap-1 overflow-x-auto lg:overflow-visible">
            {items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block shrink-0 lg:shrink px-3 py-2.5",
                    "text-sm",
                    "border-l-2",
                    active
                      ? "border-l-[color:var(--color-accent)] text-[color:var(--color-fg)] bg-[color:var(--color-bg-hover)]"
                      : "border-l-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)]",
                    "transition-colors whitespace-nowrap",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/logout"
              className={[
                "block shrink-0 lg:shrink px-3 py-2.5 mt-1",
                "text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
                "border-l-2 border-l-transparent",
                "lg:border-t lg:border-t-[color:var(--color-border)] lg:pt-4 lg:mt-4",
                "whitespace-nowrap",
              ].join(" ")}
            >
              Sign out
            </Link>
          </nav>

        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
      <Link
        href="/"
        className="inline-flex items-baseline gap-3 min-h-[44px] py-2 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      >
        <span aria-hidden="true">←</span>
        <span className="font-[family-name:var(--font-display)] text-xl tracking-[color:var(--tracking-display-tight)]">
          Launchpad
        </span>
      </Link>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
        Editorial desk
      </p>
    </nav>
  );
}

function roleLabel(role: "reader" | "practitioner" | "both"): string {
  if (role === "reader") return "Reader";
  if (role === "practitioner") return "Practitioner";
  return "Practitioner + reader";
}
