"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  loadSubmissions,
  saveSubmissions,
  submissionsForUser,
} from "@/lib/auth/storage";
import { newId } from "@/lib/auth/id";
import type { Submission, SubmissionStatus } from "@/lib/auth/types";
import { StatusPill } from "@/components/StatusPill";
import { DOMAIN_LABELS, DOMAIN_ORDER } from "@/lib/domains";
import {
  FormError,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
} from "@/components/FormField";

const FILTERS: { value: "all" | SubmissionStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "under_review", label: "Under review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export default function SubmitsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["value"]>("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSubmissions(submissionsForUser(user.id));
  }, [user]);

  const filtered = useMemo(() => {
    const base = filter === "all" ? submissions : submissions.filter((s) => s.status === filter);
    return base.sort(
      (a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at),
    );
  }, [submissions, filter]);

  if (!user) return null;

  const onCreated = (s: Submission) => {
    const all = loadSubmissions();
    const next = [s, ...all];
    saveSubmissions(next);
    setSubmissions(submissionsForUser(user.id));
    setShowNew(false);
  };

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
            Submissions
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
            Skills you&rsquo;ve sent to the desk.
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className={[
            "inline-flex items-center min-h-[44px] px-4 py-2.5",
            showNew
              ? "border border-[color:var(--color-border-strong)] text-[color:var(--color-fg)]"
              : "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:bg-[color:var(--color-accent-hover)]",
            "font-medium text-sm tracking-[0.02em] transition-colors",
          ].join(" ")}
        >
          {showNew ? "Cancel" : "+ New submission"}
        </button>
      </header>

      {showNew && (
        <NewSubmissionForm userId={user.id} onCreated={onCreated} />
      )}

      <div className="flex flex-wrap gap-1 mb-6 border-b border-[color:var(--color-border)]">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={[
              "px-3 py-2 -mb-px text-sm min-h-[40px]",
              filter === f.value
                ? "border-b-2 border-b-[color:var(--color-accent)] text-[color:var(--color-fg)] font-medium"
                : "border-b-2 border-b-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
              "transition-colors",
            ].join(" ")}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1.5 text-[color:var(--color-fg-subtle)]">
                {submissions.filter((s) => s.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border-strong)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl mb-2">
            Nothing in this bucket.
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] mb-4">
            {filter === "all"
              ? "Click the New submission button to send your first skill to editorial."
              : "Try a different status filter."}
          </p>
          {filter === "all" && (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center text-sm text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
            >
              Start a new submission →
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-t border-b border-[color:var(--color-border)]">
          {filtered.map((s) => (
            <li key={s.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight">
                    {s.published_as ? (
                      <Link
                        href={`/s/${s.published_as}`}
                        className="hover:text-[color:var(--color-accent)] transition-colors"
                      >
                        {s.skill_name}
                      </Link>
                    ) : (
                      s.skill_name
                    )}
                  </h3>
                  <StatusPill kind="submission" status={s.status} />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-fg-subtle)]">
                    {DOMAIN_LABELS[s.domain] ?? s.domain}
                  </span>
                </div>
                <p className="text-[11px] text-[color:var(--color-fg-subtle)] uppercase tracking-[0.14em]">
                  {formatDate(s.submitted_at)}
                </p>
              </div>
              <p className="text-[color:var(--color-fg-muted)] leading-relaxed max-w-3xl">
                {s.description}
              </p>
              {s.editorial_note && (
                <p className="mt-3 text-sm border-l-2 border-[color:var(--color-gold-soft)] pl-4 italic text-[color:var(--color-fg)] max-w-3xl">
                  Editorial: {s.editorial_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewSubmissionForm({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (s: Submission) => void;
}) {
  const [skillName, setSkillName] = useState("");
  const [domain, setDomain] = useState("general");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const slug = skillName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (slug.length < 2) {
      setErr("Skill name must be at least 2 characters (lowercase, hyphens).");
      return;
    }
    if (description.trim().length < 10) {
      setErr("Give editorial one or two real sentences about the skill.");
      return;
    }
    onCreated({
      id: newId("sub"),
      user_id: userId,
      skill_name: slug,
      domain,
      description: description.trim(),
      status: "draft",
      submitted_at: new Date().toISOString(),
    });
    setSkillName("");
    setDescription("");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 max-w-2xl mb-10 p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[color:var(--tracking-display)]">
        New submission
      </h2>
      <TextField
        label="Skill name"
        placeholder="e.g. hcc-risk-adjustment-primer"
        required
        value={skillName}
        onChange={(e) => setSkillName(e.target.value)}
        help="Lowercase, hyphens only. Will become the /s/[name] URL when published."
      />
      <SelectField
        label="Desk"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        options={DOMAIN_ORDER.map((d) => ({
          value: d,
          label: DOMAIN_LABELS[d] ?? d,
        }))}
      />
      <TextArea
        label="Description"
        rows={4}
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        help="What it does + who it's for. Two sentences is ideal."
      />
      {err && <FormError message={err} />}
      <div className="flex items-center gap-4">
        <SubmitButton>Create draft</SubmitButton>
        <p className="text-xs text-[color:var(--color-fg-subtle)]">
          Saves as a draft. Mark ready-for-review from the list when
          you&rsquo;re ready.
        </p>
      </div>
    </form>
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
