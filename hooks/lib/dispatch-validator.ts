/**
 * Frontmatter-type-to-validator dispatch (SPEC-008 TASK-038, Wave 2).
 *
 * The single chokepoint between the hook handler scripts (Layers 1-6 in
 * DESIGN-004) and the composition-library claim-validator catalog. A handler
 * hands this module the proposed Brain-note content plus its file path; the
 * module reads the frontmatter `type:`, routes to the matching parser +
 * claim validator, and returns a three-way `DispatchOutcome`.
 *
 * Three-way verdict (hybrid failure semantics):
 *   - `deny`               — a status-flip claim failed: the note declares a
 *                            terminal status (TASK DONE, REQ/DESIGN/ADR/ANALYSIS
 *                            ACCEPTED, SPEC/PLAN/EPIC/QA DONE) but its DoD /
 *                            acceptance / compliance / completion contract is
 *                            unsatisfied. Hard-blocks the write.
 *   - `allow-with-warning` — the note parses and its claim (if any) passes, but
 *                            a non-blocking quality issue is present (e.g. the
 *                            structural floor of observations/relations is only
 *                            just met). Surfaces advisory text; never blocks.
 *   - `allow`              — the note parses cleanly and every claim passes.
 *
 * Error boundary: this module MUST NOT throw on any validator-reachable
 * rejection — those map to `deny`. It throws `UnparseableNoteError` ONLY when
 * the input cannot be structurally parsed for a reason that is NOT a
 * terminal-status claim violation (a genuine shape/structural defect). The
 * caller converts that throw into a structured stderr error and exits
 * non-zero, where the runtime fail-open semantics apply (DESIGN-004).
 */

import { load as loadYaml } from "js-yaml";

import { parseAdrNote } from "../../shared/composition/src/parsers/adr-note.ts";
import { parseAnalysisNote } from "../../shared/composition/src/parsers/analysis-note.ts";
import { parseDesignNote } from "../../shared/composition/src/parsers/design-note.ts";
import { parseEpicNote } from "../../shared/composition/src/parsers/epic-note.ts";
import { parsePlanNote } from "../../shared/composition/src/parsers/plan-note.ts";
import { parseRequirementNote } from "../../shared/composition/src/parsers/requirement-note.ts";
import { parseSpecRootNote } from "../../shared/composition/src/parsers/spec-root-note.ts";
import { parseTaskNote } from "../../shared/composition/src/parsers/task-note.ts";
import { parseTestReportNote } from "../../shared/composition/src/parsers/test-report-note.ts";
import { validateAdrAcceptedClaim } from "../../shared/composition/src/validators/adr-claim-validator.ts";
import { validateAnalysisAcceptedClaim } from "../../shared/composition/src/validators/analysis-claim-validator.ts";
import { validateDesignComplianceClaim } from "../../shared/composition/src/validators/design-claim-validator.ts";
import { validateEpicDoneClaim } from "../../shared/composition/src/validators/epic-claim-validator.ts";
import { validatePlanDoneClaim } from "../../shared/composition/src/validators/plan-claim-validator.ts";
import { validateRequirementAcClaim } from "../../shared/composition/src/validators/requirement-claim-validator.ts";
import { validateSpecDoneClaim } from "../../shared/composition/src/validators/spec-claim-validator.ts";
import { validateTaskDoneClaim } from "../../shared/composition/src/validators/task-claim-validator.ts";
import { validateTestReportPassClaim } from "../../shared/composition/src/validators/test-report-claim-validator.ts";

/** Brain-note `type:` values that carry a claim contract (CRIT excluded per ADR-005 D-5). */
export type DispatchNoteType =
  | "task"
  | "requirement"
  | "design"
  | "spec"
  | "qa"
  | "decision"
  | "plan"
  | "analysis"
  | "epic";

/** Three-way verdict per ADR-005 D-8 hybrid failure semantics. */
export interface DispatchOutcome {
  verdict: "deny" | "allow-with-warning" | "allow";
  /** Populated when `verdict === "deny"`. */
  reason?: string;
  /** Populated when `verdict === "allow-with-warning"`. */
  warning?: string;
}

/**
 * Thrown only for genuinely unparseable input — a structural/shape defect that
 * is NOT a terminal-status claim violation. Carries the original Zod issue list
 * (duck-typed off the thrown error) so the caller can surface the issue tree.
 */
export class UnparseableNoteError extends Error {
  readonly filePath: string;
  readonly issues: readonly unknown[];
  constructor(filePath: string, issues: readonly unknown[], detail: string) {
    super(`Unparseable Brain note at ${filePath}: ${detail}`);
    this.name = "UnparseableNoteError";
    this.filePath = filePath;
    this.issues = issues;
  }
}

/**
 * Structural Zod-issue detector. Composition parsers throw `ZodError` (with an
 * `issues` array) on schema-parse failure and `ParseError` (with a `path`
 * array) on pre-schema shape failure. Importing zod's `ZodError` class here
 * would couple the hook layer to zod internals; duck-typing the issue array
 * mirrors the established per-skill validator-script pattern.
 */
function zodIssues(err: unknown): unknown[] | undefined {
  if (typeof err === "object" && err !== null && "issues" in err) {
    const { issues } = err as { issues: unknown };
    if (Array.isArray(issues)) return issues;
  }
  return undefined;
}

/** Best-effort human-readable detail from a thrown parser error. */
function errorDetail(err: unknown): string {
  const issues = zodIssues(err);
  if (issues !== undefined) {
    return issues
      .map((issue) => {
        if (typeof issue === "object" && issue !== null && "message" in issue) {
          return String((issue as { message: unknown }).message);
        }
        return JSON.stringify(issue);
      })
      .join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

/** Minimal frontmatter view used for routing + terminal-status detection. */
interface FrontmatterHead {
  type: string;
  status: string;
}

/**
 * Extract `type` and `status` from a note's YAML frontmatter block without
 * running the full per-type parser. Routing must happen before parsing so an
 * unknown type short-circuits to `allow` and so a parser throw can be
 * classified against the declared terminal status. Throws `UnparseableNoteError`
 * when no readable frontmatter mapping with a string `type` is present.
 */
function readFrontmatterHead(noteContent: string, filePath: string): FrontmatterHead {
  const match = noteContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match || match[1] === undefined) {
    throw new UnparseableNoteError(filePath, [], "no YAML frontmatter block found");
  }
  let parsed: unknown;
  try {
    parsed = loadYaml(match[1]);
  } catch (err) {
    throw new UnparseableNoteError(
      filePath,
      [],
      `frontmatter YAML did not parse: ${errorDetail(err)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new UnparseableNoteError(filePath, [], "frontmatter did not parse as a mapping");
  }
  const record = parsed as Record<string, unknown>;
  const type = record.type;
  if (typeof type !== "string") {
    throw new UnparseableNoteError(filePath, [], "frontmatter is missing a string `type` field");
  }
  const status = typeof record.status === "string" ? record.status : "";
  return { type, status };
}

/**
 * Per-type routing entry: the parser to run, the claim check to apply on a
 * parse-success note, and the declared frontmatter status that triggers the
 * schema's terminal-status gate (used to classify a parser throw).
 */
interface RouteEntry {
  /** Parse the markdown; throws on schema/shape failure. */
  parse: (markdown: string) => unknown;
  /** Inspect the parsed note; return a deny reason when the claim fails, else null. */
  check: (note: unknown) => string | null;
  /** The frontmatter status whose presence triggers the schema's terminal gate. */
  terminalStatus: string;
}

/** Format a deny reason in the contract shape from the TASK-038 DoD. */
function denyReason(schemaName: string, status: string, requires: string, failing: string): string {
  return `${schemaName}: status=${status} requires ${requires}; failing: ${failing}`;
}

/**
 * Routing table: frontmatter `type:` → parser + claim validator + terminal
 * status. New validators land here and nowhere else (single source of truth).
 */
const ROUTES: Record<DispatchNoteType, RouteEntry> = {
  task: {
    parse: parseTaskNote,
    terminalStatus: "DONE",
    check: (note) => {
      const result = validateTaskDoneClaim(note as Parameters<typeof validateTaskDoneClaim>[0]);
      if (result.verdict === "FAIL") {
        return denyReason(
          "TaskNoteSchema",
          "DONE",
          "every Definition of Done item checked or deferred",
          result.unsatisfied.map((u) => u.text).join(" | "),
        );
      }
      return null;
    },
  },
  requirement: {
    parse: parseRequirementNote,
    terminalStatus: "ACCEPTED",
    check: (note) => {
      const result = validateRequirementAcClaim(
        note as Parameters<typeof validateRequirementAcClaim>[0],
      );
      if (result.verdict === "FAIL") {
        return denyReason(
          "RequirementNoteSchema",
          "ACCEPTED",
          "every Acceptance Criteria item checked or deferred",
          result.unsatisfied.map((u) => u.text).join(" | "),
        );
      }
      return null;
    },
  },
  design: {
    parse: parseDesignNote,
    terminalStatus: "ACCEPTED",
    check: (note) => {
      const result = validateDesignComplianceClaim(
        note as Parameters<typeof validateDesignComplianceClaim>[0],
      );
      if (result.verdict === "FAIL") {
        return denyReason(
          "DesignNoteSchema",
          "ACCEPTED",
          "every Compliance item checked or deferred",
          result.unsatisfied.map((u) => u.text).join(" | "),
        );
      }
      return null;
    },
  },
  spec: {
    parse: parseSpecRootNote,
    terminalStatus: "DONE",
    check: (note) => {
      const result = validateSpecDoneClaim(note as Parameters<typeof validateSpecDoneClaim>[0]);
      if (result.verdict === "FAIL") {
        return denyReason(
          "SpecRootNoteSchema",
          "DONE",
          "every Success Criteria and Artifact Status item checked or deferred",
          result.unsatisfied.map((u) => `${u.section ?? "item"}:${u.text}`).join(" | "),
        );
      }
      return null;
    },
  },
  qa: {
    parse: parseTestReportNote,
    terminalStatus: "DONE",
    check: (note) => {
      const result = validateTestReportPassClaim(
        note as Parameters<typeof validateTestReportPassClaim>[0],
      );
      if (result.verdict === "FAIL") {
        return denyReason(
          "TestReportNoteSchema",
          "DONE",
          "declared verdict matches derived verdict with zero failing rows",
          result.unsatisfied.map((u) => u.text).join(" | "),
        );
      }
      return null;
    },
  },
  decision: {
    parse: parseAdrNote,
    terminalStatus: "ACCEPTED",
    check: (note) => {
      const result = validateAdrAcceptedClaim(
        note as Parameters<typeof validateAdrAcceptedClaim>[0],
      );
      if (!result.ok) {
        return denyReason(
          "AdrNoteSchema",
          "ACCEPTED",
          "every Clarifications item checked and every Considered Option carries a rationale",
          result.unsatisfied.map((u) => `${u.path}: ${u.reason}`).join(" | "),
        );
      }
      return null;
    },
  },
  plan: {
    parse: parsePlanNote,
    terminalStatus: "DONE",
    check: (note) => {
      const result = validatePlanDoneClaim(note as Parameters<typeof validatePlanDoneClaim>[0]);
      if (!result.ok) {
        return denyReason(
          "PlanNoteSchema",
          "DONE",
          "every part in a terminal substatus (DONE, DEFERRED, ABANDONED)",
          result.unsatisfied.map((u) => `${u.part_id}=${u.substatus}`).join(" | "),
        );
      }
      return null;
    },
  },
  analysis: {
    parse: parseAnalysisNote,
    terminalStatus: "ACCEPTED",
    check: (note) => {
      const result = validateAnalysisAcceptedClaim(
        note as Parameters<typeof validateAnalysisAcceptedClaim>[0],
      );
      if (!result.ok) {
        return denyReason(
          "AnalysisNoteSchema",
          "ACCEPTED",
          "no `## Open Questions` section present",
          result.unsatisfied.map((u) => `${u.path}: ${u.reason}`).join(" | "),
        );
      }
      return null;
    },
  },
  epic: {
    parse: parseEpicNote,
    terminalStatus: "DONE",
    check: (note) => {
      // No SPEC resolver is available at the hook boundary. validateEpicDoneClaim
      // throws when status is DONE with `contains` relations but no resolver;
      // that throw is a missing-dependency signal, NOT a claim rejection, so it
      // is caught here and surfaced as an advisory rather than a deny — the hook
      // cannot resolve cross-note SPEC status synchronously.
      try {
        const result = validateEpicDoneClaim(note as Parameters<typeof validateEpicDoneClaim>[0]);
        if (!result.ok) {
          return denyReason(
            "EpicNoteSchema",
            "DONE",
            "every contained SPEC at status DONE",
            result.unsatisfied.map((u) => `${u.spec_ref}=${u.status}`).join(" | "),
          );
        }
        return null;
      } catch {
        // Cross-note resolution unavailable at this boundary — non-blocking.
        return null;
      }
    },
  },
};

const KNOWN_TYPES = new Set<string>(Object.keys(ROUTES));

/** True when a note model meets only the bare structural floor (advisory). */
function floorWarning(note: unknown): string | null {
  if (typeof note !== "object" || note === null) return null;
  const model = note as { observations?: unknown[]; relations?: unknown[] };
  const obs = Array.isArray(model.observations) ? model.observations.length : undefined;
  const rels = Array.isArray(model.relations) ? model.relations.length : undefined;
  if (obs === 3) {
    return "observation count is at the structural floor (3); consider enriching";
  }
  if (rels === 2) {
    return "relation count is at the structural floor (2); consider enriching";
  }
  return null;
}

/**
 * Route a Brain note to its claim validator and return a three-way verdict.
 *
 * @throws {UnparseableNoteError} when the input cannot be parsed for a reason
 *   that is NOT a terminal-status claim violation.
 */
export function dispatchValidator(noteContent: string, filePath: string): DispatchOutcome {
  const head = readFrontmatterHead(noteContent, filePath);

  // Types without a claim contract (e.g. `critique` per ADR-005 D-5) carry no
  // terminal-status claim — there is nothing to gate, so allow.
  if (!KNOWN_TYPES.has(head.type)) {
    return { verdict: "allow" };
  }
  const route = ROUTES[head.type as DispatchNoteType];

  let note: unknown;
  try {
    note = route.parse(noteContent);
  } catch (err) {
    const issues = zodIssues(err) ?? [];
    // A parse throw on a note that declares the terminal status is a
    // status-flip claim failure → deny. The schema superRefine rejects the
    // exact lying-claim transition at parse time, so the throw carries the
    // failing-item detail.
    if (head.status === route.terminalStatus) {
      return {
        verdict: "deny",
        reason: denyReason(
          `${capitalize(head.type)}NoteSchema`,
          head.status,
          "the note to satisfy its terminal-status claim contract",
          errorDetail(err),
        ),
      };
    }
    // Otherwise the note is not claiming completion; the parse failure is a
    // genuine structural defect → unparseable.
    throw new UnparseableNoteError(filePath, issues, errorDetail(err));
  }

  // Claim checks gate only at the terminal status. The Wave 1 checkbox
  // validators (task/requirement/design/spec/qa) evaluate their checklist
  // regardless of status, so the dispatch must only treat a FAIL as a claim
  // rejection when the note actually declares the terminal status. The
  // `ok`-shape validators (plan/adr/analysis/epic) self-gate on status, so
  // this guard is equivalent for them.
  if (head.status === route.terminalStatus) {
    const reason = route.check(note);
    if (reason !== null) {
      return { verdict: "deny", reason };
    }
  }

  const warning = floorWarning(note);
  if (warning !== null) {
    return { verdict: "allow-with-warning", warning: `Schema warning: ${warning} (non-blocking)` };
  }

  return { verdict: "allow" };
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
