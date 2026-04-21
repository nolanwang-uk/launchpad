"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  loadUserReviews,
  reviewsByUser,
  submissionsForUser,
} from "@/lib/auth/storage";
import type { UserReview } from "@/lib/auth/types";
import { StarRating } from "@/components/StarRating";
import { StatusPill } from "@/components/StatusPill";

type Tab = "written" | "received";

export default function ReviewsPage() {
  const { user } = useAuth();
  const [mine, setMine] = useState<UserReview[]>([]);
  const [onMySkills, setOnMySkills] = useState<UserReview[]>([]);
  const [tab, setTab] = useState<Tab>("written");

  useEffect(() => {
    if (!user) return;
    setMine(reviewsByUser(user.id));
    // "Received" = reviews on any skill this user has published.
    const mySkills = new Set(
      submissionsForUser(user.id)
        .filter((s) => s.status === "published" && s.published_as)
        .map((s) => s.published_as!),
    );
    if (mySkills.size === 0) {
      setOnMySkills([]);
      return;
    }
    setOnMySkills(
      loadUserReviews().filter((r) => mySkills.has(r.skill_name)),
    );
  }, [user]);

  const active = tab === "written" ? mine : onMySkills;
  const sorted = useMemo(
    () =>
      [...active].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      ),
    [active],
  );
  const isPractitioner = user?.role !== "reader";

  if (!user) return null;

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Reader notes
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          The notes you&rsquo;ve written + what readers say about your skills.
        </h1>
      </header>

      <div className="flex gap-1 mb-6 border-b border-[color:var(--color-border)]">
        <TabButton
          label="Notes you wrote"
          count={mine.length}
          active={tab === "written"}
          onClick={() => setTab("written")}
        />
        {isPractitioner && (
          <TabButton
            label="Notes on your skills"
            count={onMySkills.length}
            active={tab === "received"}
            onClick={() => setTab("received")}
          />
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border-strong)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl mb-2">
            {tab === "written"
              ? "You haven't written any reader notes yet."
              : "No reader notes on your skills yet."}
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] mb-4">
            {tab === "written"
              ? "Browse the exchange, use a skill, send editorial two sentences."
              : "Notes post here as readers submit them and editorial confirms the reader actually used the skill."}
          </p>
          <Link
            href="/all"
            className="inline-flex items-center text-sm text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
          >
            Browse the exchange →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {sorted.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight">
                    <Link
                      href={`/s/${r.skill_name}`}
                      className="hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      {r.skill_name}
                    </Link>
                  </h3>
                  <StarRating value={r.rating} />
                  <StatusPill kind="review" status={r.status} />
                </div>
                <p className="text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em]">
                  {formatDate(r.created_at)}
                </p>
              </div>
              <p className="text-[color:var(--color-fg)] leading-relaxed max-w-3xl">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 -mb-px text-sm min-h-[40px]",
        active
          ? "border-b-2 border-b-[color:var(--color-accent)] text-[color:var(--color-fg)] font-medium"
          : "border-b-2 border-b-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
        "transition-colors",
      ].join(" ")}
    >
      {label}
      <span className="ml-1.5 text-[color:var(--color-fg-subtle)]">{count}</span>
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
