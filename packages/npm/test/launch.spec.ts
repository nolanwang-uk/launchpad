import { describe, test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// CommonJS interop — the source is plain .js so we require() it.
// Bun's test runner handles this transparently.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const launch = require("../src/launch");

describe("targetFor", () => {
  test("maps darwin-arm64", () => {
    expect(launch.targetFor({ platform: "darwin", arch: "arm64" })).toBe(
      "darwin-arm64",
    );
  });
  test("maps darwin-x64", () => {
    expect(launch.targetFor({ platform: "darwin", arch: "x64" })).toBe(
      "darwin-x64",
    );
  });
  test("maps linux-arm64", () => {
    expect(launch.targetFor({ platform: "linux", arch: "arm64" })).toBe(
      "linux-arm64",
    );
  });
  test("maps linux-x64", () => {
    expect(launch.targetFor({ platform: "linux", arch: "x64" })).toBe(
      "linux-x64",
    );
  });
  test("returns null for Windows", () => {
    expect(launch.targetFor({ platform: "win32", arch: "x64" })).toBeNull();
  });
  test("returns null for Linux ia32", () => {
    expect(launch.targetFor({ platform: "linux", arch: "ia32" })).toBeNull();
  });
  test("returns null for mipsel", () => {
    expect(launch.targetFor({ platform: "linux", arch: "mips" })).toBeNull();
  });
});

describe("SUPPORTED_TARGETS", () => {
  test("includes exactly the 4 v1 targets", () => {
    expect(launch.SUPPORTED_TARGETS).toEqual([
      "darwin-arm64",
      "darwin-x64",
      "linux-arm64",
      "linux-x64",
    ]);
  });
});

describe("resolveBinary", () => {
  async function mkRoot(withBinaryFor?: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "skillz-npm-test-"));
    if (withBinaryFor) {
      const bdir = path.join(dir, "vendor", withBinaryFor);
      await fs.mkdir(bdir, { recursive: true });
      await fs.writeFile(path.join(bdir, "skillz"), "#!/bin/sh\necho stub\n");
    }
    return dir;
  }

  test("returns 'ok' when the binary exists for the host target", async () => {
    const dir = await mkRoot("darwin-arm64");
    try {
      const r = launch.resolveBinary(dir, {
        platform: "darwin",
        arch: "arm64",
      });
      expect(r.kind).toBe("ok");
      if (r.kind === "ok") {
        expect(r.target).toBe("darwin-arm64");
        expect(r.binaryPath).toContain("vendor/darwin-arm64/skillz");
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("returns 'binary-missing' when vendor/<target>/skillz is absent", async () => {
    const dir = await mkRoot(); // no binary
    try {
      const r = launch.resolveBinary(dir, {
        platform: "linux",
        arch: "x64",
      });
      expect(r.kind).toBe("binary-missing");
      if (r.kind === "binary-missing") {
        expect(r.target).toBe("linux-x64");
        expect(r.binaryPath).toContain("vendor/linux-x64/skillz");
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("returns 'unsupported-platform' on Windows", async () => {
    const dir = await mkRoot("darwin-arm64");
    try {
      const r = launch.resolveBinary(dir, {
        platform: "win32",
        arch: "x64",
      });
      expect(r.kind).toBe("unsupported-platform");
      if (r.kind === "unsupported-platform") {
        expect(r.detail).toContain("win32");
        expect(r.detail).toContain("Supported:");
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("help messages", () => {
  test("missingBinaryHelp mentions the target and the path", () => {
    const msg = launch.missingBinaryHelp("linux-x64", "/some/path/skillz");
    expect(msg).toContain("linux-x64");
    expect(msg).toContain("/some/path/skillz");
    expect(msg).toContain("reinstall");
  });

  test("unsupportedPlatformHelp includes the detail string", () => {
    const msg = launch.unsupportedPlatformHelp(
      "win32/x64 is not supported",
    );
    expect(msg).toContain("win32/x64");
    expect(msg).toContain("WSL");
  });
});
