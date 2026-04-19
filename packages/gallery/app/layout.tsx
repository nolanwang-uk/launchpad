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

export const metadata: Metadata = {
  title: "Launchpad — one command, any Claude Code skill",
  description:
    "A curated marketplace for Claude Code skills. Discover, install, and run skills with one copy-paste command. Source always visible, SHA-pinned, security-first.",
  metadataBase: new URL("https://launchpad.dev"),
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
        {children}
        <CommandPalette entries={paletteEntries} />
      </body>
    </html>
  );
}
