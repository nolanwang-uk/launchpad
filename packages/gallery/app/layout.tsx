import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { CommandPalette, type PaletteEntry } from "@/components/CommandPalette";
import { loadRegistrySync } from "@/lib/registry";
import { AuthProvider } from "@/lib/auth/context";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--next-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--next-instrument-sans",
  display: "swap",
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
  title: "Launchpad — a Practitioners' Exchange for Claude Code skills",
  description:
    "Domain-expert Claude Code skills, authored by verified practitioners. Securities lawyers, clinical coders, FP&A leads — each skill encodes real professional judgment, SHA-pinned and source-visible.",
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    title: "Launchpad — a Practitioners' Exchange",
    description:
      "Claude Code skills authored by verified domain practitioners.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Launchpad — a Practitioners' Exchange",
    description:
      "Claude Code skills authored by verified domain practitioners.",
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
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Skip-to-content for keyboard users — visually hidden until
            focused. Target `#main` is set by each page's layout/article. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[color:var(--color-fg)] focus:text-[color:var(--color-bg)] focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <AuthProvider>
          {children}
          <CommandPalette entries={paletteEntries} />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
