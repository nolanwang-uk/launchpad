import { describe, test, expect } from "bun:test";
import { isValidSha40, assertValidSha40 } from "../src/sha";
import { isSkillzError } from "../src/errors";

describe("sha", () => {
  describe("isValidSha40", () => {
    test("accepts a 40-char lowercase hex string", () => {
      expect(isValidSha40("a".repeat(40))).toBe(true);
      expect(isValidSha40("0123456789abcdef0123456789abcdef01234567")).toBe(
        true,
      );
    });

    test("rejects branch and tag names", () => {
      expect(isValidSha40("main")).toBe(false);
      expect(isValidSha40("v1.0.0")).toBe(false);
      expect(isValidSha40("HEAD")).toBe(false);
    });

    test("rejects short SHAs (7 chars, 12 chars)", () => {
      expect(isValidSha40("abcdef1")).toBe(false);
      expect(isValidSha40("abcdef123456")).toBe(false);
    });

    test("rejects uppercase hex (SHAs are canonically lowercase)", () => {
      expect(isValidSha40("A".repeat(40))).toBe(false);
    });

    test("rejects 41- and 39-char strings", () => {
      expect(isValidSha40("a".repeat(41))).toBe(false);
      expect(isValidSha40("a".repeat(39))).toBe(false);
    });

    test("rejects non-hex chars", () => {
      expect(isValidSha40("g".repeat(40))).toBe(false);
      expect(isValidSha40("a".repeat(39) + " ")).toBe(false);
    });

    test("rejects empty and whitespace-only", () => {
      expect(isValidSha40("")).toBe(false);
      expect(isValidSha40(" ".repeat(40))).toBe(false);
    });
  });

  describe("assertValidSha40", () => {
    test("does not throw on a valid SHA", () => {
      expect(() => assertValidSha40("a".repeat(40), "test")).not.toThrow();
    });

    test("throws a SkillzError with security exit code on an invalid SHA", () => {
      try {
        assertValidSha40("main", "test context");
        throw new Error("expected assertValidSha40 to throw");
      } catch (e) {
        expect(isSkillzError(e)).toBe(true);
        if (isSkillzError(e)) {
          expect(e.code).toBe(4); // EXIT.SECURITY
          expect(e.short).toContain("sha");
          expect(e.why).toContain("test context");
        }
      }
    });
  });
});
