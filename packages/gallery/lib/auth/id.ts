/**
 * Tiny URL-safe unique-id helper for client-side records. Uses
 * crypto.randomUUID when available, otherwise falls back to a
 * randomBytes-backed base36 string. v2 replaces these with
 * database-issued IDs; until then, the UI only uses IDs for
 * linking records, so any unique string works.
 */
export function newId(prefix: string): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) {
    return `${prefix}_${c.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  const bytes = new Uint8Array(8);
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
