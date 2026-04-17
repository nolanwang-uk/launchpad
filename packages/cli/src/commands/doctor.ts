import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { EXIT } from "../errors";
import { defaultSkillsDir } from "../install-lock";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  critical: boolean;
};

async function checkBinary(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, ["--version"], { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function checkNetwork(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    const res = await fetch(url, { method: "HEAD", signal: ctl.signal });
    clearTimeout(t);
    return { ok: res.ok || res.status < 500, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export async function doctorCommand(): Promise<{ code: number }> {
  const checks: Check[] = [];

  // HOME + skills dir
  const home = process.env.HOME;
  const skillsRoot = defaultSkillsDir();
  checks.push({
    name: "$HOME set",
    ok: !!home,
    detail: home ? home : "HOME is unset; install and uninstall will fail",
    critical: true,
  });

  try {
    await fs.mkdir(skillsRoot, { recursive: true });
    const testFile = path.join(skillsRoot, `.skillz-doctor-${process.pid}`);
    await fs.writeFile(testFile, "ok");
    await fs.rm(testFile);
    checks.push({
      name: "skills dir writable",
      ok: true,
      detail: skillsRoot,
      critical: true,
    });
  } catch (e) {
    checks.push({
      name: "skills dir writable",
      ok: false,
      detail: `${skillsRoot} — ${e instanceof Error ? e.message : String(e)}`,
      critical: true,
    });
  }

  // POSIX tools
  const tar = await checkBinary("tar");
  checks.push({
    name: "tar on PATH",
    ok: tar,
    detail: tar ? "available" : "install with `brew install gnu-tar` on macOS",
    critical: true,
  });

  const sh = await checkBinary("/bin/sh");
  checks.push({
    name: "/bin/sh available",
    ok: sh,
    detail: sh ? "available" : "install_commands exec requires /bin/sh",
    critical: true,
  });

  // Runtime
  const bunOk = typeof Bun !== "undefined";
  checks.push({
    name: "bun runtime",
    ok: bunOk,
    detail: bunOk ? `bun ${Bun.version}` : "skillz is built on Bun",
    critical: false,
  });

  // Network
  const net = await checkNetwork("https://codeload.github.com");
  checks.push({
    name: "reach codeload.github.com",
    ok: net.ok,
    detail: net.ok ? `${net.ms}ms` : "check your network / proxy",
    critical: false,
  });

  // Rendering
  let allOk = true;
  for (const c of checks) {
    const glyph = c.ok ? "✓" : c.critical ? "✗" : "⚠";
    process.stdout.write(`${glyph} ${c.name.padEnd(28)}  ${c.detail}\n`);
    if (!c.ok && c.critical) allOk = false;
  }

  if (!allOk) {
    process.stdout.write(
      `\nsome critical checks failed — skillz will not operate correctly.\n`,
    );
    return { code: EXIT.RUNTIME };
  }

  process.stdout.write(`\nall critical checks passed.\n`);
  return { code: EXIT.OK };
}
