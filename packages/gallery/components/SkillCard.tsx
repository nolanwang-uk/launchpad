import Link from "next/link";
import type { RegistryEntry } from "@launchpad/registry";
import { deriveAuthorSlug } from "@launchpad/registry";
import { TierBadge } from "./TierBadge";
import { PractitionerMark } from "./PractitionerMark";
import { StarRating } from "./StarRating";
import { directionGlyph, labelFor } from "@/lib/integrations";

/**
 * Editorial skill card. Byline is the headline unit of value — card
 * leads with practitioner mark + author + credential, then skill name
 * as a display subhead. The byline is a separate link to /p/[slug] so
 * a reader can move laterally through the exchange by practitioner.
 * The card itself routes to /s/[name]. Nested interactive targets
 * have distinct click regions (byline chip and card body).
 */
export function SkillCard({ entry }: { entry: RegistryEntry }) {
  const price = formatPrice(entry.price_usd_cents);
  const slug = entry.author_slug ?? deriveAuthorSlug(entry.author);
  const hasReviews =
    typeof entry.rating === "number" && (entry.reviews_count ?? 0) > 0;

  return (
    <div
      className={[
        "group relative block border border-[color:var(--color-border)]",
        "bg-[color:var(--color-bg-elevated)]",
        "hover:border-[color:var(--color-border-strong)]",
        "transition-colors duration-150",
        "p-5",
      ].join(" ")}
    >
      {/* Top row: tier + price */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <TierBadge tier={entry.tier} />
        <span className="text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em]">
          {price}
        </span>
      </div>

      {/* Byline — own click region to /p/[slug] */}
      <Link
        href={`/p/${slug}`}
        className={[
          "flex items-start gap-3 mb-3",
          "hover:text-[color:var(--color-accent)]",
          "transition-colors",
          "relative z-10",
        ].join(" ")}
      >
        <PractitionerMark name={entry.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-[family-name:var(--font-display)] leading-tight">
            {entry.author}
          </p>
          {entry.author_credential && (
            <p className="text-[11px] text-[color:var(--color-fg-muted)] leading-snug line-clamp-2 mt-0.5 group-hover:text-[color:var(--color-fg-muted)]">
              {entry.author_credential}
            </p>
          )}
        </div>
      </Link>

      {/* Skill link — stretched anchor so the remainder of the card
          navigates to /s/[name] while the byline above stays its own
          link. Implemented via ::before so the visible block stays
          accessible and the byline sits above via z-index. */}
      <Link
        href={`/s/${entry.name}`}
        className="absolute inset-0"
        aria-label={`Read the ${entry.name} entry`}
      />

      <div className="relative">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[color:var(--color-fg)] leading-[1.15] tracking-[color:var(--tracking-display)] mb-2 group-hover:text-[color:var(--color-accent)] transition-colors">
          {entry.name}
        </h3>

        <p className="text-sm text-[color:var(--color-fg-muted)] line-clamp-3 mb-4 leading-relaxed">
          {entry.description}
        </p>

        <div className="flex items-center justify-between gap-3 text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.12em] mb-3">
          <span className="truncate">
            {entry.domain ? entry.domain : "general"}
            {entry.tags.length > 0 && <> · {entry.tags.slice(0, 2).join(" · ")}</>}
          </span>
          {hasReviews ? (
            <span className="shrink-0 normal-case tracking-normal">
              <StarRating
                value={entry.rating!}
                reviewsCount={entry.reviews_count}
              />
            </span>
          ) : (
            <code className="font-[family-name:var(--font-mono)] normal-case tracking-normal">
              {entry.sha.slice(0, 7)}
            </code>
          )}
        </div>

        {entry.integrations && entry.integrations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-3 border-t border-[color:var(--color-border)]">
            {entry.integrations.slice(0, 3).map((it, i) => (
              <span
                key={`${it.kind}-${i}`}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border)] px-1.5 py-0.5"
              >
                <span
                  aria-hidden="true"
                  className="text-[color:var(--color-gold)] normal-case tracking-normal"
                >
                  {directionGlyph(it.direction)}
                </span>
                <span>{labelFor(it.kind)}</span>
              </span>
            ))}
            {entry.integrations.length > 3 && (
              <span className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
                +{entry.integrations.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(cents?: number): string {
  if (cents === undefined || cents === 0) return "Free";
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}
