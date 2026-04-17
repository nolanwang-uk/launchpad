#!/usr/bin/env bun
import { runCommand } from "./commands/run";
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
      `  run <name|url>      fetch & execute one-shot in temp dir (primary)\n` +
      `  install <name|url>  fetch & copy into ~/.claude/skills/<name>/   [planned]\n` +
      `  doctor              environment preflight                        [planned]\n\n` +
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

  process.stderr.write(
    `error: unknown verb '${verb}'\n` +
      `why:   skillz v${VERSION} supports: run (v1), install/doctor (planned).\n` +
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
