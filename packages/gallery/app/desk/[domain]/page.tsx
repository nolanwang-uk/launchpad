import Link from "next/link";
import { notFound } from "next/navigation";
import { PRACTITIONER_DOMAINS } from "@launchpad/registry";
import {
  DOMAIN_BLURBS,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  entriesInDomain,
  labelForDomain,
  loadPractitioners,
} from "@/lib/registry";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkillCard } from "@/components/SkillCard";
import { PractitionerMark } from "@/components/PractitionerMark";

/**
 * Per-domain desk. Editorial masthead lists the desk's framing,
 * its practitioners, and every entry under it — the way a section of
 * a quarterly lists its contributors and articles.
 */

export function generateStaticParams() {
  return PRACTITIONER_DOMAINS.map((d) => ({ domain: d }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  if (!(PRACTITIONER_DOMAINS as readonly string[]).includes(domain)) {
    return { title: "Desk not found · Launchpad" };
  }
  const label = labelForDomain(domain);
  const entries = entriesInDomain(domain);
  return {
    title: `${label} desk · Launchpad`,
    description:
      DOMAIN_BLURBS[domain] ??
      `${entries.length} skill${entries.length === 1 ? "" : "s"} on the ${label} desk.`,
  };
}

export default async function DeskPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  if (!(PRACTITIONER_DOMAINS as readonly string[]).includes(domain)) {
    notFound();
  }
  const entries = entriesInDomain(domain);
  const label = labelForDomain(domain);
  const blurb = DOMAIN_BLURBS[domain];

  // Practitioners contributing to this desk.
  const allPractitioners = loadPractitioners();
  const deskPractitioners = allPractitioners
    .map((p) => ({
      ...p,
      entries: p.entries.filter((e) => (e.domain ?? "general") === domain),
    }))
    .filter((p) => p.entries.length > 0);

  // Neighboring desks for the footer navigator.
  const neighbors = DOMAIN_ORDER.filter((d) => d !== domain);

  return (
    <main id="main" className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-baseline gap-3 min-h-[44px] py-2 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
        >
          <span aria-hidden="true">←</span>
          <span className="font-[family-name:var(--font-display)] text-xl tracking-[color:var(--tracking-display-tight)]">
            Launchpad
          </span>
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pb-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Desks", href: "/#domains" },
            { label },
          ]}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-6 md:pt-10 pb-14">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          Desk
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          {label}
        </h1>
        {blurb && (
          <p className="mt-6 max-w-3xl text-xl text-[color:var(--color-fg-muted)] leading-relaxed">
            {blurb}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
          <span>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {deskPractitioners.length}{" "}
            {deskPractitioners.length === 1 ? "practitioner" : "practitioners"}
          </span>
        </div>
      </section>

      {deskPractitioners.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)]">
              Desk practitioners
            </h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
            {deskPractitioners.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/p/${p.slug}`}
                  className="group flex items-start gap-4 p-5 bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-bg-hover)] transition-colors"
                >
                  <PractitionerMark name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-lg leading-tight group-hover:text-[color:var(--color-accent)] transition-colors">
                      {p.name}
                    </p>
                    {p.credential && (
                      <p className="text-xs text-[color:var(--color-fg-muted)] leading-snug line-clamp-2 mt-1">
                        {p.credential}
                      </p>
                    )}
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] mt-2">
                      {p.entries.length} on this desk
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-6 py-14 border-t border-[color:var(--color-border)]">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)]">
            Entries
          </h2>
        </div>
        {entries.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border-strong)] p-10 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl mb-2">
              No entries yet on the {label} desk.
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] mb-5">
              Domain experts in this space haven&rsquo;t been published
              yet. If that&rsquo;s you, the editors would like to hear
              from you.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center text-sm underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-accent)]"
            >
              Submit yourself as a practitioner →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
            {entries.map((entry) => (
              <SkillCard key={entry.name} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {/* Neighboring desks */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-5">
          Other desks
        </p>
        <ul className="flex flex-wrap gap-2">
          {neighbors.map((d) => (
            <li key={d}>
              <Link
                href={`/desk/${d}`}
                className={[
                  "inline-flex items-center min-h-[44px] px-4 py-2",
                  "border border-[color:var(--color-border)]",
                  "bg-[color:var(--color-bg-elevated)]",
                  "hover:bg-[color:var(--color-bg-hover)] hover:border-[color:var(--color-border-strong)]",
                  "text-sm text-[color:var(--color-fg)]",
                  "transition-colors",
                ].join(" ")}
              >
                {DOMAIN_LABELS[d] ?? d}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
