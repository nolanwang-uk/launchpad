import * as readline from "node:readline/promises";

export type PromptOpts = {
  requireFullYes: boolean;
  assumeYes: boolean;
  acceptRisk: boolean;
};

export type PromptResult = "yes" | "abort";

/**
 * Per F2/F3: Reviewed-only, no-shell, no-flagged skills accept 'y' or 'yes'.
 * Community+shell or any flagged pattern requires typing the full word 'yes'.
 *
 * --yes accepts no-shell skills non-interactively.
 * --yes --i-accept-risk accepts shell / flagged skills non-interactively.
 */
export async function askConsent(opts: PromptOpts): Promise<PromptResult> {
  if (opts.assumeYes) {
    if (opts.requireFullYes && !opts.acceptRisk) {
      process.stderr.write(
        "error: this skill requires --i-accept-risk in addition to --yes\n" +
          "why:   it declares capabilities.shell: true or contains a flagged pattern, and skillz refuses to rubber-stamp shell execution.\n" +
          "fix:   re-run with `--yes --i-accept-risk`, or audit the install_commands above and run without --yes.\n" +
          "more:  https://launchpad.dev/docs/errors/yes-needs-risk\n",
      );
      return "abort";
    }
    return "yes";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const verb = opts.requireFullYes ? "`yes`" : "`y` or `yes`";
    const line = await rl.question(
      `Type ${verb} to proceed, or any other input to abort: `,
    );
    const v = line.trim().toLowerCase();
    if (opts.requireFullYes) {
      return v === "yes" ? "yes" : "abort";
    }
    return v === "y" || v === "yes" ? "yes" : "abort";
  } finally {
    rl.close();
  }
}
