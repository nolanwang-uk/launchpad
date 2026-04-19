import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

/**
 * Renders untrusted markdown to sanitized HTML.
 *
 * Sanitization posture: we use rehype-sanitize's default schema (based on
 * GitHub's). Raw HTML embedded in the markdown is stripped. Code blocks,
 * tables (via GFM), links, images, and inline formatting survive. No
 * scripts, no on* handlers, no arbitrary iframes.
 */
export async function renderMarkdown(input: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, defaultSchema)
    .use(rehypeStringify)
    .process(input);
  return String(file);
}
