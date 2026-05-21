/**
 * ingest entity-type detection and target path resolution.
 *
 * Maps the source frontmatter `type` (or a CLI override) to one of the 16
 * canonical entity types, then resolves the target folder per CONVENTIONS
 * Section 5.1 entity-type-to-folder mapping.
 *
 * Spec-nested types (requirement, design, task) require a parent SPEC
 * identifier; the caller is expected to supply it via `parentSpec` (e.g.
 * "SPEC-001-foo"). For top-level types the parent is ignored.
 */

import { CANONICAL_ENTITY_TYPES, type CanonicalEntityType } from "../../_shared/detect-context.ts";
import type { ParsedSource } from "./parse.ts";

/** CONVENTIONS Section 5.1 entity-type-to-folder mapping (16 canonical types). */
export const TYPE_TO_FOLDER: Record<CanonicalEntityType, string> = {
  decision: "docs/decisions",
  session: "docs/sessions",
  requirement: "docs/specs/{parentSpec}/requirements",
  design: "docs/specs/{parentSpec}/design",
  task: "docs/specs/{parentSpec}/tasks",
  analysis: "docs/analysis",
  feature: "docs/roadmap",
  epic: "docs/roadmap",
  critique: "docs/critique",
  "test-report": "docs/qa",
  security: "docs/security",
  retrospective: "docs/retrospective",
  skill: "docs/skills",
  spec: "docs/specs/{parentSpec}",
  plan: "docs/planning",
  prd: "docs/planning",
};

/** Entity-type prefix (CAPS) used in filenames and titles. */
export const TYPE_TO_PREFIX: Record<CanonicalEntityType, string> = {
  decision: "ADR",
  session: "SESSION",
  requirement: "REQ",
  design: "DESIGN",
  task: "TASK",
  analysis: "ANALYSIS",
  feature: "FEATURE",
  epic: "EPIC",
  critique: "CRIT",
  "test-report": "TEST-REPORT",
  security: "SECURITY",
  retrospective: "RETRO",
  skill: "SKILL",
  spec: "SPEC",
  plan: "PLAN",
  prd: "PRD",
};

export const SPEC_NESTED_TYPES: ReadonlySet<CanonicalEntityType> = new Set([
  "requirement",
  "design",
  "task",
]);

export interface DetectTypeOptions {
  /** Explicit --type override (highest priority). */
  override?: string;
  /** Parent SPEC identifier (e.g. "SPEC-001-foo") for spec-nested types. */
  parentSpec?: string;
}

export interface DetectTypeResult {
  type: CanonicalEntityType;
  source: "override" | "frontmatter" | "fallback";
  /** True when the resolved type requires a parentSpec that was NOT supplied. */
  missingParentSpec: boolean;
}

/** Determine the entity type for a parsed source. */
export function detectType(
  parsed: ParsedSource,
  options: DetectTypeOptions = {},
): DetectTypeResult {
  let type: CanonicalEntityType | null = null;
  let source: DetectTypeResult["source"] = "fallback";

  if (options.override && isCanonical(options.override)) {
    type = options.override;
    source = "override";
  } else if (
    parsed.frontmatter &&
    typeof parsed.frontmatter["type"] === "string" &&
    isCanonical(parsed.frontmatter["type"])
  ) {
    type = parsed.frontmatter["type"];
    source = "frontmatter";
  } else {
    type = "analysis"; // safe fallback per DESIGN-002
    source = "fallback";
  }

  const missingParentSpec = SPEC_NESTED_TYPES.has(type) && !options.parentSpec;
  return { type, source, missingParentSpec };
}

/** Resolve the target folder for an entity type, expanding `{parentSpec}` if present. */
export function resolveTargetFolder(type: CanonicalEntityType, parentSpec?: string): string {
  const tpl = TYPE_TO_FOLDER[type];
  if (tpl.includes("{parentSpec}")) {
    if (!parentSpec) throw new Error(`Type "${type}" requires a parentSpec`);
    return tpl.replace("{parentSpec}", parentSpec);
  }
  return tpl;
}

/** Compute the next available NNN counter for `prefix` in `existing` filenames. */
export function nextCounter(prefix: string, existing: string[]): number {
  const re = new RegExp(`^${escapeRe(prefix)}-(\\d{3})-`);
  let max = 0;
  for (const name of existing) {
    const m = re.exec(name);
    if (m) {
      const n = Number.parseInt(m[1] ?? "0", 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/** Build the title in `{ENTITY-ID}: {Descriptor}` form. */
export function buildTitle(
  type: CanonicalEntityType,
  counter: number,
  descriptor: string,
  parentSpec?: string,
): string {
  const prefix = TYPE_TO_PREFIX[type];
  const counterStr = String(counter).padStart(3, "0");
  if (SPEC_NESTED_TYPES.has(type) && parentSpec) {
    const parentId = parentSpec.replace(/^(SPEC-\d{3}).*$/, "$1");
    return `${prefix}-${counterStr}-${parentId}: ${descriptor}`;
  }
  return `${prefix}-${counterStr}: ${descriptor}`;
}

/** Convert a descriptor to kebab. */
export function kebabize(descriptor: string): string {
  return descriptor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build the kebab filename (no extension prefix). */
export function buildFilename(
  type: CanonicalEntityType,
  counter: number,
  descriptor: string,
  parentSpec?: string,
): string {
  const prefix = TYPE_TO_PREFIX[type];
  const counterStr = String(counter).padStart(3, "0");
  const desc = kebabize(descriptor);
  if (SPEC_NESTED_TYPES.has(type) && parentSpec) {
    const parentId = parentSpec.replace(/^(SPEC-\d{3}).*$/, "$1");
    return `${prefix}-${counterStr}-${parentId}-${desc}.md`;
  }
  return `${prefix}-${counterStr}-${desc}.md`;
}

function isCanonical(s: string): s is CanonicalEntityType {
  return (CANONICAL_ENTITY_TYPES as readonly string[]).includes(s);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
