import { describe, test, expect } from "bun:test";
import {
  escapeHtml,
  truncate,
  renderOgHtml,
  OG_WIDTH,
  OG_HEIGHT,
} from "../src/template";
import type { RegistryEntry } from "@launchpad/registry";

const ENTRY: RegistryEntry = {
  schema_version: 1,
  name: "hello-world",
  description: "A tiny test skill.",
  author: "launchpad-seed",
  license: "MIT",
  repo: "launchpad-skills/hello-world",
  sha: "0123456789abcdef0123456789abcdef01234567",
  tier: "Reviewed",
  targets: ["claude-code"],
  capabilities: { network: false, filesystem: true, shell: false },
  tags: ["example", "seed"],
  added_at: "2026-04-17T00:00:00Z",
};

describe("escapeHtml", () => {
  test("escapes the five standard entities", () => {
    expect(escapeHtml(`<script>alert("xss" & 'yes')</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;yes&#39;)&lt;/script&gt;",
    );
  });

  test("handles empty and plain input", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml("just a normal string")).toBe("just a normal string");
  });
});

describe("truncate", () => {
  test("returns input unchanged when under the limit", () => {
    expect(truncate("short", 20)).toBe("short");
  });

  test("truncates with an ellipsis at a word boundary when possible", () => {
    const input = "the quick brown fox jumps over the lazy dog";
    const result = truncate(input, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("foxxx");
  });

  test("falls back to hard cut when no good word boundary exists", () => {
    const input = "supercalifragilisticexpialidocious";
    const result = truncate(input, 10);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe("renderOgHtml", () => {
  test("returns a full HTML document", () => {
    const html = renderOgHtml(ENTRY);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  test("includes skill name, description, and install command", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("hello-world");
    expect(html).toContain("A tiny test skill.");
    expect(html).toContain("npx launchpad run hello-world");
  });

  test("encodes the Reviewed tier with the check glyph", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("Reviewed");
    expect(html).toContain('class="tier reviewed"');
    // Reviewed tier uses the checkmark path
    expect(html).toContain("M13 4L6 11.5L3 8.5");
  });

  test("switches to Community styling + branch glyph when tier is Community", () => {
    const community: RegistryEntry = { ...ENTRY, tier: "Community" };
    const html = renderOgHtml(community);
    expect(html).toContain('class="tier community"');
    expect(html).toContain("Community");
    // Branch glyph uses circles, not a checkmark
    expect(html).not.toContain("M13 4L6 11.5L3 8.5");
  });

  test("includes the author's name and license + short SHA", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("by launchpad-seed");
    expect(html).toContain("MIT");
    expect(html).toContain("@0123456");
  });

  test("renders tag line when tags exist", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("example");
    expect(html).toContain("seed");
  });

  test("skips tag line block when tags are empty", () => {
    const noTags: RegistryEntry = { ...ENTRY, tags: [] };
    const html = renderOgHtml(noTags);
    expect(html).not.toContain('class="tags"');
  });

  test("escapes hostile content in description", () => {
    const hostile: RegistryEntry = {
      ...ENTRY,
      description: `<script>alert("xss")</script>`,
    };
    const html = renderOgHtml(hostile);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  test("truncates long descriptions to fit the card", () => {
    const long: RegistryEntry = {
      ...ENTRY,
      description: "a".repeat(500),
    };
    const html = renderOgHtml(long);
    expect(html).toContain("…");
    // The raw 500-a string should not appear verbatim.
    expect(html).not.toContain("a".repeat(200));
  });

  test("exports the 1200x630 OG spec", () => {
    expect(OG_WIDTH).toBe(1200);
    expect(OG_HEIGHT).toBe(630);
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("width: 1200px");
    expect(html).toContain("height: 630px");
  });
});
