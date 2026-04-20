import type { RegistryEntry } from "@launchpad/registry";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Escape a string for safe interpolation into HTML text nodes or
 * double-quoted attributes. The registry has its own name/tag regexes so
 * those fields can't include HTML special chars, but description + author
 * are free-form strings that have to be escaped.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Truncate to n chars with an ellipsis, avoiding mid-word cuts where possible.
 */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const stop = lastSpace > n * 0.6 ? lastSpace : cut.length;
  return cut.slice(0, stop) + "…";
}

/**
 * Renders the HTML for a per-skill OG card. The output is a self-contained
 * document — all CSS is inline, all fonts are loaded from Google Fonts
 * via <link>. Playwright screenshots this at 1200x630.
 */
export function renderOgHtml(entry: RegistryEntry): string {
  const tierLabel = entry.tier === "Reviewed" ? "Reviewed" : "Community";
  const description = truncate(entry.description, 180);
  const installCmd = `npx launchpad run ${entry.name}`;
  const tagLine = entry.tags.slice(0, 4).join("  ·  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${OG_WIDTH}px;
      height: ${OG_HEIGHT}px;
      background: #0a0a0b;
      color: #f4f4f5;
      font-family: "Inter", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .root {
      width: 100%;
      height: 100%;
      padding: 68px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 1;
    }
    .wordmark {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .wordmark-dot {
      color: #a1a1aa;
    }
    .tier {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .tier.reviewed {
      background: #64748b;
      color: #f8fafc;
      border-left: 3px solid rgba(255,255,255,0.5);
    }
    .tier.community {
      background: transparent;
      color: #a1a1aa;
      border: 1px solid #3f3f46;
    }
    .tier-glyph {
      width: 12px; height: 12px;
      display: inline-block;
    }

    .body {
      position: relative;
      z-index: 1;
    }
    .skill-name {
      font-size: 92px;
      font-weight: 600;
      letter-spacing: -0.035em;
      line-height: 0.98;
      margin: 0 0 28px 0;
    }
    .description {
      font-size: 28px;
      line-height: 1.35;
      color: #a1a1aa;
      max-width: 900px;
      margin: 0;
    }

    .bottom {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }
    .command {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 24px;
      font-weight: 500;
      background: #f4f4f5;
      color: #0a0a0b;
      padding: 14px 22px;
      border-radius: 10px;
      letter-spacing: -0.01em;
    }
    .meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      font-size: 18px;
      color: #71717a;
    }
    .meta-author {
      color: #a1a1aa;
      font-weight: 500;
    }
    .tags {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 14px;
      color: #71717a;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="root">
    <div class="grid-bg" aria-hidden="true"></div>

    <div class="top">
      <div class="wordmark">launchpad<span class="wordmark-dot">.</span></div>
      <div class="tier ${entry.tier === "Reviewed" ? "reviewed" : "community"}">
        <svg class="tier-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          ${
            entry.tier === "Reviewed"
              ? '<path d="M13 4L6 11.5L3 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'
              : '<circle cx="5" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5" /><circle cx="11" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5" /><circle cx="5" cy="12" r="1.5" stroke="currentColor" stroke-width="1.5" /><path d="M5 5.5v5M11 5.5c0 3-3 3.5-6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />'
          }
        </svg>
        ${tierLabel}
      </div>
    </div>

    <div class="body">
      <h1 class="skill-name">${escapeHtml(entry.name)}</h1>
      <p class="description">${escapeHtml(description)}</p>
      ${tagLine ? `<div class="tags">${escapeHtml(tagLine)}</div>` : ""}
    </div>

    <div class="bottom">
      <code class="command">${escapeHtml(installCmd)}</code>
      <div class="meta">
        <span class="meta-author">by ${escapeHtml(entry.author)}</span>
        <span>${escapeHtml(entry.license)}  ·  @${entry.sha.slice(0, 7)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
