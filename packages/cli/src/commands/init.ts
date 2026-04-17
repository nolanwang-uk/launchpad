import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { err, EXIT, isSkillzError, printErr } from "../errors";

export type InitOpts = {
  name?: string;
  cwd: string;
  openInEditor: boolean;
  license: string; // SPDX identifier
  author: string;
};

// A small, defensible SPDX allowlist. Broader list stays tractable via the
// registry validator. The author can edit the yaml later to anything SPDX.
const COMMON_LICENSES = [
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "ISC",
  "GPL-3.0-only",
  "MPL-2.0",
  "CC0-1.0",
];

export function listCommonLicenses(): readonly string[] {
  return COMMON_LICENSES;
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const SKILL_YAML_TEMPLATE = (name: string, author: string, license: string) => `\
# Launchpad skill manifest.
# Run \`skillz validate .\` locally before submitting a registry PR.
# Full schema: https://launchpad.dev/docs/skill-yml

schema_version: 1

name: ${name}
version: 0.1.0
description: One-line summary of what your skill does.
author: ${author}
license: ${license}

# v1 targets: only 'claude-code'. Leave the array in place — adding
# 'cursor' etc. is how cross-agent support will be negotiated in v2.
targets:
  - claude-code

# Author-declared capabilities. Shown in the gallery as metadata.
# The runtime does not enforce these in v1 — sandboxing ships in v2.
# Declare honestly; capability diffs will be shown on update.
capabilities:
  network: false
  filesystem: true  # almost every skill writes into ~/.claude/skills/<name>
  shell: false      # set true if your install_commands invoke a shell script

# Files to copy into ~/.claude/skills/<name>/. Relative paths from skill root.
files:
  - SKILL.md

# Install commands. Reviewed-tier requires a closed grammar:
#   mkdir, cp, mv, chmod, ln, echo > <path>
# Community-tier can use arbitrary shell if 'capabilities.shell: true'
# is declared above. skillz validate will tell you which tier you're
# eligible for.
install_commands:
  - mkdir -p $HOME/.claude/skills/${name}
  - cp SKILL.md $HOME/.claude/skills/${name}/
`;

const SKILL_MD_TEMPLATE = (name: string) => `# ${name}

One-paragraph description: what does this skill do, who is it for, and what
does it look like in use?

## Example

Describe a concrete moment where this skill pays off. Quote the input, show
the output. The README is what installers read before typing \`yes\`.

## What it does

- ...
- ...
`;

const GITIGNORE_TEMPLATE = `node_modules/
dist/
.DS_Store
*.log
`;

export async function initCommand(opts: InitOpts): Promise<{ code: number }> {
  try {
    const name = opts.name?.trim();
    if (!name) {
      throw err(
        "init-needs-name",
        "`init` requires a skill name",
        "a name is needed so skillz knows what folder to create and what to seed in skill.yml.",
        "try `skillz init my-cool-skill`.",
        EXIT.INPUT,
      );
    }
    if (!NAME_RE.test(name)) {
      throw err(
        "init-bad-name",
        "skill name must be lowercase kebab-case",
        `got '${name}'. Names must match ${NAME_RE.toString()}.`,
        "try a name like 'my-cool-skill' (lowercase, hyphens, 1-64 chars).",
        EXIT.INPUT,
      );
    }

    if (!COMMON_LICENSES.includes(opts.license)) {
      throw err(
        "init-bad-license",
        `'${opts.license}' is not in the starter license list`,
        `skillz init accepts: ${COMMON_LICENSES.join(", ")}. You can edit skill.yml after init to any SPDX identifier.`,
        `re-run with --license <one-of-the-above>.`,
        EXIT.INPUT,
      );
    }

    const target = path.resolve(opts.cwd, name);
    const exists = await fs
      .stat(target)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      throw err(
        "init-dir-exists",
        `${target} already exists`,
        "skillz init refuses to write into an existing directory.",
        "remove the directory or pick a different name.",
        EXIT.INPUT,
      );
    }

    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(
      path.join(target, "skill.yml"),
      SKILL_YAML_TEMPLATE(name, opts.author, opts.license),
      "utf-8",
    );
    await fs.writeFile(
      path.join(target, "SKILL.md"),
      SKILL_MD_TEMPLATE(name),
      "utf-8",
    );
    await fs.writeFile(
      path.join(target, ".gitignore"),
      GITIGNORE_TEMPLATE,
      "utf-8",
    );
    // Write a LICENSE stub that points at the chosen SPDX identifier.
    await fs.writeFile(
      path.join(target, "LICENSE"),
      `This project is licensed under ${opts.license}.\nSee https://spdx.org/licenses/${opts.license}.html for the full text.\n`,
      "utf-8",
    );

    process.stdout.write(`\n✓ scaffolded '${name}' at ${target}\n\n`);
    process.stdout.write(`  next:\n`);
    process.stdout.write(`    cd ${name}\n`);
    process.stdout.write(`    $EDITOR skill.yml    # fill out description, install_commands\n`);
    process.stdout.write(`    skillz validate .   # local check before submitting\n`);
    process.stdout.write(`    skillz run --from-local .   # try it on your own machine\n\n`);

    if (opts.openInEditor && process.env.EDITOR) {
      // Fire and forget; don't block the command. Users can always edit later.
      const editor = process.env.EDITOR;
      const child = spawn(editor, [path.join(target, "skill.yml")], {
        stdio: "inherit",
        detached: true,
      });
      child.unref();
    }

    return { code: EXIT.OK };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code };
    }
    throw e;
  }
}
