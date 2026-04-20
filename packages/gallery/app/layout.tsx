import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CommandPalette, type PaletteEntry } from "@/components/CommandPalette";
import { loadRegistrySync } from "@/lib/registry";

const interDisplay = Inter({
  subsets: ["latin"],
  variable: "--next-inter-display",
  display: "swap",
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--next-jetbrains-mono",
  display: "swap",
});

// Resolve the canonical origin for absolute URLs in OG/Twitter tags.
// Priority: NEXT_PUBLIC_SITE_ORIGIN override → VERCEL_PROJECT_PRODUCTION_URL
// (set automatically on Vercel) → fallback to launchpad.dev. Until the
// real domain is pointed, crawlers resolve OG URLs against the live
// Vercel deployment instead of 404-ing on launchpad.dev.
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://launchpad.dev");

export const metadata: Metadata = {
  title: "Launchpad — one command, any Claude Code skill",
  description:
    "A curated marketplace for Claude Code skills. Discover, install, and run skills with one copy-paste command. Source always visible, SHA-pinned, security-first.",
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    title: "Launchpad",
    description: "One command, any Claude Code skill.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Launchpad",
    description: "One command, any Claude Code skill.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const registry = loadRegistrySync();
  const paletteEntries: PaletteEntry[] = registry.entries.map((e) => ({
    name: e.name,
    description: e.description,
    tier: e.tier,
    tags: e.tags,
  }));

  return (
    <html lang="en" className={`${interDisplay.variable} ${jetbrainsMono.variable}`}>
      <body>
        {/* Skip-to-content for keyboard users — visually hidden until
            focused. Target `#main` is set by each page's layout/article. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[color:var(--color-fg)] focus:text-[color:var(--color-bg)] focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        {children}
        <CommandPalette entries={paletteEntries} />
      </body>
    </html>
  );
}
