import { listInstalled, defaultSkillsDir } from "../install-lock";
import { EXIT } from "../errors";

export type ListOpts = {
  targetRoot?: string;
  json: boolean;
};

export async function listCommand(opts: ListOpts): Promise<{ code: number }> {
  const installs = await listInstalled(opts.targetRoot);

  if (opts.json) {
    process.stdout.write(JSON.stringify(installs, null, 2) + "\n");
    return { code: EXIT.OK };
  }

  const root = opts.targetRoot ?? defaultSkillsDir();
  if (installs.length === 0) {
    process.stdout.write(
      `no skills installed under ${root}\n` +
        `try \`skillz install <name>\` to install one.\n`,
    );
    return { code: EXIT.OK };
  }

  const nameWidth = Math.max(
    12,
    ...installs.map((i) => i.name.length),
  );
  const versionWidth = Math.max(
    7,
    ...installs.map((i) => i.version.length),
  );

  process.stdout.write(
    `${"NAME".padEnd(nameWidth)}  ` +
      `${"VERSION".padEnd(versionWidth)}  ` +
      `SHA      ` +
      `INSTALLED\n`,
  );
  for (const i of installs) {
    const sha = i.sha === "local" ? "local  " : i.sha.slice(0, 7);
    process.stdout.write(
      `${i.name.padEnd(nameWidth)}  ` +
        `${i.version.padEnd(versionWidth)}  ` +
        `${sha}  ` +
        `${i.installed_at.slice(0, 10)}\n`,
    );
  }
  process.stdout.write(`\n(root: ${root})\n`);
  return { code: EXIT.OK };
}
