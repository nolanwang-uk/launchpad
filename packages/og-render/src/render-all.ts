#!/usr/bin/env bun
/**
 * Renders OG images for every entry in the registry into
 * packages/gallery/public/og/<name>.png.
 *
 * Usage:
 *   bun src/render-all.ts               # render all, skip up-to-date
 *   bun src/render-all.ts --force       # re-render everything
 *   bun src/render-all.ts --out <dir>   # override output dir
 *
 * Writes a sidecar manifest at <outDir>/.manifest.json so subsequent
 * runs can skip unchanged entries. The manifest keys on
 * (sha, description, author, tier, license, tags) — a change to any
 * of those fields invalidates the cached image.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Registry, RegistryEntry } from "@launchpad/registry";
import { validateRegistry } from "@launchpad/registry";
import { renderOne, withBrowser } from "./render";

type Args = { force: boolean; outDir: string; registry: string };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.resolve(HERE, "..", "..", "gallery", "public", "og");
const DEFAULT_REG = path.resolve(HERE, "..", "..", "registry", "registry.json");

function parseArgs(argv: string[]): Args {
  const args: Args = { force: false, outDir: DEFAULT_OUT, registry: DEFAULT_REG };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") args.force = true;
    else if (a === "--out") args.outDir = path.resolve(argv[++i]!);
    else if (a === "--registry") args.registry = path.resolve(argv[++i]!);
  }
  return args;
}

function entryFingerprint(e: RegistryEntry): string {
  const material = JSON.stringify({
    sha: e.sha,
    description: e.description,
    author: e.author,
    tier: e.tier,
    license: e.license,
    tags: [...e.tags],
    name: e.name,
  });
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

async function loadRegistry(regPath: string): Promise<Registry> {
  const raw = await fs.readFile(regPath, "utf-8");
  const parsed = JSON.parse(raw);
  const result = validateRegistry(parsed);
  if (!result.ok) {
    throw new Error(
      `registry failed validation: ${result.errors.slice(0, 3).join("; ")}`,
    );
  }
  return parsed as Registry;
}

type Manifest = Record<string, string>; // name → fingerprint

async function readManifest(outDir: string): Promise<Manifest> {
  const p = path.join(outDir, ".manifest.json");
  try {
    const raw = await fs.readFile(p, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Manifest;
  } catch {
    return {};
  }
}

async function writeManifest(outDir: string, m: Manifest): Promise<void> {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, ".manifest.json"),
    JSON.stringify(m, null, 2) + "\n",
    "utf-8",
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const registry = await loadRegistry(args.registry);
  const manifest = args.force ? {} : await readManifest(args.outDir);
  const nextManifest: Manifest = { ...manifest };

  const toRender: RegistryEntry[] = [];
  const skipped: string[] = [];

  for (const entry of registry.entries) {
    const fp = entryFingerprint(entry);
    const outPath = path.join(args.outDir, `${entry.name}.png`);
    const cached = manifest[entry.name];
    const pngPresent = existsSync(outPath);
    if (!args.force && cached === fp && pngPresent) {
      skipped.push(entry.name);
      nextManifest[entry.name] = fp;
      continue;
    }
    toRender.push(entry);
    nextManifest[entry.name] = fp;
  }

  if (toRender.length === 0) {
    process.stdout.write(
      `all ${registry.entries.length} OG images up-to-date (skipped: ${skipped.length})\n`,
    );
    await writeManifest(args.outDir, nextManifest);
    return;
  }

  process.stdout.write(
    `rendering ${toRender.length} OG image(s), skipping ${skipped.length}\n`,
  );

  const results = await withBrowser(async (browser) => {
    const out: Array<{ name: string; bytesWritten: number }> = [];
    for (const entry of toRender) {
      const outPath = path.join(args.outDir, `${entry.name}.png`);
      const r = await renderOne(browser, entry, outPath);
      process.stdout.write(
        `  ✓ ${r.name}  (${(r.bytesWritten / 1024).toFixed(1)}KB)  ${r.outPath}\n`,
      );
      out.push({ name: r.name, bytesWritten: r.bytesWritten });
    }
    return out;
  });

  await writeManifest(args.outDir, nextManifest);

  const total = results.reduce((s, r) => s + r.bytesWritten, 0);
  process.stdout.write(
    `\ndone — ${results.length} rendered (${(total / 1024).toFixed(1)}KB total)\n`,
  );
}

main().catch((e: unknown) => {
  process.stderr.write(
    `error: og-render failed\nwhy:   ${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(1);
});
