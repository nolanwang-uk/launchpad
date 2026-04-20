import Link from "next/link";
import { loadRegistrySync } from "@/lib/registry";
import { CopyCommand } from "@/components/CopyCommand";
import { TerminalPreview } from "@/components/TerminalPreview";
import { SkillCard } from "@/components/SkillCard";
import { TierBadge } from "@/components/TierBadge";

export default function HomePage() {
  const registry = loadRegistrySync();
  const featured = registry.entries.slice(0, 1)[0];
  const newThisWeek = registry.entries.slice(0, 6);

  return (
    <main className="min-h-screen">
      {/* Top nav — intentionally minimal */}
      <Nav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-20 md:pb-28">
        <p className="text-sm text-[color:var(--color-fg-subtle)] mb-4 font-[family-name:var(--font-mono)]">
          launchpad · v0.1.0-dev
        </p>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-[color:var(--tracking-display-tight)] leading-[1.02] mb-8 max-w-4xl">
          One command. Any Claude Code skill.
        </h1>
        <p className="text-xl md:text-2xl text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed mb-12">
          A curated marketplace for Claude Code skills. Every skill is SHA-pinned,
          source-visible, and asks consent before it touches your machine.
        </p>

        {featured && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-fg-subtle)] mb-3">
              Featured this week
            </p>
            <div className="flex items-baseline gap-3 mb-2">
              <Link
                href={`/s/${featured.name}`}
                className="text-2xl md:text-3xl font-semibold hover:text-[color:var(--color-accent)] transition-colors"
              >
                {featured.name}
              </Link>
              <TierBadge tier={featured.tier} />
            </div>
            <p className="text-[color:var(--color-fg-muted)] mb-6 max-w-2xl">
              {featured.description}
            </p>
            <CopyCommand
              size="hero"
              command={`npx launchpad run ${featured.name}`}
            />
            <p className="text-xs text-[color:var(--color-fg-subtle)] mt-3 max-w-xl">
              Zero install. Works on any dev machine with Node. Heavy user?{" "}
              <a
                href="#install"
                className="underline decoration-dotted underline-offset-4 hover:text-[color:var(--color-fg)]"
              >
                install via Homebrew →
              </a>
            </p>
          </div>
        )}

        <div className="mt-16 max-w-2xl">
          {featured && (
            <TerminalPreview
              command={`npx launchpad run ${featured.name}`}
              skillName={featured.name}
              tier={featured.tier}
            />
          )}
        </div>
      </section>

      {/* New this week — per D3, no trending tab until 100+ installs */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-[color:var(--color-border)]">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-[color:var(--tracking-display-tight)]">
            New this week
          </h2>
          <p className="text-sm text-[color:var(--color-fg-subtle)]">
            {newThisWeek.length} skill{newThisWeek.length === 1 ? "" : "s"}
          </p>
        </div>

        {newThisWeek.length === 0 ? (
          <EmptyRegistry />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newThisWeek.map((entry) => (
              <SkillCard key={entry.name} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {/* Install instructions */}
      <section
        id="install"
        className="max-w-5xl mx-auto px-6 py-20 border-t border-[color:var(--color-border)]"
      >
        <h2 className="text-2xl md:text-3xl font-semibold tracking-[color:var(--tracking-display-tight)] mb-8">
          Install the CLI
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          <InstallOption
            title="Zero install (recommended)"
            body="Nothing to install. Run any skill immediately."
            command="npx launchpad run <skill>"
          />
          <InstallOption
            title="Homebrew (for heavy users)"
            body="Install skillz locally if you run skills daily."
            command="brew install launchpad/tap/skillz"
          />
        </div>
      </section>

      {/* Trust story */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-[color:var(--color-border)]">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-[color:var(--tracking-display-tight)] mb-12">
          How we keep this safe
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl">
          <TrustPoint
            title="SHA-pinned"
            body="Every skill is locked to a 40-char commit SHA. Tag and branch names are rejected at PR time. No one can swap the payload out from under you."
          />
          <TrustPoint
            title="Diff before exec"
            body="The CLI prints every file that will be written and every shell command that will run — decoded from base64 if obfuscated — before executing. You type yes, not y, when it matters."
          />
          <TrustPoint
            title="Scrubbed env"
            body="Install commands run with env -i PATH=/usr/bin:/bin. No GITHUB_TOKEN, no AWS credentials, no ssh-agent socket. A bad skill can't steal what it can't see."
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <Link
        href="/"
        className="font-semibold text-lg tracking-[color:var(--tracking-display-tight)]"
      >
        launchpad
      </Link>
      <div className="flex items-center gap-6 text-sm text-[color:var(--color-fg-muted)]">
        <a
          href="#install"
          className="hover:text-[color:var(--color-fg)] transition-colors"
        >
          install
        </a>
        <a
          href="/docs"
          className="hover:text-[color:var(--color-fg)] transition-colors"
        >
          docs
        </a>
        <a
          href="https://github.com/nolanwang-uk/launchpad"
          className="hover:text-[color:var(--color-fg)] transition-colors"
        >
          github
        </a>
      </div>
    </nav>
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
    <div className="p-5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[color:var(--color-fg-muted)] mb-4 min-h-[3rem]">
        {body}
      </p>
      <CopyCommand command={command} />
    </div>
  );
}

function TrustPoint({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold mb-3 tracking-[color:var(--tracking-display-tight)]">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function EmptyRegistry() {
  return (
    <div className="border border-dashed border-[color:var(--color-border)] rounded-lg p-12 text-center">
      <p className="text-[color:var(--color-fg-muted)] mb-4">
        The registry is empty. Be the first to submit a skill.
      </p>
      <a
        href="https://github.com/nolanwang-uk/launchpad"
        className="inline-block text-sm underline decoration-dotted underline-offset-4 hover:text-[color:var(--color-fg)]"
      >
        Open a PR to the registry →
      </a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)] text-sm text-[color:var(--color-fg-subtle)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p>launchpad — a skill marketplace for Claude Code.</p>
        <div className="flex gap-6">
          <a href="/privacy" className="hover:text-[color:var(--color-fg)]">
            privacy
          </a>
          <a
            href="https://github.com/nolanwang-uk/launchpad"
            className="hover:text-[color:var(--color-fg)]"
          >
            github
          </a>
        </div>
      </div>
    </footer>
  );
}
