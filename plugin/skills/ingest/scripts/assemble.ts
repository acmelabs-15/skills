/**
 * ingest content assembler.
 *
 * Produces a complete CONVENTIONS-compliant note (frontmatter + body +
 * Observations + Relations) given the parsed source, the detected entity type,
 * and the resolved counter / parent context. Source body is preserved verbatim
 * between frontmatter and the (possibly generated) Observations section.
 *
 * Two assembly paths:
 * - Brain: full CONVENTIONS compliance (Section 3 frontmatter, Section 4
 *   observations/relations, final-two-sections invariant).
 * - basic-memory: simplified — basic title + body, no required Observations
 *   or Relations.
 */

import yaml from "js-yaml";
import type { CanonicalEntityType } from "../../../src/detect-context.ts";
import type { ParsedSource } from "./parse.ts";

export interface AssembleOptions {
  type: CanonicalEntityType;
  counter: number;
  descriptor: string;
  parentSpec?: string;
  /** Folder (relative to project root) that the note will live in. */
  folder: string;
  /** Filename (kebab form, with .md). */
  filename: string;
  /** Skip Brain CONVENTIONS (basic-memory mode). */
  basicMemory?: boolean;
  /** Existing-note titles to consider for relations seeding. */
  relationTargets?: string[];
}

export interface AssembledNote {
  /** Final markdown text. */
  text: string;
  /** Frontmatter title (with colon). */
  title: string;
  /** Permalink (folder + filename stem, lowercased). */
  permalink: string;
}

const DEFAULT_TAGS_BY_TYPE: Record<CanonicalEntityType, string[]> = {
  decision: ["decision", "adr"],
  session: ["session"],
  requirement: ["requirement", "ears"],
  design: ["design"],
  task: ["task"],
  analysis: ["analysis"],
  feature: ["feature"],
  epic: ["epic"],
  critique: ["critique", "review"],
  qa: ["qa"],
  security: ["security"],
  retrospective: ["retrospective"],
  skill: ["skill"],
  spec: ["spec"],
  plan: ["plan"],
  prd: ["prd"],
};

const TITLE_PREFIXES: Record<CanonicalEntityType, string> = {
  decision: "ADR",
  session: "SESSION",
  requirement: "REQ",
  design: "DESIGN",
  task: "TASK",
  analysis: "ANALYSIS",
  feature: "FEATURE",
  epic: "EPIC",
  critique: "CRIT",
  qa: "QA",
  security: "SECURITY",
  retrospective: "RETRO",
  skill: "SKILL",
  spec: "SPEC",
  plan: "PLAN",
  prd: "PRD",
};

const SPEC_NESTED: ReadonlySet<CanonicalEntityType> = new Set(["requirement", "design", "task"]);

export function assembleNote(parsed: ParsedSource, options: AssembleOptions): AssembledNote {
  const title = buildTitle(options);
  const permalink = buildPermalink(options);

  if (options.basicMemory === true) {
    return assembleBasicMemory(parsed, title, permalink);
  }
  return assembleBrain(parsed, options, title, permalink);
}

function assembleBrain(
  parsed: ParsedSource,
  options: AssembleOptions,
  title: string,
  permalink: string,
): AssembledNote {
  const status = inferStatus(options.type);
  const fm = {
    title,
    type: options.type,
    status,
    permalink,
    tags: DEFAULT_TAGS_BY_TYPE[options.type],
  };

  const body = stripLeadingHeadingMatching(parsed.body, parsed.h1).trimEnd();

  // Generate observations and relations if absent.
  const observations = parsed.hasObservations
    ? extractSectionText(parsed.body, "Observations")
    : generateObservations(parsed, options);
  const relations = parsed.hasRelations
    ? extractSectionText(parsed.body, "Relations")
    : generateRelations(options);

  const bodyWithoutTrailingSections = removeFinalTwoSections(body);

  const lines: string[] = [];
  lines.push("---");
  lines.push(yaml.dump(fm, { lineWidth: 200 }).trimEnd());
  lines.push("---");
  lines.push("");
  lines.push(`# ${title}`);
  lines.push("");
  if (bodyWithoutTrailingSections.trim().length > 0) {
    lines.push(bodyWithoutTrailingSections.trim());
    lines.push("");
  }
  lines.push("## Observations");
  lines.push("");
  lines.push(observations.trim());
  lines.push("");
  lines.push("## Relations");
  lines.push("");
  lines.push(relations.trim());
  lines.push("");

  return { text: lines.join("\n"), title, permalink };
}

function assembleBasicMemory(
  parsed: ParsedSource,
  title: string,
  permalink: string,
): AssembledNote {
  const fm = { title, permalink };
  const lines: string[] = [];
  lines.push("---");
  lines.push(yaml.dump(fm, { lineWidth: 200 }).trimEnd());
  lines.push("---");
  lines.push("");
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(stripLeadingHeadingMatching(parsed.body, parsed.h1).trim());
  lines.push("");
  return { text: lines.join("\n"), title, permalink };
}

export function buildTitle(options: {
  type: CanonicalEntityType;
  counter: number;
  descriptor: string;
  parentSpec?: string;
}): string {
  const prefix = TITLE_PREFIXES[options.type];
  const counter = String(options.counter).padStart(3, "0");
  if (SPEC_NESTED.has(options.type) && options.parentSpec) {
    const parentId = options.parentSpec.replace(/^(SPEC-\d{3}).*$/, "$1");
    return `${prefix}-${counter}-${parentId}: ${options.descriptor}`;
  }
  return `${prefix}-${counter}: ${options.descriptor}`;
}

export function buildPermalink(options: {
  folder: string;
  filename: string;
}): string {
  const stem = options.filename.replace(/\.md$/, "");
  return `${options.folder.replace(/^docs\//, "")}/${stem}`.toLowerCase();
}

function inferStatus(type: CanonicalEntityType): string {
  if (type === "task") return "TODO";
  if (type === "session") return "IN_PROGRESS";
  return "DRAFT";
}

/** Generate at least 3 observations from the source content. */
function generateObservations(parsed: ParsedSource, options: AssembleOptions): string {
  // Pick the first 3 non-trivial paragraphs from the body, convert into
  // observations with a `[fact]` category and a type tag.
  const tag = `#${options.type}`;
  const out: string[] = [];
  const paragraphs = parsed.body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(
      (p) => p.length > 20 && !p.startsWith("#") && !p.startsWith("- ") && !p.startsWith("|"),
    );

  for (const p of paragraphs.slice(0, 3)) {
    const truncated = p.length > 200 ? `${p.slice(0, 197)}...` : p;
    out.push(`- [fact] ${truncated} ${tag} #ingested`);
  }
  while (out.length < 3) {
    out.push(`- [fact] Ingested ${options.type} note from external source ${tag} #ingested`);
  }
  return out.join("\n");
}

/** Generate at least 2 relations. */
function generateRelations(options: AssembleOptions): string {
  const out: string[] = [];
  if (options.parentSpec) {
    const parentTitle = options.parentSpec.replace(/^(SPEC-\d{3})-(.+)$/, "$1: $2");
    out.push(`- part_of [[${parentTitle}]]`);
  }
  for (const t of options.relationTargets ?? []) {
    out.push(`- relates_to [[${t}]]`);
    if (out.length >= 2) break;
  }
  while (out.length < 2) {
    out.push("- relates_to [[Ingested Source Content]]");
  }
  return out.join("\n");
}

function extractSectionText(body: string, name: string): string {
  const headingRe = new RegExp(`^## ${escapeRe(name)}\\s*$`, "m");
  const m = headingRe.exec(body);
  if (!m) return "";
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = /^## /m.exec(rest);
  return next ? rest.slice(0, next.index).trim() : rest.trim();
}

/** Strip a leading `# H1` that matches the parsed H1 (we re-emit our own). */
function stripLeadingHeadingMatching(body: string, h1: string | null): string {
  if (!h1) return body;
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") continue;
    if (line.trim() === `# ${h1}`) {
      return lines.slice(i + 1).join("\n");
    }
    break;
  }
  return body;
}

/** Remove any trailing `## Observations` and `## Relations` sections from body. */
function removeFinalTwoSections(body: string): string {
  let out = body;
  for (const name of ["Observations", "Relations"]) {
    const re = new RegExp(`\\n+## ${name}\\b[\\s\\S]*?(?=\\n## |$)`, "m");
    out = out.replace(re, "");
  }
  return out.trimEnd();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
