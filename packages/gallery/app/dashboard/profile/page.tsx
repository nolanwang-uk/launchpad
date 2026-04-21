"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  FormError,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
} from "@/components/FormField";
import { PractitionerMark } from "@/components/PractitionerMark";
import type { UserRole } from "@/lib/auth/types";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [slug, setSlug] = useState(user?.slug ?? "");
  const [credential, setCredential] = useState(user?.credential ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "reader");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    if (cleanSlug.length < 2) {
      setError("Slug must be at least 2 characters (a–z, 0–9, hyphens).");
      return;
    }
    updateUser({
      display_name: displayName.trim(),
      slug: cleanSlug,
      credential: credential.trim() || undefined,
      bio: bio.trim() || undefined,
      role,
    });
    setSlug(cleanSlug);
    setSaved(true);
  };

  const profileHref = `/p/${user.slug}`;

  return (
    <div>
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] mb-3">
          Profile
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.02] tracking-[color:var(--tracking-display-tight)] font-medium">
          How you appear on the exchange.
        </h1>
        <p className="mt-4 text-[color:var(--color-fg-muted)] leading-relaxed max-w-2xl">
          These fields control your public byline, credential line,
          and profile page at{" "}
          <Link
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
          >
            /p/{user.slug}
          </Link>
          .
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
        <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
          <TextField
            label="Display name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <TextField
            label="Public slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            help={`Lives at /p/${slug || "your-slug"}. Only a–z, 0–9, hyphens.`}
          />
          <TextField
            label="Credential"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            help="One line. Prefer specifics. 'Former SEC staff attorney (2014–2021)' beats 'securities expert'."
          />
          <TextArea
            label="Bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            help="Shown on your profile page. 2–4 sentences, practitioner voice."
          />
          <SelectField
            label="Role on the exchange"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: "reader", label: "Reader — browse + hire" },
              { value: "practitioner", label: "Practitioner — I publish skills" },
              { value: "both", label: "Both" },
            ]}
            help="Role controls which dashboard tabs you see. Verification of your credential is a separate step (editorial reviews on submit)."
          />
          {error && <FormError message={error} />}
          <div className="flex items-center gap-4 pt-1">
            <SubmitButton>Save profile</SubmitButton>
            {saved && (
              <span
                role="status"
                className="text-sm text-[color:var(--color-success)] font-[family-name:var(--font-display)]"
              >
                ✓ Saved.
              </span>
            )}
          </div>
        </form>

        <aside className="lg:sticky lg:top-6 self-start">
          <div className="p-5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)] mb-3">
              Preview
            </p>
            <div className="flex items-start gap-3 mb-3">
              <PractitionerMark name={displayName || "—"} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  {displayName || "Your name"}
                </p>
                {credential && (
                  <p className="text-xs text-[color:var(--color-fg-muted)] leading-snug mt-1 line-clamp-3">
                    {credential}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={profileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--color-accent)] underline decoration-[color:var(--color-border-strong)] underline-offset-4"
            >
              View live profile →
            </Link>
          </div>
          <p className="text-xs text-[color:var(--color-fg-subtle)] leading-relaxed mt-4">
            Changes save to your local session immediately. When the
            server backend lands, saves post to the API and the public
            profile updates on revalidation (~60s).
          </p>
        </aside>
      </div>
    </div>
  );
}
