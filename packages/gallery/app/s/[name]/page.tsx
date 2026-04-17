import Link from "next/link";
import { notFound } from "next/navigation";
import { findEntry, loadRegistrySync } from "@/lib/registry";
import { CopyCommand } from "@/components/CopyCommand";
import { TierBadge } from "@/components/TierBadge";

export function generateStaticParams() {
  return loadRegistrySync().entries.map((e) => ({ name: e.name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const entry = findEntry(name);
  if (!entry) return { title: "Skill not found · launchpad" };
  return {
    title: `${entry.name} · launchpad`,
    description: entry.description,
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

  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg tracking-[color:var(--tracking-display-tight)]"
        >
          ← launchpad
        </Link>
      </nav>

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

          <section className="prose prose-invert mb-12">
            <h2 className="text-2xl font-semibold mb-4 tracking-[color:var(--tracking-display-tight)]">
              What this skill does
            </h2>
            <p className="text-[color:var(--color-fg-muted)] leading-relaxed">
              Full README rendering lands in Phase 3 polish. For now, click the
              source link on the right to read it on GitHub.
            </p>
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

        {/* Sticky rail (D5) */}
        <aside className="lg:sticky lg:top-6 self-start space-y-6">
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
