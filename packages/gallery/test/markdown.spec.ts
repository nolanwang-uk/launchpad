import { describe, test, expect } from "bun:test";
import { renderMarkdown } from "../lib/markdown";

describe("renderMarkdown", () => {
  test("renders plain paragraphs + inline formatting", async () => {
    const html = await renderMarkdown("**Hello** _world_");
    expect(html).toContain("<strong>Hello</strong>");
    expect(html).toContain("<em>world</em>");
  });

  test("renders headings", async () => {
    const html = await renderMarkdown("# Hello\n## World");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<h2>World</h2>");
  });

  test("renders fenced code blocks", async () => {
    const html = await renderMarkdown("```\nconst x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code>");
    expect(html).toContain("const x = 1;");
  });

  test("renders GFM tables", async () => {
    const html = await renderMarkdown(
      "| col1 | col2 |\n|------|------|\n| a    | b    |",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<th>col1</th>");
    expect(html).toContain("<td>a</td>");
  });

  test("renders autolinks in GFM", async () => {
    const html = await renderMarkdown("visit https://launchpad.dev for docs");
    expect(html).toContain("<a");
    expect(html).toContain("https://launchpad.dev");
  });

  // Security tests — the payload is untrusted markdown, sanitization must work.

  test("strips <script> tags", async () => {
    const html = await renderMarkdown(
      "hello\n\n<script>alert(1)</script>\n\nworld",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  test("strips on* event handlers from surviving HTML", async () => {
    const html = await renderMarkdown('<a href="#" onclick="pwn()">x</a>');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("pwn()");
  });

  test("rejects javascript: URLs in links", async () => {
    const html = await renderMarkdown("[click](javascript:alert(1))");
    // rehype-sanitize's default schema drops javascript: hrefs entirely.
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(1)");
  });

  test("strips <iframe>", async () => {
    const html = await renderMarkdown(
      "before\n\n<iframe src=\"https://evil.example\"></iframe>\n\nafter",
    );
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("evil.example");
  });

  test("strips <style>", async () => {
    const html = await renderMarkdown(
      "<style>body{background:red}</style>\nhello",
    );
    expect(html).not.toContain("<style");
  });

  test("allows http(s) image URLs", async () => {
    const html = await renderMarkdown("![alt](https://launchpad.dev/img.png)");
    expect(html).toContain("<img");
    expect(html).toContain("https://launchpad.dev/img.png");
    expect(html).toContain('alt="alt"');
  });
});
