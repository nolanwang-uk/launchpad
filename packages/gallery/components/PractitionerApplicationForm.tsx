"use client";

import { useState } from "react";

/**
 * Practitioner-application form. Supply-side counterpart to
 * InquiryForm. Same mailto: handoff pattern — no backend in v1. The
 * editorial team reviews credentials, schedules a call, and publishes
 * as Verified if everything checks out.
 */
export function PractitionerApplicationForm({
  editorialEmail,
}: {
  editorialEmail: string;
}) {
  const [state, setState] = useState<"idle" | "opened">("idle");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = (data.get("name") as string) ?? "";
    const credential = (data.get("credential") as string) ?? "";
    const domain = (data.get("domain") as string) ?? "";
    const years = (data.get("years") as string) ?? "";
    const verification = (data.get("verification") as string) ?? "";
    const proposal = (data.get("proposal") as string) ?? "";
    const links = (data.get("links") as string) ?? "";

    const body = [
      "Practitioner application",
      "",
      `Name: ${name}`,
      `Credential / title: ${credential}`,
      `Domain: ${domain}`,
      `Years in practice: ${years}`,
      "",
      "Verification reference:",
      verification,
      "",
      "Proposed skill(s):",
      proposal,
      "",
      "Links / writing / prior work:",
      links,
      "",
      "Sent via launchpad.dev/submit",
    ].join("\n");

    const href = `mailto:${editorialEmail}?subject=${encodeURIComponent(
      "[Launchpad] Practitioner application",
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setState("opened");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Your name"
          name="name"
          required
          autoComplete="name"
        />
        <Field
          label="Credential or title"
          name="credential"
          placeholder="e.g. Securities counsel, CCS, CPA"
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Domain"
          name="domain"
          placeholder="Law · Medicine · Finance · …"
          required
        />
        <Field
          label="Years in practice"
          name="years"
          placeholder="e.g. 9"
        />
      </div>
      <TextArea
        label="Verification reference"
        name="verification"
        placeholder="License number + state bar, NPI, FINRA CRD, USPTO reg, LinkedIn, employer. Anything an editor can verify in one click."
        rows={3}
        required
      />
      <TextArea
        label="The skill you'd publish first"
        name="proposal"
        placeholder="What would you author for the exchange? One paragraph is plenty. Doesn't need to be built yet — we'll help."
        rows={5}
        required
      />
      <TextArea
        label="Links (optional)"
        name="links"
        placeholder="Prior work, writing, your firm's website, GitHub. Helpful context."
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          className={[
            "inline-flex items-center justify-center",
            "min-h-[48px] px-6 py-3",
            "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
            "hover:bg-[color:var(--color-accent-hover)]",
            "transition-colors font-medium tracking-[0.02em] text-sm md:text-base",
          ].join(" ")}
        >
          Open in my email client →
        </button>
        {state === "opened" && (
          <span
            role="status"
            className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]"
          >
            ✓ Draft ready. Send it from your mail client.
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5">
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <input
        type="text"
        name={name}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
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
  );
}

function TextArea({
  label,
  name,
  required,
  placeholder,
  rows,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5">
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className={[
          "w-full px-3 py-2.5",
          "bg-[color:var(--color-bg-elevated)]",
          "border border-[color:var(--color-border-strong)]",
          "focus:border-[color:var(--color-accent)]",
          "text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]",
          "text-[15px] leading-relaxed",
          "outline-none transition-colors resize-y",
        ].join(" ")}
      />
    </label>
  );
}
