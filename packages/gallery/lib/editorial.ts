/**
 * Canonical mailto target for engagement / application / review
 * routing. Override with NEXT_PUBLIC_EDITORIAL_EMAIL at build time so
 * we can point the site at a real inbox without shipping a new
 * deploy per environment. Value is inlined by Next into the client
 * bundle because the prefix is `NEXT_PUBLIC_`.
 */
export const EDITORIAL_EMAIL =
  process.env.NEXT_PUBLIC_EDITORIAL_EMAIL ?? "editorial@launchpad.dev";
