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
  author: "Launchpad Editorial",
  author_credential: "Seed skill maintained by the Launchpad editorial team.",
  domain: "general",
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

  test("includes skill name and description", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("hello-world");
    expect(html).toContain("A tiny test skill.");
  });

  test("renders the masthead wordmark + practitioners-exchange tag", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("Launchpad");
    expect(html).toContain("Practitioners");
  });

  test("encodes the Reviewed tier as Verified with the seal glyph", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("Verified");
    expect(html).toContain('class="tier reviewed"');
    // Seal glyph uses a concentric circle with an inner tick.
    expect(html).toContain('<circle cx="8" cy="8" r="6"');
    expect(html).toContain("M5.5 8.25L7.25 10L10.5 6.5");
  });

  test("switches to Community styling + dot glyph when tier is Community", () => {
    const community: RegistryEntry = { ...ENTRY, tier: "Community" };
    const html = renderOgHtml(community);
    expect(html).toContain('class="tier community"');
    expect(html).toContain("Community");
    // Community uses the solid filled dot, not the seal tick.
    expect(html).toContain('<circle cx="8" cy="8" r="2.5" fill="currentColor"');
    expect(html).not.toContain("M5.5 8.25L7.25 10L10.5 6.5");
  });

  test("renders the byline block with initials + author + credential", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("Practitioner");
    expect(html).toContain("Launchpad Editorial");
    expect(html).toContain("LE"); // initials from "Launchpad Editorial"
    expect(html).toContain("Seed skill maintained by the Launchpad editorial team.");
  });

  test("renders the meta row with domain, license, and short SHA", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("general");
    expect(html).toContain("MIT");
    expect(html).toContain("@0123456");
  });

  test("renders the canonical URL for the entry in the byline footer", () => {
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("launchpad.dev/s/hello-world");
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

  test("omits credential span when author_credential is absent", () => {
    const nocred: RegistryEntry = { ...ENTRY, author_credential: undefined };
    const html = renderOgHtml(nocred);
    // The CSS rule is always present, but the span rendering should be gone.
    expect(html).not.toContain('<span class="byline-credential">');
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

  test("escapes hostile content in author name + credential", () => {
    const hostile: RegistryEntry = {
      ...ENTRY,
      author: `<b>pwn</b>`,
      author_credential: `<img src=x onerror=alert(1)>`,
    };
    const html = renderOgHtml(hostile);
    expect(html).not.toContain("<b>pwn</b>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;b&gt;pwn&lt;/b&gt;");
  });

  test("truncates long descriptions to fit the card", () => {
    const long: RegistryEntry = {
      ...ENTRY,
      description: "a".repeat(500),
    };
    const html = renderOgHtml(long);
    expect(html).toContain("…");
    expect(html).not.toContain("a".repeat(200));
  });

  test("truncates long credentials to fit the byline", () => {
    const long: RegistryEntry = {
      ...ENTRY,
      author_credential: "x".repeat(300),
    };
    const html = renderOgHtml(long);
    expect(html).toContain("…");
    expect(html).not.toContain("x".repeat(200));
  });

  test("exports the 1200x630 OG spec", () => {
    expect(OG_WIDTH).toBe(1200);
    expect(OG_HEIGHT).toBe(630);
    const html = renderOgHtml(ENTRY);
    expect(html).toContain("width: 1200px");
    expect(html).toContain("height: 630px");
  });
});
