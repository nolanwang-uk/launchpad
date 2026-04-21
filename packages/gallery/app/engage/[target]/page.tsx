import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findEntry,
  findPractitioner,
  loadPractitioners,
  loadRegistrySync,
} from "@/lib/registry";
import { EDITORIAL_EMAIL } from "@/lib/editorial";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PractitionerMark } from "@/components/PractitionerMark";
import { TierBadge } from "@/components/TierBadge";
import { InquiryForm } from "@/components/InquiryForm";

/**
 * Engagement inquiry page. Two flavors resolved from the same dynamic
 * segment:
 *   /engage/<skill-name>                — inquire about a specific skill
 *   /engage/practitioner-<slug>        — inquire about a practitioner
 *
 * v1 ships without a backend — inquiries are composed by the browser
 * and sent via the user's email client to the EDITORIAL_EMAIL address.
 * We say that out loud on the page rather than pretending otherwise.
 */

const PRACTITIONER_PREFIX = "practitioner-";

export function generateStaticParams() {
  const skills = loadRegistrySync().entries.map((e) => ({ target: e.name }));
  const practitioners = loadPractitioners().map((p) => ({
    target: `${PRACTITIONER_PREFIX}${p.slug}`,
  }));
  return [...skills, ...practitioners];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ target: string }>;
}) {
  const { target } = await params;
  const resolved = resolveTarget(target);
  if (!resolved) return { title: "Request engagement · Launchpad" };
  return {
    title: `${
      resolved.kind === "skill"
        ? resolved.entry.name
        : resolved.practitioner.name
    } · Request engagement · Launchpad`,
    description:
      resolved.kind === "skill"
        ? `Send an engagement inquiry to ${resolved.entry.author} about ${resolved.entry.name}.`
        : `Send an engagement inquiry to ${resolved.practitioner.name}.`,
  };
}

type ResolvedTarget =
  | { kind: "skill"; entry: ReturnType<typeof findEntry> & object }
  | {
      kind: "practitioner";
      practitioner: NonNullable<ReturnType<typeof findPractitioner>>;
    };

function resolveTarget(target: string): ResolvedTarget | null {
  if (target.startsWith(PRACTITIONER_PREFIX)) {
    const slug = target.slice(PRACTITIONER_PREFIX.length);
    const p = findPractitioner(slug);
    if (!p) return null;
    return { kind: "practitioner", practitioner: p };
  }
  const entry = findEntry(target);
  if (!entry) return null;
  return { kind: "skill", entry };
}

export default async function EngagePage({
  params,
}: {
  params: Promise<{ target: string }>;
}) {
  const { target } = await params;
  const resolved = resolveTarget(target);
  if (!resolved) notFound();

  const subject =
    resolved.kind === "skill"
      ? `[Launchpad] Engagement: ${resolved.entry.name}`
      : `[Launchpad] Engagement: ${resolved.practitioner.name}`;

  const practitionerName =
    resolved.kind === "skill"
      ? resolved.entry.author
      : resolved.practitioner.name;

  const credential =
    resolved.kind === "skill"
      ? resolved.entry.author_credential
      : resolved.practitioner.credential;

  const backHref =
    resolved.kind === "skill"
      ? `/s/${resolved.entry.name}`
      : `/p/${resolved.practitioner.slug}`;

  const breadcrumbLabel =
    resolved.kind === "skill"
      ? resolved.entry.name
      : resolved.practitioner.name;

  const priceLabel =
    resolved.kind === "skill"
      ? typeof resolved.entry.price_usd_cents === "number" &&
        resolved.entry.price_usd_cents > 0
        ? `Listed at $${(resolved.entry.price_usd_cents / 100).toFixed(
            resolved.entry.price_usd_cents / 100 < 10 ? 2 : 0,
          )}`
        : "Listed as free"
      : undefined;

  return (
    <main id="main" className="min-h-screen">
      <nav className="max-w-5xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-6 pb-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: breadcrumbLabel, href: backHref },
            { label: "Request engagement" },
          ]}
        />
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              Request engagement
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.05] tracking-[color:var(--tracking-display)] font-medium mb-6">
              {resolved.kind === "skill"
                ? `Engage ${practitionerName} for ${resolved.entry.name}`
                : `Engage ${practitionerName}`}
            </h1>
            <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl mb-10">
              Tell us what you&rsquo;re working on. The Launchpad editorial
              team routes your message to the practitioner within one
              business day and brokers the terms. Nothing is billed until
              you agree to a scope.
            </p>

            <InquiryForm
              editorialEmail={EDITORIAL_EMAIL}
              subject={subject}
              practitionerName={practitionerName}
              context={
                resolved.kind === "skill"
                  ? `Skill: ${resolved.entry.name}`
                  : `Practitioner: ${practitionerName}`
              }
              targetKind={resolved.kind}
              targetSlug={
                resolved.kind === "skill"
                  ? resolved.entry.name
                  : resolved.practitioner.slug
              }
            />

            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed mt-6 max-w-xl">
              Submitting opens your mail client with a pre-filled message to{" "}
              <a
                href={`mailto:${EDITORIAL_EMAIL}`}
                className="underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-accent)]"
              >
                {EDITORIAL_EMAIL}
              </a>
              . v1 ships without a server so your message is never stored
              on Launchpad infrastructure.
            </p>
          </div>

          <aside className="lg:sticky lg:top-6 self-start space-y-5">
            <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-3">
                You&rsquo;re engaging
              </p>
              <div className="flex items-start gap-3 mb-4">
                <PractitionerMark name={practitionerName} size="sm" />
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                    {practitionerName}
                  </p>
                  {credential && (
                    <p className="text-xs text-[color:var(--color-fg-muted)] leading-snug mt-1">
                      {credential}
                    </p>
                  )}
                </div>
              </div>
              {resolved.kind === "skill" && (
                <div className="border-t border-[color:var(--color-border)] pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={resolved.entry.tier} />
                    {resolved.entry.domain && (
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
                        {resolved.entry.domain}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                    {resolved.entry.description}
                  </p>
                  {priceLabel && (
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)] pt-2">
                      {priceLabel}
                    </p>
                  )}
                </div>
              )}
              {resolved.kind === "practitioner" && (
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                    {resolved.practitioner.entries.length} skill
                    {resolved.practitioner.entries.length === 1
                      ? ""
                      : "s"}{" "}
                    published.
                  </p>
                </div>
              )}
              <Link
                href={backHref}
                className="mt-4 block text-sm text-[color:var(--color-accent)] hover:underline decoration-[color:var(--color-border-strong)] underline-offset-4"
              >
                ← Back to the entry
              </Link>
            </div>

            <div className="p-5 border border-dashed border-[color:var(--color-border-strong)] space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
              <p className="font-[family-name:var(--font-display)] text-[color:var(--color-fg)]">
                How engagements work
              </p>
              <p>
                You send a brief. Editorial confirms the practitioner is
                available and quotes a scope. You approve the scope.
                Payment is held by editorial until delivery.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
