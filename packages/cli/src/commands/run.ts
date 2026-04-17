import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseRepoArg, fetchAndExtract, cleanupExtracted } from "../fetch";
import { parseManifest } from "../manifest";
import { renderDiff, type Tier } from "../diff";
import { askConsent } from "../prompt";
import { execCommands } from "../exec";
import { err, EXIT, isSkillzError, printErr } from "../errors";

export type RunOpts = {
  target: string; // "run" uses a temp dir; "install" uses this path
  assumeYes: boolean;
  acceptRisk: boolean;
  dryRun: boolean;
  fromLocal?: string;
  // Tier is passed in once Phase 2 adds registry resolution. For Phase 1,
  // local/URL skills default to Community.
  tierOverride?: Tier;
};

export type RunResult = {
  code: number;
  abortedByUser?: boolean;
};

/**
 * `skillz run <name|url>` — fetches, shows diff, prompts, executes one-shot
 * in a temp dir. The resolved extractDir is cleaned up on every exit path.
 */
export async function runCommand(
  arg: string,
  opts: RunOpts,
): Promise<RunResult> {
  let extractDir: string | undefined;
  let tmpRootForLocalCopy: string | undefined;

  const cleanup = async () => {
    if (extractDir && !opts.fromLocal) {
      await cleanupExtracted(extractDir);
    }
    if (tmpRootForLocalCopy) {
      await fs
        .rm(tmpRootForLocalCopy, { recursive: true, force: true })
        .catch(() => {});
    }
  };

  // Wire SIGINT to clean up and exit.
  const onSig = () => {
    cleanup().finally(() => process.exit(EXIT.SIGNAL));
  };
  process.once("SIGINT", onSig);
  process.once("SIGTERM", onSig);

  try {
    if (opts.fromLocal) {
      extractDir = path.resolve(opts.fromLocal);
      const stat = await fs.stat(extractDir).catch(() => null);
      if (!stat?.isDirectory()) {
        throw err(
          "local-not-dir",
          "--from-local path is not a directory",
          `expected a directory containing skill.yml, got: '${extractDir}'.`,
          "pass a path to a directory, e.g. `skillz run --from-local ./my-skill`.",
          EXIT.INPUT,
        );
      }
    } else {
      const ref = parseRepoArg(arg);
      extractDir = await fetchAndExtract(ref);
    }

    const manifestPath = path.join(extractDir, "skill.yml");
    const yamlText = await fs.readFile(manifestPath, "utf-8").catch(() => {
      throw err(
        "no-manifest",
        "skill.yml not found at the archive root",
        `expected ${manifestPath} to exist.`,
        "the skill author must include skill.yml at the repo root.",
        EXIT.INPUT,
      );
    });

    const manifest = parseManifest(yamlText, manifestPath);
    const tier: Tier = opts.tierOverride ?? "Community";

    const diff = await renderDiff(manifest, tier, extractDir);
    process.stdout.write(diff.text);

    if (opts.dryRun) {
      process.stdout.write("\n(dry-run: skipping prompt and exec)\n");
      return { code: EXIT.OK };
    }

    const consent = await askConsent({
      requireFullYes: diff.requireFullYes,
      assumeYes: opts.assumeYes,
      acceptRisk: opts.acceptRisk,
    });
    if (consent === "abort") {
      process.stdout.write("\naborted.\n");
      return { code: EXIT.OK, abortedByUser: true };
    }

    await execCommands(manifest.install_commands, {
      cwd: extractDir,
      dryRun: false,
    });

    return { code: EXIT.OK };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code };
    }
    throw e;
  } finally {
    process.removeListener("SIGINT", onSig);
    process.removeListener("SIGTERM", onSig);
    await cleanup();
  }
}
