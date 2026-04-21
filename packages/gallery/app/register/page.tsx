"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, AuthError } from "@/lib/auth/context";
import {
  FormError,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/FormField";
import type { UserRole } from "@/lib/auth/types";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("reader");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError(
        "Please confirm you've read the editorial ethos before registering.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({
        email,
        password,
        display_name: displayName,
        role,
      });
      router.replace(role === "reader" ? "/dashboard" : "/dashboard/profile");
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Couldn't create account.");
    } finally {
      setBusy(false);
    }
  };

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
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
            Create account
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium mb-4">
            Open a reader account.
          </h1>
          <p className="text-[color:var(--color-fg-muted)] leading-relaxed max-w-xl mb-10">
            Readers browse, install, and hire practitioners. If you plan
            to publish skills, pick <span className="italic">practitioner</span>{" "}
            below — editorial reviews your credential before the
            Verified seal appears on your byline.
          </p>
          <form onSubmit={onSubmit} className="space-y-5 max-w-md" noValidate>
            <TextField
              label="Display name"
              placeholder="e.g. Alex Chen"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              help="Shown as your byline. You can change it later."
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              help="At least 8 characters. Hashed with SHA-256 client-side until backend lands."
            />
            <SelectField
              label="I'm joining as"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { value: "reader", label: "Reader — browse + hire practitioners" },
                { value: "practitioner", label: "Practitioner — I want to publish" },
                { value: "both", label: "Both" },
              ]}
              help="You can switch roles anytime from Settings."
            />
            <label className="flex items-start gap-3 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 accent-[color:var(--color-accent)]"
              />
              <span>
                I&rsquo;ve read the{" "}
                <Link
                  href="/#ethos"
                  className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
                >
                  editorial ethos
                </Link>{" "}
                and understand Verified applies to credentials, not
                bug-free code.
              </span>
            </label>
            {error && <FormError message={error} />}
            <div className="flex items-center gap-4 pt-1">
              <SubmitButton disabled={busy}>
                {busy ? "Creating account…" : "Create account →"}
              </SubmitButton>
              <Link
                href="/login"
                className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              >
                Sign in instead
              </Link>
            </div>
          </form>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 self-start">
          <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-2">
              Reader vs practitioner
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
              Anyone can open a reader account in 30 seconds — hire
              practitioners, leave reader notes, track engagements.
              Becoming a practitioner takes an editorial credential
              check; expect a 1–2 day turnaround after you submit your
              first skill.
            </p>
          </div>
          <Link
            href="/submit"
            className="block p-5 border border-dashed border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-bg-hover)] transition-colors"
          >
            <p className="font-[family-name:var(--font-display)] text-lg leading-tight mb-1">
              Already have a credential?
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-snug">
              Apply to publish directly — the editorial desk will pair
              with you on your first skill. →
            </p>
          </Link>
        </aside>
      </section>
    </main>
  );
}
