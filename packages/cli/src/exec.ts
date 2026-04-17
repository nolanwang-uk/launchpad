import { spawn } from "node:child_process";
import { err, EXIT } from "./errors";

export type ExecOpts = {
  cwd: string;
  dryRun: boolean;
};

/**
 * Executes install_commands sequentially in a scrubbed environment (E-S2).
 *
 * We use `env -i PATH=/usr/bin:/bin HOME=$HOME` so that:
 *   - GitHub tokens, cloud creds, and ssh-agent sockets are stripped
 *   - The install shell sees a predictable, minimal environment
 *
 * Each command is run as a single shell string (/bin/sh -c "<cmd>"). This is
 * necessary because install_commands are written as shell one-liners; we'll
 * add AST-level validation in Phase 2 per UC-Eng-2 resolution F3.
 *
 * On the first non-zero exit, we stop and return the error. We do NOT roll
 * back partial state — that's the skill author's problem per ERRORS.md §3.
 */
export async function execCommands(
  commands: readonly string[],
  opts: ExecOpts,
): Promise<void> {
  const scrubbed: NodeJS.ProcessEnv = {
    PATH: "/usr/bin:/bin",
    HOME: process.env.HOME ?? "",
    // Preserve user locale so utf-8 output doesn't break.
    LANG: process.env.LANG ?? "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL ?? "en_US.UTF-8",
    // TMPDIR is standard POSIX; needed by tools like `mktemp`, and used by
    // test fixtures to write scratch output without touching the skill's cwd.
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    // Test hook: when set, propagate a single SKILLZ_TEST_OUT env var so
    // e2e fixtures can write to a test-controlled scratch directory.
    // Not used in production runs (variable is unset).
    ...(process.env.SKILLZ_TEST_OUT
      ? { SKILLZ_TEST_OUT: process.env.SKILLZ_TEST_OUT }
      : {}),
  };

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]!;
    const label = `[${i + 1}/${commands.length}]`;

    if (opts.dryRun) {
      process.stdout.write(`${label} (dry-run) would exec: ${cmd}\n`);
      continue;
    }

    process.stdout.write(`${label} $ ${cmd}\n`);

    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn("/bin/sh", ["-c", cmd], {
        cwd: opts.cwd,
        env: scrubbed,
        stdio: "inherit",
      });
      child.on("exit", (exitCode, signal) => {
        if (signal) resolve(128 + 15); // SIGTERM-ish
        else resolve(exitCode ?? 1);
      });
      child.on("error", (e) => reject(e));
    });

    if (code !== 0) {
      throw err(
        "exec-nonzero",
        `install_command #${i + 1} exited with code ${code}`,
        `the command \`${truncate(cmd, 80)}\` failed inside the scrubbed install shell.`,
        "check the output above. Common causes: missing binary on PATH, permission denied, typo. The skill author must fix skill.yml.",
        EXIT.EXEC_NONZERO,
      );
    }
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
