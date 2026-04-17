import * as fs from "node:fs/promises";
import { err, EXIT, isSkillzError, printErr } from "../errors";
import { readLock, skillDir } from "../install-lock";

export type UninstallOpts = {
  targetRoot?: string;
  assumeYes: boolean;
};

export type UninstallResult = {
  code: number;
  abortedByUser?: boolean;
};

export async function uninstallCommand(
  name: string,
  opts: UninstallOpts,
): Promise<UninstallResult> {
  try {
    if (!name) {
      throw err(
        "uninstall-needs-name",
        "`uninstall` requires a skill name",
        "no argument was provided.",
        "try `skillz uninstall <name>`. Run `skillz list` to see installed skills.",
        EXIT.INPUT,
      );
    }

    const target = skillDir(name, opts.targetRoot);
    const lock = await readLock(target);

    if (!lock) {
      throw err(
        "not-installed",
        `no installed skill found at ${target}`,
        "either the skill was never installed, or its .skillz-lock.json is missing.",
        "run `skillz list` to see what's actually installed.",
        EXIT.INPUT,
      );
    }

    // Refuse to rm anything that doesn't look like our install target.
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isDirectory()) {
      throw err(
        "target-not-dir",
        `expected ${target} to be a directory`,
        "the path exists but is not a directory. skillz will not rm files outside its install model.",
        "manually clean up and retry.",
        EXIT.RUNTIME,
      );
    }

    process.stdout.write(
      `removing ${target} (installed at ${lock.installed_at}, sha ${lock.sha.slice(0, 7)})\n`,
    );

    if (!opts.assumeYes) {
      const { askConsent } = await import("../prompt");
      const consent = await askConsent({
        requireFullYes: false,
        assumeYes: false,
        acceptRisk: false,
      });
      if (consent === "abort") {
        process.stdout.write("aborted.\n");
        return { code: EXIT.OK, abortedByUser: true };
      }
    }

    await fs.rm(target, { recursive: true, force: true });
    process.stdout.write(`✓ uninstalled ${name}\n`);
    return { code: EXIT.OK };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code };
    }
    throw e;
  }
}
