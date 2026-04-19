import { describe, test, expect } from "bun:test";
import { loadAllDocs, loadDoc } from "../lib/docs";

describe("loadAllDocs", () => {
  test("loads every markdown file in content/docs", () => {
    const docs = loadAllDocs();
    expect(docs.length).toBe(7);
    const slugs = docs.map((d) => d.slug);
    expect(slugs).toContain("build-your-first-skill");
    expect(slugs).toContain("skill-yml");
    expect(slugs).toContain("registry-entry");
    expect(slugs).toContain("security-model");
    expect(slugs).toContain("troubleshooting");
    expect(slugs).toContain("migration");
    expect(slugs).toContain("privacy");
  });

  test("parses frontmatter into typed metadata", () => {
    const docs = loadAllDocs();
    const first = docs.find((d) => d.slug === "build-your-first-skill");
    expect(first).toBeDefined();
    expect(first!.title).toBe("Build your first skill");
    expect(first!.order).toBe(1);
    expect(first!.summary).toContain("empty directory");
  });

  test("sorts by order ascending", () => {
    const docs = loadAllDocs();
    for (let i = 1; i < docs.length; i++) {
      expect(docs[i]!.order).toBeGreaterThanOrEqual(docs[i - 1]!.order);
    }
  });

  test("strips the frontmatter block from the body", () => {
    const docs = loadAllDocs();
    for (const d of docs) {
      // Body should NOT start with '---' (frontmatter stripped)
      expect(d.body.startsWith("---\n")).toBe(false);
      // Body should include a real heading from the content
      expect(d.body).toMatch(/^#\s+/m);
    }
  });
});

describe("loadDoc", () => {
  test("returns the requested doc by slug", () => {
    const doc = loadDoc("security-model");
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Security model");
  });

  test("returns null for unknown slugs", () => {
    expect(loadDoc("does-not-exist")).toBeNull();
  });
});
