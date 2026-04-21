"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/context";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    const t = setTimeout(() => router.replace("/"), 1200);
    return () => clearTimeout(t);
  }, [logout, router]);

  return (
    <main
      id="main"
      className="min-h-screen flex items-center justify-center px-6 py-20"
    >
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-4">
          Signing out
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-medium mb-4">
          Until next time.
        </h1>
        <p className="text-[color:var(--color-fg-muted)] leading-relaxed">
          Clearing your session now. Redirecting home…
        </p>
        <p className="text-xs text-[color:var(--color-fg-subtle)] mt-6">
          If you&rsquo;re not redirected,{" "}
          <Link
            href="/"
            className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
          >
            go home
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
