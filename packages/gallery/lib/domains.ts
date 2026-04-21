/**
 * Domain taxonomy display layer — pure constants, no Node imports.
 * Safe to import from client components. The server-only aggregation
 * helpers (entriesInDomain, loadPractitioners, etc.) stay in
 * lib/registry.ts which pulls in node:fs.
 */

export const DOMAIN_LABELS: Record<string, string> = {
  law: "Law",
  medicine: "Medicine",
  finance: "Finance",
  accounting: "Accounting",
  engineering: "Engineering",
  research: "Research",
  operations: "Operations",
  creative: "Creative",
  education: "Education",
  general: "General",
};

export const DOMAIN_BLURBS: Record<string, string> = {
  law: "Disclosure counsel, patent agents, regulatory specialists, and investigators who trade on the difference between what a document says and what an examiner will ask about it.",
  medicine:
    "Coders, clinicians, and quality auditors who encode the specific guideline that holds up the diagnosis or the claim.",
  finance:
    "FP&A leads, treasurers, and close operators who explain the number to the room, and know where a $40K variance came from.",
  accounting:
    "Audit, tax, and controllership practitioners turning compliance work into encoded checklists.",
  engineering:
    "Engineers distilling tribal knowledge — the review habits, the runbooks, the post-mortems — into skills the rest of the team can run.",
  research:
    "Biostatisticians, clinical research associates, and literature-review practitioners who read protocols for a living.",
  operations:
    "Ops leaders turning recurring playbooks — onboarding, dispatch, month-end — into skills a junior can run.",
  creative:
    "Editors, story leads, and brand strategists encoding taste. Rare on the exchange; always valuable when a credential lines up.",
  education:
    "Curriculum designers, admissions readers, and instructional practitioners shaping how a body of knowledge gets taught or evaluated.",
  general:
    "Foundational skills and editorial seed entries that don't fit under a single practitioner desk.",
};

export const DOMAIN_ORDER = [
  "law",
  "medicine",
  "finance",
  "accounting",
  "research",
  "engineering",
  "operations",
  "creative",
  "education",
  "general",
];

export function labelForDomain(domain: string | undefined): string {
  if (!domain) return DOMAIN_LABELS.general!;
  return DOMAIN_LABELS[domain] ?? domain;
}
