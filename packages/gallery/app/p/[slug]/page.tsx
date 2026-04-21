import Link from "next/link";
import { notFound } from "next/navigation";
import type { RegistryEntry } from "@launchpad/registry";
import {
  DOMAIN_LABELS,
  findPractitioner,
  labelForDomain,
  loadPractitioners,
} from "@/lib/registry";
import { labelFor as integrationLabel } from "@/lib/integrations";
import { PractitionerMark } from "@/components/PractitionerMark";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { HireCTA, formatEngagementPrice } from "@/components/HireCTA";
import { Breadcrumbs } from "@/components/Breadcrumbs";

/**
 * Practitioner profile page. Aggregates every skill by one author
 * under a single editorial surface. On the Practitioners' Exchange,
 * the practitioner is the thing being traded on — so this page is the
 * direct equivalent of a journal contributor's page on a quarterly.
 */

export function generateStaticParams() {
  return loadPractitioners().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = findPractitioner(slug);
  if (!p) return { title: "Practitioner not found · Launchpad" };
  const title = `${p.name} · Launchpad`;
  const description =
    p.credential ??
    `${p.entries.length} skill${p.entries.length === 1 ? "" : "s"} on Launchpad.`;
  return {
    title,
    description,
    openGraph: {
      title: `${p.name} — Practitioner · Launchpad`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${p.name} — Practitioner · Launchpad`,
      description,
    },
  };
}

export default async function PractitionerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = findPractitioner(slug);
  if (!p) notFound();

  const totalReviews = p.entries.reduce(
    (sum, e) => sum + (e.reviews_count ?? 0),
    0,
  );
  const ratedEntries = p.entries.filter(
    (e) => typeof e.rating === "number" && (e.reviews_count ?? 0) > 0,
  );
  const weighted = ratedEntries.reduce(
    (sum, e) => sum + (e.rating ?? 0) * (e.reviews_count ?? 0),
    0,
  );
  const avgRating =
    totalReviews > 0 ? weighted / Math.max(1, totalReviews) : undefined;

  // Derived stats
  const domainCounts = new Map<string, number>();
  for (const e of p.entries) {
    const k = e.domain ?? "general";
    domainCounts.set(k, (domainCounts.get(k) ?? 0) + 1);
  }
  const domainsSorted = [...domainCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );

  const verifiedCount = p.entries.filter((e) => e.tier === "Reviewed").length;
  const freeCount = p.entries.filter(
    (e) => (e.price_usd_cents ?? 0) === 0,
  ).length;
  const paidCount = p.entries.length - freeCount;

  const priceCentsList = p.entries
    .map((e) => e.price_usd_cents ?? 0)
    .filter((c) => c > 0);
  const priceRange =
    priceCentsList.length === 0
      ? null
      : {
          min: Math.min(...priceCentsList),
          max: Math.max(...priceCentsList),
        };

  const integrationKinds = new Set<string>();
  for (const e of p.entries) {
    for (const it of e.integrations ?? []) integrationKinds.add(it.kind);
  }
  const topIntegrations = [...integrationKinds].slice(0, 6);

  const firstPublishedAt = p.entries.reduce<Date | null>((acc, e) => {
    if (e.tier !== "Reviewed" && e.tier !== "Community") return acc;
    const t = new Date(e.added_at);
    if (Number.isNaN(t.getTime())) return acc;
    if (!acc || t < acc) return t;
    return acc;
  }, null);
  const lastPublishedAt = p.entries.reduce<Date | null>((acc, e) => {
    const t = new Date(e.added_at);
    if (Number.isNaN(t.getTime())) return acc;
    if (!acc || t > acc) return t;
    return acc;
  }, null);

  const domains = Array.from(domainCounts.keys());

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
            { label: "Practitioners", href: "/#recent" },
            { label: p.name },
          ]}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-6 md:pt-10 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start">
          <PractitionerMark name={p.name} size="lg" />

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
              Practitioner
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl leading-[1.02] tracking-[color:var(--tracking-display)] font-medium">
              {p.name}
            </h1>
            {p.credential && (
              <p className="mt-4 text-lg text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl">
                {p.credential}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              <span>
                {p.entries.length} skill
                {p.entries.length === 1 ? "" : "s"}
              </span>
              {domains.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {domains
                      .map((d) => labelForDomain(d))
                      .join(" · ")}
                  </span>
                </>
              )}
              {avgRating !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <StarRating value={avgRating} reviewsCount={totalReviews} />
                </>
              )}
              {lastPublishedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Last published {formatMonth(lastPublishedAt)}
                  </span>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <HireCTA
                href={`/engage/practitioner-${p.slug}`}
                label="Hire this practitioner"
                priceLabel={
                  priceRange
                    ? priceRange.min === priceRange.max
                      ? `From $${Math.round(priceRange.min / 100)}`
                      : `From $${Math.round(priceRange.min / 100)}`
                    : "1 business day"
                }
                size="lg"
              />
              <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
                Inquiries routed via Launchpad editorial
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14 border-t border-[color:var(--color-border)]">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-2">
            At the desk
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)]">
            A working record.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)] mb-10">
          <ProfileStat
            label="Published skills"
            value={String(p.entries.length)}
            accent
          />
          <ProfileStat
            label="Verified bylines"
            value={`${verifiedCount}/${p.entries.length}`}
          />
          <ProfileStat
            label="Reader notes"
            value={String(totalReviews)}
          />
          <ProfileStat
            label="Price range"
            value={
              priceRange
                ? priceRange.min === priceRange.max
                  ? formatCurrency(priceRange.min)
                  : `${formatCurrency(priceRange.min)}–${formatCurrency(priceRange.max)}`
                : freeCount > 0
                  ? "Free"
                  : "—"
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-3">
              Desks covered
            </p>
            <ul className="space-y-2">
              {domainsSorted.map(([domain, count]) => (
                <li
                  key={domain}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/desk/${domain}`}
                    className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    {DOMAIN_LABELS[domain] ?? domain}
                  </Link>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] tabular-nums">
                    {count} {count === 1 ? "skill" : "skills"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-3">
              Systems reached
            </p>
            {topIntegrations.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-subtle)]">
                No integrations declared yet.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {topIntegrations.map((k) => (
                  <li key={k}>
                    <Link
                      href={`/all?integration=${k}`}
                      className={[
                        "inline-flex items-center text-[11px] uppercase tracking-[0.12em]",
                        "border border-[color:var(--color-border-strong)]",
                        "bg-[color:var(--color-bg-elevated)]",
                        "hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]",
                        "text-[color:var(--color-fg)] px-2 py-0.5 min-h-[24px]",
                        "transition-colors",
                      ].join(" ")}
                    >
                      {integrationLabel(k as never)}
                    </Link>
                  </li>
                ))}
                {integrationKinds.size > topIntegrations.length && (
                  <li className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-fg-subtle)] self-center">
                    +{integrationKinds.size - topIntegrations.length} more
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] flex flex-wrap gap-x-4 gap-y-1 pt-5 border-t border-[color:var(--color-border)]">
          {firstPublishedAt && (
            <span>First published {formatMonth(firstPublishedAt)}</span>
          )}
          {firstPublishedAt && <span aria-hidden="true">·</span>}
          <span>
            {paidCount} paid · {freeCount} free
          </span>
          {avgRating !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Avg rating {avgRating.toFixed(1)} across {totalReviews} notes
              </span>
            </>
          )}
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14 border-t border-[color:var(--color-border)]">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl tracking-[color:var(--tracking-display)]">
            Skills by {firstName(p.name)}
          </h2>
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
            {p.entries.length} {p.entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>

        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {p.entries.map((entry) => (
            <li key={entry.name}>
              <ProfileSkillRow entry={entry} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ProfileSkillRow({ entry }: { entry: RegistryEntry }) {
  return (
    <Link
      href={`/s/${entry.name}`}
      className={[
        "group grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-4 md:gap-8",
        "py-6 px-1",
        "hover:bg-[color:var(--color-bg-hover)] transition-colors",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
          <TierBadge tier={entry.tier} />
          {entry.domain && (
            <>
              <span aria-hidden="true">·</span>
              <span>{entry.domain}</span>
            </>
          )}
          {typeof entry.rating === "number" &&
            (entry.reviews_count ?? 0) > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <StarRating
                  value={entry.rating}
                  reviewsCount={entry.reviews_count}
                />
              </>
            )}
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl leading-[1.1] tracking-[color:var(--tracking-display)] group-hover:text-[color:var(--color-accent)] transition-colors">
          {entry.name}
        </h3>
        <p className="mt-2 text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl">
          {entry.description}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
          {formatEngagementPrice(entry.price_usd_cents)}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[color:var(--color-accent)] group-hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4">
          Read the entry →
        </p>
      </div>
    </Link>
  );
}

function firstName(full: string): string {
  const first = full.split(/\s+/)[0];
  return first && first.length > 0 ? first : full;
}

function ProfileStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "p-5 min-h-[110px]",
        accent
          ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
          : "bg-[color:var(--color-bg-elevated)]",
      ].join(" ")}
    >
      <p
        className={[
          "text-[11px] uppercase tracking-[0.14em] mb-3",
          accent
            ? "text-[color:var(--color-accent-fg)]/80"
            : "text-[color:var(--color-fg-subtle)]",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-2xl md:text-3xl leading-none">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars === 0) return "Free";
  if (dollars >= 1000) return `$${Math.round(dollars).toLocaleString("en-US")}`;
  return `$${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}
