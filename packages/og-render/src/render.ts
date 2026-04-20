import * as fs from "node:fs/promises";
import * as path from "node:path";
import { chromium, type Browser } from "playwright";
import type { RegistryEntry } from "@launchpad/registry";
import { renderOgHtml, OG_WIDTH, OG_HEIGHT } from "./template";

export type RenderResult = {
  name: string;
  bytesWritten: number;
  outPath: string;
};

/**
 * Renders one entry's OG image to disk. Accepts a reusable `browser` so
 * callers rendering many entries don't pay the Chromium launch cost
 * per entry.
 */
export async function renderOne(
  browser: Browser,
  entry: RegistryEntry,
  outPath: string,
): Promise<RenderResult> {
  const page = await browser.newPage({
    viewport: { width: OG_WIDTH, height: OG_HEIGHT },
    deviceScaleFactor: 1,
  });

  try {
    const html = renderOgHtml(entry);
    // `waitUntil: networkidle` waits for Google Fonts CDN fetches to settle
    // before the screenshot. Verified against the real seed entry — the
    // resulting PNG has the webfonts visibly loaded.
    await page.setContent(html, { waitUntil: "networkidle" });

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const buf = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
      animations: "disabled",
    });
    await fs.writeFile(outPath, buf);

    return { name: entry.name, bytesWritten: buf.length, outPath };
  } finally {
    await page.close();
  }
}

export async function withBrowser<T>(
  fn: (browser: Browser) => Promise<T>,
): Promise<T> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
