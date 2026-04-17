import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Minimal on-disk cache root. Currently only used by `skillz cache clear`
 * since Phase 2 still reads the bundled registry file. Phase 3 will wire
 * the GitHub-raw fetch + ETag revalidation through this directory.
 */
export function cacheDir(): string {
  const base =
    process.env.XDG_CACHE_HOME ??
    path.join(process.env.HOME ?? os.homedir(), ".cache");
  return path.join(base, "launchpad");
}

export async function clearCache(): Promise<{ removed: boolean; dir: string }> {
  const dir = cacheDir();
  const exists = await fs
    .stat(dir)
    .then(() => true)
    .catch(() => false);
  if (!exists) return { removed: false, dir };
  await fs.rm(dir, { recursive: true, force: true });
  return { removed: true, dir };
}
