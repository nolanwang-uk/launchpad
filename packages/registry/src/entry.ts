export type Tier = "Reviewed" | "Community";

export type Capabilities = {
  network: boolean;
  filesystem: boolean;
  shell: boolean;
};

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
