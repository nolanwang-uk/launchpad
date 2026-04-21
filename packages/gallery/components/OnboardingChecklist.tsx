"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import type { User } from "@/lib/auth/types";
import {
  reviewsByUser,
  submissionsForUser,
} from "@/lib/auth/storage";

/**
 * Small guided-setup panel shown on /dashboard when the new account
 * has more than ~2 incomplete tasks. Dismissible, persists the
 * dismiss state per user in localStorage. Computes completion from
 * the user record + submissions + reviews — no extra state to
 * maintain.
 */

type ChecklistTask = {
  key: string;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
  done: boolean;
  /** Optional role gate — hide the task for users whose role doesn't apply. */
  roles?: User["role"][];
};

const DISMISS_KEY = (userId: string) => `launchpad.v1.onboarding.dismissed.${userId}`;

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(DISMISS_KEY(user.id)) === "1");
    }
    const subs = submissionsForUser(user.id);
    const reviews = reviewsByUser(user.id);
    const published = subs.filter((s) => s.status === "published").length > 0;
    const anyDraft = subs.length > 0;
    const hasBio = Boolean(user.bio && user.bio.length >= 30);
    const hasCredential = Boolean(
      user.credential && user.credential.length >= 10,
    );
    const hasReviewed = reviews.length > 0;
    const emailPrefsReviewed =
      user.email_prefs.engagement_requests ||
      user.email_prefs.review_published ||
      user.email_prefs.weekly_digest ||
      user.email_prefs.product_updates;

    const isPractitioner = user.role !== "reader";

    const computed: ChecklistTask[] = [
      {
        key: "bio",
        title: "Write your bio",
        body: "Two to four sentences in practitioner voice. This is the first thing a buyer reads on your profile.",
        href: "/dashboard/profile",
        hrefLabel: "Go to profile",
        done: hasBio,
      },
      {
        key: "credential",
        title: "Add your credential",
        body: "Specifics beat generalities. 'Former SEC staff attorney (2014–2021)' beats 'securities expert.'",
        href: "/dashboard/profile",
        hrefLabel: "Go to profile",
        done: hasCredential,
        roles: ["practitioner", "both"],
      },
      {
        key: "submit",
        title: isPractitioner ? "Submit your first skill" : "Browse the exchange",
        body: isPractitioner
          ? "Editorial pairs with you on your first skill. Drafts are private until you're ready for review."
          : "Find a practitioner whose work you'd pay for. Hire takes one form.",
        href: isPractitioner ? "/dashboard/submits" : "/all",
        hrefLabel: isPractitioner ? "Start a submission" : "Browse entries",
        done: isPractitioner ? anyDraft : hasReviewed,
      },
      {
        key: "publish",
        title: "Publish your first skill",
        body: "Once editorial clears the credential and install grammar, your byline goes public with a Verified seal.",
        href: "/dashboard/submits",
        hrefLabel: "See submissions",
        done: published,
        roles: ["practitioner", "both"],
      },
      {
        key: "note",
        title: "Write a reader note",
        body: "Two sentences about a skill you've used. Editorial confirms, then publishes under your byline.",
        href: "/dashboard/reviews",
        hrefLabel: "Go to notes",
        done: hasReviewed,
      },
      {
        key: "email",
        title: "Set your email preferences",
        body: "Decide what editorial writes to you about. Defaults are sensible but opinionated.",
        href: "/dashboard/settings",
        hrefLabel: "Go to settings",
        done: emailPrefsReviewed && user.credits_balance_cents !== undefined,
      },
    ];

    const filtered = computed.filter(
      (t) => !t.roles || t.roles.includes(user.role),
    );
    setTasks(filtered);
  }, [user]);

  if (!user || dismissed) return null;
  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = Math.round((completed / total) * 100);
  const incomplete = total - completed;
  // Once the account has most tasks done, the checklist retires itself.
  if (incomplete <= 1) return null;

  const onDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY(user.id), "1");
    setDismissed(true);
  };

  return (
    <section
      className={[
        "mb-12 border border-[color:var(--color-border-strong)]",
        "bg-[color:var(--color-bg-elevated)]",
      ].join(" ")}
      aria-label="Onboarding checklist"
    >
      <div className="p-5 md:p-6 border-b border-[color:var(--color-border)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-2">
              Getting started
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[color:var(--tracking-display)] leading-tight">
              Your first few moves on the exchange.
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-xl">
              {completed} of {total} done. Walk through these once and
              the rest of the dashboard lights up with real work.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss onboarding checklist"
            className="shrink-0 text-xs uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg)] px-2 py-2 min-h-[36px] transition-colors"
          >
            Dismiss
          </button>
        </div>
        <div
          className="mt-5 h-1 bg-[color:var(--color-bg-hover)] overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[color:var(--color-accent)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-[color:var(--color-border)]">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              className={[
                "flex items-start gap-4 p-5",
                "hover:bg-[color:var(--color-bg-hover)] transition-colors",
              ].join(" ")}
            >
              <CheckGlyph done={t.done} />
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "font-[family-name:var(--font-display)] text-lg leading-tight",
                    t.done
                      ? "text-[color:var(--color-fg-subtle)] line-through decoration-[color:var(--color-border-strong)]"
                      : "text-[color:var(--color-fg)]",
                  ].join(" ")}
                >
                  {t.title}
                </p>
                <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed mt-1">
                  {t.body}
                </p>
              </div>
              {!t.done && (
                <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] self-center">
                  {t.hrefLabel} →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckGlyph({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "shrink-0 w-6 h-6 border",
        "flex items-center justify-center",
        done
          ? "bg-[color:var(--color-accent)] border-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
          : "bg-transparent border-[color:var(--color-border-strong)] text-transparent",
      ].join(" ")}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path
          d="M13 4L6 11.5L3 8.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
