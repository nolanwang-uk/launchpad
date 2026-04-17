#!/usr/bin/env bun
import { runCommand } from "./commands/run";
import { installCommand } from "./commands/install";
import { uninstallCommand } from "./commands/uninstall";
import { listCommand } from "./commands/list";
import { doctorCommand } from "./commands/doctor";
import { initCommand, listCommonLicenses } from "./commands/init";
import { validateCommand } from "./commands/validate";
import { infoCommand } from "./commands/info";
import { searchCommand } from "./commands/search";
import { updateCommand } from "./commands/update";
import { cacheCommand } from "./commands/cache";
import { EXIT } from "./errors";

const VERSION = "0.1.0-dev.0";

type Flags = {
  assumeYes: boolean;
  acceptRisk: boolean;
  dryRun: boolean;
  fromLocal?: string;
  noColor: boolean;
  json: boolean;
  quiet: boolean;
  target?: string;
  license?: string;
  author?: string;
  tier?: "Reviewed" | "Community";
  limit?: number;
};

function parseFlags(argv: string[]): { verb: string | null; rest: string[]; flags: Flags } {
  const flags: Flags = {
    assumeYes: false,
    acceptRisk: false,
    dryRun: false,
    noColor: false,
    json: false,
    quiet: false,
  };
  const rest: string[] = [];
  let verb: string | null = null;
  let i = 0;
  while (i < argv.length) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(EXIT.OK);
    } else if (a === "--version" || a === "-V") {
      process.stdout.write(`skillz ${VERSION} (bun)\n`);
      process.exit(EXIT.OK);
    } else if (a === "--yes" || a === "-y") {
      flags.assumeYes = true;
    } else if (a === "--i-accept-risk") {
      flags.acceptRisk = true;
    } else if (a === "--dry-run") {
      flags.dryRun = true;
    } else if (a === "--no-color") {
      flags.noColor = true;
    } else if (a === "--json") {
      flags.json = true;
    } else if (a === "--quiet" || a === "-q") {
      flags.quiet = true;
    } else if (a === "--from-local") {
      flags.fromLocal = argv[++i];
    } else if (a.startsWith("--from-local=")) {
      flags.fromLocal = a.slice("--from-local=".length);
    } else if (a === "--target") {
      flags.target = argv[++i];
    } else if (a.startsWith("--target=")) {
      flags.target = a.slice("--target=".length);
    } else if (a === "--license") {
      flags.license = argv[++i];
    } else if (a.startsWith("--license=")) {
      flags.license = a.slice("--license=".length);
    } else if (a === "--author") {
      flags.author = argv[++i];
    } else if (a.startsWith("--author=")) {
      flags.author = a.slice("--author=".length);
    } else if (a === "--tier") {
      const t = argv[++i];
      if (t === "Reviewed" || t === "Community") flags.tier = t;
    } else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) flags.limit = Math.floor(n);
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) flags.limit = Math.floor(n);
    } else if (!verb) {
      verb = a;
    } else {
      rest.push(a);
    }
    i++;
  }
  return { verb, rest, flags };
}

function printHelp(): void {
  process.stdout.write(
    `skillz ${VERSION} — Launchpad CLI\n\n` +
      `usage: skillz [flags] <verb> [args]\n\n` +
      `verbs (v1):\n` +
      `  run <name|url>        fetch & execute one-shot in temp dir (primary)\n` +
      `  install <name|url>    fetch & copy into ~/.claude/skills/<name>/\n` +
      `  uninstall <name>      remove an installed skill\n` +
      `  list                  show installed skills (add --json for machine output)\n` +
      `  info <name>           show registry metadata for a skill\n` +
      `  search <term>         fuzzy-match registry entries by name / tag / desc\n` +
      `  update [<name>]       refresh installed skills to latest registry SHA\n` +
      `  cache clear           drop the local registry cache\n` +
      `  doctor                environment preflight\n` +
      `  init <name>           scaffold a new skill repo locally\n` +
      `  validate [<path>]     run registry-PR-validator checks on a skill\n\n` +
      `flags:\n` +
      `  --help, -h          this help\n` +
      `  --version, -V       version + install source\n` +
      `  --yes, -y           accept no-shell skills non-interactively\n` +
      `  --i-accept-risk     required with --yes for shell/flagged skills\n` +
      `  --dry-run           show what would happen, don't exec\n` +
      `  --from-local <dir>  run from a local directory (skip fetch)\n` +
      `  --no-color          disable ANSI color\n` +
      `  --json              machine-readable output\n` +
      `  --quiet, -q         suppress non-error output\n\n` +
      `full reference: packages/cli/HELP.md\n`,
  );
}

async function main(): Promise<void> {
  const { verb, rest, flags } = parseFlags(process.argv.slice(2));

  if (!verb) {
    printHelp();
    process.exit(EXIT.OK);
  }

  if (verb === "run") {
    const arg = rest[0];
    if (!arg && !flags.fromLocal) {
      process.stderr.write(
        "error: `run` requires a name or URL\n" +
          "why:   no argument was provided and --from-local was not set.\n" +
          "fix:   try `skillz run github.com/you/my-skill` or `skillz run --from-local ./my-skill`.\n" +
          "more:  https://launchpad.dev/docs/errors/run-needs-arg\n",
      );
      process.exit(EXIT.INPUT);
    }
    const result = await runCommand(arg ?? "", {
      target: "",
      assumeYes: flags.assumeYes,
      acceptRisk: flags.acceptRisk,
      dryRun: flags.dryRun,
      fromLocal: flags.fromLocal,
    });
    process.exit(result.code);
  }

  if (verb === "install") {
    const arg = rest[0];
    if (!arg && !flags.fromLocal) {
      process.stderr.write(
        "error: `install` requires a name or URL\n" +
          "why:   no argument was provided and --from-local was not set.\n" +
          "fix:   try `skillz install github.com/you/my-skill` or `skillz install --from-local ./my-skill`.\n" +
          "more:  https://launchpad.dev/docs/errors/install-needs-arg\n",
      );
      process.exit(EXIT.INPUT);
    }
    const result = await installCommand(arg ?? "", {
      targetRoot: flags.target,
      assumeYes: flags.assumeYes,
      acceptRisk: flags.acceptRisk,
      dryRun: flags.dryRun,
      fromLocal: flags.fromLocal,
    });
    process.exit(result.code);
  }

  if (verb === "uninstall") {
    const arg = rest[0];
    const result = await uninstallCommand(arg ?? "", {
      targetRoot: flags.target,
      assumeYes: flags.assumeYes,
    });
    process.exit(result.code);
  }

  if (verb === "list") {
    const result = await listCommand({
      targetRoot: flags.target,
      json: flags.json,
    });
    process.exit(result.code);
  }

  if (verb === "doctor") {
    const result = await doctorCommand();
    process.exit(result.code);
  }

  if (verb === "init") {
    const name = rest[0];
    const license = flags.license ?? "MIT";
    const author = flags.author ?? process.env.USER ?? "anonymous";
    if (!listCommonLicenses().includes(license)) {
      process.stderr.write(
        `error: --license '${license}' is not in the starter list\n` +
          `why:   skillz init seeds a LICENSE file from a small vetted set.\n` +
          `fix:   use one of: ${listCommonLicenses().join(", ")}.\n` +
          `more:  https://launchpad.dev/docs/errors/init-bad-license\n`,
      );
      process.exit(EXIT.INPUT);
    }
    const result = await initCommand({
      name,
      cwd: process.cwd(),
      openInEditor: !flags.quiet,
      license,
      author,
    });
    process.exit(result.code);
  }

  if (verb === "validate") {
    const skillPath = rest[0] ?? ".";
    const result = await validateCommand({
      skillPath,
      targetTier: flags.tier,
      json: flags.json,
    });
    process.exit(result.code);
  }

  if (verb === "info") {
    const name = rest[0];
    const result = await infoCommand({
      name: name ?? "",
      json: flags.json,
    });
    process.exit(result.code);
  }

  if (verb === "search") {
    const term = rest.join(" ");
    const result = await searchCommand({
      term,
      json: flags.json,
      limit: flags.limit ?? 20,
    });
    process.exit(result.code);
  }

  if (verb === "update") {
    const name = rest[0];
    const result = await updateCommand({
      name,
      targetRoot: flags.target,
      assumeYes: flags.assumeYes,
      acceptRisk: flags.acceptRisk,
      dryRun: flags.dryRun,
    });
    process.exit(result.code);
  }

  if (verb === "cache") {
    const sub = rest[0];
    if (sub !== "clear" && sub !== "show") {
      process.stderr.write(
        `error: \`cache\` requires a subverb\n` +
          `why:   only 'clear' and 'show' are supported.\n` +
          `fix:   try \`skillz cache clear\` or \`skillz cache show\`.\n` +
          `more:  https://launchpad.dev/docs/errors/cache-subverb\n`,
      );
      process.exit(EXIT.INPUT);
    }
    const result = await cacheCommand({ subverb: sub });
    process.exit(result.code);
  }

  process.stderr.write(
    `error: unknown verb '${verb}'\n` +
      `why:   skillz v${VERSION} supports: run, install, uninstall, list, doctor, init, validate.\n` +
      `fix:   run \`skillz --help\` for the full verb list.\n` +
      `more:  https://launchpad.dev/docs/errors/unknown-verb\n`,
  );
  process.exit(EXIT.INPUT);
}

main().catch((e: unknown) => {
  process.stderr.write(
    `error: unexpected internal error\n` +
      `why:   ${e instanceof Error ? e.message : String(e)}\n` +
      `fix:   re-run with --quiet removed to see output, and file an issue if it persists.\n` +
      `more:  https://launchpad.dev/docs/errors/internal\n`,
  );
  process.exit(EXIT.RUNTIME);
});
