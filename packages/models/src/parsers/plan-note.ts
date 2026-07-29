import type { Heading, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../relations.js";
import type { Observation } from "../schemas/common.js";
import type {
  BuildWorkflowItem,
  DecisionState,
  DodItem,
  EditorMirrorEntry,
  Part,
  PendingDecision,
  PlanNote,
  Task,
} from "../schemas/plan-note.js";
import {
  BuildWorkflowItemIdSchema,
  DROPPED_H2_HEADINGS,
  PlanNoteSchema,
} from "../schemas/plan-note.js";
import {
  ParseError,
  bulletFieldMap,
  captureUnknownH2Sections,
  checkboxItems,
  extractFrontmatter,
  fieldMap,
  findTable,
  findTableWithColumns,
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

function parseFrontmatter(raw: Record<string, unknown>): PlanNote["frontmatter"] {
  return {
    title: asString(raw["title"]),
    type: "plan",
    status: asString(raw["status"]) as PlanNote["frontmatter"]["status"],
    complexity_tier: asString(raw["complexity_tier"]) as PlanNote["frontmatter"]["complexity_tier"],
    branches: asStringArray(raw["branches"]),
    permalink: asString(raw["permalink"]),
    tags: asStringArray(raw["tags"]),
  };
}

function parseScope(children: RootContent[]): { scope: string; source_reference?: string } {
  // First paragraph(s) are scope; a trailing paragraph starting with **Source**: is source_reference
  const paragraphs: string[] = [];
  let sourceReference: string | undefined;
  for (const node of children) {
    if (node.type !== "paragraph") continue;
    const text = proseFromChildren([node]);
    const sourceMatch = text.match(/^(?:\*\*)?Source(?:\*\*)?:\s*(.+)$/);
    if (sourceMatch?.[1]) {
      sourceReference = sourceMatch[1];
    } else {
      paragraphs.push(text);
    }
  }
  const scope = paragraphs.join("\n\n");
  if (sourceReference !== undefined) {
    return { scope, source_reference: sourceReference };
  }
  return { scope };
}

function parseObjectives(children: RootContent[]): PlanNote["objectives"] {
  return checkboxItems(children).map((it, idx) => ({
    id: `O-${idx + 1}`,
    text: it.text,
    done: it.done,
  }));
}

function parseDodFromText(text: string): {
  text: string;
  done: boolean;
  deferred_rationale?: string;
} {
  const m = text.match(/^(.*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), done: false, deferred_rationale: m[2].trim() };
  }
  return { text, done: false };
}

function parseDodList(children: RootContent[]): DodItem[] {
  const items = checkboxItems(children);
  return items.map((it) => {
    const parsed = parseDodFromText(it.text);
    const out: DodItem = { text: parsed.text, done: it.done };
    if (parsed.deferred_rationale) out.deferred_rationale = parsed.deferred_rationale;
    return out;
  });
}

/**
 * Derive a part's phase from its id when no `Phase` field is written.
 *
 * The id already encodes it — `build.SPEC-003` is a build part, `decisions.2` a
 * decisions part — and hand-authored notes routinely omit the field because it
 * would only restate the id. Deriving beats defaulting to a fixed phase, which
 * would silently misfile every part that omits it.
 */
function inferPhaseFromId(id: string): string {
  const stem = id.split(".")[0] ?? id;
  return stem;
}

/**
 * Take the value from a field that may carry a parenthetical aside.
 *
 * Authors annotate values in place, and the annotation is often the interesting
 * part:
 *
 *     **Substatus**: DONE (reached DONE with 15 specs → reopened → re-closed)
 *     **Failed iterations**: 0 (1 orchestrator pre-DONE correction, not a QA-fail)
 *
 * The value is what precedes the first `(`. The aside is deliberately dropped
 * rather than preserved: it is prose about the value, the schema has no field for
 * it, and the alternative was failing the whole document over a note someone left
 * for a reader. Losing it costs a comment; rejecting it costs every other field in
 * the document.
 */
function stripValueAside(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const paren = raw.indexOf("(");
  const value = (paren >= 0 ? raw.slice(0, paren) : raw).trim();
  return value.length > 0 ? value : undefined;
}

/**
 * Split a part heading into its id and any descriptive remainder.
 *
 * Headings come in two forms. `### build.SPEC-003` is bare id. `### research —
 * Multi-level gap audit (3 items)` carries a human title after an em dash, which
 * is genuinely useful to a reader and is not part of the id — feeding the whole
 * string to the id check rejects the part outright.
 *
 * The em dash is the separator; a hyphen is not, because ids legitimately contain
 * hyphens (`spec-decomposition`).
 */
function splitPartHeading(heading: string): { id: string; title?: string } {
  const dash = heading.indexOf("—");
  if (dash < 0) return { id: heading.trim() };
  const id = heading.slice(0, dash).trim();
  const title = heading.slice(dash + 1).trim();
  return title ? { id, title } : { id };
}

/**
 * Read a session reference that may be written bare or as a wikilink.
 *
 * Both spellings occur, sometimes in the same note:
 *
 *     **Owning session**: SESSION-2026-06-16_01
 *     **Owning session**: [[SESSION-2026-06-16_01: DataTable Client-Side …]]
 *
 * The wikilink form carries a descriptor after a colon, which the id itself never
 * contains, so taking everything up to the first colon inside the brackets
 * recovers the id without needing to know the descriptor.
 */
/**
 * Take the entity id from a reference that may carry a trailing descriptor.
 *
 * Entity ids never contain a colon, and wikilink titles always do
 * (`TASK-001-SPEC-003: Operator-Key Rename`), so the first colon is an unambiguous
 * boundary. Brackets are stripped if present.
 */
function stripRefDescriptor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const inner = raw.trim().match(/^\[\[(.+?)\]\]$/)?.[1] ?? raw.trim();
  const id = inner.split(":")[0]?.trim();
  return id && id.length > 0 ? id : undefined;
}

function parseSessionRef(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  // `—` is the written placeholder for "no session yet", and the renderer emits it
  // too. Treating it as a value produces a field that fails its own id check for
  // a part that is simply not started.
  if (trimmed === "" || trimmed === "—" || trimmed === "-" || trimmed === "(none)") {
    return undefined;
  }
  const inner = trimmed.match(/^\[\[(.+?)\]\]$/)?.[1] ?? trimmed;
  const id = inner.split(":")[0]?.trim();
  return id && id.length > 0 ? id : undefined;
}

function parsePart(partHeading: string, children: RootContent[]): Part {
  // `fieldMap` (not `bulletFieldMap`) because real plan notes write part fields as
  // bold-prefixed paragraph lines rather than list items, and spell the same key
  // with different capitalisation across notes — `Owning session` and
  // `Owning Session` both occur. Case-sensitive list-only reading found neither,
  // and reported the field as absent rather than erroring, so the whole part came
  // back empty and the note failed on a downstream required-field check instead of
  // where the problem was.
  const fields = fieldMap(children);
  const { id, title: headingTitle } = splitPartHeading(partHeading);
  const part: Part = {
    id,
    phase: fields.get("phase") ?? inferPhaseFromId(id),
    // An explicit `Title` field wins; otherwise the heading's descriptive half is
    // the title, which is where hand-authored notes put it.
    title: fields.get("title") ?? headingTitle ?? id,
    substatus: (stripValueAside(fields.get("substatus")) ?? "PENDING") as Part["substatus"],
    source_artifacts: parseListField(fields.get("source artifacts")),
    depends_on: parseListField(fields.get("depends on")),
    dod: [],
  };
  const owning = parseSessionRef(fields.get("owning session"));
  if (owning) part.owning_session = owning;
  const completing = parseSessionRef(fields.get("completing session"));
  if (completing) part.completing_session = completing;
  const outcome = fields.get("outcome");
  if (outcome) part.outcome = outcome;

  // DoD list is the SECOND list in the part body (first list is the bullet fields)
  const lists = children.filter((n) => n.type === "list");
  if (lists.length >= 2) {
    const dodList = lists[1];
    if (dodList) part.dod = parseDodList([dodList]);
  }

  // Decisions table — identified by its COLUMNS, not by being the first table.
  //
  // `findTable` returns the first table in the part body, which in real notes is
  // often a task list (`| Task | Status |`) or a DoD table. Reading that as
  // decisions produced rows whose `status` held task values like `TODO`, failing
  // the decision-status enum — an error that pointed at the enum while the real
  // fault was picking the wrong table. A wrong answer, not a missing one.
  //
  // The requirement is an `ID` column plus a `Status` column, which is what makes
  // a decisions table a decisions table.
  const decisionsTable = findTableWithColumns(children, ["ID", "Status"]);
  if (decisionsTable) {
    const rows = tableRows(decisionsTable);
    const decisions: DecisionState[] = rows.map((r) => ({
      id: r["ID"] ?? "",
      status: (r["Status"] ?? "PENDING") as DecisionState["status"],
      topic: r["Topic"] ?? "",
    }));
    if (decisions.length > 0) part.decisions = decisions;
  }

  // Build Workflow Items (if present) — H4 blocks beneath this part.
  const buildItems = parseBuildWorkflowItems(children);
  if (buildItems.length > 0) part.build_workflow_items = buildItems;
  return part;
}

function optStr(value: string | undefined): string | undefined {
  if (value === undefined || value === "—" || value === "") return undefined;
  return value;
}

/**
 * Read an event number written either bare or prose-prefixed.
 *
 * Real notes write `Event 34` where the renderer writes `34`. `Number("Event 34")`
 * is NaN, and the old implementation returned undefined for it — so an event
 * linkage that WAS recorded read as absent. A wrong answer rather than an error,
 * and invisible: the field simply looked unset.
 *
 * A leading label is stripped and the first integer taken. Anything with no digits
 * at all is still undefined, which is the honest answer for a genuinely empty
 * field.
 */
function optNum(value: string | undefined): number | undefined {
  const s = optStr(value);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  const digits = s.match(/\d+/);
  if (!digits) return undefined;
  const parsed = Number(digits[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBuildWorkflowItems(children: RootContent[]): BuildWorkflowItem[] {
  // Walk the flat children list; for each H4 heading, the next list contains
  // the bullet fields for that build workflow item. Renderer order is
  // deterministic: `#### {id}` followed by an 8-bullet list.
  const items: BuildWorkflowItem[] = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!node || node.type !== "heading") continue;
    if ((node as Heading).depth !== 4) continue;
    const id = mdToString(node as Heading).trim();
    // Only H4s whose heading IS a build-workflow-item id are items. Parts contain
    // other H4s — `#### D-N substatus list`, documented per-part scaffolds — and
    // treating every H4 as an item turns each one into a hard failure now that the
    // guard below is loud. The id shape is the discriminator because it is already
    // specified: `impl-TASK-NNN-SPEC-NNN` or `qa-TASK-NNN-SPEC-NNN`.
    if (!BuildWorkflowItemIdSchema.safeParse(id).success) continue;
    // Find the next list following this heading (skip paragraphs between).
    let listChild: RootContent | undefined;
    for (let j = i + 1; j < children.length; j++) {
      const candidate = children[j];
      if (!candidate) continue;
      if (candidate.type === "heading") break;
      if (candidate.type === "list") {
        listChild = candidate;
        break;
      }
    }
    if (!listChild) continue;
    // `fieldMap`, not `bulletFieldMap`: keys are matched case-insensitively and
    // the paragraph spelling is read too. Real notes write `Test report ref` where
    // the renderer writes `QA Ref`, and `Event 34` where it writes `34`; a
    // case-sensitive list-only lookup returned nothing for six of the eight field
    // names, so `type`/`taskRef`/`status` came back undefined and the item was
    // silently dropped by the guard below.
    const fm = fieldMap([listChild]);
    const type = fm.get("type") as BuildWorkflowItem["type"] | undefined;
    // The written value carries the id plus a human descriptor after a colon —
    // `TASK-001-SPEC-003: Operator-Key Rename — Number to AGG-Canonical` — where
    // the id itself never contains one. Same shape as a session ref, so the id is
    // everything before the first colon.
    const taskRef = stripRefDescriptor(fm.get("task ref") ?? fm.get("task"));
    const status = stripValueAside(fm.get("status")) as BuildWorkflowItem["status"] | undefined;
    const failedIterationsRaw = stripValueAside(fm.get("failed iterations"));
    if (!type || !taskRef || !status) {
      // Fail loudly. This guard used to `continue`, which meant a malformed item
      // vanished with no error and no count — the defect that hid the field-name
      // mismatch above for as long as it existed. A parser that cannot read
      // something says so.
      const present = [...fm.keys()].join(", ") || "(no fields found)";
      throw new ParseError(
        `build workflow item "${id}" is missing required fields (needs type, task ref, status; found: ${present})`,
        ["parts", "build_workflow_items", id],
      );
    }
    const item: BuildWorkflowItem = {
      id,
      type,
      task_ref: taskRef,
      status,
      failed_iterations: failedIterationsRaw === undefined ? 0 : (Number(failedIterationsRaw) ?? 0),
    };
    const owningSession = optStr(fm.get("owning session"));
    if (owningSession !== undefined) item.owning_session = owningSession;
    const transitionedAt = optNum(fm.get("transitioned at event"));
    if (transitionedAt !== undefined) item.transitioned_at_event = transitionedAt;
    // `Test report ref` predates the QA rename and means the same thing.
    const qaRef = optStr(fm.get("qa ref") ?? fm.get("test report ref"));
    if (qaRef !== undefined) item.qa_ref = qaRef;
    const fixBriefFor = optNum(fm.get("fix brief for event"));
    if (fixBriefFor !== undefined) item.fix_brief_for_event = fixBriefFor;
    items.push(item);
  }
  return items;
}

function parseListField(value: string | undefined): string[] {
  if (!value || value === "(none)") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Does this H3 body describe a plan part?
 *
 * The test is the presence of a `Substatus` field, which is what distinguishes a
 * part from every other H3 in a plan note. That matters because H3s are not
 * exclusive to parts: `## Risks` holds `### R1 — …` rows, `## Relations` holds
 * grouped H3s, and treating "any H3 under any H2" as a part turns risk rows into
 * parts with empty ids.
 *
 * Deliberately NOT a list of phase heading names. Real notes spell those headings
 * `## Research`, `## Research Parts (kickoff Phase 0–4)`, `## Build Parts` and
 * `## Spec Decomposition`, so any exact-match list misses some and any
 * prefix-match list eventually collides with a section that merely starts with a
 * phase word. The body says what the thing is; the heading only says where the
 * author filed it.
 */
function isPartBody(children: RootContent[]): boolean {
  return fieldMap(children).has("substatus");
}

/**
 * Collect parts from every H2 that contains part-shaped H3s.
 *
 * Parts live under `## Phase Progression` in notes the renderer produced, and
 * under per-phase H2s (`## Research`, `## Build`, …) in notes written by hand.
 * Both are read, so neither shape loses its parts, and the H2 a part was found
 * under is not recorded — a part's own `phase` field carries that, and trusting
 * the heading instead would make `## Spec Parts (kickoff Phase 5–6)` a different
 * phase from `## Spec`.
 *
 * Order follows the document, so a plan's parts come back in the sequence a
 * reader sees them.
 */
function collectParts(sections: Map<string, RootContent[]>): Part[] {
  const parts: Part[] = [];
  const seen = new Set<string>();
  for (const [, sectionChildren] of sections) {
    for (const [partId, partChildren] of sectionizeH3(sectionChildren)) {
      if (!isPartBody(partChildren)) continue;
      // A duplicate part id across two H2s is a real authoring error, but the
      // schema's own uniqueness check reports it far better than a parse-time
      // throw would; skipping here would hide it from that check entirely.
      if (seen.has(partId)) continue;
      seen.add(partId);
      parts.push(parsePart(partId, partChildren));
    }
  }
  return parts;
}

function parseTaskTable(children: RootContent[]): Task[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  const tasks: Task[] = [];
  for (const r of rows) {
    const task: Task = {
      id: r["ID"] ?? "",
      subject: r["Subject"] ?? "",
      part: r["Part"] ?? "",
      files: r["Files"] && r["Files"] !== "—" ? r["Files"].split(";").map((s) => s.trim()) : [],
      status: (r["Status"] ?? "PENDING") as Task["status"],
    };
    const effort = r["Effort"];
    if (effort && effort !== "—") task.effort = effort as Task["effort"];
    const agent = r["Agent"];
    if (agent && agent !== "—") task.agent = agent;
    const created = r["Created"];
    if (created && created !== "—") task.created_at_event = Number(created);
    const resolved = r["Resolved"];
    if (resolved && resolved !== "—") task.resolved_at_event = Number(resolved);
    tasks.push(task);
  }
  return tasks;
}

function parseTasks(children: RootContent[]): Task[] {
  const subs = sectionizeH3(children);
  const all: Task[] = [];
  for (const label of ["Active", "Backlog", "Archive"]) {
    const c = subs.get(label);
    if (!c) continue;
    all.push(...parseTaskTable(c));
  }
  return all;
}

function parsePendingDecisions(children: RootContent[]): PendingDecision[] {
  const subs = sectionizeH3(children);
  const pds: PendingDecision[] = [];
  for (const [pudId, pudChildren] of subs) {
    const fm = bulletFieldMap(pudChildren);
    // Find options list (the SECOND list — first is the field bullets)
    const lists = pudChildren.filter((n) => n.type === "list");
    const options: PendingDecision["options"] = [];
    if (lists.length >= 2) {
      const optList = lists[1];
      if (optList) {
        const optMap = bulletFieldMap([optList]);
        for (const [label, description] of optMap) {
          options.push({ label, description });
        }
      }
    }
    if (options.length < 2) continue; // skip malformed PUDs
    pds.push({
      id: pudId,
      part: fm.get("Part") ?? "",
      question: fm.get("Question") ?? "",
      surfaced_at_event: Number(fm.get("Surfaced At Event") ?? 0),
      surfaced_session: fm.get("Surfaced Session") ?? "",
      options,
    });
  }
  return pds;
}

function parseEditorMirror(children: RootContent[]): EditorMirrorEntry[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  return rows.map((r) => ({
    task_id: r["Task"] ?? "",
    cc_id: r["CC ID"] === "—" ? null : (r["CC ID"] ?? null),
    cursor_id: r["Cursor ID"] === "—" ? null : (r["Cursor ID"] ?? null),
    last_synced: r["Last Synced"] === "—" ? null : (r["Last Synced"] ?? null),
  }));
}

function parseBlockers(children: RootContent[]): string[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  // List items where the text is not "(none)"
  const items: string[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
    const text = listItemText(item);
    if (text && text !== "(none)") items.push(text);
  }
  return items;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

function parseObservations(children: RootContent[]): Observation[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  const out: Observation[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
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

/**
 * H2 headings this parser turns into typed fields. Anything outside this set and
 * outside `DROPPED_H2_HEADINGS` is captured verbatim into `unmodelled_sections`
 * so the round trip cannot lose it.
 */
const MODELLED_H2_HEADINGS = new Set<string>([
  "Scope",
  "Objectives",
  "Phase Progression",
  "Tasks",
  "Pending User Decisions",
  "Editor Mirror IDs",
  "Blockers",
  "Observations",
  "Relations",
]);

export function parsePlanNote(markdown: string): PlanNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const dropped = new Set<string>(DROPPED_H2_HEADINGS);
  const unmodelled = captureUnknownH2Sections(
    markdown,
    ast,
    (heading) => MODELLED_H2_HEADINGS.has(heading) || dropped.has(heading),
  );
  const scopeChildren = sections.get("Scope") ?? [];
  const scopeData = parseScope(scopeChildren);

  const model: PlanNote = {
    frontmatter,
    scope: scopeData.scope,
    objectives: parseObjectives(sections.get("Objectives") ?? []),
    parts: collectParts(sections),
    tasks: parseTasks(sections.get("Tasks") ?? []),
    pending_decisions: parsePendingDecisions(sections.get("Pending User Decisions") ?? []),
    editor_mirror: parseEditorMirror(sections.get("Editor Mirror IDs") ?? []),
    blockers: parseBlockers(sections.get("Blockers") ?? []),
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
    unmodelled_sections: unmodelled,
  };
  if (scopeData.source_reference !== undefined) {
    model.source_reference = scopeData.source_reference;
  }
  return PlanNoteSchema.parse(model);
}
