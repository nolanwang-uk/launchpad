import { loadRegistry } from "../registry";
import type { RegistryEntry } from "@launchpad/registry";
import { err, EXIT, isSkillzError, printErr } from "../errors";

export type SearchOpts = {
  term: string;
  registry?: string;
  json: boolean;
  limit: number;
};

type Hit = { entry: RegistryEntry; score: number };

/**
 * Score an entry against a lowercase search term.
 * - Exact name match: 100
 * - Name starts with term: 80
 * - Name contains term: 50
 * - Tag exact match: 40
 * - Tag contains term: 25
 * - Description contains term (word boundary): 20
 * - Description contains term: 10
 * - Author contains term: 5
 * Returns 0 for no match.
 */
function scoreEntry(entry: RegistryEntry, term: string): number {
  const name = entry.name.toLowerCase();
  const desc = entry.description.toLowerCase();
  const author = entry.author.toLowerCase();

  if (name === term) return 100;
  if (name.startsWith(term)) return 80;
  if (name.includes(term)) return 50;

  let score = 0;
  for (const tag of entry.tags) {
    const t = tag.toLowerCase();
    if (t === term) score = Math.max(score, 40);
    else if (t.includes(term)) score = Math.max(score, 25);
  }

  const wordBoundary = new RegExp(`\\b${escapeRegExp(term)}\\b`);
  if (wordBoundary.test(desc)) score = Math.max(score, 20);
  else if (desc.includes(term)) score = Math.max(score, 10);

  if (author.includes(term)) score = Math.max(score, 5);

  return score;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchCommand(
  opts: SearchOpts,
): Promise<{ code: number; hits: Hit[] }> {
  try {
    if (!opts.term.trim()) {
      throw err(
        "search-needs-term",
        "`search` requires a term",
        "no search term was provided.",
        "try `skillz search <term>`. Use --json for scripts.",
        EXIT.INPUT,
      );
    }

    const reg = await loadRegistry(opts.registry);
    const term = opts.term.toLowerCase();
    const hits: Hit[] = [];
    for (const entry of reg.entries) {
      const score = scoreEntry(entry, term);
      if (score > 0) hits.push({ entry, score });
    }
    hits.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
    const limited = hits.slice(0, opts.limit);

    if (opts.json) {
      process.stdout.write(
        JSON.stringify(
          limited.map((h) => ({ name: h.entry.name, score: h.score, tier: h.entry.tier })),
          null,
          2,
        ) + "\n",
      );
      return { code: EXIT.OK, hits: limited };
    }

    if (limited.length === 0) {
      process.stdout.write(
        `no matches for '${opts.term}' in the registry.\n` +
          `try: skillz info <name>  /  skillz search <broader-term>\n`,
      );
      return { code: EXIT.OK, hits: limited };
    }

    const nameWidth = Math.max(12, ...limited.map((h) => h.entry.name.length));
    process.stdout.write(
      `${"NAME".padEnd(nameWidth)}  TIER        DESCRIPTION\n`,
    );
    for (const { entry } of limited) {
      const tier = entry.tier.padEnd(10);
      const desc = entry.description.length > 60
        ? entry.description.slice(0, 57) + "..."
        : entry.description;
      process.stdout.write(
        `${entry.name.padEnd(nameWidth)}  ${tier}  ${desc}\n`,
      );
    }
    if (hits.length > limited.length) {
      process.stdout.write(
        `\n(${hits.length - limited.length} more — pass --limit to see more)\n`,
      );
    }

    return { code: EXIT.OK, hits: limited };
  } catch (e) {
    if (isSkillzError(e)) {
      printErr(e);
      return { code: e.code, hits: [] };
    }
    throw e;
  }
}
