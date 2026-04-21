"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth, AuthError } from "@/lib/auth/context";
import { DEMO_PASSWORD } from "@/lib/auth/seed";
import { loadAccounts } from "@/lib/auth/storage";
import {
  FormError,
  SubmitButton,
  TextField,
} from "@/components/FormField";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="min-h-screen flex items-center justify-center">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            Loading sign-in…
          </p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<
    { email: string; display_name: string }[]
  >([]);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  useEffect(() => {
    const accounts = loadAccounts();
    setDemoAccounts(
      Object.values(accounts)
        .map((a) => ({
          email: a.user.email,
          display_name: a.user.display_name,
        }))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
    );
  }, [loading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(next);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="min-h-screen">
      <AuthHeader />
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
            Sign in
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium mb-4">
            Welcome back.
          </h1>
          <p className="text-[color:var(--color-fg-muted)] leading-relaxed max-w-xl mb-10">
            Sign in to the editorial desk to manage your submissions,
            engagements, and practitioner profile. New here? {" "}
            <Link
              href="/register"
              className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:decoration-[color:var(--color-accent)]"
            >
              Create an account.
            </Link>
          </p>
          <form onSubmit={onSubmit} className="space-y-5 max-w-md" noValidate>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <FormError message={error} />}
            <div className="flex items-center gap-4 pt-1">
              <SubmitButton disabled={busy}>
                {busy ? "Signing in…" : "Sign in →"}
              </SubmitButton>
              <Link
                href="/register"
                className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              >
                Create account
              </Link>
            </div>
          </form>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 self-start">
          <div className="p-5 border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-2">
              Demo mode
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg leading-tight mb-2">
              Click to prefill.
            </p>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed mb-4">
              Accounts below are seeded in your browser&rsquo;s local
              storage. Password is{" "}
              <code className="font-[family-name:var(--font-mono)] text-[0.9em] bg-[color:var(--color-bg-hover)] px-1 py-0.5">
                {DEMO_PASSWORD}
              </code>{" "}
              for each. Nothing leaves your machine.
            </p>
            <ul className="space-y-1">
              {demoAccounts.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className={[
                      "w-full text-left block py-2 px-3",
                      "hover:bg-[color:var(--color-bg-hover)]",
                      "transition-colors",
                    ].join(" ")}
                  >
                    <span className="block font-[family-name:var(--font-display)] text-[color:var(--color-fg)]">
                      {a.display_name}
                    </span>
                    <span className="block text-[11px] text-[color:var(--color-fg-subtle)] tracking-wide">
                      {a.email}
                    </span>
                  </button>
                </li>
              ))}
              {demoAccounts.length === 0 && (
                <li className="text-sm text-[color:var(--color-fg-subtle)]">
                  Seeding…
                </li>
              )}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

function AuthHeader() {
  return (
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
  );
}
