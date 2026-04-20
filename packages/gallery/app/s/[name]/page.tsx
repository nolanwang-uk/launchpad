import Link from "next/link";
import { notFound } from "next/navigation";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { findEntry, loadRegistrySync } from "@/lib/registry";
import { renderMarkdown } from "@/lib/markdown";
import { CopyCommand } from "@/components/CopyCommand";
import { TierBadge } from "@/components/TierBadge";
import { Prose } from "@/components/Prose";

export function generateStaticParams() {
  return loadRegistrySync().entries.map((e) => ({ name: e.name }));
}

/**
 * Resolve the per-skill OG image. Returns the rendered PNG path if it
 * exists (committed by the og-render workflow), otherwise null so the
 * site-default OG is used.
 */
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
  if (!entry) return { title: "Skill not found · launchpad" };
  const og = ogPathFor(entry.name);
  return {
    title: `${entry.name} · launchpad`,
    description: entry.description,
    openGraph: og
      ? {
          title: `${entry.name} — ${entry.tier} skill`,
          description: entry.description,
          type: "article",
          images: [{ url: og, width: 1200, height: 630, alt: entry.name }],
        }
      : undefined,
    twitter: og
      ? {
          card: "summary_large_image",
          title: `${entry.name} — ${entry.tier} skill`,
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

  return (
    <main id="main" className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg tracking-[color:var(--tracking-display-tight)] py-3 inline-flex items-center min-h-[44px]"
        >
          ← launchpad
        </Link>
      </nav>

      {/* Mobile primary-action bar — sticky directly under nav so install
          commands are one thumb-scroll away (D5 spec on small screens). */}
      <div className="lg:hidden sticky top-0 z-20 bg-[color:var(--color-bg)]/90 backdrop-blur-sm border-b border-[color:var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-3">
          <TierBadge tier={entry.tier} size="sm" />
          <span className="text-sm font-semibold truncate flex-1">
            {entry.name}
          </span>
          <a
            href="#install-rail"
            className={[
              "shrink-0 text-xs font-medium",
              "px-3 py-2 min-h-[44px] inline-flex items-center",
              "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]",
              "hover:bg-[color:var(--color-accent-muted)]",
              "rounded-md transition-colors",
            ].join(" ")}
          >
            Install ↓
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        {/* Main column */}
        <article className="min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <TierBadge tier={entry.tier} size="md" />
            <span className="text-sm text-[color:var(--color-fg-subtle)]">
              v0.1.0 · by {entry.author} · {entry.license}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[color:var(--tracking-display-tight)] mb-4">
            {entry.name}
          </h1>
          <p className="text-xl text-[color:var(--color-fg-muted)] max-w-3xl leading-relaxed mb-8">
            {entry.description}
          </p>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className={[
                    "text-xs px-2.5 py-1 rounded",
                    "bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)]",
                    "border border-[color:var(--color-border)]",
                  ].join(" ")}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <section className="mb-12">
            {readmeHtml ? (
              <Prose html={readmeHtml} />
            ) : (
              <>
                <h2 className="text-2xl font-semibold mb-4 tracking-[color:var(--tracking-display-tight)]">
                  What this skill does
                </h2>
                <p className="text-[color:var(--color-fg-muted)] leading-relaxed">
                  This entry doesn&apos;t inline its README in the registry yet.
                  Click the source link on the right to read the real one on
                  GitHub.
                </p>
              </>
            )}
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 tracking-[color:var(--tracking-display-tight)]">
              What the CLI will do
            </h2>
            <ul className="space-y-3 text-[color:var(--color-fg-muted)]">
              <Bullet>
                Fetch the archive at <Mono>{entry.sha.slice(0, 7)}</Mono>,
                verify its commit oid matches.
              </Bullet>
              <Bullet>
                Extract to a temp dir, parse <Mono>skill.yml</Mono>, render the
                two-panel diff prompt.
              </Bullet>
              <Bullet>
                Prompt for <Mono>y</Mono> or <Mono>yes</Mono> (full word if any
                install command looks suspicious).
              </Bullet>
              <Bullet>
                Run install commands under <Mono>env -i PATH=/usr/bin:/bin</Mono>
                — no tokens, no cloud creds, no ssh agent.
              </Bullet>
            </ul>
          </section>
        </article>

        {/* Sticky rail (D5). On mobile the rail stacks below the main
            article; the sticky mobile top bar above jumps here via
            #install-rail when the user taps "Install ↓". */}
        <aside
          id="install-rail"
          className="lg:sticky lg:top-6 self-start space-y-6 scroll-mt-20"
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-fg-subtle)]">
              Run once (recommended)
            </p>
            <CopyCommand command={`npx launchpad run ${entry.name}`} />
            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
              <Mono>run</Mono> = try once in a temp dir. <Mono>install</Mono> =
              keep it in{" "}
              <Mono>~/.claude/skills/</Mono>.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-fg-subtle)]">
              Install
            </p>
            <CopyCommand command={`skillz install ${entry.name}`} />
          </div>

          <div
            className={[
              "p-4 rounded-lg border border-[color:var(--color-border)]",
              "bg-[color:var(--color-bg-elevated)] space-y-3",
            ].join(" ")}
          >
            <Stat label="source">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--color-fg)] underline decoration-dotted underline-offset-4 truncate block"
              >
                {entry.repo}
              </a>
            </Stat>
            <Stat label="commit">
              <Mono>{entry.sha.slice(0, 7)}</Mono>
            </Stat>
            <Stat label="tier">
              <TierBadge tier={entry.tier} size="sm" />
            </Stat>
            <Stat label="license">{entry.license}</Stat>
          </div>

          <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed">
            Capability declarations live in{" "}
            <Mono>skill.yml</Mono> but are not shown here: v1 does not enforce
            them at runtime, and a badge you can&apos;t verify is worse than no
            badge. Runtime enforcement lands in v2.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[color:var(--color-fg-subtle)] select-none mt-0.5">
        →
      </span>
      <span>{children}</span>
    </li>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-[family-name:var(--font-mono)] text-[color:var(--color-fg)] text-[0.92em]">
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
      <span className="text-[color:var(--color-fg-subtle)] shrink-0">
        {label}
      </span>
      <span className="text-[color:var(--color-fg)] min-w-0">{children}</span>
    </div>
  );
}
