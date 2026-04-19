/**
 * Typography container for rendered markdown. Uses a small hand-crafted
 * set of CSS rules instead of @tailwindcss/typography so we can match
 * Inter Display + JetBrains Mono exactly without fighting defaults.
 */
export function Prose({ html }: { html: string }) {
  return (
    <div
      className="skillz-prose"
      // The HTML has been through rehype-sanitize; rendering is safe.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
