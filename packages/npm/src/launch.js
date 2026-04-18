"use strict";
// Pure-Node launcher logic. No TypeScript at publish time — npm consumers
// should not have to install a transpiler. JSDoc types give us editor
// hints + tsc --checkJs can verify them on the source side.

const path = require("node:path");
const fs = require("node:fs");

/**
 * @typedef {"darwin-arm64"|"darwin-x64"|"linux-arm64"|"linux-x64"} Target
 *
 * @typedef {{ platform: NodeJS.Platform, arch: NodeJS.Architecture }} Platform
 *
 * @typedef {{ kind: "ok", target: Target, binaryPath: string }
 *   | { kind: "unsupported-platform", detail: string }
 *   | { kind: "binary-missing", target: Target, binaryPath: string }} Resolution
 */

/** @type {readonly Target[]} */
const SUPPORTED_TARGETS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
];

/**
 * @param {Platform} p
 * @returns {Target | null}
 */
function targetFor(p) {
  if (p.platform === "darwin" && p.arch === "arm64") return "darwin-arm64";
  if (p.platform === "darwin" && p.arch === "x64") return "darwin-x64";
  if (p.platform === "linux" && p.arch === "arm64") return "linux-arm64";
  if (p.platform === "linux" && p.arch === "x64") return "linux-x64";
  return null;
}

/**
 * @param {string} packageRoot
 * @param {Platform} [platform]
 * @returns {Resolution}
 */
function resolveBinary(packageRoot, platform) {
  const p = platform ?? {
    platform: process.platform,
    arch: /** @type {NodeJS.Architecture} */ (process.arch),
  };
  const target = targetFor(p);
  if (!target) {
    return {
      kind: "unsupported-platform",
      detail:
        p.platform + "/" + p.arch +
        " is not in the v1 support matrix. Supported: " +
        SUPPORTED_TARGETS.join(", ") + ".",
    };
  }

  const binaryPath = path.join(packageRoot, "vendor", target, "skillz");
  if (!fs.existsSync(binaryPath)) {
    return { kind: "binary-missing", target, binaryPath };
  }
  return { kind: "ok", target, binaryPath };
}

/**
 * @param {Target} target
 * @param {string} binaryPath
 * @returns {string}
 */
function missingBinaryHelp(target, binaryPath) {
  return (
    "error: the skillz binary for " + target + " is missing from this package\n" +
    "why:   the npm package is corrupted — vendor/" + target +
    "/skillz is not present at " + binaryPath + ".\n" +
    "fix:   reinstall with `npm i -g launchpad@latest`, or download the binary directly from https://github.com/launchpad-skills/launchpad/releases/latest\n" +
    "more:  https://launchpad.dev/docs/errors/npm-corrupt\n"
  );
}

/**
 * @param {string} detail
 * @returns {string}
 */
function unsupportedPlatformHelp(detail) {
  return (
    "error: launchpad does not ship a binary for this platform\n" +
    "why:   " + detail + "\n" +
    "fix:   try WSL on Windows, or track the v2 roadmap for native support: https://launchpad.dev/docs/roadmap\n" +
    "more:  https://launchpad.dev/docs/errors/unsupported-platform\n"
  );
}

module.exports = {
  SUPPORTED_TARGETS,
  targetFor,
  resolveBinary,
  missingBinaryHelp,
  unsupportedPlatformHelp,
};
