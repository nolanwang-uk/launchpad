"use client";

import { useState } from "react";

/**
 * Pre-backend engagement inquiry form. On submit, constructs a mailto:
 * link with the filled-in body and hands off to the user's email
 * client. No server stores the message. This is deliberate for v1 —
 * v2 will POST to a managed endpoint once we have practitioner
 * contracts in place to honor response SLAs.
 */
export function InquiryForm({
  editorialEmail,
  subject,
  practitionerName,
  context,
}: {
  editorialEmail: string;
  subject: string;
  practitionerName: string;
  context: string;
}) {
  const [state, setState] = useState<"idle" | "opened">("idle");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = (data.get("name") as string) ?? "";
    const company = (data.get("company") as string) ?? "";
    const role = (data.get("role") as string) ?? "";
    const brief = (data.get("brief") as string) ?? "";
    const timeline = (data.get("timeline") as string) ?? "";

    const body = [
      `To: Launchpad editorial (forwarding to ${practitionerName})`,
      `Context: ${context}`,
      "",
      `Name: ${name}`,
      `Role: ${role}`,
      `Company: ${company}`,
      `Desired timeline: ${timeline}`,
      "",
      "Project brief:",
      brief,
      "",
      "Sent via launchpad.dev",
    ].join("\n");

    const href = `mailto:${editorialEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setState("opened");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Role" name="role" placeholder="e.g. Director of Finance" />
      </div>
      <Field label="Company or organization" name="company" />
      <Field
        label="Desired timeline"
        name="timeline"
        placeholder="e.g. within 2 weeks"
      />
      <TextArea
        label="Project brief"
        name="brief"
        required
        rows={5}
        placeholder="What would you like this practitioner to do? One paragraph is enough."
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
            ✓ Message drafted. Send it from your mail client.
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
