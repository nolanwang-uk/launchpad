/**
 * Static rendering of what `npx launchpad run <skill>` looks like in a
 * terminal. Will be replaced with an asciinema autoplay loop once real
 * recordings exist (D2 spec). For now, a hand-authored transcript sells
 * the shape.
 */
export function TerminalPreview({
  command,
  skillName,
  tier,
}: {
  command: string;
  skillName: string;
  tier: "Reviewed" | "Community";
}) {
  return (
    <div
      className={[
        "rounded-xl overflow-hidden border border-[color:var(--color-border)]",
        "bg-[color:var(--color-bg-elevated)] shadow-2xl shadow-black/60",
        "font-[family-name:var(--font-mono)] text-[13px] leading-relaxed",
      ].join(" ")}
      aria-label={`Terminal preview of running ${skillName}`}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[color:var(--color-border)]">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-[color:var(--color-fg-subtle)]">
          ~/.claude/skills
        </span>
      </div>

      <div className="p-6 space-y-1 text-[color:var(--color-fg)]">
        <Line prompt="$">{command}</Line>

        <Box>
          <BoxLine>
            Skill: <b>{skillName}</b> ({tier} · v0.1.0)
          </BoxLine>
          <BoxDivider />
          <BoxLine muted>
            INSTALL COMMANDS (exec with env -i PATH=/usr/bin:/bin):
          </BoxLine>
          <BoxLine>{" 1. mkdir -p ~/.claude/skills/" + skillName}</BoxLine>
          <BoxLine>
            {" 2. cp SKILL.md ~/.claude/skills/" + skillName + "/"}
          </BoxLine>
          <BoxDivider />
          <BoxLine muted>FILES TO WRITE: 1 files (4.2KB total)</BoxLine>
          <BoxLine>{" + SKILL.md                           4.2KB"}</BoxLine>
        </Box>

        <Line>Type yes to proceed, or any other key to abort:{" "}
          <span className="inline-block w-2 h-4 bg-[color:var(--color-fg)] animate-pulse align-middle" />
        </Line>
      </div>
    </div>
  );
}

function Line({
  prompt,
  children,
}: {
  prompt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      {prompt && (
        <span className="text-[color:var(--color-fg-subtle)] select-none">
          {prompt}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 border border-[color:var(--color-border)] rounded-md p-3 text-[color:var(--color-fg-muted)]">
      {children}
    </div>
  );
}

function BoxLine({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "text-[color:var(--color-fg-subtle)]" : ""}>
      {children}
    </div>
  );
}

function BoxDivider() {
  return <div className="border-t border-[color:var(--color-border)] my-1.5" />;
}
