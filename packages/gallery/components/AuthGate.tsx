"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/context";

/**
 * Client-side auth guard. Renders nothing while the auth state is
 * loading (prevents a flash of protected content during hydration)
 * and pushes to /login?next=<current> if no user is present after
 * hydration. The guard is deliberately thin — it's the last line of
 * defense, not a security boundary. v2's real backend will enforce
 * at the API.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname || "/dashboard")}`,
      );
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-20 text-[color:var(--color-fg-subtle)]">
        <p className="text-sm uppercase tracking-[0.2em]">Checking session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
