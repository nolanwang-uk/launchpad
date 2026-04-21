import type { Metadata } from "next";
import Link from "next/link";
import type { RegistryEntry } from "@launchpad/registry";
import { INTEGRATION_KINDS, PRACTITIONER_DOMAINS } from "@launchpad/registry";
import {
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  loadRegistrySync,
} from "@/lib/registry";
import { INTEGRATION_META, labelFor } from "@/lib/integrations";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkillCard } from "@/components/SkillCard";

export const metadata: Metadata = {
  title: "All entries · Launchpad",
  description:
    "Browse every published skill on Launchpad. Filter by desk, tier, and sort by recency, rating, or price.",
};

type Tier = "all" | "Reviewed" | "Community";
type Sort = "recent" | "rating" | "price-asc" | "price-desc";

const VALID_DOMAINS = new Set<string>([...PRACTITIONER_DOMAINS, "all"]);
const VALID_TIERS: Tier[] = ["all", "Reviewed", "Community"];
const VALID_SORTS: Sort[] = ["recent", "rating", "price-asc", "price-desc"];
const VALID_INTEGRATIONS = new Set<string>([...INTEGRATION_KINDS, "all"]);

function getParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Browse-all page. Server-rendered, query-param driven. No pagination
 * in v1 — registry is bounded and the editorial ethos is against
 * infinite scroll anyway (a quarterly is not a feed). When the
 * registry crosses ~50 entries we'll add cursor pagination.
 */
export default async function AllPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawDomain = getParam(sp, "desk");
  const rawTier = getParam(sp, "tier");
  const rawSort = getParam(sp, "sort");
  const rawIntegration = getParam(sp, "integration");
  const rawQuery = getParam(sp, "q") ?? "";
  const query = rawQuery.trim().slice(0, 120);
  const queryLower = query.toLowerCase();

  const domain = rawDomain && VALID_DOMAINS.has(rawDomain) ? rawDomain : "all";
  const tier: Tier =
    rawTier && (VALID_TIERS as string[]).includes(rawTier)
      ? (rawTier as Tier)
      : "all";
  const sort: Sort =
    rawSort && (VALID_SORTS as string[]).includes(rawSort)
      ? (rawSort as Sort)
      : "recent";
  const integration =
    rawIntegration && VALID_INTEGRATIONS.has(rawIntegration)
      ? rawIntegration
      : "all";

  const registry = loadRegistrySync();
  const filtered = registry.entries.filter((e) => {
    if (domain !== "all" && (e.domain ?? "general") !== domain) return false;
    if (tier !== "all" && e.tier !== tier) return false;
    if (
      integration !== "all" &&
      !(e.integrations ?? []).some((it) => it.kind === integration)
    ) {
      return false;
    }
    if (queryLower.length > 0 && !entryMatchesQuery(e, queryLower)) {
      return false;
    }
    return true;
  });
  const sorted = sortEntries(filtered, sort);

  const totalCount = registry.entries.length;
  const resultCount = sorted.length;
  const hasFilter =
    domain !== "all" ||
    tier !== "all" ||
    integration !== "all" ||
    query.length > 0;
  const integrationLabel =
    integration === "all" ? null : labelFor(integration as never);

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
          items={[{ label: "Home", href: "/" }, { label: "All entries" }]}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-6 md:pt-10 pb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          The full roster
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          All entries
        </h1>
        <p className="mt-6 text-lg text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed">
          Every skill in the current issue of the exchange. Filter by
          desk and tier, sort by recency, rating, or price.
        </p>
      </section>

      {/* Filter / sort rail — pure GET form. Works without JS. */}
      <form
        method="GET"
        className="max-w-6xl mx-auto px-6 py-6 border-t border-[color:var(--color-border)]"
        aria-label="Filter and sort"
      >
        <div className="mb-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5">
              Search
            </span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Try 'disclosure', 'ICD-10', 'ARR', 'patent', practitioner names…"
              className={[
                "w-full min-h-[44px] px-3 py-2.5",
                "bg-[color:var(--color-bg-elevated)]",
                "border border-[color:var(--color-border-strong)]",
                "focus:border-[color:var(--color-accent)]",
                "text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]",
                "text-[15px] leading-tight",
                "outline-none transition-colors",
              ].join(" ")}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end">
          <FilterSelect
            name="desk"
            label="Desk"
            value={domain}
            options={[
              { value: "all", label: "All desks" },
              ...DOMAIN_ORDER.map((d) => ({
                value: d,
                label: DOMAIN_LABELS[d] ?? d,
              })),
            ]}
          />
          <FilterSelect
            name="tier"
            label="Tier"
            value={tier}
            options={[
              { value: "all", label: "All tiers" },
              { value: "Reviewed", label: "Verified only" },
              { value: "Community", label: "Community only" },
            ]}
          />
          <FilterSelect
            name="integration"
            label="Integration"
            value={integration}
            options={[
              { value: "all", label: "Any integration" },
              ...[...INTEGRATION_KINDS]
                .sort((a, b) =>
                  INTEGRATION_META[a].label.localeCompare(
                    INTEGRATION_META[b].label,
                  ),
                )
                .map((k) => ({
                  value: k,
                  label: INTEGRATION_META[k].label,
                })),
            ]}
          />
          <FilterSelect
            name="sort"
            label="Sort"
            value={sort}
            options={[
              { value: "recent", label: "Most recent" },
              { value: "rating", label: "Highest rated" },
              { value: "price-asc", label: "Price: low to high" },
              { value: "price-desc", label: "Price: high to low" },
            ]}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className={[
                "inline-flex items-center min-h-[44px] px-4 py-2.5",
                "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
                "hover:bg-[color:var(--color-accent-hover)] transition-colors",
                "font-medium text-sm",
              ].join(" ")}
            >
              Apply
            </button>
            {hasFilter && (
              <Link
                href="/all"
                className={[
                  "inline-flex items-center min-h-[44px] px-3 py-2",
                  "text-sm text-[color:var(--color-fg-muted)]",
                  "hover:text-[color:var(--color-fg)]",
                ].join(" ")}
              >
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>

      <section className="max-w-6xl mx-auto px-6 py-10 border-t border-[color:var(--color-border)]">
        <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
            {resultCount} {resultCount === 1 ? "entry" : "entries"}
            {hasFilter && (
              <>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                of {totalCount}
              </>
            )}
            {query.length > 0 && (
              <>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                matching &ldquo;{query}&rdquo;
              </>
            )}
            {integrationLabel && (
              <>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                connects to {integrationLabel}
              </>
            )}
          </p>
          {sort !== "recent" && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              Sorted by {SORT_LABELS[sort]}
            </p>
          )}
        </div>

        {resultCount === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border-strong)] p-12 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl mb-2">
              No entries match these filters.
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] mb-5">
              Try a broader desk, switch tiers, or clear the filters.
            </p>
            <Link
              href="/all"
              className="inline-flex items-center text-sm underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-accent)]"
            >
              Clear filters →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
            {sorted.map((entry) => (
              <SkillCard key={entry.name} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const SORT_LABELS: Record<Sort, string> = {
  recent: "most recent",
  rating: "highest rated",
  "price-asc": "price, low to high",
  "price-desc": "price, high to low",
};

function entryMatchesQuery(e: RegistryEntry, q: string): boolean {
  if (e.name.toLowerCase().includes(q)) return true;
  if (e.description.toLowerCase().includes(q)) return true;
  if (e.author.toLowerCase().includes(q)) return true;
  if (e.author_credential && e.author_credential.toLowerCase().includes(q))
    return true;
  if (e.who_its_for && e.who_its_for.toLowerCase().includes(q)) return true;
  for (const tag of e.tags) {
    if (tag.toLowerCase().includes(q)) return true;
  }
  return false;
}

function sortEntries(entries: RegistryEntry[], sort: Sort): RegistryEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => {
        const aScore = scoreRating(a);
        const bScore = scoreRating(b);
        if (bScore !== aScore) return bScore - aScore;
        return Date.parse(b.added_at) - Date.parse(a.added_at);
      });
    case "price-asc":
      return copy.sort((a, b) => priceCents(a) - priceCents(b));
    case "price-desc":
      return copy.sort((a, b) => priceCents(b) - priceCents(a));
    case "recent":
    default:
      return copy.sort(
        (a, b) => Date.parse(b.added_at) - Date.parse(a.added_at),
      );
  }
}

/**
 * Bayesian-shrunk rating score: entries with few reviews don't leap
 * above entries with many reviews just because their single reviewer
 * gave five stars. Prior is 3.5 with pseudo-count 3.
 */
function scoreRating(e: RegistryEntry): number {
  const r = typeof e.rating === "number" ? e.rating : 0;
  const n = e.reviews_count ?? 0;
  const prior = 3.5;
  const pseudo = 3;
  return (r * n + prior * pseudo) / (n + pseudo);
}

function priceCents(e: RegistryEntry): number {
  return e.price_usd_cents ?? 0;
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className={[
          "w-full min-h-[44px] px-3 py-2.5",
          "bg-[color:var(--color-bg-elevated)]",
          "border border-[color:var(--color-border-strong)]",
          "focus:border-[color:var(--color-accent)]",
          "text-[color:var(--color-fg)]",
          "text-[15px] leading-tight",
          "outline-none transition-colors",
          "appearance-none",
          "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20d%3D%22M3%204.5L6%207.5L9%204.5%22%20stroke%3D%22%236a6864%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')]",
          "bg-[length:12px_12px] bg-no-repeat bg-[right_12px_center]",
          "pr-9",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
