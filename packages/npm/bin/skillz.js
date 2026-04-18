#!/usr/bin/env node
// Pure-Node launcher for the compiled skillz binary. No Bun required to run
// this wrapper — only the launched binary is a self-contained Bun compile.

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  resolveBinary,
  missingBinaryHelp,
  unsupportedPlatformHelp,
} = require("../src/launch");

const PACKAGE_ROOT = path.resolve(__dirname, "..");

const resolution = resolveBinary(PACKAGE_ROOT);

switch (resolution.kind) {
  case "unsupported-platform":
    process.stderr.write(unsupportedPlatformHelp(resolution.detail));
    process.exit(2);
    break;

  case "binary-missing":
    process.stderr.write(
      missingBinaryHelp(resolution.target, resolution.binaryPath),
    );
    process.exit(1);
    break;

  case "ok": {
    // Forward argv + signals. stdio: inherit preserves interactive prompts
    // (the y/yes consent flow) and passes through exit codes cleanly.
    const result = spawnSync(resolution.binaryPath, process.argv.slice(2), {
      stdio: "inherit",
      env: process.env,
    });

    if (result.error) {
      // Most commonly this is ENOENT (binary missing) or EACCES (not +x).
      // Both are fatal packaging bugs.
      process.stderr.write(
        `error: could not exec ${resolution.binaryPath}\n` +
          `why:   ${result.error.message}\n` +
          `fix:   reinstall launchpad. If this persists, file an issue with your npm version + OS.\n` +
          `more:  https://launchpad.dev/docs/errors/npm-exec\n`,
      );
      process.exit(1);
    }

    // Signal-driven exit: mirror the child's termination signal in our own
    // exit code (128 + signum convention).
    if (result.signal) {
      const signals = { SIGINT: 2, SIGTERM: 15, SIGHUP: 1, SIGQUIT: 3 };
      const num = signals[result.signal] ?? 15;
      process.exit(128 + num);
    }
    process.exit(result.status ?? 0);
    break;
  }
}
