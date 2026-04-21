import type { Metadata } from "next";
import Link from "next/link";
import { EDITORIAL_EMAIL } from "@/lib/editorial";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PractitionerApplicationForm } from "@/components/PractitionerApplicationForm";

export const metadata: Metadata = {
  title: "Become a practitioner · Launchpad",
  description:
    "Apply to publish a Verified skill on Launchpad. Editorial reviews credentials, closes install grammar, and helps you author your first entry.",
};

/**
 * Supply-side onboarding — the editorial "contribute" page. Explains
 * the verification bargain, the three ways we check a credential, and
 * what happens after you submit. Same mailto handoff as InquiryForm
 * for v1.
 */
export default function SubmitPage() {
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

      <div className="max-w-5xl mx-auto px-6 pb-4">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Become a practitioner" }]}
        />
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-6 md:pt-10 pb-16">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          Apply to publish
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium max-w-4xl">
          Become a practitioner.
        </h1>
        <p className="mt-6 max-w-3xl text-lg md:text-xl text-[color:var(--color-fg-muted)] leading-relaxed">
          The exchange is built on verified domain expertise. If you
          have one — former SEC staff, CCS-credentialed coder, CPA,
          USPTO-registered agent, chartered engineer, tenured biostat,
          something specific a reader can name — we&rsquo;d like to
          hear from you.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              How it works
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
              From application to byline.
            </h2>
          </div>
          <ol className="space-y-8">
            <Step
              index={1}
              title="You apply"
              body="Fill the form below or email the editorial desk directly. Tell us your credential, your domain, and the first skill you'd publish."
            />
            <Step
              index={2}
              title="We verify"
              body="Editorial checks your credential against a public registry, a licensing body, or an employer of record. We don't audit your code — we audit the signature."
            />
            <Step
              index={3}
              title="We help you author"
              body="Most practitioners aren't Claude Code experts. We pair with you to draft SKILL.md, tighten the install grammar to Verified's closed-grammar set, and open a PR on your behalf."
            />
            <Step
              index={4}
              title="You publish"
              body="Your first entry ships with your byline, credential line, and a Verified seal. You keep the copyright. Revenue share on paid engagements is set by the desk."
            />
          </ol>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              How practitioners get paid
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
              Revenue, plainly stated.
            </h2>
          </div>
          <div className="space-y-8">
            <PayTier
              label="Engagements"
              split="80% practitioner · 20% editorial"
              body="When a buyer requests an engagement through the exchange and you take it, you keep 80% of the scope price after Stripe fees. Editorial keeps 20% to cover verification, brokering, and dispute handling."
            />
            <PayTier
              label="Paid skills"
              split="70% practitioner · 30% editorial"
              body="A direct skill purchase (buyer clicks Hire, runs the skill themselves on their own infra) is 70/30. The larger editorial share covers the infrastructure we keep around automatic checkpoint pricing, refund handling, and the analyzer that keeps your skill Verified."
            />
            <PayTier
              label="Free skills"
              split="No fee"
              body="Ship a free skill and we take nothing. Many practitioners start here — Verified bylines + a free skill build audience, which makes later paid engagements easier to land."
            />
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-2xl">
              You set your own scope prices. Editorial can advise on
              ranges per desk — disclosure counsel engagements typically
              start at $500; a one-off chart audit is more like $75. You
              keep copyright on every skill.
            </p>
            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed max-w-2xl">
              v1 runs on invoices and Stripe Connect is not yet wired,
              so payouts in the first six months are manual and cleared
              on a 30-day cadence. That will change.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              What we verify
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)]">
              Credentials, not character.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 text-[color:var(--color-fg)] leading-relaxed">
            <Ethos
              label="Public registries"
              body="Bar admissions, USPTO Reg. No., NPI, FINRA CRD, medical board lookup, CPA state rosters. If your license is on a searchable public index, an editor confirms it in a minute."
            />
            <Ethos
              label="Employer of record"
              body="If your credential is 'former X at Y,' we verify via LinkedIn plus a short call. For current roles, we may ask for your work email."
            />
            <Ethos
              label="Peer attestation"
              body="Specialists in hard-to-license domains (operations, research, creative) are verified by two practitioners already on the exchange willing to vouch."
            />
            <Ethos
              label="What we don't verify"
              body="The code inside your skill. That's your craft. We flag obvious patterns with the analyzer, but Verified means the byline is real — not that the skill is bug-free."
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
              Apply
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-[1.1] tracking-[color:var(--tracking-display)] mb-8">
              Application
            </h2>
            <PractitionerApplicationForm editorialEmail={EDITORIAL_EMAIL} />
            <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed mt-6 max-w-xl">
              Submitting opens your mail client with a pre-filled
              message to{" "}
              <a
                href={`mailto:${EDITORIAL_EMAIL}`}
                className="underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-accent)]"
              >
                {EDITORIAL_EMAIL}
              </a>
              . Editorial responds within one business day. Nothing is
              stored on Launchpad infrastructure until you agree to
              publish.
            </p>
          </div>

          <aside className="lg:sticky lg:top-6 self-start space-y-5">
            <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
                Shortlist
              </p>
              <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                What makes a strong application
              </p>
              <ul className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed space-y-2 list-disc pl-5">
                <li>A specific credential an editor can look up.</li>
                <li>
                  A skill proposal that a domain peer would pay for.
                </li>
                <li>
                  A clear statement of what the skill does NOT do — we
                  prefer narrow to broad.
                </li>
              </ul>
            </div>

            <div className="p-5 border border-dashed border-[color:var(--color-border-strong)] space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
              <p className="font-[family-name:var(--font-display)] text-[color:var(--color-fg)]">
                Don&rsquo;t have a skill yet?
              </p>
              <p>
                Send us the credential anyway. Most practitioners
                don&rsquo;t have one built when they apply — the
                editorial desk pairs with you on the first one.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PayTier({
  label,
  split,
  body,
}: {
  label: string;
  split: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 md:gap-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1">
          {label}
        </p>
        <p className="font-[family-name:var(--font-display)] text-lg leading-tight text-[color:var(--color-accent)]">
          {split}
        </p>
      </div>
      <p className="text-[15px] text-[color:var(--color-fg)] leading-relaxed max-w-2xl">
        {body}
      </p>
    </div>
  );
}

function Step({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-5">
      <span className="font-[family-name:var(--font-display)] text-[color:var(--color-gold)] text-3xl leading-none w-10 text-right tabular-nums">
        {index.toString().padStart(2, "0")}
      </span>
      <div>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-[color:var(--tracking-display)] mb-2">
          {title}
        </p>
        <p className="text-[color:var(--color-fg)] leading-relaxed max-w-2xl">
          {body}
        </p>
      </div>
    </li>
  );
}

function Ethos({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-2">
        {label}
      </p>
      <p className="text-[15px] leading-relaxed">{body}</p>
    </div>
  );
}
