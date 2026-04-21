import type { Metadata } from "next";
import Link from "next/link";
import { INTEGRATION_KINDS, type IntegrationKind } from "@launchpad/registry";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  INTEGRATION_META,
  type IntegrationCategory,
} from "@/lib/integrations";
import { countByIntegration } from "@/lib/registry";
import { EDITORIAL_EMAIL } from "@/lib/editorial";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Integrations · Launchpad",
  description:
    "Which industrial and business systems Launchpad skills can connect to — spreadsheets, warehouses, CRMs, MCP passthrough, and the editorial roadmap for what's live vs coming.",
};

/**
 * Editorial landing for the integrations story. Groups supported
 * kinds by category, shows per-kind status (available / coming soon
 * / MCP-only), counts the skills currently declaring each kind, and
 * points at /all?integration=<kind> for browsing.
 */

export default function IntegrationsPage() {
  const counts = countByIntegration();

  // Group kinds by category for the rendered sections.
  const grouped = new Map<IntegrationCategory, IntegrationKind[]>();
  for (const kind of INTEGRATION_KINDS) {
    const cat = INTEGRATION_META[kind].category;
    const list = grouped.get(cat) ?? [];
    list.push(kind);
    grouped.set(cat, list);
  }

  const totalDeclared = Array.from(counts.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const availableCount = INTEGRATION_KINDS.filter(
    (k) => INTEGRATION_META[k].status === "available",
  ).length;

  const askHref = `mailto:${EDITORIAL_EMAIL}?subject=${encodeURIComponent(
    "[Launchpad] Integration request",
  )}&body=${encodeURIComponent(
    [
      "System I need a skill to reach:",
      "",
      "How our team uses it today (read, write, both):",
      "",
      "What a practitioner would do with it:",
      "",
      "Sent via launchpad.dev/integrations",
    ].join("\n"),
  )}`;

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
          items={[{ label: "Home", href: "/" }, { label: "Integrations" }]}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-6 md:pt-10 pb-12">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          Industrial reach
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium max-w-5xl">
          Where skills meet the systems your team already uses.
        </h1>
        <p className="mt-6 max-w-3xl text-lg md:text-xl text-[color:var(--color-fg-muted)] leading-relaxed">
          A Claude Code skill is a practitioner&rsquo;s judgment,
          encoded. An integration is how that judgment reaches the
          spreadsheet, warehouse, CRM, or vertical system your team
          lives in. This page lists the integrations Launchpad supports
          today, the ones landing next, and the escape hatch that
          makes the long tail reachable without waiting for us.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
          <span>{INTEGRATION_KINDS.length} kinds declared</span>
          <span aria-hidden="true">·</span>
          <span>{availableCount} live today</span>
          <span aria-hidden="true">·</span>
          <span>{totalDeclared} declarations across published skills</span>
        </div>
      </section>

      {CATEGORY_ORDER.map((cat) => {
        const kinds = grouped.get(cat) ?? [];
        if (kinds.length === 0) return null;
        return (
          <section
            key={cat}
            className="max-w-6xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
                  Category
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <p className="text-[color:var(--color-fg-muted)] leading-relaxed mt-4">
                  {CATEGORY_BLURBS[cat]}
                </p>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-border)] border border-[color:var(--color-border)]">
                {kinds.map((kind) => (
                  <li key={kind}>
                    <IntegrationCell
                      kind={kind}
                      count={counts.get(kind) ?? 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              The long tail
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)] mb-4">
              MCP passthrough is the escape hatch.
            </h2>
            <p className="text-[color:var(--color-fg)] leading-relaxed max-w-3xl">
              Every industrial stack has one weird system. A custom
              Oracle app from 2011. A vertical CRM built for a single
              industry. An internal data warehouse with no official
              SDK. Launchpad will not ship a first-party adapter for
              most of these. The{" "}
              <strong>Model Context Protocol</strong> does. If someone
              on your team (or a vendor, or the open-source community)
              has built an MCP server for that system, a Launchpad
              skill can declare{" "}
              <code className="font-[family-name:var(--font-mono)] text-[0.9em] bg-[color:var(--color-bg-hover)] border border-[color:var(--color-border)] px-1 py-0.5">
                mcp_passthrough
              </code>{" "}
              and reach it. Buyer-side MCP, practitioner-side skill,
              no new platform lock-in.
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl mt-4">
              MCP-only integrations show the <em>MCP only</em> tag on
              their card above. Vertical-system integrations like Epic
              are shipped this way on purpose &mdash; PHI stays on the
              buyer&rsquo;s infrastructure, not on ours.
            </p>
          </div>
          <aside className="p-5 border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-3">
              Need an integration that isn&rsquo;t listed?
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed mb-5">
              Editorial prioritizes integrations by the number of
              practitioners who ask for them. One email from a real
              team counts.
            </p>
            <a
              href={askHref}
              className={[
                "inline-flex items-center min-h-[44px] px-4 py-2.5",
                "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
                "hover:bg-[color:var(--color-accent-hover)] transition-colors",
                "font-medium text-sm tracking-[0.02em]",
              ].join(" ")}
            >
              Request an integration →
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}

function IntegrationCell({
  kind,
  count,
}: {
  kind: IntegrationKind;
  count: number;
}) {
  const meta = INTEGRATION_META[kind];
  const statusLabel =
    meta.status === "available"
      ? "Live"
      : meta.status === "mcp_only"
        ? "MCP only"
        : "Coming soon";
  const statusTone =
    meta.status === "available"
      ? "bg-[#d8ecdb] text-[#164a2b] border-[#7cb28f]"
      : meta.status === "mcp_only"
        ? "bg-[#f7ecc4] text-[#6b4f00] border-[#d7b04a]"
        : "bg-transparent text-[color:var(--color-fg-muted)] border-[color:var(--color-border-strong)]";
  const isNav = count > 0;
  const Cell = (
    <div
      className={[
        "group p-5 bg-[color:var(--color-bg-elevated)]",
        isNav ? "hover:bg-[color:var(--color-bg-hover)]" : "",
        "transition-colors",
        "min-h-[150px] flex flex-col justify-between gap-3",
      ].join(" ")}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
            {meta.label}
          </h3>
          <span
            className={[
              "shrink-0 inline-flex items-center border text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5",
              statusTone,
            ].join(" ")}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          {meta.blurb}
        </p>
      </div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
        {count === 0
          ? "No skills yet"
          : `${count} ${count === 1 ? "skill" : "skills"} →`}
      </p>
    </div>
  );
  return isNav ? (
    <Link
      href={`/all?integration=${kind}`}
      aria-label={`See ${count} skill${count === 1 ? "" : "s"} declaring ${meta.label}`}
    >
      {Cell}
    </Link>
  ) : (
    Cell
  );
}
