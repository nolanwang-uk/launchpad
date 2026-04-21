import type { IntegrationKind } from "@launchpad/registry";

/**
 * Display-layer metadata for integration kinds. Categories group the
 * /integrations landing page. Labels and blurbs are editorial copy —
 * the canonical enum lives in @launchpad/registry so renames break
 * the schema validator, not silently drift.
 */

export type IntegrationCategory =
  | "files"
  | "warehouses"
  | "business_apps"
  | "messaging"
  | "vertical"
  | "generic";

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  files: "Files + spreadsheets",
  warehouses: "Data warehouses",
  business_apps: "Business apps",
  messaging: "Messaging + email",
  vertical: "Vertical systems",
  generic: "Generic escape hatches",
};

export const CATEGORY_BLURBS: Record<IntegrationCategory, string> = {
  files:
    "The 80% case. A skill that reads a CSV or writes a Google Sheet covers most industrial workflows because every industrial system exports one or ingests the other.",
  warehouses:
    "Read-only SQL against a warehouse. Practitioners declare what views they need; buyers grant row-level access once.",
  business_apps:
    "OAuth-style connectors to the systems buyers already pay for. Scoped per-skill — a Salesforce integration with scope read:Account can't write, can't touch Contacts.",
  messaging:
    "Delivery surfaces. Post the deliverable to Slack, send a digest over email, open a Jira ticket. How the output reaches the buyer.",
  vertical:
    "Domain-specific rails — EDGAR, PubMed, an Epic MCP server. Narrow, but the exact surface a verified practitioner already knows.",
  generic:
    "The escape hatch. http_api + MCP passthrough mean any system with an API or a Model Context Protocol server is reachable from a skill without a vendor-specific adapter.",
};

export const CATEGORY_ORDER: IntegrationCategory[] = [
  "files",
  "warehouses",
  "business_apps",
  "messaging",
  "vertical",
  "generic",
];

type Meta = {
  label: string;
  category: IntegrationCategory;
  /** Status we're honest about on the /integrations page. */
  status: "available" | "coming_soon" | "mcp_only";
  /** One-line blurb shown on the integrations landing card. */
  blurb: string;
};

export const INTEGRATION_META: Record<IntegrationKind, Meta> = {
  local_files: {
    label: "Local files",
    category: "files",
    status: "available",
    blurb:
      "Read and write files in the buyer's working directory. Every skill can do this.",
  },
  google_sheets: {
    label: "Google Sheets",
    category: "files",
    status: "coming_soon",
    blurb:
      "Read ranges and write rows into a sheet. First-class v1.5 integration — universal buyer surface.",
  },
  google_drive: {
    label: "Google Drive",
    category: "files",
    status: "coming_soon",
    blurb:
      "List, read, and upload files scoped to a single folder the buyer shares.",
  },
  excel: {
    label: "Excel",
    category: "files",
    status: "available",
    blurb: "Read .xlsx files from disk. Write new workbooks as deliverables.",
  },
  csv: {
    label: "CSV",
    category: "files",
    status: "available",
    blurb: "Read arbitrary CSV exports from downstream systems.",
  },
  s3: {
    label: "Amazon S3",
    category: "files",
    status: "coming_soon",
    blurb:
      "Scoped bucket/prefix access. Read exports, write deliverables, no list-all-buckets surface.",
  },
  gcs: {
    label: "Google Cloud Storage",
    category: "files",
    status: "coming_soon",
    blurb: "Read + write against a scoped bucket/prefix.",
  },
  azure_blob: {
    label: "Azure Blob",
    category: "files",
    status: "coming_soon",
    blurb: "Read + write against a scoped container.",
  },
  postgres: {
    label: "Postgres (read-only)",
    category: "warehouses",
    status: "coming_soon",
    blurb:
      "Parameterized SQL against a view the buyer grants access to. No writes. No DDL.",
  },
  bigquery: {
    label: "BigQuery",
    category: "warehouses",
    status: "coming_soon",
    blurb:
      "Scheduled queries against a dataset. Dry-run cost estimation before execution.",
  },
  snowflake: {
    label: "Snowflake",
    category: "warehouses",
    status: "coming_soon",
    blurb:
      "Parameterized SQL with a dedicated compute warehouse per run. Write path requires explicit scope.",
  },
  duckdb: {
    label: "DuckDB",
    category: "warehouses",
    status: "available",
    blurb: "Embedded analytics for local CSV/Parquet. No external connection.",
  },
  salesforce: {
    label: "Salesforce",
    category: "business_apps",
    status: "coming_soon",
    blurb:
      "Object-scoped reads + writes. First vendor-specific connector on the v2 roadmap.",
  },
  hubspot: {
    label: "HubSpot",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Contact and deal reads. Property-level scoping.",
  },
  netsuite: {
    label: "NetSuite",
    category: "business_apps",
    status: "coming_soon",
    blurb: "SuiteQL reads. Per-record-type scope.",
  },
  quickbooks: {
    label: "QuickBooks Online",
    category: "business_apps",
    status: "coming_soon",
    blurb: "GL and transaction reads. Report export writes.",
  },
  stripe: {
    label: "Stripe",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Subscription and invoice reads. Read-only by default.",
  },
  jira: {
    label: "Jira",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Project-scoped issue search + create.",
  },
  linear: {
    label: "Linear",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Team-scoped issue search + create.",
  },
  notion: {
    label: "Notion",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Database-scoped read and page write.",
  },
  confluence: {
    label: "Confluence",
    category: "business_apps",
    status: "coming_soon",
    blurb: "Space-scoped page read + write.",
  },
  slack: {
    label: "Slack",
    category: "messaging",
    status: "coming_soon",
    blurb: "Post deliverables to a specific channel. No message-history reads.",
  },
  teams: {
    label: "Microsoft Teams",
    category: "messaging",
    status: "coming_soon",
    blurb: "Channel-scoped post. Adaptive cards supported.",
  },
  email: {
    label: "Email (SMTP)",
    category: "messaging",
    status: "coming_soon",
    blurb: "Send deliverables to a pre-registered address list only.",
  },
  epic_mcp: {
    label: "Epic (MCP)",
    category: "vertical",
    status: "mcp_only",
    blurb:
      "Routed through a buyer-side MCP server. Launchpad never touches PHI directly.",
  },
  edgar: {
    label: "SEC EDGAR",
    category: "vertical",
    status: "available",
    blurb:
      "Public-disclosure filings. Read-only. No auth needed — lives in the skill itself.",
  },
  pubmed: {
    label: "PubMed",
    category: "vertical",
    status: "available",
    blurb: "Literature search. Read-only. No auth needed.",
  },
  http_api: {
    label: "HTTP API",
    category: "generic",
    status: "coming_soon",
    blurb:
      "Allowlisted hostnames. Scoped headers. Diff prompt shows exact URL patterns before first run.",
  },
  webhook_in: {
    label: "Inbound webhooks",
    category: "generic",
    status: "coming_soon",
    blurb: "HMAC-verified inbound events trigger a skill run.",
  },
  mcp_passthrough: {
    label: "MCP passthrough",
    category: "generic",
    status: "coming_soon",
    blurb:
      "Any Model Context Protocol server the buyer has locally configured. The escape hatch that makes the long tail reachable without a first-party adapter.",
  },
};

export function labelFor(kind: IntegrationKind): string {
  return INTEGRATION_META[kind]?.label ?? kind;
}

export function categoryFor(kind: IntegrationKind): IntegrationCategory {
  return INTEGRATION_META[kind]?.category ?? "generic";
}

export function directionGlyph(
  direction: "read" | "write" | "both",
): string {
  if (direction === "read") return "→";
  if (direction === "write") return "←";
  return "↔";
}

export function directionLabel(
  direction: "read" | "write" | "both",
): string {
  if (direction === "read") return "Reads from";
  if (direction === "write") return "Writes to";
  return "Reads + writes";
}
