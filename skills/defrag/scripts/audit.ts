/**
 * defrag audit engine.
 *
 * Phase 1 (discovery): enumerate notes under docs/** and read frontmatter + body.
 * Phase 2 (evaluation): apply CONVENTIONS Section 6 thresholds and scope-evaluation
 * heuristics, classify each note into zero or more candidate buckets.
 *
 * Pure-function shape: takes a `MemoryAdapter` (dependency injected for tests) and
 * an options bag, returns a structured `AuditResult`. The default file-system
 * adapter uses Bun.file + Bun.Glob; tests inject a mock adapter to avoid touching
 * disk.
 */

import { join } from "node:path";
import yaml from "js-yaml";
import { extractFrontmatter } from "../../../_shared/detect-context.ts";

export type ViolationType = "split" | "merge" | "stale" | "structural-fix";

export interface AuditCandidate {
  /** Path relative to project root (e.g. "docs/specs/SPEC-001/.../TASK-001.md"). */
  path: string;
  /** Entity type from frontmatter (or "unknown"). */
  entityType: string;
  violationType: ViolationType;
  violationDetail: string;
  evidence: AuditEvidence;
}

export interface AuditEvidence {
  observationCount: number;
  relationCount: number;
  lineCount: number;
  hasObservationH3Grouping: boolean;
  hasRelationH3Grouping: boolean;
  lastModifiedISO: string | null;
  status: string | null;
}

export interface AuditResult {
  candidates: AuditCandidate[];
  notesScanned: number;
  by: Record<ViolationType, AuditCandidate[]>;
}

export interface AuditOptions {
  projectRoot: string;
  /** Staleness threshold in days (default 90, per REQ-002-SPEC-006 AC-5). */
  stalenessDays?: number;
  /** Adapter for file ops + git (default uses Bun + git). */
  adapter?: MemoryAdapter;
}

export interface MemoryAdapter {
  listNotes(docsPath: string): AsyncIterable<string>;
  readNote(absPath: string): Promise<string>;
  lastModified(absPath: string): Promise<string | null>;
}

/** Default file-system adapter (real Bun + git). */
export const defaultMemoryAdapter: MemoryAdapter = {
  async *listNotes(docsPath: string) {
    const glob = new Bun.Glob("**/*.md");
    for await (const rel of glob.scan({ cwd: docsPath, onlyFiles: true, absolute: false })) {
      yield rel;
    }
  },
  async readNote(absPath: string) {
    return await Bun.file(absPath).text();
  },
  async lastModified(absPath: string) {
    try {
      const r = await Bun.$`git log -1 --format=%aI -- ${absPath}`.quiet().nothrow().text();
      const out = r.trim();
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  },
};

const OBS_MAX = 15;
const REL_MAX = 12;
const OBS_MIN = 3;
const REL_MIN = 2;
const LINE_MAX = 500;
const DEFAULT_STALENESS_DAYS = 90;
const TERMINAL_STATUSES = new Set(["DONE", "DEPRECATED"]);

export async function audit(options: AuditOptions): Promise<AuditResult> {
  const adapter = options.adapter ?? defaultMemoryAdapter;
  const stalenessDays = options.stalenessDays ?? DEFAULT_STALENESS_DAYS;
  const docsPath = join(options.projectRoot, "docs");
  const candidates: AuditCandidate[] = [];
  let notesScanned = 0;

  for await (const rel of adapter.listNotes(docsPath)) {
    notesScanned++;
    const absPath = join(docsPath, rel);
    let body: string;
    try {
      body = await adapter.readNote(absPath);
    } catch {
      continue;
    }
    const fm = extractFrontmatter(body) ?? {};
    const entityType = typeof fm["type"] === "string" ? fm["type"] : "unknown";
    const status = typeof fm["status"] === "string" ? fm["status"] : null;
    const evidence: AuditEvidence = {
      observationCount: countObservations(body),
      relationCount: countRelations(body),
      lineCount: body.split("\n").length,
      hasObservationH3Grouping: hasH3InSection(body, "Observations"),
      hasRelationH3Grouping: hasH3InSection(body, "Relations"),
      lastModifiedISO: await adapter.lastModified(absPath),
      status,
    };

    const notePath = `docs/${rel}`;
    for (const c of classify(notePath, entityType, evidence, stalenessDays)) candidates.push(c);
  }

  const by: Record<ViolationType, AuditCandidate[]> = {
    split: [],
    merge: [],
    stale: [],
    "structural-fix": [],
  };
  for (const c of candidates) by[c.violationType].push(c);
  return { candidates, notesScanned, by };
}

function classify(
  path: string,
  entityType: string,
  e: AuditEvidence,
  stalenessDays: number,
): AuditCandidate[] {
  const out: AuditCandidate[] = [];

  // split: > 15 observations without H3 sub-grouping
  if (e.observationCount > OBS_MAX && !e.hasObservationH3Grouping) {
    out.push({
      path,
      entityType,
      violationType: "split",
      violationDetail: `observations=${e.observationCount} exceeds ${OBS_MAX} without H3 sub-grouping`,
      evidence: e,
    });
  }
  // split: > 500 lines
  if (e.lineCount > LINE_MAX) {
    out.push({
      path,
      entityType,
      violationType: "split",
      violationDetail: `lineCount=${e.lineCount} exceeds ${LINE_MAX}`,
      evidence: e,
    });
  }
  // merge: < 3 observations
  if (e.observationCount < OBS_MIN) {
    out.push({
      path,
      entityType,
      violationType: "merge",
      violationDetail: `observations=${e.observationCount} below minimum ${OBS_MIN}`,
      evidence: e,
    });
  }
  // merge: < 2 relations
  if (e.relationCount < REL_MIN) {
    out.push({
      path,
      entityType,
      violationType: "merge",
      violationDetail: `relations=${e.relationCount} below minimum ${REL_MIN}`,
      evidence: e,
    });
  }
  // structural-fix: > 12 relations without H3 grouping
  if (e.relationCount > REL_MAX && !e.hasRelationH3Grouping) {
    out.push({
      path,
      entityType,
      violationType: "structural-fix",
      violationDetail: `relations=${e.relationCount} exceeds ${REL_MAX} without H3 type-grouping`,
      evidence: e,
    });
  }
  // stale: last-modified older than threshold AND status not DONE/DEPRECATED
  if (e.lastModifiedISO && !TERMINAL_STATUSES.has(e.status ?? "")) {
    const ageDays = (Date.now() - new Date(e.lastModifiedISO).getTime()) / 86400000;
    if (ageDays > stalenessDays) {
      out.push({
        path,
        entityType,
        violationType: "stale",
        violationDetail: `last-modified ${Math.floor(ageDays)}d ago exceeds ${stalenessDays}d threshold; status=${e.status ?? "(unset)"}`,
        evidence: e,
      });
    }
  }

  return out;
}

/** Count observations: lines starting with `- [category]` inside `## Observations`. */
export function countObservations(body: string): number {
  const section = extractSection(body, "Observations");
  if (section === null) return 0;
  return (section.match(/^- \[[a-z-]+\]/gim) ?? []).length;
}

/** Count relations: lines starting with `- ` inside `## Relations`. */
export function countRelations(body: string): number {
  const section = extractSection(body, "Relations");
  if (section === null) return 0;
  return (section.match(/^- \S/gm) ?? []).length;
}

/** Whether the named H2 section contains any H3 sub-heading. */
export function hasH3InSection(body: string, sectionName: string): boolean {
  const section = extractSection(body, sectionName);
  if (section === null) return false;
  return /^### /m.test(section);
}

/** Extract text between `## <name>` and the next H2 (or end-of-file). */
export function extractSection(body: string, name: string): string | null {
  const headingRe = new RegExp(`^## ${escapeRe(name)}\\s*$`, "m");
  const m = headingRe.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = /^## /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Re-export for tests.
export { yaml };
