import Link from "next/link";
import type { RegistryEntry } from "@launchpad/registry";
import { deriveAuthorSlug } from "@launchpad/registry";
import {
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  loadPractitioners,
  loadRegistrySync,
  type Practitioner,
} from "@/lib/registry";
import { SkillCard } from "@/components/SkillCard";
import { TierBadge } from "@/components/TierBadge";
import { PractitionerMark } from "@/components/PractitionerMark";
import { CopyCommand } from "@/components/CopyCommand";
import { StarRating } from "@/components/StarRating";
import { HireCTA, formatEngagementPrice } from "@/components/HireCTA";
import { UserMenu } from "@/components/UserMenu";

/**
 * Practitioners' Exchange — editorial home. The page reads as the
 * front matter of a quarterly journal: masthead, one featured
 * practitioner above the fold, a domain navigator (Law / Medicine /
 * Finance / …), recent editorial entries, and an "Ethos" block that
 * explains why we verify. The CLI exists but it lives in the footer,
 * not the hero: on an exchange, the trade is the thing, not the tool.
 */


export default function HomePage() {
  const registry = loadRegistrySync();
  // Featured-this-week should never be the editorial seed (hello-world)
  // — it's a smoke-test entry, not a practitioner's real work. Prefer
  // Verified + real-practitioner bylines, sorted by freshness.
  const isEditorialSeed = (e: RegistryEntry) =>
    (e.author_slug ?? deriveAuthorSlug(e.author)) === "launchpad-editorial";
  const verified = registry.entries.filter((e) => e.tier === "Reviewed");
  const eligible = verified
    .filter((e) => !isEditorialSeed(e))
    .sort((a, b) => Date.parse(b.added_at) - Date.parse(a.added_at));
  const featured =
    eligible[0] ??
    verified[0] ??
    registry.entries.find((e) => !isEditorialSeed(e)) ??
    registry.entries[0];
  const recent = registry.entries.slice(0, 6);
  const domainCounts = countByDomain(registry.entries);
  const updatedAt = registry.updated_at;
  const practitioners = loadPractitioners();

  return (
    <main id="main" className="min-h-screen">
      <Masthead updatedAt={updatedAt} total={registry.entries.length} />

      {/* Featured practitioner — above the fold, one skill, treated
          like a journal's lead essay. */}
      {featured && (
        <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-16 md:pb-20">
          <div className="editorial-rule mb-8">
            <span>Featured this week</span>
          </div>
          <FeaturedPractitioner entry={featured} />
        </section>
      )}

      {/* Domain navigator — this is the product's real index. On a
          practitioners' exchange, you don't "trend" — you know what
          job you need done and look up the right desk. */}
      <section
        id="domains"
        className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]"
      >
        <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] tracking-[color:var(--tracking-display)] mb-2">
          Browse by domain
        </h2>
        <p className="text-[color:var(--color-fg-muted)] max-w-2xl mb-10 leading-relaxed">
          Each skill lives under one practitioner desk. Subfields,
          methodologies, and jurisdictions are tags inside the desk.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[color:var(--color-border)]">
          {DOMAIN_ORDER.map((d) => (
            <DomainCell
              key={d}
              domain={d}
              count={domainCounts.get(d) ?? 0}
            />
          ))}
        </div>
      </section>

      {/* Practitioners — the contributors page of the quarterly. */}
      {practitioners.length > 0 && (
        <section
          id="practitioners"
          className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]"
        >
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] tracking-[color:var(--tracking-display)]">
              Practitioners
            </h2>
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              {practitioners.length} on the roster
            </p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
            {practitioners.map((p) => (
              <li key={p.slug}>
                <PractitionerRow practitioner={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent entries — editorial, not grid-of-tiles. */}
      <section
        id="recent"
        className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]"
      >
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] tracking-[color:var(--tracking-display)]">
            Recently published
          </h2>
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
            Showing {recent.length} of {registry.entries.length}
          </p>
        </div>

        {recent.length === 0 ? (
          <EmptyRegistry />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
              {recent.map((entry) => (
                <SkillCard key={entry.name} entry={entry} />
              ))}
            </div>
            {registry.entries.length > recent.length && (
              <div className="mt-8 flex justify-center">
                <Link
                  href="/all"
                  className={[
                    "inline-flex items-center min-h-[48px] px-6 py-3",
                    "border border-[color:var(--color-border-strong)]",
                    "bg-[color:var(--color-bg-elevated)]",
                    "hover:bg-[color:var(--color-bg-hover)]",
                    "text-sm font-medium tracking-[0.02em]",
                    "transition-colors",
                  ].join(" ")}
                >
                  See all {registry.entries.length} entries →
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Ethos — what we verify, why we verify it, what it's not.
          This is the page that differentiates an exchange from a
          generic marketplace: the editors' promise. */}
      <Ethos />

      {/* Supply-side CTA — the masthead's most important recurring
          question is "how do I get on here?" Keep it visible near
          the ethos section, not buried in the footer. */}
      <SubmitCTA />

      {/* CLI install — deliberately demoted below the editorial fold.
          Practitioners aren't the audience for "nothing to install":
          their buyers are. */}
      <InstallSection featuredName={featured?.name} />

      <Footer />
    </main>
  );
}

function Masthead({ updatedAt, total }: { updatedAt: string; total: number }) {
  const volYear = new Date(updatedAt).getFullYear();
  const issueDate = new Date(updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <header className="max-w-6xl mx-auto px-6 pt-10 pb-8">
      <Nav />
      <div className="mt-10 md:mt-14">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-6 flex items-center gap-3">
          <span>Vol. {volYear}</span>
          <span aria-hidden="true">·</span>
          <span>{issueDate}</span>
          <span aria-hidden="true">·</span>
          <span>{total} practitioners on the roster</span>
        </p>
        <h1
          className={[
            "font-[family-name:var(--font-display)]",
            "text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95]",
            "tracking-[color:var(--tracking-display-tight)]",
            "max-w-5xl font-medium",
          ].join(" ")}
        >
          A Practitioners&rsquo; Exchange for Claude Code.
        </h1>
        <p className="mt-6 md:mt-8 max-w-2xl text-lg md:text-xl text-[color:var(--color-fg-muted)] leading-relaxed">
          Each skill is a working professional&rsquo;s judgment,
          distilled into a Claude Code workflow. Securities lawyers,
          clinical coders, FP&amp;A leads, patent agents. Credentials
          verified. Install grammar vetted. Source always visible.
        </p>
      </div>
    </header>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between">
      <Link
        href="/"
        className="inline-flex items-baseline gap-2 min-h-[44px] py-3"
      >
        <span className="font-[family-name:var(--font-display)] text-2xl tracking-[color:var(--tracking-display-tight)] font-medium">
          Launchpad
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] hidden sm:inline">
          The Practitioners&rsquo; Exchange
        </span>
      </Link>
      <div className="flex items-center gap-1 sm:gap-3 text-sm text-[color:var(--color-fg-muted)]">
        <a
          href="#domains"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Desks
        </a>
        <a
          href="#practitioners"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Practitioners
        </a>
        <Link
          href="/integrations"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Integrations
        </Link>
        <a
          href="/docs"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Docs
        </a>
        <a
          href="#ethos"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Ethos
        </a>
        <Link
          href="/submit"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          Submit
        </Link>
        <a
          href="https://github.com/nolanwang-uk/launchpad"
          className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px]"
        >
          GitHub
        </a>
        <span
          aria-hidden="true"
          className="hidden sm:inline text-[color:var(--color-border-strong)] mx-1"
        >
          |
        </span>
        <UserMenu />
      </div>
    </nav>
  );
}

function FeaturedPractitioner({ entry }: { entry: RegistryEntry }) {
  const slug = entry.author_slug ?? deriveAuthorSlug(entry.author);
  const hasReviews =
    typeof entry.rating === "number" && (entry.reviews_count ?? 0) > 0;

  return (
    <article className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start">
      <Link
        href={`/p/${slug}`}
        className="flex flex-row lg:flex-col items-start gap-4 lg:w-48 group py-2 -my-2 min-h-[44px]"
      >
        <PractitionerMark name={entry.author} size="lg" />
        <div className="lg:mt-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1">
            Practitioner
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg leading-tight group-hover:text-[color:var(--color-accent)] transition-colors">
            {entry.author}
          </p>
          {entry.author_credential && (
            <p className="text-xs text-[color:var(--color-fg-muted)] leading-snug mt-1.5">
              {entry.author_credential}
            </p>
          )}
        </div>
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <TierBadge tier={entry.tier} size="md" />
          {entry.domain && (
            <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              {DOMAIN_LABELS[entry.domain] ?? entry.domain}
            </span>
          )}
          {hasReviews && (
            <>
              <span
                aria-hidden="true"
                className="text-[color:var(--color-fg-subtle)]"
              >
                ·
              </span>
              <StarRating
                value={entry.rating!}
                reviewsCount={entry.reviews_count}
                size="md"
              />
            </>
          )}
        </div>
        <Link href={`/s/${entry.name}`} className="block group">
          <h2
            className={[
              "font-[family-name:var(--font-display)]",
              "text-4xl md:text-5xl leading-[1.05]",
              "tracking-[color:var(--tracking-display)]",
              "font-medium mb-4",
              "group-hover:text-[color:var(--color-accent)] transition-colors",
            ].join(" ")}
          >
            {entry.name}
          </h2>
        </Link>
        <p className="text-lg md:text-xl text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl mb-5">
          {entry.description}
        </p>
        {entry.who_its_for && (
          <p className="font-[family-name:var(--font-display)] italic text-[color:var(--color-fg)] text-lg leading-relaxed border-l-2 border-[color:var(--color-gold-soft)] pl-4 max-w-2xl mb-8">
            For {entry.who_its_for}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <HireCTA
            href={`/engage/${entry.name}`}
            label="Hire this practitioner"
            priceLabel={formatEngagementPrice(entry.price_usd_cents)}
            size="lg"
          />
          <Link
            href={`/s/${entry.name}`}
            className={[
              "inline-flex items-center min-h-[48px] px-4 py-3",
              "text-sm font-medium text-[color:var(--color-fg)]",
              "hover:text-[color:var(--color-accent)] transition-colors",
            ].join(" ")}
          >
            Read the entry →
          </Link>
        </div>
      </div>
    </article>
  );
}

function PractitionerRow({ practitioner }: { practitioner: Practitioner }) {
  const skillCount = practitioner.entries.length;
  const domains = Array.from(
    new Set(practitioner.entries.map((e) => e.domain ?? "general")),
  );
  const totalReviews = practitioner.entries.reduce(
    (sum, e) => sum + (e.reviews_count ?? 0),
    0,
  );
  const weighted = practitioner.entries.reduce(
    (sum, e) => sum + (e.rating ?? 0) * (e.reviews_count ?? 0),
    0,
  );
  const avg = totalReviews > 0 ? weighted / totalReviews : undefined;

  return (
    <Link
      href={`/p/${practitioner.slug}`}
      className={[
        "group flex items-start gap-4 p-5",
        "bg-[color:var(--color-bg-elevated)]",
        "hover:bg-[color:var(--color-bg-hover)]",
        "transition-colors",
      ].join(" ")}
    >
      <PractitionerMark name={practitioner.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-display)] text-xl leading-tight group-hover:text-[color:var(--color-accent)] transition-colors">
          {practitioner.name}
        </p>
        {practitioner.credential && (
          <p className="text-sm text-[color:var(--color-fg-muted)] leading-snug line-clamp-2 mt-1">
            {practitioner.credential}
          </p>
        )}
        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {skillCount} skill{skillCount === 1 ? "" : "s"}
          </span>
          {domains.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{domains.slice(0, 3).join(" · ")}</span>
            </>
          )}
          {avg !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="normal-case tracking-normal">
                <StarRating value={avg} reviewsCount={totalReviews} />
              </span>
            </>
          )}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="font-[family-name:var(--font-display)] text-lg text-[color:var(--color-fg-subtle)] group-hover:text-[color:var(--color-accent)] transition-colors self-center"
      >
        →
      </span>
    </Link>
  );
}

function DomainCell({ domain, count }: { domain: string; count: number }) {
  const label = DOMAIN_LABELS[domain] ?? domain;
  const hasEntries = count > 0;
  return (
    <Link
      href={`/desk/${domain}`}
      aria-disabled={!hasEntries}
      className={[
        "group border-r border-b border-[color:var(--color-border)]",
        "px-5 py-6 flex items-start justify-between gap-4",
        "hover:bg-[color:var(--color-bg-hover)] transition-colors",
        "min-h-[88px]",
      ].join(" ")}
    >
      <div>
        <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[color:var(--color-fg)]">
          {label}
        </p>
        <p className="text-xs text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em] mt-1">
          {hasEntries
            ? `${count} ${count === 1 ? "entry" : "entries"}`
            : "Desk opening soon"}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={[
          "font-[family-name:var(--font-display)] text-lg",
          "text-[color:var(--color-fg-subtle)]",
          "group-hover:text-[color:var(--color-accent)]",
        ].join(" ")}
      >
        →
      </span>
    </Link>
  );
}

function Ethos() {
  return (
    <section
      id="ethos"
      className="max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-[color:var(--color-border)]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
            Editorial ethos
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
            Why we verify practitioners.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 text-[color:var(--color-fg)] leading-relaxed">
          <EthosPoint
            label="The unit of value"
            body="What you&rsquo;re trading for is a working professional&rsquo;s judgment — the twenty years of seeing the same document, the same chart, the same close — encoded into a prompt. We verify that the person on the byline is who they say they are."
          />
          <EthosPoint
            label="Verified means verified"
            body="Verified practitioners hand over a credential that an editor can check against a public registry or employer record. It doesn&rsquo;t mean the skill is bug-free. It means the signature is."
          />
          <EthosPoint
            label="Community is still welcome"
            body="You can publish a skill without verifying. It ships as Community, the diff is shown before install, and the provenance chain is still SHA-pinned. We just don&rsquo;t stamp it."
          />
          <EthosPoint
            label="Source is always visible"
            body="Every entry links to the exact commit. Every install prints every file it will write and every command it will run, decoded if obfuscated, before a single byte lands on your machine."
          />
        </div>
      </div>
    </section>
  );
}

function EthosPoint({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-2">
        {label}
      </p>
      <p className="text-[15px] leading-relaxed">{body}</p>
    </div>
  );
}

function SubmitCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
            For practitioners
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl leading-[1.05] tracking-[color:var(--tracking-display)] font-medium mb-4">
            Have a domain credential? Become a practitioner.
          </h2>
          <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed">
            Editorial helps you draft your first skill, closes the
            install grammar, and publishes you with a Verified seal.
            You keep the copyright. Revenue share is set by the desk.
          </p>
        </div>
        <Link
          href="/submit"
          className={[
            "inline-flex items-center min-h-[56px] px-6 py-3",
            "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
            "hover:bg-[color:var(--color-accent-hover)] transition-colors",
            "font-medium tracking-[0.02em] text-base",
            "shrink-0",
          ].join(" ")}
        >
          Apply to publish →
        </Link>
      </div>
    </section>
  );
}

function InstallSection({ featuredName }: { featuredName?: string }) {
  const exampleCmd = featuredName
    ? `npx launchpad run ${featuredName}`
    : "npx launchpad run <skill>";
  return (
    <section
      id="install"
      className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
            The tool
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
            One command. Any entry.
          </h2>
          <p className="text-[color:var(--color-fg-muted)] mt-4 leading-relaxed">
            The Launchpad CLI is plumbing. It fetches the pinned SHA,
            shows the diff, runs under a scrubbed environment. Most
            readers should start with a single skill.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InstallOption
            title="Zero install"
            body="Nothing to install locally. Try any entry with one line."
            command={exampleCmd}
          />
          <InstallOption
            title="Homebrew"
            body="Install the CLI if you read the journal daily."
            command="brew install launchpad/tap/skillz"
          />
        </div>
      </div>
    </section>
  );
}

function InstallOption({
  title,
  body,
  command,
}: {
  title: string;
  body: string;
  command: string;
}) {
  return (
    <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
      <h3 className="font-[family-name:var(--font-display)] text-xl mb-2 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--color-fg-muted)] mb-4 leading-relaxed min-h-[3rem]">
        {body}
      </p>
      <CopyCommand command={command} />
    </div>
  );
}

function EmptyRegistry() {
  return (
    <div className="border border-[color:var(--color-border)] p-12 text-center bg-[color:var(--color-bg-elevated)]">
      <p className="font-[family-name:var(--font-display)] text-xl mb-2">
        The roster is empty.
      </p>
      <p className="text-sm text-[color:var(--color-fg-muted)] mb-6">
        No practitioners have been admitted yet. Be the first.
      </p>
      <a
        href="https://github.com/nolanwang-uk/launchpad"
        className="inline-block text-sm underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-accent)]"
      >
        Submit your credential →
      </a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border)] mt-4">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 md:gap-12">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-[color:var(--tracking-display-tight)] leading-tight">
              Launchpad
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mt-1.5">
              The Practitioners&rsquo; Exchange for Claude Code
            </p>
            <p className="mt-4 text-sm text-[color:var(--color-fg-muted)] max-w-md leading-relaxed">
              A curated marketplace of domain-verified Claude Code
              skills. SHA-pinned, source-visible, every install shown
              as a diff before it runs.
            </p>
          </div>
          <FooterCol title="For buyers">
            <FooterLink href="/all">Browse all entries</FooterLink>
            <FooterLink href="/#domains">Browse by desk</FooterLink>
            <FooterLink href="/#practitioners">Practitioners</FooterLink>
            <FooterLink href="/integrations">Integrations</FooterLink>
            <FooterLink href="/#install">Install the CLI</FooterLink>
          </FooterCol>
          <FooterCol title="For practitioners">
            <FooterLink href="/submit">Become a practitioner</FooterLink>
            <FooterLink href="/#ethos">Editorial ethos</FooterLink>
            <FooterLink href="/docs/build-your-first-skill">
              Build your first skill
            </FooterLink>
            <FooterLink href="/docs/registry-entry">
              Registry entry spec
            </FooterLink>
          </FooterCol>
          <FooterCol title="Project">
            <FooterLink href="https://github.com/nolanwang-uk/launchpad">
              GitHub
            </FooterLink>
            <FooterLink href="https://github.com/nolanwang-uk/launchpad/releases">
              Releases
            </FooterLink>
            <FooterLink href="/docs/security-model">Security</FooterLink>
            <FooterLink href="/docs/privacy">Privacy</FooterLink>
          </FooterCol>
        </div>
        <div className="border-t border-[color:var(--color-border)] mt-12 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-[color:var(--color-fg-subtle)]">
          <p>© {new Date().getFullYear()} Launchpad Editorial.</p>
          <p>
            An open-source project. Contributions welcome at{" "}
            <a
              href="https://github.com/nolanwang-uk/launchpad"
              className="underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-fg)]"
            >
              github.com/nolanwang-uk/launchpad
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-4">
        {title}
      </p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <li>
      {external ? (
        <a
          href={href}
          className="text-sm text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors py-2.5 inline-flex items-center min-h-[44px]"
        >
          {children}
        </a>
      ) : (
        <Link
          href={href}
          className="text-sm text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors py-2.5 inline-flex items-center min-h-[44px]"
        >
          {children}
        </Link>
      )}
    </li>
  );
}

function countByDomain(
  entries: readonly RegistryEntry[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    const d = e.domain ?? "general";
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}
