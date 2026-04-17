#!/usr/bin/env bun
/**
 * Standalone registry validator used by CI.
 *
 * Runs the same schema + cross-entry checks the CLI uses. Designed for
 * GitHub Actions: exits 0 on pass, non-zero with a human-readable error
 * list on fail. No network access; deep per-entry validation (fetching
 * skill.yml at the declared SHA) is a v1.1 feature.
 *
 * Usage:
 *   bun packages/registry/src/validate-cli.ts [--path <registry.json>] [--json]
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { validateRegistry } from "./entry";

type Args = { path: string; json: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = {
    path: path.resolve(process.cwd(), "registry.json"),
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--path") {
      args.path = path.resolve(argv[++i]!);
    } else if (a === "--json") {
      args.json = true;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a && !a.startsWith("--")) {
      args.path = path.resolve(a);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    `launchpad-registry-validate\n\n` +
      `usage: bun packages/registry/src/validate-cli.ts [--path <registry.json>] [--json]\n\n` +
      `Validates a registry.json file. Exit 0 if all checks pass, exit 1 if any fail.\n` +
      `Does not fetch skill.yml from referenced repos — deep validation is v1.1.\n`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let raw: string;
  try {
    raw = await fs.readFile(args.path, "utf-8");
  } catch (e) {
    report({
      ok: false,
      path: args.path,
      errors: [
        `could not read ${args.path}: ${e instanceof Error ? e.message : String(e)}`,
      ],
    }, args);
    process.exit(2);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    report({
      ok: false,
      path: args.path,
      errors: [
        `${args.path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
      ],
    }, args);
    process.exit(2);
  }

  const result = validateRegistry(parsed);
  if (result.ok) {
    report({ ok: true, path: args.path, errors: [] }, args);
    process.exit(0);
  }
  report({ ok: false, path: args.path, errors: result.errors }, args);
  process.exit(1);
}

type Report = { ok: boolean; path: string; errors: string[] };

function report(r: Report, args: Args): void {
  if (args.json) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    return;
  }
  if (r.ok) {
    process.stdout.write(`✓ ${r.path} — all checks passed.\n`);
    return;
  }
  process.stderr.write(`✗ ${r.path} — ${r.errors.length} error(s):\n`);
  for (const e of r.errors) {
    process.stderr.write(`    ${e}\n`);
  }
}

main().catch((e: unknown) => {
  process.stderr.write(
    `error: unexpected internal error\n` +
      `why:   ${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(2);
});
