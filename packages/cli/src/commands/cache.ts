import { cacheDir, clearCache } from "../cache";
import { EXIT } from "../errors";

export type CacheOpts = {
  subverb: "clear" | "show";
};

export async function cacheCommand(opts: CacheOpts): Promise<{ code: number }> {
  if (opts.subverb === "clear") {
    const { removed, dir } = await clearCache();
    if (removed) {
      process.stdout.write(`✓ cleared launchpad cache at ${dir}\n`);
    } else {
      process.stdout.write(
        `cache dir does not exist — nothing to clear (${dir})\n`,
      );
    }
    return { code: EXIT.OK };
  }
  if (opts.subverb === "show") {
    process.stdout.write(`cache dir: ${cacheDir()}\n`);
    return { code: EXIT.OK };
  }
  return { code: EXIT.OK };
}
