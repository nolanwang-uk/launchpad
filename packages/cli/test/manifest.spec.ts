import { describe, test, expect } from "bun:test";
import { parseManifest } from "../src/manifest";
import { isSkillzError } from "../src/errors";

const VALID = `
schema_version: 1
name: awesome-refactor
version: 0.3.1
description: One-line summary.
author: nolan
license: MIT
targets:
  - claude-code
capabilities:
  network: false
  filesystem: true
  shell: false
files:
  - SKILL.md
install_commands:
  - mkdir -p ~/.claude/skills/awesome-refactor
  - cp SKILL.md ~/.claude/skills/awesome-refactor/
`;

describe("manifest", () => {
  test("parses a valid manifest", () => {
    const m = parseManifest(VALID, "test:skill.yml");
    expect(m.name).toBe("awesome-refactor");
    expect(m.version).toBe("0.3.1");
    expect(m.schema_version).toBe(1);
    expect(m.capabilities.shell).toBe(false);
    expect(m.targets).toEqual(["claude-code"]);
    expect(m.install_commands).toHaveLength(2);
  });

  test("rejects wrong schema_version with actionable error", () => {
    const bad = VALID.replace("schema_version: 1", "schema_version: 99");
    try {
      parseManifest(bad, "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("schema_version");
        expect(e.fix).toMatch(/upgrade skillz|downgrade the manifest/);
      }
    }
  });

  test("rejects missing required field", () => {
    const bad = VALID.replace("license: MIT\n", "");
    try {
      parseManifest(bad, "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("license");
      }
    }
  });

  test("rejects invalid name (uppercase, spaces)", () => {
    const bad = VALID.replace(
      "name: awesome-refactor",
      "name: AwesomeRefactor",
    );
    try {
      parseManifest(bad, "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("kebab-case");
      }
    }
  });

  test("rejects empty targets array", () => {
    const bad = VALID.replace(/targets:\n  - claude-code/, "targets: []");
    try {
      parseManifest(bad, "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("targets");
      }
    }
  });

  test("rejects non-boolean capability", () => {
    const bad = VALID.replace(
      "  network: false",
      '  network: "no"',
    );
    try {
      parseManifest(bad, "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("true or false");
      }
    }
  });

  test("rejects malformed YAML", () => {
    try {
      parseManifest("schema_version: 1\n  bad: : indent", "test:skill.yml");
      throw new Error("expected parseManifest to throw");
    } catch (e) {
      expect(isSkillzError(e)).toBe(true);
      if (isSkillzError(e)) {
        expect(e.short).toContain("YAML");
      }
    }
  });
});
