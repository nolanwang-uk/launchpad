export type Tier = "Reviewed" | "Community";

export type Capabilities = {
  network: boolean;
  filesystem: boolean;
  shell: boolean;
};

/**
 * Integration kinds a skill can optionally declare. v1 does not
 * enforce these at runtime — they're editorial content used to
 * surface buyer-side compatibility (what systems the skill reads
 * from / writes to). v2 backs each kind with a typed SDK adapter
 * and runtime scope enforcement. The enum is stable; new kinds
 * append to the end. Never rename one.
 */
export const INTEGRATION_KINDS = [
  // File surfaces
  "local_files",
  "google_sheets",
  "google_drive",
  "excel",
  "csv",
  "s3",
  "gcs",
  "azure_blob",
  // Warehouses + DBs
  "postgres",
  "bigquery",
  "snowflake",
  "duckdb",
  // Business apps
  "salesforce",
  "hubspot",
  "netsuite",
  "quickbooks",
  "stripe",
  "jira",
  "linear",
  "notion",
  "confluence",
  // Messaging
  "slack",
  "teams",
  "email",
  // Health + domain-specific
  "epic_mcp",
  "edgar",
  "pubmed",
  // Generic escape hatches
  "http_api",
  "webhook_in",
  "mcp_passthrough",
] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export type IntegrationDirection = "read" | "write" | "both";

export type Integration = {
  kind: IntegrationKind;
  direction: IntegrationDirection;
  /** Optional one-line note for the per-skill page. */
  note?: string;
};

/**
 * Practitioner domain taxonomy. Kept intentionally small in v1 — every
 * entry lives under one top-level domain. Subfields live in tags.
 */
export const PRACTITIONER_DOMAINS = [
  "law",
  "medicine",
  "finance",
  "accounting",
  "engineering",
  "research",
  "operations",
  "creative",
  "education",
  "general",
] as const;
export type PractitionerDomain = (typeof PRACTITIONER_DOMAINS)[number];

export type RegistryEntry = {
  schema_version: 1;
  name: string;
  description: string;
  author: string;
  license: string;
  repo: string; // "owner/name"
  sha: string; // 40-char lowercase hex
  tier: Tier;
  targets: readonly string[];
  capabilities: Capabilities;
  tags: readonly string[];
  added_at: string; // ISO 8601
  deprecated?: boolean;
  /**
   * Optional inline README in Markdown. When present, the gallery renders
   * this on the per-skill page. When absent, Phase 3 (future work) will
   * fetch the real README from the skill's repo at the declared SHA.
   * Bounded so a single entry can't bloat registry.json unreasonably.
   */
  readme_md?: string;
  /**
   * Practitioner identity fields. These express *who is encoded in this
   * skill* and are what the Practitioners' Exchange frame trades on:
   * verified domain expertise, not generic dev utility. All optional so
   * legacy entries and pre-verification community submissions still
   * validate. Reviewed/Verified tier should supply all four.
   */
  /** Short professional credential. e.g. "Former SEC staff attorney (2014–2021)" */
  author_credential?: string;
  /** Top-level domain this skill encodes expertise in. */
  domain?: PractitionerDomain;
  /** One-line "who this is for" in practitioner's own voice. */
  who_its_for?: string;
  /** Suggested price in USD cents. 0 = free. Display only in v1. */
  price_usd_cents?: number;
  /**
   * URL-safe handle for the practitioner. Used as the /p/[slug] route
   * key so multiple skills by the same practitioner aggregate under
   * one profile page. Defaults to a slug derived from `author` at load
   * time if absent.
   */
  author_slug?: string;
  /**
   * Aggregate rating 0.0–5.0 in 0.5 steps. Display only in v1 — there
   * is no server to record or verify these, so the value is whatever
   * the registry entry declares. Editorial responsibility, not UGC.
   */
  rating?: number;
  /** Number of reviews contributing to `rating`. */
  reviews_count?: number;
  /**
   * Short sample reviews shown on the per-skill page. Bounded so the
   * registry JSON doesn't bloat. Reviewer names and roles are
   * free-text — editorial rather than authenticated.
   */
  reviews?: readonly {
    reviewer: string;
    reviewer_role?: string;
    rating: number;
    body: string;
    at: string; // ISO 8601
  }[];
  /**
   * Declared integrations. v1 editorial only — what the practitioner
   * claims this skill reads from or writes to. The diff-before-exec
   * layer eventually enforces scope per integration at runtime; for
   * now the value is buyer-side expectation setting on the gallery.
   */
  integrations?: readonly Integration[];
};

export type Registry = {
  schema_version: 1;
  updated_at: string;
  entries: readonly RegistryEntry[];
};

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const REPO_RE = /^[^/]+\/[^/]+$/;
const TAG_RE = /^[a-z0-9-]{1,32}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Derive a URL-safe slug from a free-text author name. Used as the
 * default key for /p/[slug] when a registry entry doesn't declare an
 * explicit `author_slug`. Lowercases, strips diacritics, collapses
 * runs of non-alphanumerics into a single hyphen, trims hyphens.
 */
export function deriveAuthorSlug(author: string): string {
  const normalized = author
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized.slice(0, 64) : "anonymous";
}

export type ValidateResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Validates a single registry entry. Used by the CLI loader and by the
 * registry PR validator (to be wired up in CI in Phase 2). Does not check
 * cross-entry invariants like unique names — that's the caller's job.
 */
export function validateEntry(raw: unknown, i: number): ValidateResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: [`entry[${i}]: must be an object`] };
  }
  const e = raw as Record<string, unknown>;

  if (e.schema_version !== 1) {
    errors.push(`entry[${i}].schema_version: must be 1 (got ${JSON.stringify(e.schema_version)})`);
  }
  if (typeof e.name !== "string" || !NAME_RE.test(e.name)) {
    errors.push(`entry[${i}].name: must match ${NAME_RE}`);
  }
  if (typeof e.description !== "string" || e.description.length === 0 || e.description.length > 280) {
    errors.push(`entry[${i}].description: must be a string 1-280 chars`);
  }
  if (typeof e.author !== "string" || e.author.length === 0) {
    errors.push(`entry[${i}].author: must be a non-empty string`);
  }
  if (typeof e.license !== "string" || e.license.length === 0) {
    errors.push(`entry[${i}].license: must be an SPDX license identifier`);
  }
  if (typeof e.repo !== "string" || !REPO_RE.test(e.repo)) {
    errors.push(`entry[${i}].repo: must be 'owner/name'`);
  }
  if (typeof e.sha !== "string" || !SHA_RE.test(e.sha)) {
    errors.push(`entry[${i}].sha: must be a 40-char lowercase hex SHA (no tags, no branches)`);
  }
  if (e.tier !== "Reviewed" && e.tier !== "Community") {
    errors.push(`entry[${i}].tier: must be 'Reviewed' or 'Community'`);
  }
  if (!Array.isArray(e.targets) || e.targets.length === 0) {
    errors.push(`entry[${i}].targets: must be a non-empty array`);
  } else {
    for (const [j, t] of e.targets.entries()) {
      if (t !== "claude-code") {
        errors.push(`entry[${i}].targets[${j}]: only 'claude-code' is supported in v1 (got ${JSON.stringify(t)})`);
      }
    }
  }

  const caps = e.capabilities;
  if (typeof caps !== "object" || caps === null) {
    errors.push(`entry[${i}].capabilities: must be an object`);
  } else {
    const c = caps as Record<string, unknown>;
    for (const field of ["network", "filesystem", "shell"]) {
      if (typeof c[field] !== "boolean") {
        errors.push(`entry[${i}].capabilities.${field}: must be boolean`);
      }
    }
  }

  if (!Array.isArray(e.tags)) {
    errors.push(`entry[${i}].tags: must be an array`);
  } else {
    if (e.tags.length > 8) errors.push(`entry[${i}].tags: max 8`);
    for (const [j, tag] of e.tags.entries()) {
      if (typeof tag !== "string" || !TAG_RE.test(tag)) {
        errors.push(`entry[${i}].tags[${j}]: must match ${TAG_RE}`);
      }
    }
  }

  if (typeof e.added_at !== "string" || Number.isNaN(Date.parse(e.added_at))) {
    errors.push(`entry[${i}].added_at: must be an ISO 8601 timestamp`);
  }

  if (e.readme_md !== undefined) {
    if (typeof e.readme_md !== "string") {
      errors.push(`entry[${i}].readme_md: must be a string if present`);
    } else if (e.readme_md.length > 40_000) {
      errors.push(
        `entry[${i}].readme_md: exceeds 40,000 char limit (got ${e.readme_md.length})`,
      );
    }
  }

  if (e.author_credential !== undefined) {
    if (
      typeof e.author_credential !== "string" ||
      e.author_credential.length === 0 ||
      e.author_credential.length > 200
    ) {
      errors.push(
        `entry[${i}].author_credential: must be a string 1-200 chars if present`,
      );
    }
  }

  if (e.domain !== undefined) {
    if (
      typeof e.domain !== "string" ||
      !(PRACTITIONER_DOMAINS as readonly string[]).includes(e.domain)
    ) {
      errors.push(
        `entry[${i}].domain: must be one of ${PRACTITIONER_DOMAINS.join(", ")}`,
      );
    }
  }

  if (e.who_its_for !== undefined) {
    if (
      typeof e.who_its_for !== "string" ||
      e.who_its_for.length === 0 ||
      e.who_its_for.length > 280
    ) {
      errors.push(
        `entry[${i}].who_its_for: must be a string 1-280 chars if present`,
      );
    }
  }

  if (e.price_usd_cents !== undefined) {
    if (
      typeof e.price_usd_cents !== "number" ||
      !Number.isInteger(e.price_usd_cents) ||
      e.price_usd_cents < 0 ||
      e.price_usd_cents > 1_000_000
    ) {
      errors.push(
        `entry[${i}].price_usd_cents: must be an integer 0-1000000 (cents)`,
      );
    }
  }

  if (e.author_slug !== undefined) {
    if (typeof e.author_slug !== "string" || !SLUG_RE.test(e.author_slug)) {
      errors.push(
        `entry[${i}].author_slug: must match ${SLUG_RE} if present`,
      );
    }
  }

  if (e.rating !== undefined) {
    if (
      typeof e.rating !== "number" ||
      e.rating < 0 ||
      e.rating > 5 ||
      Math.round(e.rating * 2) !== e.rating * 2
    ) {
      errors.push(
        `entry[${i}].rating: must be a number 0.0-5.0 in 0.5 steps`,
      );
    }
  }

  if (e.reviews_count !== undefined) {
    if (
      typeof e.reviews_count !== "number" ||
      !Number.isInteger(e.reviews_count) ||
      e.reviews_count < 0
    ) {
      errors.push(`entry[${i}].reviews_count: must be a non-negative integer`);
    }
  }

  if (e.integrations !== undefined) {
    if (!Array.isArray(e.integrations)) {
      errors.push(
        `entry[${i}].integrations: must be an array if present`,
      );
    } else if (e.integrations.length > 12) {
      errors.push(`entry[${i}].integrations: max 12`);
    } else {
      for (const [j, raw] of e.integrations.entries()) {
        if (typeof raw !== "object" || raw === null) {
          errors.push(`entry[${i}].integrations[${j}]: must be an object`);
          continue;
        }
        const it = raw as Record<string, unknown>;
        if (
          typeof it.kind !== "string" ||
          !(INTEGRATION_KINDS as readonly string[]).includes(it.kind)
        ) {
          errors.push(
            `entry[${i}].integrations[${j}].kind: must be one of ${INTEGRATION_KINDS.slice(0, 6).join(", ")}, … (see registry spec)`,
          );
        }
        if (
          typeof it.direction !== "string" ||
          !["read", "write", "both"].includes(it.direction)
        ) {
          errors.push(
            `entry[${i}].integrations[${j}].direction: must be 'read' | 'write' | 'both'`,
          );
        }
        if (
          it.note !== undefined &&
          (typeof it.note !== "string" || it.note.length > 160)
        ) {
          errors.push(
            `entry[${i}].integrations[${j}].note: string ≤160 chars if present`,
          );
        }
      }
    }
  }

  if (e.reviews !== undefined) {
    if (!Array.isArray(e.reviews)) {
      errors.push(`entry[${i}].reviews: must be an array if present`);
    } else if (e.reviews.length > 20) {
      errors.push(`entry[${i}].reviews: max 20`);
    } else {
      for (const [j, r] of e.reviews.entries()) {
        if (typeof r !== "object" || r === null) {
          errors.push(`entry[${i}].reviews[${j}]: must be an object`);
          continue;
        }
        const rec = r as Record<string, unknown>;
        if (typeof rec.reviewer !== "string" || rec.reviewer.length === 0 || rec.reviewer.length > 80) {
          errors.push(`entry[${i}].reviews[${j}].reviewer: 1-80 chars`);
        }
        if (rec.reviewer_role !== undefined && (typeof rec.reviewer_role !== "string" || rec.reviewer_role.length > 120)) {
          errors.push(`entry[${i}].reviews[${j}].reviewer_role: string ≤120 chars`);
        }
        if (
          typeof rec.rating !== "number" ||
          rec.rating < 0 ||
          rec.rating > 5 ||
          Math.round(rec.rating * 2) !== rec.rating * 2
        ) {
          errors.push(`entry[${i}].reviews[${j}].rating: 0.0-5.0 in 0.5 steps`);
        }
        if (typeof rec.body !== "string" || rec.body.length === 0 || rec.body.length > 600) {
          errors.push(`entry[${i}].reviews[${j}].body: 1-600 chars`);
        }
        if (typeof rec.at !== "string" || Number.isNaN(Date.parse(rec.at))) {
          errors.push(`entry[${i}].reviews[${j}].at: ISO 8601`);
        }
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateRegistry(raw: unknown): ValidateResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["registry: must be an object"] };
  }
  const r = raw as Record<string, unknown>;
  if (r.schema_version !== 1) errors.push(`registry.schema_version: must be 1`);
  if (typeof r.updated_at !== "string" || Number.isNaN(Date.parse(r.updated_at))) {
    errors.push(`registry.updated_at: must be an ISO 8601 timestamp`);
  }
  if (!Array.isArray(r.entries)) {
    return { ok: false, errors: [...errors, "registry.entries: must be an array"] };
  }

  const seenNames = new Set<string>();
  for (let i = 0; i < r.entries.length; i++) {
    const res = validateEntry(r.entries[i], i);
    if (!res.ok) errors.push(...res.errors);

    const name = (r.entries[i] as { name?: unknown })?.name;
    if (typeof name === "string") {
      if (seenNames.has(name)) errors.push(`entry[${i}].name: duplicate name '${name}'`);
      seenNames.add(name);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
