import type { RegistryEntry } from "@launchpad/registry";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Escape a string for safe interpolation into HTML text nodes or
 * double-quoted attributes. The registry has its own name/tag regexes
 * so those fields can't include HTML special chars, but description +
 * author are free-form strings that have to be escaped.
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
 * Truncate to n chars with an ellipsis, avoiding mid-word cuts where
 * possible.
 */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const stop = lastSpace > n * 0.6 ? lastSpace : cut.length;
  return cut.slice(0, stop) + "…";
}

function deriveInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((p) => p.length > 0)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * Renders the HTML for a per-skill OG card — editorial/Practitioners'
 * Exchange direction. Light paper ground, Fraunces display, byline
 * treated like a journal contributor card. Playwright screenshots at
 * 1200x630.
 */
export function renderOgHtml(entry: RegistryEntry): string {
  const tierLabel = entry.tier === "Reviewed" ? "Verified" : "Community";
  const description = truncate(entry.description, 180);
  const initials = deriveInitials(entry.author);
  const tagLine = entry.tags.slice(0, 4).join("  ·  ");
  const credential = entry.author_credential
    ? truncate(entry.author_credential, 120)
    : "";
  const domain = entry.domain ?? "general";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${OG_WIDTH}px;
      height: ${OG_HEIGHT}px;
      background: #fcfaf5;
      color: #12110f;
      font-family: "Instrument Sans", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .root {
      width: 100%;
      height: 100%;
      padding: 64px 72px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wordmark {
      font-family: "Fraunces", serif;
      font-size: 30px;
      font-weight: 500;
      letter-spacing: -0.02em;
    }
    .wordmark-tag {
      display: inline-block;
      margin-left: 12px;
      font-family: "Instrument Sans", sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #6a6864;
      vertical-align: middle;
    }
    .tier {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 3px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .tier.reviewed {
      background: #8a6a2e;
      color: #ffffff;
    }
    .tier.community {
      background: transparent;
      color: #4a4741;
      border: 1px solid #c7bfab;
    }
    .tier-glyph {
      width: 12px;
      height: 12px;
      display: inline-block;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 20px;
      font-size: 13px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6a6864;
    }
    .meta-row .dot { color: #c7bfab; }

    .body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 28px 0;
    }
    .skill-name {
      font-family: "Fraunces", serif;
      font-size: 110px;
      font-weight: 500;
      letter-spacing: -0.02em;
      line-height: 0.96;
      margin: 0 0 24px 0;
      color: #12110f;
    }
    .description {
      font-family: "Fraunces", serif;
      font-weight: 400;
      font-size: 28px;
      line-height: 1.35;
      color: #4a4741;
      max-width: 960px;
      margin: 0;
    }
    .tags {
      font-family: "Instrument Sans", sans-serif;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6a6864;
      margin-top: 20px;
    }

    .byline {
      display: flex;
      align-items: center;
      gap: 16px;
      border-top: 1px solid #e4ddcc;
      padding-top: 20px;
    }
    .mark {
      width: 64px;
      height: 64px;
      border: 1px solid #c7bfab;
      background: #f4efe4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Fraunces", serif;
      font-size: 24px;
      font-weight: 500;
      color: #12110f;
    }
    .byline-text { display: flex; flex-direction: column; gap: 2px; }
    .byline-label {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #6a6864;
    }
    .byline-name {
      font-family: "Fraunces", serif;
      font-size: 24px;
      font-weight: 500;
      color: #12110f;
      line-height: 1.1;
    }
    .byline-credential {
      font-size: 13px;
      color: #4a4741;
      line-height: 1.3;
      max-width: 620px;
    }
    .license-line {
      margin-left: auto;
      text-align: right;
      font-size: 12px;
      font-family: "JetBrains Mono", monospace;
      color: #6a6864;
    }
  </style>
</head>
<body>
  <div class="root">
    <div>
      <div class="top">
        <div class="wordmark">
          Launchpad
          <span class="wordmark-tag">The Practitioners&rsquo; Exchange</span>
        </div>
        <div class="tier ${entry.tier === "Reviewed" ? "reviewed" : "community"}">
          <svg class="tier-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            ${
              entry.tier === "Reviewed"
                ? '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" fill="none" /><path d="M5.5 8.25L7.25 10L10.5 6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />'
                : '<circle cx="8" cy="8" r="2.5" fill="currentColor" />'
            }
          </svg>
          ${tierLabel}
        </div>
      </div>
      <div class="meta-row">
        <span>${escapeHtml(domain)}</span>
        <span class="dot">·</span>
        <span>${escapeHtml(entry.license)}</span>
        <span class="dot">·</span>
        <span>@${entry.sha.slice(0, 7)}</span>
      </div>
    </div>

    <div class="body">
      <h1 class="skill-name">${escapeHtml(entry.name)}</h1>
      <p class="description">${escapeHtml(description)}</p>
      ${tagLine ? `<div class="tags">${escapeHtml(tagLine)}</div>` : ""}
    </div>

    <div class="byline">
      <div class="mark">${escapeHtml(initials)}</div>
      <div class="byline-text">
        <span class="byline-label">Practitioner</span>
        <span class="byline-name">${escapeHtml(entry.author)}</span>
        ${
          credential
            ? `<span class="byline-credential">${escapeHtml(credential)}</span>`
            : ""
        }
      </div>
      <div class="license-line">launchpad.dev/s/${escapeHtml(entry.name)}</div>
    </div>
  </div>
</body>
</html>`;
}
