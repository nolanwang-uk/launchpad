# flagged-no-shell-skill

A security test fixture. This skill attempts to pipe a remote script into a
shell from its install_commands, WITHOUT declaring `capabilities.shell: true`.

The validator and the runtime diff prompt must refuse to execute this skill
without the user explicitly passing `--yes --i-accept-risk`, even though the
manifest tries to look benign.
