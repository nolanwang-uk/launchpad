import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { Capabilities, Manifest } from "./manifest";

export type InstallLock = {
  schema: 1;
  name: string;
  version: string;
  sha: string;
  installed_at: string; // ISO 8601
  source_url: string | null; // github URL or "local"
  capabilities: Capabilities;
  files: readonly string[];
};

const LOCK_FILENAME = ".skillz-lock.json";

export function defaultSkillsDir(): string {
  const home = process.env.HOME ?? os.homedir();
  return path.join(home, ".claude", "skills");
}

export function skillDir(name: string, override?: string): string {
  const root = override ?? defaultSkillsDir();
  return path.join(root, name);
}

export async function readLock(dir: string): Promise<InstallLock | null> {
  const p = path.join(dir, LOCK_FILENAME);
  try {
    const raw = await fs.readFile(p, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.schema !== 1) return null;
    return parsed as InstallLock;
  } catch {
    return null;
  }
}

export async function writeLock(dir: string, lock: InstallLock): Promise<void> {
  const p = path.join(dir, LOCK_FILENAME);
  await fs.writeFile(p, JSON.stringify(lock, null, 2) + "\n", "utf-8");
}

export function makeLock(args: {
  manifest: Manifest;
  sha: string;
  sourceUrl: string | null;
}): InstallLock {
  return {
    schema: 1,
    name: args.manifest.name,
    version: args.manifest.version,
    sha: args.sha,
    installed_at: new Date().toISOString(),
    source_url: args.sourceUrl,
    capabilities: args.manifest.capabilities,
    files: args.manifest.files,
  };
}

export async function listInstalled(override?: string): Promise<InstallLock[]> {
  const root = override ?? defaultSkillsDir();
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const locks: InstallLock[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const lock = await readLock(path.join(root, e.name));
    if (lock) locks.push(lock);
  }
  return locks.sort((a, b) => a.name.localeCompare(b.name));
}
