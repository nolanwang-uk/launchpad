"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { PractitionerMark } from "./PractitionerMark";

/**
 * Top-nav account affordance. Shows a quiet "Sign in" link when
 * signed out and a clickable initials chip that opens a dropdown
 * when signed in. Safe to render on every public page — loading
 * state shows a skeleton chip so the nav doesn't reflow on hydrate.
 */
export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="w-7 h-7 bg-[color:var(--color-bg-hover)] border border-[color:var(--color-border)]"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="hover:text-[color:var(--color-fg)] px-2 py-3 inline-flex items-center min-h-[44px] text-sm text-[color:var(--color-fg-muted)]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-2 min-h-[44px] px-2 py-1.5",
          "hover:bg-[color:var(--color-bg-hover)] transition-colors",
        ].join(" ")}
      >
        <PractitionerMark name={user.display_name} size="sm" />
        <span className="hidden sm:inline text-sm text-[color:var(--color-fg)] max-w-[140px] truncate">
          {user.display_name}
        </span>
        <span
          aria-hidden="true"
          className="text-[color:var(--color-fg-subtle)] text-xs"
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className={[
            "absolute right-0 top-full mt-2 w-64 z-30",
            "bg-[color:var(--color-bg-elevated)]",
            "border border-[color:var(--color-border-strong)]",
            "shadow-[0_8px_24px_rgba(18,17,15,0.12)]",
          ].join(" ")}
        >
          <div className="px-4 py-3 border-b border-[color:var(--color-border)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              Signed in as
            </p>
            <p className="font-[family-name:var(--font-display)] text-base leading-tight truncate">
              {user.display_name}
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] truncate">
              {user.email}
            </p>
          </div>
          <MenuLink href="/dashboard" label="Dashboard" onClick={() => setOpen(false)} />
          <MenuLink
            href="/dashboard/profile"
            label="Profile"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            href="/dashboard/credits"
            label={`Credits · ${formatBalance(user.credits_balance_cents)}`}
            onClick={() => setOpen(false)}
          />
          <MenuLink
            href={`/p/${user.slug}`}
            label="View public profile"
            onClick={() => setOpen(false)}
          />
          <div className="border-t border-[color:var(--color-border)]">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="block w-full text-left px-4 py-2.5 text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)] transition-colors"
    >
      {label}
    </Link>
  );
}

function formatBalance(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  if (abs >= 1000) return `$${Math.round(abs).toLocaleString("en-US")}`;
  return `$${abs.toFixed(abs < 10 ? 2 : 0)}`;
}
