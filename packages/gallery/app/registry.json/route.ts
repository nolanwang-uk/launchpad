import { NextResponse } from "next/server";
import { loadRegistrySync } from "@/lib/registry";

/**
 * Public registry JSON endpoint. Client-side surfaces — the saved
 * dashboard, any future search box that needs entry metadata —
 * fetch this instead of re-exporting the server-only loader. Cached
 * at the edge for a minute so walking the dashboard doesn't hammer
 * the loader.
 */

export const dynamic = "force-static";

export function GET() {
  const registry = loadRegistrySync();
  return NextResponse.json(registry, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}
