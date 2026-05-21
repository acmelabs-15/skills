import { parseDesignNote } from "../parsers/design-note.js";
import { parseRequirementNote } from "../parsers/requirement-note.js";
import { parseTaskNote } from "../parsers/task-note.js";

/**
 * Cross-note checkbox-flip mutation (Phase X.C deferred — unblocked by X.D.5
 * TaskNoteSchema + X.D.6 RequirementNoteSchema + DesignNoteSchema).
 *
 * The orchestrator calls `applyCheckboxMutation` to flip a `[ ]` → `[x]`
 * (or vice versa) in a source TASK / REQ / DESIGN note. The mutation operates
 * directly on the raw markdown via regex-driven section walking, then
 * re-parses the result through the appropriate parser to guarantee the
 * post-flip note still satisfies its schema.
 *
 * Renderers for TaskNote / RequirementNote / DesignNote are still deferred,
 * so the apply-via-parse-and-render pattern used by plan-mutations is not
 * available here. The markdown-string flip is the substitute: precise,
 * minimal, and re-parse-validated to catch any structural breakage.
 */

export type CheckboxTarget = "dod" | "acceptance_criteria" | "compliance_criteria";

export type FlipCheckboxMutation = {
  type: "flip-checkbox";
  /** Which section's checkbox list. */
  target: CheckboxTarget;
  /** Zero-based index of the checkbox within the target list. */
  index: number;
  /** Whether to set the checkbox to checked (true) or unchecked (false). */
  done: boolean;
  /** Optional deferral rationale; when present + done=false, treats as deferred-with-rationale. */
  deferred_rationale?: string;
};

type TargetSpec = {
  /** H2 headings that may host the checkbox list, in priority order. */
  headings: readonly string[];
  /** Human-readable label for error messages. */
  label: string;
};

const TARGET_SPECS: Record<CheckboxTarget, TargetSpec> = {
  dod: { headings: ["Definition of Done"], label: "Definition of Done" },
  acceptance_criteria: { headings: ["Acceptance Criteria"], label: "Acceptance Criteria" },
  compliance_criteria: {
    headings: ["Compliance", "Architecture Compliance"],
    label: "Compliance",
  },
};

/** Regex matching a checkbox list line. Captures: indent, mark, text. */
const CHECKBOX_LINE = /^(\s*)- \[([ xX])\] (.*)$/;

/** Regex matching the deferred-rationale suffix on an item text. */
const DEFERRED_SUFFIX = /\s*\(deferred:\s*(.+)\)\s*$/;

type CheckboxLine = {
  /** Index into the file's lines[] array. */
  lineIndex: number;
  /** Captured indent prefix (preserved on rewrite). */
  indent: string;
  /** Current checkbox state (true if `x` or `X`). */
  checked: boolean;
  /** Item text after the `] ` prefix, with any deferred suffix attached. */
  text: string;
};

/**
 * Locate the line index of the H2 heading whose text matches one of the
 * candidate headings. Returns -1 if none found.
 */
function findHeadingLine(lines: readonly string[], candidates: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[1];
    if (heading !== undefined && candidates.includes(heading)) return i;
  }
  return -1;
}

/**
 * Starting just after a heading line, collect checkbox lines that belong to
 * the section's list. The loop tolerates:
 *   - blank lines (between heading and list, and between items in a loose list)
 *   - indented continuation lines (multi-line EARS-style AC items)
 *   - leading non-checkbox prose before the first checkbox (descriptive intro)
 * It stops at the next markdown heading. Non-blank, non-indented prose
 * appearing AFTER the first checkbox also ends the list (defends against
 * trailing prose between the list and the next heading).
 *
 * The flip targets ONLY the leading `- [ ]` line of each item; multi-line
 * continuation lines are not modified, so index counting matches the parser's
 * mdast-derived ordering.
 */
function collectCheckboxesAfter(lines: readonly string[], headingLine: number): CheckboxLine[] {
  const out: CheckboxLine[] = [];
  let started = false;
  for (let i = headingLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (/^#{1,6}\s/.test(line)) break; // next heading ends the section
    const m = line.match(CHECKBOX_LINE);
    if (m) {
      const indent = m[1] ?? "";
      const mark = m[2] ?? " ";
      const text = m[3] ?? "";
      out.push({
        lineIndex: i,
        indent,
        checked: mark === "x" || mark === "X",
        text,
      });
      started = true;
      continue;
    }
    if (line.trim() === "") continue; // blank lines tolerated
    // Indented continuation of the current list item — keep scanning.
    if (started && /^\s/.test(line)) continue;
    // Before any checkbox: descriptive prose may sit between heading and list.
    if (!started) continue;
    // After the list: non-indented prose terminates it.
    break;
  }
  return out;
}

/**
 * Strip an existing ` (deferred: ...)` suffix from item text, if present.
 * The parser strips this suffix when extracting `deferred_rationale`, so any
 * flip must clean up the prior suffix before deciding whether to append a
 * new one.
 */
function stripDeferredSuffix(text: string): string {
  return text.replace(DEFERRED_SUFFIX, "").trim();
}

/**
 * Rewrite a single checkbox line with the new state and (optional)
 * deferred-rationale suffix. The indent and text body are preserved.
 */
function rewriteCheckbox(line: CheckboxLine, done: boolean, deferredRationale?: string): string {
  const mark = done ? "x" : " ";
  const baseText = stripDeferredSuffix(line.text);
  const suffix = !done && deferredRationale ? ` (deferred: ${deferredRationale})` : "";
  return `${line.indent}- [${mark}] ${baseText}${suffix}`;
}

/**
 * Dispatch a target to its parser. The parser is invoked twice during a
 * mutation cycle: once before any change (input validation) and once after
 * (post-flip validation).
 */
function parseForTarget(
  target: CheckboxTarget,
  markdown: string,
): { dod?: readonly { done: boolean; deferred_rationale?: string | undefined }[] } {
  if (target === "dod") {
    const note = parseTaskNote(markdown);
    return { dod: note.definition_of_done };
  }
  if (target === "acceptance_criteria") {
    const note = parseRequirementNote(markdown);
    return { dod: note.acceptance_criteria };
  }
  const note = parseDesignNote(markdown);
  if (!note.compliance_criteria) {
    throw new Error("flip failed: DESIGN note has no Compliance / Architecture Compliance section");
  }
  return { dod: note.compliance_criteria };
}

export function applyCheckboxMutation(markdown: string, mutation: FlipCheckboxMutation): string {
  if (mutation.index < 0) {
    throw new Error(`flip failed: negative index ${mutation.index}`);
  }

  const spec = TARGET_SPECS[mutation.target];

  // Pre-flip input validation. Surfaces schema errors and the
  // "compliance_criteria undefined" case before we touch the markdown.
  parseForTarget(mutation.target, markdown);

  const lines = markdown.split("\n");
  const headingLine = findHeadingLine(lines, spec.headings);
  if (headingLine === -1) {
    throw new Error(`flip failed: no \`## ${spec.headings.join("` or `## ")}\` heading found`);
  }

  const checkboxes = collectCheckboxesAfter(lines, headingLine);
  if (mutation.index >= checkboxes.length) {
    throw new Error(
      `flip failed: index ${mutation.index} out of bounds; ${spec.label} has ${checkboxes.length} item${checkboxes.length === 1 ? "" : "s"}`,
    );
  }

  const target = checkboxes[mutation.index];
  if (!target) {
    throw new Error(`flip failed: index ${mutation.index} resolved to no line`);
  }

  lines[target.lineIndex] = rewriteCheckbox(target, mutation.done, mutation.deferred_rationale);

  const next = lines.join("\n");

  // Post-flip schema validation + state cross-check.
  const reparsed = parseForTarget(mutation.target, next);
  const list = reparsed.dod;
  if (!list) {
    throw new Error(
      `flip failed: post-flip parse returned no ${spec.label} list at index ${mutation.index}`,
    );
  }
  const item = list[mutation.index];
  if (!item) {
    throw new Error(`flip failed: post-flip ${spec.label} list missing index ${mutation.index}`);
  }
  if (item.done !== mutation.done) {
    throw new Error(
      `flip failed: post-flip state did not match request at index ${mutation.index}`,
    );
  }
  const expectedRationale = !mutation.done ? mutation.deferred_rationale : undefined;
  if (item.deferred_rationale !== expectedRationale) {
    throw new Error(
      `flip failed: post-flip deferred_rationale did not match request at index ${mutation.index}`,
    );
  }

  return next;
}
