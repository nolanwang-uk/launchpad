export const EXIT = {
  OK: 0,
  RUNTIME: 1,
  INPUT: 2,
  NETWORK: 3,
  SECURITY: 4,
  EXEC_NONZERO: 5,
  SIGNAL: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export type SkillzError = {
  short: string;
  why: string;
  fix: string;
  more: string;
  code: ExitCode;
};

const DOCS_BASE = "https://launchpad.dev/docs/errors";

export function err(
  slug: string,
  short: string,
  why: string,
  fix: string,
  code: ExitCode,
): SkillzError {
  return { short, why, fix, more: `${DOCS_BASE}/${slug}`, code };
}

export function printErr(e: SkillzError): void {
  process.stderr.write(
    `error: ${e.short}\n` +
      `why:   ${e.why}\n` +
      `fix:   ${e.fix}\n` +
      `more:  ${e.more}\n`,
  );
}

export function isSkillzError(x: unknown): x is SkillzError {
  return (
    typeof x === "object" &&
    x !== null &&
    "short" in x &&
    "why" in x &&
    "fix" in x &&
    "more" in x &&
    "code" in x
  );
}
