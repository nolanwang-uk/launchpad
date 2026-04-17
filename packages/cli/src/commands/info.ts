import { loadRegistry, resolveShortName } from "../registry";
import { err, EXIT, isSkillzError, printErr } from "../errors";

export type InfoOpts = {
  name: string;
  registry?: string;
  json: boolean;
};

export async function infoCommand(
  opts: InfoOpts,
): Promise<{ code: number }> {
  try {
    if (!opts.name) {
      throw err(
        "info-needs-name",
        "`info` requires a skill name",
        "no argument was provided.",
        "try `skillz info <name>`. Run `skillz search <term>` to browse available skills.",
        EXIT.INPUT,
      );
    }

    // Pull the raw entry (not just the resolved minimal shape) so we can
    // print description, tags, added_at, etc.
    const reg = await loadRegistry(opts.registry);
    const entry = reg.entries.find((e) => e.name === opts.name);
    if (!entry) {
      // Use resolveShortName to reuse its friendly not-found error.
      await resolveShortName(opts.name, opts.registry);
      return { code: EXIT.RUNTIME };
    }

    if (opts.json) {
      process.stdout.write(JSON.stringify(entry, null, 2) + "\n");
      return { code: EXIT.OK };
    }

    const repoUrl = `https://github.com/${entry.repo}/tree/${entry.sha}`;

    process.stdout.write(
      `${entry.name}  ${entry.tier === "Reviewed" ? "[Reviewed]" : "[Community]"}  @${entry.sha.slice(0, 7)}\n`,
    );
    process.stdout.write(`  by ${entry.author}  ·  ${entry.license}\n\n`);
    process.stdout.write(`  ${entry.description}\n\n`);
    process.stdout.write(`  source:       ${repoUrl}\n`);
    process.stdout.write(`  sha:          ${entry.sha}\n`);
    process.stdout.write(
      `  capabilities: network=${entry.capabilities.network}  filesystem=${entry.capabilities.filesystem}  shell=${entry.capabilities.shell}\n`,
    );
    process.stdout.write(
      `                (author-declared, not enforced at runtime in v1)\n`,
    );
    process.stdout.write(
      `  targets:      ${entry.targets.join(", ")}\n`,
    );
    if (entry.tags.length > 0) {
      process.stdout.write(`  tags:         ${entry.tags.join(", ")}\n`);
    }
    process.stdout.write(`  added:        ${entry.added_at.slice(0, 10)}\n`);
    if (entry.deprecated) {
      process.stdout.write(`  \n  ⚠ deprecated\n`);
    }
    process.stdout.write(`\n`);
    process.stdout.write(`  run once:     skillz run ${entry.name}\n`);
    process.stdout.write(`  install:      skillz install ${entry.name}\n`);

    return { code: EXIT.OK };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code };
    }
    throw e;
  }
}
