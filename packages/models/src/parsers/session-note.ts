import type { RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../relations.js";
import type { Observation } from "../schemas/common.js";
import type { BoundPlanRef, Event, SessionNote } from "../schemas/session-note.js";
import { EventSchema, SessionNoteSchema } from "../schemas/session-note.js";
import {
  ParseError,
  bulletFieldMap,
  extractFrontmatter,
  proseFromChildren,
  sectionizeH2,
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

/**
 * Read session frontmatter, carrying every key rather than a fixed six.
 *
 * The previous version listed six keys and returned exactly those, so anything else
 * a note carried was discarded on read — including the five R-4 filtering keys and
 * the `status_history` one real note uses. R-4 rules that out explicitly: keys are
 * carried, and unspecified ones are reported rather than dropped.
 *
 * `binds_to` also stops being mandatory. It was required here and by the schema
 * while only 3 of 10 real session notes carried it, so the requirement was already
 * fiction; a note without it now reads instead of throwing.
 */
function parseFrontmatter(raw: Record<string, unknown>): SessionNote["frontmatter"] {
  const fm: Record<string, unknown> = {
    // Spread first so the typed reads below win on any key they cover.
    ...raw,
    title: asString(raw["title"]),
    type: "session",
    status: asString(raw["status"]) as SessionNote["frontmatter"]["status"],
    permalink: asString(raw["permalink"]),
    tags: asStringArray(raw["tags"]),
  };
  if (raw["binds_to"] !== undefined) fm["binds_to"] = asStringArray(raw["binds_to"]);
  if (raw["parts"] !== undefined) fm["parts"] = asStringArray(raw["parts"]);
  return fm as SessionNote["frontmatter"];
}

/**
 * Parse the "Bound Plans" section. Format:
 *   - **Ref**: [[PLAN-001: Test]]
 *     - **Worked Parts**: build.SPEC-007, build.SPEC-005
 *
 * Implemented by walking the top-level list and treating each top-level item's
 * nested list as the worked_parts field.
 */
function parseBoundPlans(children: RootContent[]): BoundPlanRef[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  const refs: BoundPlanRef[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
    const itemChildren = (item as { children: RootContent[] }).children;
    // Top item: first paragraph contains "**Ref**: ..." (no nested list expected directly)
    // But mdast list-items normally contain paragraphs + nested lists. We use the
    // ListItem's bullet-key map by treating ITS direct paragraph as text:
    const para = itemChildren.find((c) => c.type === "paragraph");
    if (!para) continue;
    const text = proseFromChildren([para]).trim();
    const refMatch = text.match(/^(?:\*\*)?Ref(?:\*\*)?:\s*(.+)$/);
    if (!refMatch?.[1]) continue;
    const ref = refMatch[1];

    // Nested list contains the worked-parts bullet
    const nested = itemChildren.find((c) => c.type === "list");
    let worked: string[] = [];
    if (nested) {
      const nestedMap = bulletFieldMap([nested]);
      const wp = nestedMap.get("Worked Parts");
      if (wp)
        worked = wp
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
    }
    if (worked.length === 0) continue;
    refs.push({ ref, worked_parts: worked });
  }
  return refs;
}

function parseEvent(heading: string, children: RootContent[]): Event {
  // heading format: "Event NN — Title"
  const m = heading.match(/^Event\s+(\d+)\s+—\s+(.+)$/);
  if (!m?.[1] || !m[2]) throw new ParseError(`malformed event heading: ${heading}`, ["event"]);
  const n = Number(m[1]);
  const title = m[2].trim();

  const fields = bulletFieldMap(children);
  const type = fields.get("Type");
  if (!type) throw new ParseError(`event ${n} missing Type field`, ["event", String(n)]);

  // Body: paragraphs AFTER the first list (which holds the field bullets)
  const firstListIdx = children.findIndex((c) => c.type === "list");
  const bodyChildren = firstListIdx >= 0 ? children.slice(firstListIdx + 1) : children;
  const body = proseFromChildren(bodyChildren);

  const base: { n: number; title: string; body?: string } = { n, title };
  if (body) base.body = body;

  // Construct event payload per type
  let payload: unknown;
  switch (type) {
    case "session-start": {
      const obj: Record<string, unknown> = { ...base, type };
      const p = fields.get("Project");
      if (p) obj["project"] = p;
      const br = fields.get("Branch");
      if (br) obj["branch"] = br;
      const sha = fields.get("Starting SHA");
      if (sha) obj["starting_sha"] = sha;
      payload = obj;
      break;
    }
    case "bootstrap": {
      const obj: Record<string, unknown> = { ...base, type };
      const step = fields.get("Step");
      if (step) obj["step"] = step;
      payload = obj;
      break;
    }
    case "part-transition": {
      const obj: Record<string, unknown> = {
        ...base,
        type,
        part: fields.get("Part"),
        from: fields.get("From"),
        to: fields.get("To"),
      };
      const outcome = fields.get("Outcome");
      if (outcome) obj["outcome"] = outcome;
      payload = obj;
      break;
    }
    case "decision-lock": {
      payload = {
        ...base,
        type,
        part: fields.get("Part"),
        decision_ids: (fields.get("Decision IDs") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      };
      break;
    }
    case "task-transition": {
      payload = {
        ...base,
        type,
        task: fields.get("Task"),
        from: fields.get("From"),
        to: fields.get("To"),
      };
      break;
    }
    case "agent-dispatch": {
      const obj: Record<string, unknown> = { ...base, type, agent: fields.get("Agent") };
      const t = fields.get("Task");
      if (t) obj["task"] = t;
      const p = fields.get("Part");
      if (p) obj["part"] = p;
      const tu = fields.get("Token Usage");
      if (tu !== undefined) obj["token_usage"] = Number(tu);
      const ds = fields.get("Duration Seconds");
      if (ds !== undefined) obj["duration_seconds"] = Number(ds);
      payload = obj;
      break;
    }
    case "debate-result": {
      const tally = parseTally(fields.get("Tally") ?? "");
      const obj: Record<string, unknown> = {
        ...base,
        type,
        target: fields.get("Target"),
        verdict: fields.get("Verdict"),
        tally,
      };
      const p0 = fields.get("P0");
      if (p0 !== undefined) obj["p0"] = Number(p0);
      const p1 = fields.get("P1");
      if (p1 !== undefined) obj["p1"] = Number(p1);
      const p2 = fields.get("P2");
      if (p2 !== undefined) obj["p2"] = Number(p2);
      const art = fields.get("Artifact");
      if (art) obj["artifact"] = art;
      payload = obj;
      break;
    }
    case "pending-decision-surfaced": {
      payload = {
        ...base,
        type,
        pud_id: fields.get("PUD ID"),
        part: fields.get("Part"),
      };
      break;
    }
    case "pending-decision-resolved": {
      payload = {
        ...base,
        type,
        pud_id: fields.get("PUD ID"),
        selected_option: fields.get("Selected Option"),
      };
      break;
    }
    case "state-change": {
      payload = {
        ...base,
        type,
        scope: fields.get("Scope"),
        target: fields.get("Target"),
      };
      break;
    }
    default:
      throw new ParseError(`unknown event type: ${type}`, ["event", String(n)]);
  }
  return EventSchema.parse(payload);
}

function parseTally(raw: string): { accept: number; concerns: number; block: number } {
  // Format: "accept=5, concerns=1, block=0"
  const out = { accept: 0, concerns: 0, block: 0 };
  for (const part of raw.split(",")) {
    const m = part.trim().match(/^(\w+)=(\d+)$/);
    if (!m?.[1] || !m[2]) continue;
    const key = m[1] as keyof typeof out;
    if (key in out) out[key] = Number(m[2]);
  }
  return out;
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
    out.push({ category: category as Observation["category"], text: body.trim(), tags });
  }
  return out;
}

export function parseSessionNote(markdown: string): SessionNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);

  const scopeChildren = sections.get("Scope") ?? [];
  const scope = proseFromChildren(scopeChildren);

  const bound_plans = parseBoundPlans(sections.get("Bound Plans") ?? []);

  const events: Event[] = [];
  for (const [heading, children] of sections) {
    if (heading.startsWith("Event ")) {
      events.push(parseEvent(heading, children));
    }
  }

  const model: SessionNote = {
    frontmatter,
    scope,
    bound_plans,
    events,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  return SessionNoteSchema.parse(model);
}
