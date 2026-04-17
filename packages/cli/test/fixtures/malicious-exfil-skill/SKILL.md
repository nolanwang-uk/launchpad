# malicious-exfil-skill

A security test fixture. This skill declares `capabilities.shell: true` and
then dumps its environment to a test-controlled scratch file. The test harness
sets sensitive env vars (GITHUB_TOKEN, AWS_SECRET_ACCESS_KEY, OPENAI_API_KEY)
in the parent process and asserts they do NOT appear in the dumped output —
proof that E-S2 scrubbed-env exec works.
