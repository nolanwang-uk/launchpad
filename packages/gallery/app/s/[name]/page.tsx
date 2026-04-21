import Link from "next/link";
import { notFound } from "next/navigation";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { deriveAuthorSlug } from "@launchpad/registry";
import {
  entriesInDomain,
  findEntry,
  findPractitioner,
  labelForDomain,
  loadRegistrySync,
} from "@/lib/registry";
import { renderMarkdown } from "@/lib/markdown";
import { CliBlock } from "@/components/CliBlock";
import { TierBadge } from "@/components/TierBadge";
import { PractitionerMark } from "@/components/PractitionerMark";
import { Prose } from "@/components/Prose";
import { StarRating } from "@/components/StarRating";
import { HireCTA, formatEngagementPrice } from "@/components/HireCTA";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkillCard } from "@/components/SkillCard";
import { WriteReviewLink } from "@/components/WriteReviewLink";
import { UserMenu } from "@/components/UserMenu";
import { IntegrationList } from "@/components/IntegrationBadge";
import { SaveButton } from "@/components/SaveButton";

export function generateStaticParams() {
  return loadRegistrySync().entries.map((e) => ({ name: e.name }));
}

function ogPathFor(name: string): string | null {
  const rel = `/og/${name}.png`;
  const abs = path.resolve(process.cwd(), "public", "og", `${name}.png`);
  return existsSync(abs) ? rel : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const entry = findEntry(name);
  if (!entry) return { title: "Entry not found · Launchpad" };
  const og = ogPathFor(entry.name);
  return {
    title: `${entry.name} · Launchpad`,
    description: entry.description,
    openGraph: og
      ? {
          title: `${entry.name} — ${entry.tier === "Reviewed" ? "Verified" : "Community"} · Launchpad`,
          description: entry.description,
          type: "article",
          images: [{ url: og, width: 1200, height: 630, alt: entry.name }],
        }
      : undefined,
    twitter: og
      ? {
          card: "summary_large_image",
          title: `${entry.name} — ${entry.tier === "Reviewed" ? "Verified" : "Community"} · Launchpad`,
          description: entry.description,
          images: [og],
        }
      : undefined,
  };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const entry = findEntry(name);
  if (!entry) notFound();

  const repoUrl = `https://github.com/${entry.repo}/tree/${entry.sha}`;
  const readmeHtml = entry.readme_md
    ? await renderMarkdown(entry.readme_md)
    : null;
  const addedAt = new Date(entry.added_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const priceLabel = formatPrice(entry.price_usd_cents);
  const authorSlug = entry.author_slug ?? deriveAuthorSlug(entry.author);
  const hasReviews =
    typeof entry.rating === "number" && (entry.reviews_count ?? 0) > 0;

  // Related entries: other skills by the same practitioner, plus
  // other skills in the same desk. Dedupe against the current entry
  // and against each other so the "More on this desk" row doesn't
  // repeat things already in the practitioner strip.
  const practitioner = findPractitioner(authorSlug);
  const moreByPractitioner =
    practitioner?.entries.filter((e) => e.name !== entry.name).slice(0, 3) ??
    [];
  const domainKey = entry.domain ?? "general";
  const byPractitionerNames = new Set(moreByPractitioner.map((e) => e.name));
  const moreInDomain = entriesInDomain(domainKey)
    .filter(
      (e) => e.name !== entry.name && !byPractitionerNames.has(e.name),
    )
    .slice(0, 3);

  return (
    <main id="main" className="min-h-screen">
      {/* Top nav — editorial, matches home. */}
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
        <div className="flex items-center gap-2">
          <Link
            href="/#domains"
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
          >
            Browse desks →
          </Link>
          <UserMenu />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pb-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            {
              label: labelForDomain(entry.domain),
              href: `/desk/${entry.domain ?? "general"}`,
            },
            { label: entry.name },
          ]}
        />
      </div>

      {/* Mobile install bar. */}
      <div className="lg:hidden sticky top-0 z-20 bg-[color:var(--color-bg)]/95 backdrop-blur-sm border-b border-[color:var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-3">
          <TierBadge tier={entry.tier} size="sm" />
          <span className="text-sm font-[family-name:var(--font-display)] truncate flex-1">
            {entry.name}
          </span>
          <a
            href="#install-rail"
            className={[
              "shrink-0 text-xs font-medium",
              "px-3 py-2 min-h-[44px] inline-flex items-center",
              "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
              "hover:bg-[color:var(--color-accent-hover)]",
              "transition-colors",
            ].join(" ")}
          >
            Hire ↓
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 lg:gap-16">
        {/* Main article — research-paper masthead */}
        <article className="min-w-0">
          {/* Masthead meta row */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-6">
            <TierBadge tier={entry.tier} size="md" />
            {entry.domain && (
              <>
                <span aria-hidden="true">·</span>
                <span>{entry.domain}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Published {addedAt}</span>
            <span aria-hidden="true">·</span>
            <span>{entry.license}</span>
            {hasReviews && (
              <>
                <span aria-hidden="true">·</span>
                <span className="normal-case tracking-normal">
                  <StarRating
                    value={entry.rating!}
                    reviewsCount={entry.reviews_count}
                  />
                </span>
              </>
            )}
          </div>

          <h1
            className={[
              "font-[family-name:var(--font-display)]",
              "text-4xl md:text-6xl leading-[1.02]",
              "tracking-[color:var(--tracking-display)] font-medium",
              "mb-6",
            ].join(" ")}
          >
            {entry.name}
          </h1>

          <p className="text-xl md:text-2xl text-[color:var(--color-fg-muted)] leading-[1.45] max-w-3xl mb-10">
            {entry.description}
          </p>

          {/* Byline block — links to the practitioner's profile */}
          <Link
            href={`/p/${authorSlug}`}
            className={[
              "flex items-start gap-4 py-5 border-y border-[color:var(--color-border)] mb-10",
              "group hover:bg-[color:var(--color-bg-hover)] -mx-2 px-2 transition-colors",
            ].join(" ")}
          >
            <PractitionerMark name={entry.author} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-0.5">
                Practitioner
              </p>
              <p className="font-[family-name:var(--font-display)] text-lg leading-tight group-hover:text-[color:var(--color-accent)] transition-colors">
                {entry.author}
              </p>
              {entry.author_credential && (
                <p className="text-sm text-[color:var(--color-fg-muted)] leading-snug mt-1">
                  {entry.author_credential}
                </p>
              )}
            </div>
            <span
              aria-hidden="true"
              className="text-[color:var(--color-fg-subtle)] group-hover:text-[color:var(--color-accent)] transition-colors self-center font-[family-name:var(--font-display)] text-lg"
            >
              →
            </span>
          </Link>

          {/* Who it's for — pulled out as a lede quote */}
          {entry.who_its_for && (
            <div className="mb-12">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-3">
                Who this is for
              </p>
              <p className="font-[family-name:var(--font-display)] italic text-xl md:text-2xl leading-[1.4] text-[color:var(--color-fg)] border-l-2 border-[color:var(--color-gold-soft)] pl-5 max-w-3xl">
                {entry.who_its_for}
              </p>
            </div>
          )}

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className={[
                    "text-[11px] uppercase tracking-[0.12em]",
                    "px-2.5 py-1",
                    "bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)]",
                    "border border-[color:var(--color-border)]",
                  ].join(" ")}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {entry.integrations && entry.integrations.length > 0 && (
            <section className="mb-10 pt-6 border-t border-[color:var(--color-border)]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
                How this skill connects
              </p>
              <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl mb-4">
                Declared integrations. v1 does not enforce these at
                runtime &mdash; the diff shown before install is still
                the authoritative surface. The{" "}
                <Link
                  href="/integrations"
                  className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
                >
                  integrations roadmap
                </Link>{" "}
                explains which of these are live and which are MCP-only
                today.
              </p>
              <IntegrationList integrations={entry.integrations} />
              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] flex flex-wrap gap-x-3">
                <span>
                  Filesystem: {entry.capabilities.filesystem ? "yes" : "no"}
                </span>
                <span aria-hidden="true">·</span>
                <span>Network: {entry.capabilities.network ? "yes" : "no"}</span>
                <span aria-hidden="true">·</span>
                <span>Shell: {entry.capabilities.shell ? "yes" : "no"}</span>
              </p>
            </section>
          )}

          <section className="mb-14">
            {readmeHtml ? (
              <Prose html={readmeHtml} />
            ) : (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-3xl mb-4 tracking-[color:var(--tracking-display)]">
                  What this skill does
                </h2>
                <p className="text-[color:var(--color-fg-muted)] leading-relaxed text-lg">
                  This entry doesn&rsquo;t inline its README yet. Click the
                  source link on the right to read it at the pinned commit
                  on GitHub.
                </p>
              </>
            )}
          </section>

          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[color:var(--tracking-display)]">
                Reader notes
              </h2>
              {hasReviews && (
                <StarRating
                  value={entry.rating!}
                  reviewsCount={entry.reviews_count}
                  size="md"
                />
              )}
            </div>

            {entry.reviews && entry.reviews.length > 0 ? (
              <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
                {entry.reviews.map((r, i) => (
                  <li key={i} className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <PractitionerMark name={r.reviewer} size="sm" />
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-base leading-tight">
                            {r.reviewer}
                          </p>
                          {r.reviewer_role && (
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] mt-0.5">
                              {r.reviewer_role}
                            </p>
                          )}
                        </div>
                      </div>
                      <StarRating value={r.rating} />
                    </div>
                    <p className="text-[color:var(--color-fg)] leading-relaxed max-w-3xl">
                      {r.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-[color:var(--color-border-strong)] p-8 text-center">
                <p className="font-[family-name:var(--font-display)] text-xl mb-2">
                  No reader notes yet.
                </p>
                <p className="text-sm text-[color:var(--color-fg-muted)] max-w-lg mx-auto">
                  Have you used this skill on a real file? Send editorial
                  two sentences. If it checks out, we&rsquo;ll publish it
                  with your byline.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <WriteReviewLink
                skillName={entry.name}
                practitionerName={entry.author}
              />
              <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed max-w-md">
                Reader notes are editorial, not user-generated. v2 opens
                verified-buyer reviews once engagements settle through
                the editorial desk.
              </p>
            </div>
          </section>


          <section className="mb-12">
            <h2 className="font-[family-name:var(--font-display)] text-3xl mb-4 tracking-[color:var(--tracking-display)]">
              What the CLI will do
            </h2>
            <ul className="space-y-3 text-[color:var(--color-fg)] leading-relaxed">
              <Bullet>
                Fetch the archive at <Mono>{entry.sha.slice(0, 7)}</Mono>,
                verify its commit oid matches.
              </Bullet>
              <Bullet>
                Extract to a temp dir, parse <Mono>skill.yml</Mono>, render
                the two-panel diff prompt.
              </Bullet>
              <Bullet>
                Prompt for <Mono>y</Mono> or <Mono>yes</Mono> (full word if
                any install command looks suspicious).
              </Bullet>
              <Bullet>
                Run install commands under{" "}
                <Mono>env -i PATH=/usr/bin:/bin</Mono> &mdash; no tokens,
                no cloud creds, no ssh agent.
              </Bullet>
            </ul>
          </section>

          {moreByPractitioner.length > 0 && (
            <section className="mb-14 pt-10 border-t border-[color:var(--color-border)]">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)]">
                  More by {firstNameOf(entry.author)}
                </h2>
                <Link
                  href={`/p/${authorSlug}`}
                  className="text-sm text-[color:var(--color-accent)] hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4"
                >
                  Profile →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
                {moreByPractitioner.map((e) => (
                  <SkillCard key={e.name} entry={e} />
                ))}
              </div>
            </section>
          )}

          {moreInDomain.length > 0 && (
            <section className="mb-12 pt-10 border-t border-[color:var(--color-border)]">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)]">
                  More on the {labelForDomain(entry.domain)} desk
                </h2>
                <Link
                  href={`/desk/${domainKey}`}
                  className="text-sm text-[color:var(--color-accent)] hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4"
                >
                  See all →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
                {moreInDomain.map((e) => (
                  <SkillCard key={e.name} entry={e} />
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sticky rail */}
        <aside
          id="install-rail"
          className="lg:sticky lg:top-6 self-start space-y-7 scroll-mt-20"
        >
          {/* Hire — the primary market action. Above install to signal
              that on the Practitioners' Exchange, what you're trading
              for is the practitioner, not just the skill binary. */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              Hire the practitioner
            </p>
            <HireCTA
              href={`/engage/${entry.name}`}
              label="Request engagement"
              priceLabel={formatEngagementPrice(entry.price_usd_cents)}
              size="lg"
            />
            <div className="pt-1">
              <SaveButton skillName={entry.name} variant="inline" />
            </div>
            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
              Route a project through editorial. Scope and terms quoted
              within one business day.
            </p>
          </div>

          <CliBlock skillName={entry.name} />

          <div
            className={[
              "p-4 border border-[color:var(--color-border)]",
              "bg-[color:var(--color-bg-elevated)] space-y-3",
            ].join(" ")}
          >
            <Stat label="Price">{priceLabel}</Stat>
            <Stat label="Source">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4 truncate block"
              >
                {entry.repo}
              </a>
            </Stat>
            <Stat label="Commit">
              <Mono>{entry.sha.slice(0, 7)}</Mono>
            </Stat>
            <Stat label="Tier">
              <TierBadge tier={entry.tier} size="sm" />
            </Stat>
            <Stat label="License">{entry.license}</Stat>
          </div>

          <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
            Capabilities (network / filesystem / shell) are declared in
            <Mono> skill.yml</Mono> but not enforced at runtime in v1. A
            badge we can&rsquo;t verify is worse than no badge.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[color:var(--color-gold-soft)] select-none mt-0.5">
        →
      </span>
      <span>{children}</span>
    </li>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-[family-name:var(--font-mono)] text-[color:var(--color-fg)] text-[0.92em] bg-[color:var(--color-bg-hover)] border border-[color:var(--color-border)] px-1 py-0.5 rounded-sm">
      {children}
    </code>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] shrink-0">
        {label}
      </span>
      <span className="text-[color:var(--color-fg)] min-w-0">{children}</span>
    </div>
  );
}

function formatPrice(cents?: number): string {
  if (cents === undefined || cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function firstNameOf(full: string): string {
  const first = full.split(/\s+/)[0];
  return first && first.length > 0 ? first : full;
}
