import { readFileSync } from "node:fs";
import * as path from "node:path";
import { validateRegistry, type Registry, type RegistryEntry } from "@launchpad/registry";

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
