import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type DocMeta = {
  slug: string;
  title: string;
  order: number;
  summary: string;
};

export type Doc = DocMeta & { body: string };

// Resolve content/docs relative to this source file, not cwd. Next build and
// `bun test` run from different working directories; the docs tree always
// lives at packages/gallery/content/docs.
const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(THIS_DIR, "..", "content", "docs");

function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: raw };
  const head = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const data: Record<string, string> = {};
  for (const line of head.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1]!;
    let value = (m[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body };
}

let cache: Doc[] | null = null;

export function loadAllDocs(): Doc[] {
  if (cache) return cache;
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  const docs: Doc[] = [];
  for (const f of files) {
    const raw = readFileSync(path.join(DOCS_DIR, f), "utf-8");
    const { data, body } = parseFrontmatter(raw);
    docs.push({
      slug: f.replace(/\.md$/, ""),
      title: data.title ?? f.replace(/\.md$/, ""),
      order: Number(data.order ?? "99"),
      summary: data.summary ?? "",
      body,
    });
  }
  docs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  cache = docs;
  return docs;
}

export function loadDoc(slug: string): Doc | null {
  return loadAllDocs().find((d) => d.slug === slug) ?? null;
}
