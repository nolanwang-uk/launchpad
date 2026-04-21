import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  deriveAuthorSlug,
  validateRegistry,
  type Registry,
  type RegistryEntry,
} from "@launchpad/registry";

/**
 * Server-side registry loader. Reads the bundled registry.json at build/request
 * time. In Phase 3 this will move to GitHub raw with tag-based revalidation;
 * in Phase 4 it uses the Vercel edge-cached proxy (E-I1/I5). For now, local
 * file read is fine — `next build` will inline the result into static pages.
 */

const REGISTRY_PATH = path.resolve(
  process.cwd(),
  "..",
  "registry",
  "registry.json",
);

let cached: Registry | null = null;

export function loadRegistrySync(): Registry {
  if (cached) return cached;

  const raw = readFileSync(REGISTRY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const result = validateRegistry(parsed);
  if (!result.ok) {
    throw new Error(
      `registry.json failed validation: ${result.errors.slice(0, 3).join("; ")}`,
    );
  }
  cached = parsed as Registry;
  return cached;
}

export function findEntry(name: string): RegistryEntry | undefined {
  return loadRegistrySync().entries.find((e) => e.name === name);
}

/**
 * Effective slug for an entry — prefer the explicit `author_slug`, fall
 * back to a slug derived from the free-text `author`. Keeps profile
 * routing stable even for legacy entries.
 */
export function slugForEntry(e: RegistryEntry): string {
  return e.author_slug ?? deriveAuthorSlug(e.author);
}

export type Practitioner = {
  slug: string;
  /** Display name, taken from the most recent entry's `author`. */
  name: string;
  /** Representative credential, taken from the most recent entry. */
  credential?: string;
  /** All skills by this practitioner, newest first. */
  entries: RegistryEntry[];
};

/**
 * Aggregate all skills by practitioner slug. Used by the /p/[slug]
 * profile route and by anywhere else that needs to say "other skills
 * by this practitioner." Result is stable across requests because the
 * registry is cached.
 */
export function loadPractitioners(): Practitioner[] {
  const byslug = new Map<string, RegistryEntry[]>();
  for (const entry of loadRegistrySync().entries) {
    const slug = slugForEntry(entry);
    const list = byslug.get(slug) ?? [];
    list.push(entry);
    byslug.set(slug, list);
  }
  const practitioners: Practitioner[] = [];
  for (const [slug, entries] of byslug.entries()) {
    const sorted = [...entries].sort(
      (a, b) => Date.parse(b.added_at) - Date.parse(a.added_at),
    );
    const headline = sorted[0]!;
    practitioners.push({
      slug,
      name: headline.author,
      credential: headline.author_credential,
      entries: sorted,
    });
  }
  return practitioners.sort((a, b) => a.name.localeCompare(b.name));
}

export function findPractitioner(slug: string): Practitioner | undefined {
  return loadPractitioners().find((p) => p.slug === slug);
}

/**
 * Count of skills per integration kind. Used by the /integrations
 * landing page to show which kinds have real usage and which are
 * declared-but-unattached.
 */
export function countByIntegration(): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of loadRegistrySync().entries) {
    for (const it of e.integrations ?? []) {
      m.set(it.kind, (m.get(it.kind) ?? 0) + 1);
    }
  }
  return m;
}

export function entriesWithIntegration(kind: string): RegistryEntry[] {
  return loadRegistrySync()
    .entries.filter((e) => (e.integrations ?? []).some((it) => it.kind === kind))
    .sort((a, b) => Date.parse(b.added_at) - Date.parse(a.added_at));
}

/**
 * Filter entries by domain. Undefined domain defaults to "general"
 * for aggregation purposes so the desk page is complete — legacy
 * entries without a declared domain land under the General desk.
 */
export function entriesInDomain(domain: string): RegistryEntry[] {
  return loadRegistrySync()
    .entries.filter((e) => (e.domain ?? "general") === domain)
    .sort((a, b) => Date.parse(b.added_at) - Date.parse(a.added_at));
}

/**
 * Client-safe domain constants live in ./domains so client components
 * can import them without pulling in node:fs. Re-exported here for
 * server-side callers that already import from this module.
 */
export {
  DOMAIN_LABELS,
  DOMAIN_BLURBS,
  DOMAIN_ORDER,
  labelForDomain,
} from "./domains";
