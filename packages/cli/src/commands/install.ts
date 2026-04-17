import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  parseRepoArg,
  fetchAndExtract,
  cleanupExtracted,
  makeRepoRef,
  type RepoRef,
} from "../fetch";
import { parseManifest } from "../manifest";
import { renderDiff, type Tier } from "../diff";
import { askConsent } from "../prompt";
import { execCommands } from "../exec";
import { err, EXIT, isSkillzError, printErr } from "../errors";
import { makeLock, skillDir, writeLock } from "../install-lock";
import { resolveShortName, looksLikeShortName } from "../registry";

export type InstallOpts = {
  targetRoot?: string; // override ~/.claude/skills
  assumeYes: boolean;
  acceptRisk: boolean;
  dryRun: boolean;
  fromLocal?: string;
  tierOverride?: Tier;
  registry?: string;
};

export type InstallResult = {
  code: number;
  installedTo?: string;
  abortedByUser?: boolean;
};

/**
 * `skillz install <name|url>` — same consent flow as `run`, but instead of
 * executing one-shot in a temp dir, we:
 *   1. Compute target = <skillsRoot>/<manifest.name>/
 *   2. Copy `files[]` from the archive into the target
 *   3. Run install_commands with cwd=target (so relative paths in commands
 *      like `chmod +x bin/setup.sh` work after copy)
 *   4. Write a .skillz-lock.json to the target (for `list` and `update`)
 */
export async function installCommand(
  arg: string,
  opts: InstallOpts,
): Promise<InstallResult> {
  let extractDir: string | undefined;
  let sourceUrl: string | null = null;
  let sha = "";

  const cleanup = async () => {
    if (extractDir && !opts.fromLocal) {
      await cleanupExtracted(extractDir);
    }
  };

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
          "pass a path to a directory, e.g. `skillz install --from-local ./my-skill`.",
          EXIT.INPUT,
        );
      }
      sourceUrl = "local";
      sha = "local";
    } else {
      let ref: RepoRef;
      if (looksLikeShortName(arg)) {
        const resolved = await resolveShortName(arg, opts.registry);
        ref = makeRepoRef(resolved.owner, resolved.repoName, resolved.sha);
        opts.tierOverride ??= resolved.tier;
      } else {
        ref = parseRepoArg(arg);
      }
      sourceUrl = `github.com/${ref.owner}/${ref.name}@${ref.sha}`;
      sha = ref.sha;
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
    process.stdout.write(
      `\ntarget: ${skillDir(manifest.name, opts.targetRoot)}\n`,
    );

    if (opts.dryRun) {
      process.stdout.write("\n(dry-run: skipping prompt, copy, and exec)\n");
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

    const target = skillDir(manifest.name, opts.targetRoot);
    await fs.mkdir(target, { recursive: true });

    // Copy files[] from the archive into the target dir.
    for (const f of manifest.files) {
      const src = path.join(extractDir, f);
      const dst = path.join(target, f);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }

    // Run install_commands with cwd=target. This matches the typical shape
    // where install_commands operate on the freshly-copied tree.
    await execCommands(manifest.install_commands, {
      cwd: target,
      dryRun: false,
    });

    await writeLock(target, makeLock({ manifest, sha, sourceUrl }));

    process.stdout.write(`\n✓ installed to ${target}\n`);
    return { code: EXIT.OK, installedTo: target };
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
