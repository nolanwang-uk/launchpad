"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  FormError,
  SubmitButton,
  TextField,
} from "@/components/FormField";
import { generateSalt, hashPassword, verifyPassword } from "@/lib/auth/hash";
import {
  findAccountByEmail,
  saveAccount,
  wipeAll,
} from "@/lib/auth/storage";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="space-y-14">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Settings
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          Account preferences.
        </h1>
      </header>

      <EmailSection />
      <PasswordSection />
      <EmailPrefsSection />
      <DangerSection
        onReset={() => {
          wipeAll();
          logout();
          router.replace("/");
        }}
      />
    </div>
  );

  function EmailSection() {
    const [email, setEmail] = useState(user!.email);
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      setSaved(false);
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        setErr("Email looks off.");
        return;
      }
      if (normalized === user!.email) {
        setSaved(true);
        return;
      }
      if (findAccountByEmail(normalized)) {
        setErr("An account with that email already exists.");
        return;
      }
      // Migrate the account under the new key, then update the user.
      const existing = findAccountByEmail(user!.email);
      if (!existing) return;
      // Save under new email key
      saveAccount({ ...existing, user: { ...existing.user, email: normalized } });
      updateUser({ email: normalized });
      setSaved(true);
    };
    return (
      <SectionBlock
        title="Email"
        description="Your login email and where engagement inquiries are routed."
      >
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {err && <FormError message={err} />}
          <div className="flex items-center gap-4">
            <SubmitButton>Update email</SubmitButton>
            {saved && (
              <span className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]">
                ✓ Updated.
              </span>
            )}
          </div>
        </form>
      </SectionBlock>
    );
  }

  function PasswordSection() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      setSaved(false);
      const account = findAccountByEmail(user!.email);
      if (!account) {
        setErr("Couldn't locate your account.");
        return;
      }
      const ok = await verifyPassword(
        current,
        account.password_salt,
        account.password_hash,
      );
      if (!ok) {
        setErr("Current password is wrong.");
        return;
      }
      if (next.length < 8) {
        setErr("New password must be at least 8 characters.");
        return;
      }
      if (next !== confirm) {
        setErr("Confirmation doesn't match the new password.");
        return;
      }
      const salt = generateSalt();
      const hash = await hashPassword(next, salt);
      saveAccount({ ...account, password_hash: hash, password_salt: salt });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    };
    return (
      <SectionBlock
        title="Password"
        description="Client-side SHA-256 hashed. When the server lands this request moves server-side and argon2 replaces SHA-256."
      >
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            help="At least 8 characters."
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {err && <FormError message={err} />}
          <div className="flex items-center gap-4">
            <SubmitButton>Change password</SubmitButton>
            {saved && (
              <span className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]">
                ✓ Password updated.
              </span>
            )}
          </div>
        </form>
      </SectionBlock>
    );
  }

  function EmailPrefsSection() {
    const [prefs, setPrefs] = useState(user!.email_prefs);
    const [saved, setSaved] = useState(false);
    const set = (k: keyof typeof prefs, v: boolean) =>
      setPrefs((p) => ({ ...p, [k]: v }));
    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateUser({ email_prefs: prefs });
      setSaved(true);
    };
    return (
      <SectionBlock
        title="Email preferences"
        description="What editorial writes to you about."
      >
        <form onSubmit={onSubmit} className="space-y-3 max-w-md">
          <Toggle
            label="Engagement requests"
            description="New buyer engagements for your skills."
            value={prefs.engagement_requests}
            onChange={(v) => set("engagement_requests", v)}
          />
          <Toggle
            label="Reader notes on your skills"
            description="When a reader note clears editorial review."
            value={prefs.review_published}
            onChange={(v) => set("review_published", v)}
          />
          <Toggle
            label="Weekly digest"
            description="One email per week with the desk's top activity."
            value={prefs.weekly_digest}
            onChange={(v) => set("weekly_digest", v)}
          />
          <Toggle
            label="Product updates"
            description="Major changes to the platform. Infrequent."
            value={prefs.product_updates}
            onChange={(v) => set("product_updates", v)}
          />
          <div className="flex items-center gap-4 pt-2">
            <SubmitButton>Save preferences</SubmitButton>
            {saved && (
              <span className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]">
                ✓ Saved.
              </span>
            )}
          </div>
        </form>
      </SectionBlock>
    );
  }

  function DangerSection({ onReset }: { onReset: () => void }) {
    const [confirming, setConfirming] = useState(false);
    return (
      <SectionBlock
        title="Reset local state"
        description="Wipes every Launchpad account and dashboard record stored in this browser. Useful for demo resets. v2 replaces this with a per-account delete."
      >
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium text-[#7b1f1f] border border-[#c57878] hover:bg-[#f6dada] transition-colors"
          >
            Reset local state…
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[color:var(--color-fg)]">
              This wipes all demo accounts in this browser. Confirm?
            </span>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium bg-[#7b1f1f] text-white hover:bg-[#5b1515] transition-colors"
            >
              Wipe and sign out
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex items-center min-h-[44px] px-3 py-2 text-sm text-[color:var(--color-fg-muted)]"
            >
              Cancel
            </button>
          </div>
        )}
      </SectionBlock>
    );
  }
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-12">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-2">
          {title}
        </p>
        <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-2 border-b border-[color:var(--color-border)] last:border-b-0">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-[color:var(--color-accent)]"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-[color:var(--color-fg)]">{label}</span>
        <span className="block text-xs text-[color:var(--color-fg-subtle)] leading-relaxed mt-0.5">
          {description}
        </span>
      </span>
    </label>
  );
}
