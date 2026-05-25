/**
 * Lenient claim extraction (SPEC-008 REQ-011 LAYERED-SEVERITY, Event 114).
 *
 * The decisive sub-problem of the layered-severity refactor is classifying a
 * strict-parse THROW into either a CLAIM-lie (`deny`) or a hygiene-only issue
 * (`allow-with-warning`). The two cannot be told apart by inspecting the thrown
 * `ZodError` issues, because Zod runs a schema's `superRefine` (which carries
 * the terminal-status claim check) ONLY after the base object schema passes.
 * When a base-object hygiene field also fails — an observation `category`
 * outside the enum, an `observations`/`relations` count below the floor, a
 * `tags` bound — the base parse fails first and `superRefine` never runs, so the
 * claim issue is absent from the error. Partitioning the issue list (approach a)
 * would then see "only hygiene issues" on a note that is ALSO lying about its
 * terminal-status claim, and wrongly downgrade it to `allow-with-warning`.
 *
 * Empirically confirmed (probe in the SPEC-008 build, Event 114): a TASK at
 * `status: DONE` with an unchecked DoD item AND an observation `category` of
 * `NOT_A_CATEGORY` produces a `ZodError` whose ONLY issue is the category enum
 * failure — the "Status DONE requires ..." superRefine message is absent. That
 * is why this module exists: it determines claim-satisfaction INDEPENDENTLY of
 * hygiene by extracting only the claim-bearing fields from the markdown AST
 * (reusing the shared parser helpers) and running the real composition-library
 * claim validators on that lenient model.
 *
 * This module reuses `shared/composition` AST helpers and the actual claim
 * validators; it never duplicates a validator's PASS/FAIL logic. It mirrors,
 * field-for-field, the claim-bearing extraction each strict parser performs
 * (the `(deferred: ...)` rationale regex, the checkbox-list shapes, the `[~]`
 * SPEC-root deferred marker, the summary table, PLAN part substatuses, ADR
 * options/clarifications, ANALYSIS Open-Questions presence, EPIC `contains`
 * relations) so a lenient claim verdict equals the strict-parse claim verdict
 * whenever the strict parse would have reached `superRefine`.
 */

import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import {
  bulletFieldMap,
  findTable,
  sectionizeH2,
  sectionizeH3,
  tableRows,
} from "../parsers/ast-helpers.js";

import { validateAdrAcceptedClaim } from "./adr-claim-validator.js";
import { validateAnalysisAcceptedClaim } from "./analysis-claim-validator.js";
import { validateDesignComplianceClaim } from "./design-claim-validator.js";
import { validateEpicDoneClaim } from "./epic-claim-validator.js";
import { validatePlanDoneClaim } from "./plan-claim-validator.js";
import { validateRequirementAcClaim } from "./requirement-claim-validator.js";
import { validateSpecDoneClaim } from "./spec-claim-validator.js";
import { validateTaskDoneClaim } from "./task-claim-validator.js";
import { validateQaPassClaim } from "./qa-claim-validator.js";

/**
 * Claim-bearing note types this extractor handles. Mirrors the dispatch routing
 * table in the hook layer's `dispatch-validator.ts`; kept as a local union so
 * the composition library carries no dependency on the hook layer.
 */
export type ClaimNoteType =
  | "task"
  | "requirement"
  | "design"
  | "spec"
  | "qa"
  | "decision"
  | "plan"
  | "analysis"
  | "epic";

/**
 * Result of determining a note's claim-satisfaction leniently
 * (hygiene-independent):
 *   - `claim-fail` — the terminal-status claim contract is violated. The
 *                    `failing` text names the failing items. → caller denies.
 *   - `claim-pass` — the claim passes or is N/A (non-terminal status, or a type
 *                    whose claim self-gates and is satisfied).
 *
 * The extractor always reaches one of these two for a routed type: every
 * claim-bearing field is read from the markdown AST with empty-set fallbacks, so
 * a missing section yields an empty list (the claim validators handle empty
 * lists deterministically) rather than an indeterminate state. A genuine
 * structural defect that prevents even AST sectionizing surfaces as a throw from
 * `extractAndCheckClaim`, which the caller routes to UnparseableNoteError.
 */
export type LenientClaimResult = { kind: "claim-fail"; failing: string } | { kind: "claim-pass" };

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/** A single checkbox item in the shape the checkbox claim validators consume. */
interface CheckboxItem {
  text: string;
  done: boolean;
  deferred_rationale?: string;
  /** SPEC-root only: carries the raw `~` glyph for `[~]` deferred rows. */
  marker?: "~";
}

/** Split a `(deferred: <rationale>)` suffix off a checkbox line (mirrors parsers). */
function splitDeferred(text: string): { text: string; deferred_rationale?: string } {
  const m = text.match(/^([\s\S]*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), deferred_rationale: m[2].trim() };
  }
  return { text };
}

/**
 * Extract checkbox items from the first list under a section's children. Mirrors
 * the strict parsers: only `- [ ]` / `- [x]` items (boolean `checked`) become
 * entries; the `(deferred: ...)` rationale is split off.
 */
function checkboxItemsFromFirstList(children: RootContent[]): CheckboxItem[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  return checkboxItemsFromList(list);
}

function checkboxItemsFromList(list: List): CheckboxItem[] {
  const out: CheckboxItem[] = [];
  for (const item of list.children as ListItem[]) {
    if (typeof item.checked !== "boolean") continue;
    const raw = mdToString(item).trim();
    const parsed = splitDeferred(raw);
    const cb: CheckboxItem = { text: parsed.text, done: item.checked };
    if (parsed.deferred_rationale) cb.deferred_rationale = parsed.deferred_rationale;
    out.push(cb);
  }
  return out;
}

/**
 * SPEC-root checkbox extraction. SPEC roots flatten lists across H3 sub-sections
 * (Artifact Status often nests Requirements/Designs/Tasks) AND recognize the
 * `[~]` deferred marker. remark parses `- [~]` as `checked: null` with the
 * literal `[~]` text prefix (GFM only recognizes ` `/`x`), so this detects that
 * shape and sets `marker: "~"` — matching `isSpecRootTerminal` in the SPEC claim
 * validator, which treats `marker === "~"` as terminal.
 */
function specRootCheckboxItems(children: RootContent[]): CheckboxItem[] {
  const out: CheckboxItem[] = [];
  for (const node of children) {
    if (node.type !== "list") continue;
    for (const item of (node as List).children as ListItem[]) {
      const raw = mdToString(item).trim();
      if (typeof item.checked === "boolean") {
        const parsed = splitDeferred(raw);
        const cb: CheckboxItem = { text: parsed.text, done: item.checked };
        if (parsed.deferred_rationale) cb.deferred_rationale = parsed.deferred_rationale;
        out.push(cb);
        continue;
      }
      // `[~]` deferred row: remark yields checked=null + a literal `[~]` prefix.
      const deferredMatch = raw.match(/^\[~\]\s*([\s\S]*)$/);
      if (deferredMatch) {
        const body = splitDeferred((deferredMatch[1] ?? "").trim());
        const cb: CheckboxItem = { text: body.text, done: false, marker: "~" };
        if (body.deferred_rationale) cb.deferred_rationale = body.deferred_rationale;
        out.push(cb);
      }
    }
  }
  return out;
}

/** Pretty-join a checkbox claim validator's unsatisfied items into reason text. */
function joinUnsatisfied(items: ReadonlyArray<{ text: string }>): string {
  return items.map((u) => u.text).join(" | ");
}

/**
 * Determine claim-satisfaction for a note WITHOUT running the strict schema.
 * Called only when the strict parse threw at a recognized type; the verdict here
 * is hygiene-independent, so a claim-lie is never masked by a co-occurring
 * hygiene defect.
 *
 * `status` is the frontmatter status already extracted by the caller. The
 * checkbox validators evaluate their list regardless of status, so this gates a
 * FAIL on the declared terminal status to match the strict-parse superRefine
 * (which only fires at the terminal status). The `ok`-shape validators
 * (plan/adr/analysis/epic) self-gate on status internally.
 */
export function extractAndCheckClaim(
  type: ClaimNoteType,
  status: string,
  markdown: string,
): LenientClaimResult {
  const ast = processor.parse(markdown);
  const sections = sectionizeH2(ast);
  switch (type) {
    case "task":
      return checkTask(sections, status);
    case "requirement":
      return checkRequirement(sections, status);
    case "design":
      return checkDesign(sections, status);
    case "spec":
      return checkSpec(sections, status);
    case "qa":
      return checkQa(sections, status);
    case "decision":
      return checkAdr(sections, status);
    case "plan":
      return checkPlan(sections, status);
    case "analysis":
      return checkAnalysis(sections, status);
    case "epic":
      return checkEpic(sections, status);
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled dispatch note type: ${String(exhaustive)}`);
    }
  }
}

function checkTask(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "DONE") return { kind: "claim-pass" };
  const dod = checkboxItemsFromFirstList(sections.get("Definition of Done") ?? []);
  // Lenient partial model: the claim validator reads ONLY `definition_of_done`,
  // so the structurally-incomplete object is cast through `unknown` after we
  // have constructed exactly the field the validator consumes.
  const result = validateTaskDoneClaim({ definition_of_done: dod } as unknown as Parameters<
    typeof validateTaskDoneClaim
  >[0]);
  if (result.verdict === "FAIL") {
    return { kind: "claim-fail", failing: joinUnsatisfied(result.unsatisfied) };
  }
  return { kind: "claim-pass" };
}

function checkRequirement(
  sections: Map<string, RootContent[]>,
  status: string,
): LenientClaimResult {
  if (status !== "ACCEPTED") return { kind: "claim-pass" };
  const ac = checkboxItemsFromFirstList(sections.get("Acceptance Criteria") ?? []);
  const result = validateRequirementAcClaim({ acceptance_criteria: ac } as unknown as Parameters<
    typeof validateRequirementAcClaim
  >[0]);
  if (result.verdict === "FAIL") {
    return { kind: "claim-fail", failing: joinUnsatisfied(result.unsatisfied) };
  }
  return { kind: "claim-pass" };
}

function checkDesign(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "ACCEPTED") return { kind: "claim-pass" };
  const children = sections.get("Compliance") ?? sections.get("Architecture Compliance");
  const items = children ? checkboxItemsFromFirstList(children) : undefined;
  const model =
    items && items.length > 0 ? { compliance_criteria: items } : { compliance_criteria: undefined };
  const result = validateDesignComplianceClaim(
    model as unknown as Parameters<typeof validateDesignComplianceClaim>[0],
  );
  if (result.verdict === "FAIL") {
    return { kind: "claim-fail", failing: joinUnsatisfied(result.unsatisfied) };
  }
  return { kind: "claim-pass" };
}

function checkSpec(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "DONE") return { kind: "claim-pass" };
  const scChildren = sections.get("Success Criteria");
  const asChildren = sections.get("Artifact Status");
  const sc = scChildren ? specRootCheckboxItems(scChildren) : undefined;
  const as = asChildren ? specRootCheckboxItems(asChildren) : undefined;
  const model = {
    success_criteria: sc && sc.length > 0 ? sc : undefined,
    artifact_status: as && as.length > 0 ? as : undefined,
  };
  const result = validateSpecDoneClaim(
    model as unknown as Parameters<typeof validateSpecDoneClaim>[0],
  );
  if (result.verdict === "FAIL") {
    return {
      kind: "claim-fail",
      failing: result.unsatisfied.map((u) => `${u.section ?? "item"}:${u.text}`).join(" | "),
    };
  }
  return { kind: "claim-pass" };
}

const NUMERIC_RE = /-?\d+/;

function parseNumber(text: string): number {
  const m = text.match(NUMERIC_RE);
  return m ? Number.parseInt(m[0], 10) : 0;
}

function parseStatusMarker(text: string): "PASS" | "FAIL" | "PARTIAL" | "SKIPPED" | undefined {
  const cleaned = text.replace(/[[\]]/g, "").trim().toUpperCase();
  if (cleaned === "PASS" || cleaned === "FAIL" || cleaned === "PARTIAL" || cleaned === "SKIPPED") {
    return cleaned;
  }
  return undefined;
}

function checkQa(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "DONE") return { kind: "claim-pass" };
  const results = sectionizeH3(sections.get("Results") ?? []);
  const summaryChildren = results.get("Summary") ?? [];
  const summaryTable = findTable(summaryChildren);
  const byMetric = new Map<string, Record<string, string>>();
  if (summaryTable) {
    for (const row of tableRows(summaryTable)) {
      const metric = (row["Metric"] ?? "").trim();
      if (metric) byMetric.set(metric, row);
    }
  }
  const get = (key: string): string => byMetric.get(key)?.["Value"] ?? "";
  const tests_run = parseNumber(get("Tests Run"));
  const passed = parseNumber(get("Passed"));
  const failed = parseNumber(get("Failed"));
  const skipped = parseNumber(get("Skipped"));
  const failedRow = byMetric.get("Failed");
  const explicit = failedRow ? parseStatusMarker(failedRow["Status"] ?? "") : undefined;
  let verdict: "PASS" | "FAIL" | "PARTIAL";
  if (explicit === "PASS" || explicit === "FAIL" || explicit === "PARTIAL") {
    verdict = explicit;
  } else if (failed === 0 && tests_run > 0 && skipped > 0) {
    verdict = "PARTIAL";
  } else if (failed === 0 && tests_run > 0) {
    verdict = "PASS";
  } else {
    verdict = "FAIL";
  }

  const testResults = parseQaTestResults(results.get("Test Results by Category") ?? []);
  const model = {
    summary: { tests_run, passed, failed, skipped, verdict },
    test_results: testResults,
  };
  const result = validateQaPassClaim(
    model as unknown as Parameters<typeof validateQaPassClaim>[0],
  );
  if (result.verdict === "FAIL") {
    return { kind: "claim-fail", failing: joinUnsatisfied(result.unsatisfied) };
  }
  return { kind: "claim-pass" };
}

function parseQaTestResults(
  children: RootContent[],
): Array<{ test: string; category: string; status: "PASS" | "FAIL" | "PARTIAL" | "SKIPPED" }> {
  const table = findTable(children);
  if (!table) return [];
  const out: Array<{
    test: string;
    category: string;
    status: "PASS" | "FAIL" | "PARTIAL" | "SKIPPED";
  }> = [];
  for (const row of tableRows(table)) {
    const test = (row["Test"] ?? "").trim();
    const category = (row["Category"] ?? "").trim();
    if (!test || !category) continue;
    const status = parseStatusMarker((row["Status"] ?? "").trim());
    if (!status) continue;
    out.push({ test, category, status });
  }
  return out;
}

/** GFM Considered-Options table → {name, rationale}[] (mirrors the ADR parser). */
function adrConsideredOptions(children: RootContent[]): Array<{ name: string; rationale: string }> {
  const table = findTable(children);
  if (!table) return [];
  const out: Array<{ name: string; rationale: string }> = [];
  for (const row of tableRows(table)) {
    const nameKey = Object.keys(row).find((k) => /^(option|name)$/i.test(k));
    const rationaleKey = Object.keys(row).find((k) => /^rationale$/i.test(k));
    if (!nameKey || !rationaleKey) continue;
    const name = (row[nameKey] ?? "").trim();
    if (name.length === 0) continue;
    out.push({ name, rationale: (row[rationaleKey] ?? "").trim() });
  }
  return out;
}

/** ADR Clarifications list: checkbox or plain bullet (plain defaults done=true). */
function adrClarifications(children: RootContent[]): Array<{ text: string; done: boolean }> {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Array<{ text: string; done: boolean }> = [];
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    if (text.length === 0) continue;
    const done = typeof item.checked === "boolean" ? item.checked : true;
    out.push({ text, done });
  }
  return out;
}

function checkAdr(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "ACCEPTED") return { kind: "claim-pass" };
  const considered = adrConsideredOptions(sections.get("Considered Options") ?? []);
  const clarChildren = sections.get("Clarifications");
  const clarifications = clarChildren ? adrClarifications(clarChildren) : undefined;
  const model = {
    frontmatter: { status: "ACCEPTED" },
    considered_options: considered,
    clarifications,
  };
  const result = validateAdrAcceptedClaim(
    model as unknown as Parameters<typeof validateAdrAcceptedClaim>[0],
  );
  if (!result.ok) {
    return { kind: "claim-fail", failing: result.unsatisfied.map((u) => u.reason).join(" | ") };
  }
  return { kind: "claim-pass" };
}

function checkPlan(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "DONE") return { kind: "claim-pass" };
  const partSections = sectionizeH3(sections.get("Phase Progression") ?? []);
  const parts: Array<{ id: string; substatus: string; dod: never[] }> = [];
  for (const [partId, partChildren] of partSections) {
    const fieldMap = bulletFieldMap(partChildren);
    parts.push({ id: partId, substatus: fieldMap.get("Substatus") ?? "PENDING", dod: [] });
  }
  const model = { frontmatter: { status: "DONE" }, parts };
  const result = validatePlanDoneClaim(
    model as unknown as Parameters<typeof validatePlanDoneClaim>[0],
  );
  if (!result.ok) {
    return {
      kind: "claim-fail",
      failing: result.unsatisfied.map((u) => `${u.part_id}=${u.substatus}`).join(" | "),
    };
  }
  return { kind: "claim-pass" };
}

function checkAnalysis(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "ACCEPTED") return { kind: "claim-pass" };
  const hasOpenQuestions = sections.has("Open Questions");
  const model = { frontmatter: { status: "ACCEPTED" }, hasOpenQuestions };
  const result = validateAnalysisAcceptedClaim(
    model as unknown as Parameters<typeof validateAnalysisAcceptedClaim>[0],
  );
  if (!result.ok) {
    return { kind: "claim-fail", failing: result.unsatisfied.map((u) => u.reason).join(" | ") };
  }
  return { kind: "claim-pass" };
}

/** Relations parser (verb [[Target]]) — mirrors the shared parsers. */
function parseRelationVerbs(children: RootContent[]): Array<{ verb: string; target: string }> {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Array<{ verb: string; target: string }> = [];
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    const m = text.match(/^(\w+)\s+\[\[(.+?)\]\]\s*$/);
    if (!m) continue;
    const [, verb, target] = m;
    if (!verb || !target) continue;
    out.push({ verb, target });
  }
  return out;
}

function checkEpic(sections: Map<string, RootContent[]>, status: string): LenientClaimResult {
  if (status !== "DONE") return { kind: "claim-pass" };
  const relations = parseRelationVerbs(sections.get("Relations") ?? []);
  const model = { frontmatter: { status: "DONE" }, relations };
  // No SPEC resolver is available at the hook boundary; validateEpicDoneClaim
  // throws when status is DONE with `contains` relations but no resolver. That
  // throw is a missing-dependency signal, NOT a claim rejection — the hook
  // cannot resolve cross-note SPEC status synchronously — so it is treated as a
  // non-failing claim (claim-pass), mirroring the strict-path route handler.
  try {
    const result = validateEpicDoneClaim(
      model as unknown as Parameters<typeof validateEpicDoneClaim>[0],
    );
    if (!result.ok) {
      return {
        kind: "claim-fail",
        failing: result.unsatisfied.map((u) => `${u.spec_ref}=${u.status}`).join(" | "),
      };
    }
    return { kind: "claim-pass" };
  } catch {
    return { kind: "claim-pass" };
  }
}
