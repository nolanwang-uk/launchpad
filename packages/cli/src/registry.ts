import * as fs from "node:fs/promises";
import * as path from "node:path";
import { validateRegistry, type Registry, type RegistryEntry } from "@launchpad/registry";
import { err, EXIT } from "./errors";

export type ResolvedEntry = {
  shortName: string;
  owner: string;
  repoName: string;
  sha: string;
  tier: RegistryEntry["tier"];
  capabilities: RegistryEntry["capabilities"];
};

const BUNDLED_REGISTRY_PATH = path.resolve(
  import.meta.dir,
  "..",
  "..",
  "registry",
  "registry.json",
);

/**
 * Loads the registry. Phase 2 reads a local file (bundled in the monorepo
 * for now; in Phase 3 the CLI will fetch from GitHub raw with edge caching
 * per E-I1/I5). Override via --registry <path> or the SKILLZ_REGISTRY env var.
 */
export async function loadRegistry(override?: string): Promise<Registry> {
  const src = override ?? process.env.SKILLZ_REGISTRY ?? BUNDLED_REGISTRY_PATH;

  let raw: string;
  try {
    raw = await fs.readFile(src, "utf-8");
  } catch (e) {
    throw err(
      "registry-not-found",
      "could not read the registry file",
      `${src}: ${e instanceof Error ? e.message : String(e)}`,
      "set SKILLZ_REGISTRY to a valid path, or reinstall skillz.",
      EXIT.RUNTIME,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw err(
      "registry-bad-json",
      "registry is not valid JSON",
      `${src}: ${e instanceof Error ? e.message : String(e)}`,
      "the registry file is corrupted; reinstall skillz or restore from git.",
      EXIT.RUNTIME,
    );
  }

  const validation = validateRegistry(parsed);
  if (!validation.ok) {
    throw err(
      "registry-invalid",
      "registry failed schema validation",
      `${src}: ${validation.errors.slice(0, 3).join("; ")}${validation.errors.length > 3 ? " …" : ""}`,
      "this is a registry-side bug. file an issue with the full output.",
      EXIT.RUNTIME,
    );
  }

  return parsed as Registry;
}

export async function resolveShortName(
  shortName: string,
  override?: string,
): Promise<ResolvedEntry> {
  const reg = await loadRegistry(override);
  const entry = reg.entries.find((e) => e.name === shortName);
  if (!entry) {
    throw err(
      "unknown-skill",
      `no skill named '${shortName}' in the registry`,
      `the registry at ${override ?? BUNDLED_REGISTRY_PATH} does not list this skill.`,
      "try `skillz search <term>` (Phase 2) or pass a full GitHub URL instead.",
      EXIT.INPUT,
    );
  }

  if (entry.deprecated) {
    process.stderr.write(
      `warning: '${shortName}' is marked deprecated in the registry.\n`,
    );
  }

  const repoParts = entry.repo.split("/");
  const owner = repoParts[0] ?? "";
  const repoName = repoParts[1] ?? "";

  return {
    shortName: entry.name,
    owner,
    repoName,
    sha: entry.sha,
    tier: entry.tier,
    capabilities: entry.capabilities,
  };
}

export function looksLikeShortName(arg: string): boolean {
  // Short name = the manifest name pattern, no slash, no scheme, no '@'.
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(arg);
}
