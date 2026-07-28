import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../relations.js";
import type { Observation } from "../schemas/common.js";
import type {
  QaApproach,
  QaFrontmatter,
  QaNote,
  QaSummary,
  QaVerdict,
  TestResultRow,
  TestRowStatus,
} from "../schemas/qa-note.js";
import { QaNoteSchema } from "../schemas/qa-note.js";
import {
  ParseError,
  bulletFieldMap,
  extractFrontmatter,
  findTable,
  proseFromChildren,
  sectionizeH2,
  sectionizeH3,
  tableRows,
} from "./ast-helpers.js";

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

function asString(v: unknown): string {
  if (typeof v !== "string") throw new ParseError(`expected string, got ${typeof v}`, []);
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ParseError("expected array", []);
  return v.map((x) => asString(x));
}

function parseFrontmatter(raw: Record<string, unknown>): QaFrontmatter {
  // Preserve the actual frontmatter `type` value rather than hard-coding;
  // schema rejects anything other than the literal `qa` at parse time.
  const rawType = asString(raw["type"]);
  return {
    title: asString(raw["title"]),
    type: rawType as QaFrontmatter["type"],
    permalink: asString(raw["permalink"]),
    status: asString(raw["status"]) as QaFrontmatter["status"],
    tags: asStringArray(raw["tags"]),
  };
}

/**
 * Extract objective prose (before any bullet list). Returns first paragraph
 * text only — the structured `- **Feature**:` / `- **Scope**:` bullets are
 * parsed separately into typed fields.
 */
function parseObjective(children: RootContent[]): {
  prose: string;
  feature: string | undefined;
  scope: string | undefined;
  acceptance_criteria_refs: string[] | undefined;
} {
  // Collect prose nodes up to (but not including) the first list.
  const proseNodes: RootContent[] = [];
  for (const node of children) {
    if (node.type === "list") break;
    proseNodes.push(node);
  }
  const prose = proseFromChildren(proseNodes);
  const fields = bulletFieldMap(children);

  const feature = fields.get("Feature");
  const scope = fields.get("Scope");
  const acRaw = fields.get("Acceptance Criteria");
  let acRefs: string[] | undefined;
  if (acRaw !== undefined && acRaw.length > 0) {
    acRefs = acRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (acRefs.length === 0) acRefs = undefined;
  }

  return {
    prose,
    feature: feature && feature.length > 0 ? feature : undefined,
    scope: scope && scope.length > 0 ? scope : undefined,
    acceptance_criteria_refs: acRefs,
  };
}

function parseApproach(children: RootContent[]): QaApproach {
  const fields = bulletFieldMap(children);
  const typesRaw = fields.get("Test Types") ?? "";
  const test_types = typesRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const environment = fields.get("Environment") ?? "";
  const data_strategy = fields.get("Data Strategy") ?? "";
  const test_file_raw = fields.get("Test File");
  const test_file =
    test_file_raw && test_file_raw.length > 0
      ? test_file_raw.replace(/^`/, "").replace(/`$/, "")
      : undefined;

  const out: QaApproach = {
    test_types,
    environment,
    data_strategy,
  };
  if (test_file !== undefined) out.test_file = test_file;
  return out;
}

const NUMERIC_RE = /-?\d+/;

function parseNumber(text: string): number {
  const m = text.match(NUMERIC_RE);
  if (!m) return 0;
  return Number.parseInt(m[0], 10);
}

function parseStatusMarker(text: string): TestRowStatus | undefined {
  const cleaned = text.replace(/[[\]]/g, "").trim().toUpperCase();
  if (cleaned === "PASS" || cleaned === "FAIL" || cleaned === "PARTIAL" || cleaned === "SKIPPED") {
    return cleaned;
  }
  return undefined;
}

/**
 * Parse `### Summary` table. Schema is a Metric-keyed table; each row has
 * `Metric | Value | Target | Status` columns. Values are numeric strings.
 * The verdict is derived from the row Status markers (PASS appears alongside
 * Passed=N or Failed=0); when no explicit verdict signal is present, derive
 * from failed===0.
 */
function parseSummary(children: RootContent[]): QaSummary {
  const tbl = findTable(children);
  if (!tbl) {
    return {
      tests_run: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      assertions: 0,
      verdict: "FAIL",
    };
  }
  const rows = tableRows(tbl);
  const byMetric = new Map<string, Record<string, string>>();
  for (const r of rows) {
    const metric = (r["Metric"] ?? "").trim();
    if (metric) byMetric.set(metric, r);
  }

  const get = (key: string): string => byMetric.get(key)?.["Value"] ?? "";
  const tests_run = parseNumber(get("Tests Run"));
  const passed = parseNumber(get("Passed"));
  const failed = parseNumber(get("Failed"));
  const skipped = parseNumber(get("Skipped"));
  const assertions = parseNumber(get("Assertions"));
  const execTimeRaw = byMetric.get("Execution Time")?.["Value"] ?? "";
  const execMatch = execTimeRaw.match(/(\d+)\s*ms/i);
  const execution_time_ms = execMatch?.[1] ? Number.parseInt(execMatch[1], 10) : undefined;

  // Derive verdict: prefer the Status column on the Failed row (canonical
  // PASS/FAIL marker per the exemplar). Fall back to derived rule.
  const failedRow = byMetric.get("Failed");
  let verdict: QaVerdict;
  const explicit = failedRow ? parseStatusMarker(failedRow["Status"] ?? "") : undefined;
  if (explicit === "PASS" || explicit === "FAIL" || explicit === "PARTIAL") {
    verdict = explicit;
  } else if (failed === 0 && tests_run > 0 && skipped > 0) {
    verdict = "PARTIAL";
  } else if (failed === 0 && tests_run > 0) {
    verdict = "PASS";
  } else {
    verdict = "FAIL";
  }

  const summary: QaSummary = {
    tests_run,
    passed,
    failed,
    skipped,
    assertions,
    verdict,
  };
  if (execution_time_ms !== undefined) summary.execution_time_ms = execution_time_ms;
  return summary;
}

function parseTestResults(children: RootContent[]): TestResultRow[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  const out: TestResultRow[] = [];
  for (const r of rows) {
    const test = (r["Test"] ?? "").trim();
    const category = (r["Category"] ?? "").trim();
    const statusRaw = (r["Status"] ?? "").trim();
    const notes = (r["Notes"] ?? "").trim();
    if (!test || !category) continue;
    const status = parseStatusMarker(statusRaw);
    if (!status) continue;
    const row: TestResultRow = { test, category, status };
    if (notes && notes !== "-") row.notes = notes;
    out.push(row);
  }
  return out;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

function parseObservations(children: RootContent[]): Observation[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Observation[] = [];
  for (const item of list.children as ListItem[]) {
    const text = listItemText(item);
    const m = text.match(/^\[(\w+)\]\s+(.+?)(?:\s+((?:#[\w-]+\s*)+))?\s*$/);
    if (!m) continue;
    const [, category, body, tagPart] = m;
    if (!category || !body) continue;
    const tags = tagPart
      ? tagPart
          .trim()
          .split(/\s+/)
          .map((t) => t.slice(1))
      : [];
    out.push({
      category: category as Observation["category"],
      text: body.trim(),
      tags,
    });
  }
  return out;
}

function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

export function parseQaNote(markdown: string): QaNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const objective = parseObjective(sections.get("Objective") ?? []);
  const approach = parseApproach(sections.get("Approach") ?? []);

  const resultsChildren = sections.get("Results") ?? [];
  const resultsH3 = sectionizeH3(resultsChildren);
  const summary = parseSummary(resultsH3.get("Summary") ?? []);
  const test_results = parseTestResults(resultsH3.get("Test Results by Category") ?? []);

  const model: QaNote = {
    frontmatter,
    objective: objective.prose,
    approach,
    summary,
    test_results,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };
  if (objective.feature !== undefined) model.feature = objective.feature;
  if (objective.scope !== undefined) model.scope = objective.scope;
  if (objective.acceptance_criteria_refs !== undefined) {
    model.acceptance_criteria_refs = objective.acceptance_criteria_refs;
  }
  if (sections.has("Findings")) {
    const findings = serializeSectionContent(sections.get("Findings") ?? []);
    if (findings.length > 0) model.findings = findings;
  }

  return QaNoteSchema.parse(model);
}
