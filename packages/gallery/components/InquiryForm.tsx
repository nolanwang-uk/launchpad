"use client";

import { useState } from "react";

/**
 * Engagement inquiry form.
 *
 * Preferred path: POST to /api/inquiry, which inserts into
 * public.inquiries (Supabase) and fires a Resend email to editorial.
 *
 * Fallback path: when the API is unavailable (404/503/network) the
 * form re-composes the same payload as a mailto: link and hands off
 * to the user's email client. That keeps the feature working in
 * dev/local builds where Supabase env vars aren't set, and guards
 * against transient API failures.
 */
export function InquiryForm({
  editorialEmail,
  subject,
  practitionerName,
  context,
  targetKind,
  targetSlug,
}: {
  editorialEmail: string;
  subject: string;
  practitionerName: string;
  context: string;
  targetKind: "skill" | "practitioner";
  targetSlug: string;
}) {
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "opened">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setState("submitting");
    const data = new FormData(e.currentTarget);
    const name = ((data.get("name") as string) || "").trim();
    const email = ((data.get("email") as string) || "").trim();
    const company = ((data.get("company") as string) || "").trim();
    const role = ((data.get("role") as string) || "").trim();
    const brief = ((data.get("brief") as string) || "").trim();
    const timeline = ((data.get("timeline") as string) || "").trim();

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_kind: targetKind,
          target_slug: targetSlug,
          buyer_name: name,
          buyer_email: email,
          buyer_company: company,
          buyer_role: role,
          timeline,
          brief,
          source: "web-form",
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setState("sent");
        return;
      }
      // Any non-ok response OR the API returning a validation error
      // other than a 503-without-supabase case — show it inline.
      if (res.status >= 400 && res.status < 500) {
        setErrorMessage(json.error || "Couldn't submit. Please review and retry.");
        setState("idle");
        return;
      }
      // 5xx or Supabase-not-configured: fall back to mailto.
      fallbackToMailto({
        editorialEmail,
        subject,
        practitionerName,
        context,
        name,
        email,
        role,
        company,
        timeline,
        brief,
      });
      setState("opened");
    } catch {
      // Network failure: fall back to mailto.
      fallbackToMailto({
        editorialEmail,
        subject,
        practitionerName,
        context,
        name,
        email,
        role,
        company,
        timeline,
        brief,
      });
      setState("opened");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Role" name="role" placeholder="e.g. Director of Finance" />
        <Field label="Company or organization" name="company" />
      </div>
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
      {errorMessage && (
        <div
          role="alert"
          className="text-sm text-[#b04141] border border-[#b04141]/40 bg-[#fdf2f2] px-3 py-2"
        >
          {errorMessage}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={state === "submitting"}
          className={[
            "inline-flex items-center justify-center",
            "min-h-[48px] px-6 py-3",
            "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
            "hover:bg-[color:var(--color-accent-hover)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-colors font-medium tracking-[0.02em] text-sm md:text-base",
          ].join(" ")}
        >
          {state === "submitting" ? "Sending…" : "Send to editorial →"}
        </button>
        {state === "sent" && (
          <span
            role="status"
            className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]"
          >
            ✓ Received. Editorial replies within one business day.
          </span>
        )}
        {state === "opened" && (
          <span
            role="status"
            className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]"
          >
            ✓ Message drafted in your mail client. Send it from there.
          </span>
        )}
      </div>
    </form>
  );
}

function fallbackToMailto(opts: {
  editorialEmail: string;
  subject: string;
  practitionerName: string;
  context: string;
  name: string;
  email: string;
  role: string;
  company: string;
  timeline: string;
  brief: string;
}) {
  const body = [
    `To: Launchpad editorial (forwarding to ${opts.practitionerName})`,
    `Context: ${opts.context}`,
    "",
    `Name:           ${opts.name}`,
    `Email:          ${opts.email}`,
    `Role:           ${opts.role}`,
    `Company:        ${opts.company}`,
    `Timeline:       ${opts.timeline}`,
    "",
    "Project brief:",
    opts.brief,
    "",
    "Sent via launchpad.dev (API fallback)",
  ].join("\n");
  const href = `mailto:${opts.editorialEmail}?subject=${encodeURIComponent(
    opts.subject,
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

function Field({
  label,
  name,
  required,
  placeholder,
  autoComplete,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-1.5">
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      <input
        type={type}
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
