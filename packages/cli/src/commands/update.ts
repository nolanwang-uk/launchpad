import { listInstalled, type InstallLock } from "../install-lock";
import { loadRegistry } from "../registry";
import { installCommand } from "./install";
import { err, EXIT, isSkillzError, printErr } from "../errors";
import type { Capabilities, RegistryEntry } from "@launchpad/registry";

export type UpdateOpts = {
  name?: string;
  targetRoot?: string;
  registry?: string;
  assumeYes: boolean;
  acceptRisk: boolean;
  dryRun: boolean;
};

export type UpdatePlanItem = {
  name: string;
  reason:
    | "up-to-date"
    | "newer-sha"
    | "not-in-registry"
    | "deprecated"
    | "local-only";
  from_sha: string;
  to_sha?: string;
  capability_diff?: Array<{ key: keyof Capabilities; before: boolean; after: boolean }>;
};

function diffCaps(
  before: Capabilities,
  after: Capabilities,
): Array<{ key: keyof Capabilities; before: boolean; after: boolean }> {
  const keys: Array<keyof Capabilities> = ["network", "filesystem", "shell"];
  const diffs: Array<{ key: keyof Capabilities; before: boolean; after: boolean }> = [];
  for (const k of keys) {
    if (before[k] !== after[k]) diffs.push({ key: k, before: before[k], after: after[k] });
  }
  return diffs;
}

function planFor(
  lock: InstallLock,
  entry: RegistryEntry | undefined,
): UpdatePlanItem {
  if (lock.sha === "local") {
    return {
      name: lock.name,
      reason: "local-only",
      from_sha: "local",
    };
  }
  if (!entry) {
    return {
      name: lock.name,
      reason: "not-in-registry",
      from_sha: lock.sha,
    };
  }
  if (entry.deprecated) {
    return {
      name: lock.name,
      reason: "deprecated",
      from_sha: lock.sha,
      to_sha: entry.sha,
    };
  }
  if (lock.sha === entry.sha) {
    return {
      name: lock.name,
      reason: "up-to-date",
      from_sha: lock.sha,
      to_sha: entry.sha,
    };
  }
  return {
    name: lock.name,
    reason: "newer-sha",
    from_sha: lock.sha,
    to_sha: entry.sha,
    capability_diff: diffCaps(lock.capabilities, entry.capabilities),
  };
}

export async function updateCommand(
  opts: UpdateOpts,
): Promise<{ code: number; plan: UpdatePlanItem[] }> {
  try {
    const installed = await listInstalled(opts.targetRoot);
    if (installed.length === 0) {
      process.stdout.write(
        `no skills installed — nothing to update. try \`skillz install <name>\`.\n`,
      );
      return { code: EXIT.OK, plan: [] };
    }

    const reg = await loadRegistry(opts.registry);
    const byName = new Map(reg.entries.map((e) => [e.name, e]));

    // Filter to the requested subset.
    const targets = opts.name
      ? installed.filter((i) => i.name === opts.name)
      : installed;

    if (opts.name && targets.length === 0) {
      throw err(
        "update-not-installed",
        `'${opts.name}' is not installed`,
        "skillz update <name> can only refresh skills already present in ~/.claude/skills/.",
        "install it first with `skillz install <name>`, or run `skillz list` to see what's installed.",
        EXIT.INPUT,
      );
    }

    const plan: UpdatePlanItem[] = targets.map((lock) =>
      planFor(lock, byName.get(lock.name)),
    );

    // Print the plan
    const pending = plan.filter((p) => p.reason === "newer-sha");
    const skipped = plan.filter((p) => p.reason !== "newer-sha");

    for (const p of skipped) {
      if (p.reason === "up-to-date") {
        process.stdout.write(`  = ${p.name}  up to date (@${p.from_sha.slice(0, 7)})\n`);
      } else if (p.reason === "local-only") {
        process.stdout.write(
          `  - ${p.name}  installed from --from-local; skillz update does not refresh local installs\n`,
        );
      } else if (p.reason === "not-in-registry") {
        process.stdout.write(
          `  - ${p.name}  no longer listed in the registry; leaving in place\n`,
        );
      } else if (p.reason === "deprecated") {
        process.stdout.write(
          `  ⚠ ${p.name}  marked deprecated in the registry (current ${p.from_sha.slice(0, 7)} → ${p.to_sha!.slice(0, 7)}); skipping by default\n`,
        );
      }
    }

    if (pending.length === 0) {
      process.stdout.write(`\nnothing to update.\n`);
      return { code: EXIT.OK, plan };
    }

    process.stdout.write(`\n${pending.length} skill(s) have updates:\n`);
    for (const p of pending) {
      process.stdout.write(
        `  ↑ ${p.name}  ${p.from_sha.slice(0, 7)} → ${p.to_sha!.slice(0, 7)}\n`,
      );
      if (p.capability_diff && p.capability_diff.length > 0) {
        for (const d of p.capability_diff) {
          const marker = !d.before && d.after ? "⚠ NEW" : d.before && !d.after ? "dropped" : "changed";
          process.stdout.write(
            `      ${marker} capability ${String(d.key)}: ${d.before} → ${d.after}\n`,
          );
        }
      }
    }

    if (opts.dryRun) {
      process.stdout.write(`\n(dry-run: not installing anything)\n`);
      return { code: EXIT.OK, plan };
    }

    process.stdout.write(`\n`);

    // Execute the updates. Each is a full `install` flow — diff prompt
    // included, so the user sees the install_commands before they run.
    // DX-13: if capabilities changed, the skill's declared caps are new
    // and the diff prompt reflects that.
    let installedCount = 0;
    for (const p of pending) {
      process.stdout.write(`--- updating ${p.name} ---\n`);
      const result = await installCommand(p.name, {
        targetRoot: opts.targetRoot,
        assumeYes: opts.assumeYes,
        acceptRisk: opts.acceptRisk,
        dryRun: false,
        registry: opts.registry,
      });
      if (result.code !== 0 && !result.abortedByUser) {
        process.stderr.write(
          `✗ failed to update ${p.name} (exit ${result.code}); continuing\n`,
        );
      } else if (!result.abortedByUser) {
        installedCount++;
      }
    }

    process.stdout.write(
      `\n✓ updated ${installedCount} of ${pending.length} skill(s).\n`,
    );
    return { code: EXIT.OK, plan };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code, plan: [] };
    }
    throw e;
  }
}
