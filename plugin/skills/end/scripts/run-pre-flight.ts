#!/usr/bin/env bun
/**
 * run-pre-flight — CONVENTIONS Section 8.1 pre-flight checklist runner (end skill).
 *
 * Reads any Brain note and enumerates the 11 pre-flight checklist items from
 * KNOWLEDGE-GRAPH-CONVENTIONS Section 8.1. Each failing item is surfaced to
 * stderr prefixed with its Section 8.1 item NUMBER so the orchestrator can cite
 * the exact gate that failed (TASK-014 DoD #2, traceability decision).
 *
 * Checks derive from the composition library wherever a canonical enum exists:
 * observation categories from `ObservationCategoryEnum` and relation verbs from
 * `validRelationTypes` — not from hand-copied prose lists. Frontmatter is read
 * with `js-yaml`; section structure is scanned line-by-line (no remark
 * processor — its transitive deps live only under the composition module tree
 * and do not resolve from a per-skill script location).
 *
 * Exit codes:
 *   0  all 11 items pass (stdout = "ok: 11/11")
 *   1  one or more checklist items fail (stderr lists each with its 8.1 number)
 *   2  usage error / path-containment violation / file-not-found / parse failure
 */

import { basename, resolve, sep } from "node:path";
import { ObservationCategoryEnum, validRelationTypes } from "@acmelabs/models/schemas/common";
import yaml from "js-yaml";

/** The 16 canonical entity types (CONVENTIONS Section 3, item 8.1.5). */
const CANONICAL_TYPES = new Set<string>([
  "decision",
  "session",
  "requirement",
  "design",
  "task",
  "analysis",
  "feature",
  "epic",
  "critique",
  "qa",
  "security",
  "retrospective",
  "skill",
  "spec",
  "plan",
  "prd",
]);

/** type → folder substring mapping (CONVENTIONS Section 5.1, item 8.1.10). */
const TYPE_FOLDER: Record<string, string> = {
  decision: "decisions/",
  analysis: "analysis/",
  critique: "critique/",
  session: "sessions/",
  spec: "specs/",
  task: "tasks/",
  design: "design/",
  requirement: "requirements/",
  plan: "planning/",
  prd: "planning/",
  epic: "roadmap/",
  feature: "roadmap/",
  retrospective: "retrospective/",
  qa: "qa/",
  security: "security/",
  skill: "skills/",
};

const GENERAL_STATUS = new Set([
  "DRAFT",
  "ACCEPTED",
  "PROPOSED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "DEPRECATED",
]);
const TASK_STATUS = new Set(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]);

interface Finding {
  item: number;
  ok: boolean;
  detail: string;
  /**
   * Set when a check could not be evaluated rather than evaluated and failed.
   * Two of the eleven checks read the note's location, so a caller holding
   * unwritten text has nothing for them to read. Reporting those as failures
   * would tell a caller its draft is malformed when the truth is that the
   * question does not apply yet, so they are marked skipped and `ok` stays
   * true — a skip must never gate a write.
   */
  skipped?: boolean;
}

interface ParsedNote {
  fm: Record<string, unknown>;
  h1: string | null;
  /** Ordered H2 heading texts as they appear in the body. */
  order: string[];
  /** H2 heading text → its `- ` bullet lines. */
  sections: Map<string, string[]>;
}

const OBSERVATION_RE = /^-\s+\[(\w+)\]\s+.+?\s(#[\w-]+(?:\s+#[\w-]+){0,2})\s*$/;
const RELATION_RE = /^-\s+(\w+)\s+\[\[[^\]]+:[^\]]+\]\]\s*$/;

/**
 * Split a Brain note into frontmatter + H1 + ordered H2 sections. Frontmatter
 * is the first `---`-fenced YAML block; sections are H2 (`## `) headings with
 * their `- ` bullet lines. Throws when no frontmatter block is present.
 */
function parseNote(markdown: string): ParsedNote {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch || fmMatch[1] === undefined) {
    throw new Error("no frontmatter block found");
  }
  const loaded = yaml.load(fmMatch[1]);
  if (typeof loaded !== "object" || loaded === null) {
    throw new Error("frontmatter did not parse as a mapping");
  }
  const fm = loaded as Record<string, unknown>;
  const body = markdown.slice(fmMatch[0].length);

  let h1: string | null = null;
  const order: string[] = [];
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of body.split("\n")) {
    const h1m = line.match(/^#\s+(.+?)\s*$/);
    if (h1m?.[1] !== undefined) {
      h1 ??= h1m[1].trim();
      continue;
    }
    const h2m = line.match(/^##\s+(.+?)\s*$/);
    if (h2m?.[1] !== undefined) {
      current = h2m[1].trim();
      order.push(current);
      sections.set(current, []);
      continue;
    }
    if (current !== null && line.startsWith("- ")) {
      sections.get(current)?.push(line);
    }
  }
  return { fm, h1, order, sections };
}

function checkTitle(fm: Record<string, unknown>): Finding {
  const title = typeof fm["title"] === "string" ? fm["title"] : "";
  const ok = /^[A-Z][A-Z0-9-]*\d.*:\s.+/.test(title) && title.includes(": ");
  return { item: 1, ok, detail: `title "${title}" must be '{ENTITY-ID}: {Descriptor}'` };
}

function checkFilename(filePath: string): Finding {
  const name = basename(filePath, ".md");
  // CAPS entity prefix + lowercase kebab body, no spaces (session counter `_NN`
  // is the only underscore exception).
  const ok = /^[A-Z]+-\d/.test(name) && !/\s/.test(name) && /^[A-Z0-9_-]+-[a-z0-9-]+$/.test(name);
  return { item: 2, ok, detail: `filename "${name}.md" must be CAPS-prefix + kebab body` };
}

function checkPermalink(fm: Record<string, unknown>): Finding {
  const pl = typeof fm["permalink"] === "string" ? fm["permalink"] : "";
  const ok = pl.length > 0 && pl === pl.toLowerCase() && pl.includes("/") && !/\s/.test(pl);
  return { item: 3, ok, detail: `permalink "${pl}" must be lowercase '{folder}/{stem}'` };
}

function checkH1(fm: Record<string, unknown>, h1: string | null): Finding {
  const title = typeof fm["title"] === "string" ? fm["title"] : "";
  const ok = h1 !== null && h1 === title;
  return { item: 4, ok, detail: `H1 "${h1 ?? "<none>"}" must match frontmatter title "${title}"` };
}

function checkType(fm: Record<string, unknown>): Finding {
  const type = typeof fm["type"] === "string" ? fm["type"] : "";
  const ok = CANONICAL_TYPES.has(type);
  return { item: 5, ok, detail: `type "${type}" must be one of the 16 canonical types` };
}

function checkStatus(fm: Record<string, unknown>): Finding {
  const status = typeof fm["status"] === "string" ? fm["status"] : "";
  const ok = GENERAL_STATUS.has(status) || TASK_STATUS.has(status);
  return { item: 6, ok, detail: `status "${status}" must be a canonical status value` };
}

function checkTags(fm: Record<string, unknown>): Finding {
  const tags = fm["tags"];
  const arr = Array.isArray(tags) ? tags : [];
  const ok =
    arr.length >= 2 &&
    arr.length <= 5 &&
    arr.every((t) => typeof t === "string" && t === t.toLowerCase() && !/\s/.test(t));
  return { item: 7, ok, detail: `tags must be 2-5 lowercase hyphenated (got ${arr.length})` };
}

function checkObservations(sections: Map<string, string[]>): Finding {
  const lines = sections.get("Observations") ?? [];
  const categories = new Set(ObservationCategoryEnum.options as readonly string[]);
  const valid = lines.filter((l) => {
    const m = l.match(OBSERVATION_RE);
    return m?.[1] !== undefined && categories.has(m[1]);
  });
  const ok = valid.length >= 3 && valid.length === lines.length;
  return {
    item: 8,
    ok,
    detail: `Observations need min 3 with [category]+1-3 #tags (got ${valid.length}/${lines.length} valid)`,
  };
}

function checkRelations(sections: Map<string, string[]>): Finding {
  const lines = sections.get("Relations") ?? [];
  const verbs = new Set(validRelationTypes as readonly string[]);
  const valid = lines.filter((l) => {
    const m = l.match(RELATION_RE);
    return m?.[1] !== undefined && verbs.has(m[1]);
  });
  const ok = valid.length >= 2 && valid.length === lines.length;
  return {
    item: 9,
    ok,
    detail: `Relations need min 2 with valid verb + colon-wikilink (got ${valid.length}/${lines.length} valid)`,
  };
}

function checkFolder(fm: Record<string, unknown>, filePath: string): Finding {
  const type = typeof fm["type"] === "string" ? fm["type"] : "";
  const expected = TYPE_FOLDER[type];
  const ok = expected !== undefined && resolve(filePath).includes(expected);
  return { item: 10, ok, detail: `type "${type}" expects folder containing "${expected ?? "?"}"` };
}

function checkFinalSections(order: string[]): Finding {
  const n = order.length;
  const ok = n >= 2 && order[n - 2] === "Observations" && order[n - 1] === "Relations";
  return { item: 11, ok, detail: "final two sections must be Observations then Relations" };
}

function runChecks(markdown: string, filePath: string): Finding[] {
  const { fm, h1, order, sections } = parseNote(markdown);
  return [
    checkTitle(fm),
    checkFilename(filePath),
    checkPermalink(fm),
    checkH1(fm, h1),
    checkType(fm),
    checkStatus(fm),
    checkTags(fm),
    checkObservations(sections),
    checkRelations(sections),
    checkFolder(fm, filePath),
    checkFinalSections(order),
  ];
}

/** The two checks that read the note's location rather than its text. */
const PATH_DEPENDENT_ITEMS = new Set([2, 10]);

/**
 * Check note text that has no file yet.
 *
 * Nine of the eleven checks read only the markdown, so a draft can be held to
 * the same standard as a written note before anything lands on disk. The two
 * that need a path — filename shape and folder-by-type — come back `skipped`
 * with `ok` left true, so a caller gating a write on this result refuses
 * malformed content without refusing content whose location is simply not
 * decided yet.
 */
function checkDraft(markdown: string): Finding[] {
  return runChecks(markdown, "<draft>").map((f) =>
    PATH_DEPENDENT_ITEMS.has(f.item)
      ? {
          item: f.item,
          ok: true,
          skipped: true,
          detail: `${f.detail} — skipped: draft has no path`,
        }
      : f,
  );
}

async function main(args: string[]): Promise<number> {
  const notePath = args[0];
  if (notePath === undefined || notePath.length === 0) {
    process.stderr.write("usage: run-pre-flight.ts <note-path>\n");
    return 2;
  }

  // Path-containment (ADR-005 D-8): accept ONLY paths that resolve to the
  // project root itself or a descendant. Bare `.startsWith(root)` is forbidden —
  // it false-accepts sibling prefixes (e.g. /repo-evil vs /repo).
  const projectRoot = process.cwd();
  const resolved = resolve(projectRoot, notePath);
  if (!(resolved === projectRoot || resolved.startsWith(projectRoot + sep))) {
    process.stderr.write(`path-containment violation: ${notePath}\n`);
    return 2;
  }

  let findings: Finding[];
  try {
    const markdown = await Bun.file(resolved).text();
    findings = runChecks(markdown, resolved);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`cannot read or parse note: ${message}\n`);
    return 2;
  }

  const failed = findings.filter((f) => !f.ok);
  if (failed.length > 0) {
    for (const f of failed) {
      process.stderr.write(`[8.1.${f.item}] FAIL: ${f.detail}\n`);
    }
    return 1;
  }

  process.stdout.write(`ok: ${findings.length}/${findings.length}\n`);
  return 0;
}

if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}

export { main, runChecks, checkDraft };
