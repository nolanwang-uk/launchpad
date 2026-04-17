import { parse as parseYaml } from "yaml";
import { err, EXIT } from "./errors";
import { isValidSha40 } from "./sha";

export type Capabilities = {
  network: boolean;
  filesystem: boolean;
  shell: boolean;
};

export type Manifest = {
  schema_version: 1;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  targets: readonly string[];
  capabilities: Capabilities;
  files: readonly string[];
  install_commands: readonly string[];
};

const REQUIRED_FIELDS = [
  "schema_version",
  "name",
  "version",
  "description",
  "author",
  "license",
  "targets",
  "capabilities",
  "files",
  "install_commands",
] as const satisfies readonly (keyof Manifest)[];

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function parseManifest(yamlText: string, sourcePath: string): Manifest {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw err(
      "manifest-parse",
      "skill.yml is not valid YAML",
      `${sourcePath}: ${msg}`,
      "fix the YAML syntax in skill.yml. Tip: run `bunx yaml-lint skill.yml` locally.",
      EXIT.INPUT,
    );
  }
  return validateManifest(raw, sourcePath);
}

export function validateManifest(raw: unknown, sourcePath: string): Manifest {
  if (typeof raw !== "object" || raw === null) {
    throw err(
      "manifest-shape",
      "skill.yml must be a YAML object at the top level",
      `${sourcePath} parsed to ${typeof raw}, not an object with keys.`,
      "wrap your manifest fields in a top-level YAML mapping (no leading `-`, no arrays at root).",
      EXIT.INPUT,
    );
  }
  const m = raw as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in m)) {
      throw err(
        "manifest-missing-field",
        `skill.yml is missing required field '${field}'`,
        `schema_version: 1 requires: ${REQUIRED_FIELDS.join(", ")}.`,
        `add '${field}:' to skill.yml.`,
        EXIT.INPUT,
      );
    }
  }

  if (m.schema_version !== 1) {
    throw err(
      "manifest-schema-version",
      "skill.yml declares an unsupported schema_version",
      `this CLI supports schema_version: 1, found: ${JSON.stringify(m.schema_version)}.`,
      "upgrade skillz (`brew upgrade skillz` or `npm i -g skillz@latest`), or downgrade the manifest to schema_version: 1.",
      EXIT.INPUT,
    );
  }

  const name = assertString(m.name, "name", sourcePath);
  if (!NAME_RE.test(name)) {
    throw err(
      "manifest-bad-name",
      "skill name must be lowercase kebab-case",
      `got '${name}'. Names must match ${NAME_RE.toString()} (lowercase, digits, hyphens, 1-64 chars).`,
      "rename the skill to conform. Example: 'awesome-refactor'.",
      EXIT.INPUT,
    );
  }

  const targets = assertStringArray(m.targets, "targets", sourcePath);
  if (targets.length === 0) {
    throw err(
      "manifest-no-targets",
      "targets array must have at least one entry",
      `${sourcePath}: targets is empty. v1 only supports 'claude-code'.`,
      "set `targets: [claude-code]` in skill.yml.",
      EXIT.INPUT,
    );
  }

  const capsRaw = m.capabilities;
  if (typeof capsRaw !== "object" || capsRaw === null) {
    throw err(
      "manifest-bad-caps",
      "capabilities must be an object with network/filesystem/shell booleans",
      `${sourcePath}: capabilities is ${typeof capsRaw}.`,
      "set `capabilities: { network: false, filesystem: true, shell: false }` (edit values to match your skill).",
      EXIT.INPUT,
    );
  }
  const caps = capsRaw as Record<string, unknown>;
  const capabilities: Capabilities = {
    network: assertBool(caps.network, "capabilities.network", sourcePath),
    filesystem: assertBool(caps.filesystem, "capabilities.filesystem", sourcePath),
    shell: assertBool(caps.shell, "capabilities.shell", sourcePath),
  };

  const files = assertStringArray(m.files, "files", sourcePath);
  const install_commands = assertStringArray(
    m.install_commands,
    "install_commands",
    sourcePath,
  );

  return {
    schema_version: 1,
    name,
    version: assertString(m.version, "version", sourcePath),
    description: assertString(m.description, "description", sourcePath),
    author: assertString(m.author, "author", sourcePath),
    license: assertString(m.license, "license", sourcePath),
    targets,
    capabilities,
    files,
    install_commands,
  };
}

function assertString(v: unknown, field: string, source: string): string {
  if (typeof v !== "string" || v.length === 0) {
    throw err(
      "manifest-bad-string",
      `${field} must be a non-empty string`,
      `${source}: ${field} is ${typeof v === "string" ? "empty" : typeof v}.`,
      `set a string value for '${field}:' in skill.yml.`,
      EXIT.INPUT,
    );
  }
  return v;
}

function assertStringArray(v: unknown, field: string, source: string): string[] {
  if (!Array.isArray(v)) {
    throw err(
      "manifest-bad-array",
      `${field} must be a YAML sequence (array) of strings`,
      `${source}: ${field} is ${typeof v}.`,
      `use YAML list syntax: '${field}:' then indented '- value' lines.`,
      EXIT.INPUT,
    );
  }
  return v.map((x, i) => {
    if (typeof x !== "string" || x.length === 0) {
      throw err(
        "manifest-bad-array-item",
        `${field}[${i}] must be a non-empty string`,
        `${source}: ${field}[${i}] is ${typeof x === "string" ? "empty" : typeof x}.`,
        `remove the empty entry or replace it with a valid string.`,
        EXIT.INPUT,
      );
    }
    return x;
  });
}

function assertBool(v: unknown, field: string, source: string): boolean {
  if (typeof v !== "boolean") {
    throw err(
      "manifest-bad-bool",
      `${field} must be true or false`,
      `${source}: ${field} is ${typeof v} (${JSON.stringify(v)}).`,
      `set '${field}: true' or '${field}: false' in skill.yml.`,
      EXIT.INPUT,
    );
  }
  return v;
}

export { isValidSha40 };
