/**
 * Frontmatter-type-to-validator dispatch (SPEC-008 TASK-038, Wave 2).
 *
 * The single chokepoint between the hook handler scripts (Layers 1-6 in
 * DESIGN-004) and the composition-library claim-validator catalog. A handler
 * hands this module the proposed Brain-note content plus its file path; the
 * module reads the frontmatter `type:`, routes to the matching parser +
 * claim validator, and returns a three-way `DispatchOutcome`.
 *
 * Three-way verdict (LAYERED-SEVERITY model, REQ-011 amended Event 114):
 *   - `deny`               — a CLAIM-validator failure: the note declares a
 *                            terminal status (TASK DONE, REQ/DESIGN/ADR/ANALYSIS
 *                            ACCEPTED, SPEC/PLAN/EPIC/QA DONE) but its DoD /
 *                            acceptance / compliance / completion contract is
 *                            unsatisfied.
 *   - `allow-with-warning` — the note's claim passes (or is N/A) but a NON-claim
 *                            hygiene/schema issue is present (observation
 *                            `category` outside the enum, observation/frontmatter
 *                            `tags` count bounds, observation/relation count
 *                            below floor, or another recoverable schema-rule
 *                            violation).
 *   - `allow`              — the note parses cleanly and every claim passes.
 *
 * The verdict is severity-neutral here; each hook handler maps it per its layer
 * class (per-write gates ALLOW `allow-with-warning`; boundary + backstop gates
 * DENY it). This module only classifies.
 *
 * CRITICAL INVARIANT: a claim lie is NEVER downgraded to `allow-with-warning`,
 * even when hygiene issues co-occur. Claim-satisfaction is determined
 * INDEPENDENTLY of hygiene (via `extractAndCheckClaim`, which reads only the
 * claim-bearing fields from the AST). This is required because Zod runs a
 * schema's `superRefine` — the terminal-status claim arm — ONLY after the base
 * object parse succeeds. A co-occurring hygiene defect (e.g. a bad observation
 * category) fails the base parse first, so the thrown `ZodError` carries ONLY
 * the hygiene issue and the claim issue is absent. Partitioning the thrown
 * issues (approach a) would therefore mask the lie; this module instead checks
 * the claim leniently first, so `deny` always wins over a co-occurring
 * hygiene issue.
 *
 * Error boundary: this module throws `UnparseableNoteError` ONLY when the input
 * has a genuine structural defect that prevents any model AND its claim passes
 * (or is N/A). A claim-validator failure is always `deny`, never a throw. The
 * caller converts the throw into a structured stderr error and exits non-zero,
 * where the runtime fail-open semantics apply (DESIGN-004).
 */

import { load as loadYaml } from "js-yaml";

import { extractAndCheckClaim } from "../../shared/composition/src/validators/lenient-claim-extract.ts";

import { parseAdrNote } from "../../shared/composition/src/parsers/adr-note.ts";
import { parseAnalysisNote } from "../../shared/composition/src/parsers/analysis-note.ts";
import { parseDesignNote } from "../../shared/composition/src/parsers/design-note.ts";
import { parseEpicNote } from "../../shared/composition/src/parsers/epic-note.ts";
import { parsePlanNote } from "../../shared/composition/src/parsers/plan-note.ts";
import { parseRequirementNote } from "../../shared/composition/src/parsers/requirement-note.ts";
import { parseSpecRootNote } from "../../shared/composition/src/parsers/spec-root-note.ts";
import { parseTaskNote } from "../../shared/composition/src/parsers/task-note.ts";
import { parseQaNote } from "../../shared/composition/src/parsers/qa-note.ts";
import { validateAdrAcceptedClaim } from "../../shared/composition/src/validators/adr-claim-validator.ts";
import { validateAnalysisAcceptedClaim } from "../../shared/composition/src/validators/analysis-claim-validator.ts";
import { validateDesignComplianceClaim } from "../../shared/composition/src/validators/design-claim-validator.ts";
import { validateEpicDoneClaim } from "../../shared/composition/src/validators/epic-claim-validator.ts";
import { validatePlanDoneClaim } from "../../shared/composition/src/validators/plan-claim-validator.ts";
import { validateRequirementAcClaim } from "../../shared/composition/src/validators/requirement-claim-validator.ts";
import { validateSpecDoneClaim } from "../../shared/composition/src/validators/spec-claim-validator.ts";
import { validateTaskDoneClaim } from "../../shared/composition/src/validators/task-claim-validator.ts";
import { validateQaPassClaim } from "../../shared/composition/src/validators/qa-claim-validator.ts";

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

/**
 * Recognized HYGIENE issue path prefixes — recoverable schema-rule violations
 * that do NOT defeat the structural model. A thrown `ZodError` whose issues are
 * ALL hygiene (after the claim has been independently determined to pass)
 * classifies as `allow-with-warning`; any non-hygiene issue means a genuine
 * structural defect and classifies as `UnparseableNoteError`.
 *
 * Hygiene paths cover: observation category enum / text / tags-count, relation
 * verb / count, observation/relation array `.min` floors, and frontmatter
 * tags-count bounds. Each is a quality rule on an otherwise-structurally-present
 * note, not a missing required section.
 */
const HYGIENE_PATH_PREFIXES: readonly string[] = ["observations", "relations"];

/** Path forms (joined with ".") that are hygiene-class even at the top level. */
const HYGIENE_EXACT_PATHS: ReadonlySet<string> = new Set([
  "frontmatter.tags",
  "tags",
  // EPIC `contains`-without-`## Contained Specs` gate: a recoverable schema-rule
  // violation (add the section), NOT a claim-validator failure — the EPIC
  // done-claim requires cross-note SPEC resolution that the hook boundary cannot
  // perform, so it is N/A here. Classifies allow-with-warning (boundary gates
  // still DENY it; per-write gates allow the note to be fixed incrementally).
  "sections.Contained Specs",
]);

/** Dotted path string from a Zod issue's `path` array, or "" when unavailable. */
function issuePath(issue: unknown): string {
  if (typeof issue === "object" && issue !== null && "path" in issue) {
    const { path } = issue as { path: unknown };
    if (Array.isArray(path)) return path.map((p) => String(p)).join(".");
  }
  return "";
}

/**
 * True when EVERY thrown issue is a recognized hygiene-class rule. An empty
 * issue list (a non-Zod throw, e.g. a pre-schema ParseError with no `issues`)
 * is NOT hygiene — it is a structural defect.
 */
function allIssuesAreHygiene(issues: readonly unknown[]): boolean {
  if (issues.length === 0) return false;
  return issues.every((issue) => {
    const path = issuePath(issue);
    if (HYGIENE_EXACT_PATHS.has(path)) return true;
    const head = path.split(".")[0] ?? "";
    return HYGIENE_PATH_PREFIXES.includes(head);
  });
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
    parse: parseQaNote,
    terminalStatus: "DONE",
    check: (note) => {
      const result = validateQaPassClaim(
        note as Parameters<typeof validateQaPassClaim>[0],
      );
      if (result.verdict === "FAIL") {
        return denyReason(
          "QaNoteSchema",
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
 * Classify a strict-parse THROW into a three-way verdict (or an
 * `UnparseableNoteError` throw). This is the load-bearing layered-severity
 * classification:
 *
 *   1. Determine claim-satisfaction INDEPENDENTLY of hygiene via
 *      `extractAndCheckClaim` (reads only the claim-bearing fields from the AST,
 *      never the strict schema). This guarantees a claim lie is detected even
 *      when a co-occurring hygiene defect made the strict parse fail before
 *      `superRefine` ran — the CRITICAL INVARIANT.
 *   2. If the claim FAILS → `deny` (claim wins, hygiene notwithstanding).
 *   3. If the claim PASSES, the strict-parse throw was caused by hygiene and/or
 *      a structural defect. Partition the thrown issues: when EVERY issue is a
 *      recognized hygiene rule → `allow-with-warning` (recoverable); otherwise
 *      the note has a genuine structural defect → throw `UnparseableNoteError`
 *      (the caller routes it to the runtime fail-open/closed semantics).
 *
 * Step 3's issue-partition is safe here precisely because the claim verdict is
 * already settled in steps 1-2 — partitioning never decides a claim outcome.
 */
function classifyParseThrow(
  type: DispatchNoteType,
  status: string,
  noteContent: string,
  filePath: string,
  parseErr: unknown,
): DispatchOutcome {
  // Step 1-2: hygiene-independent claim determination. A throw inside the
  // lenient extractor itself (e.g. remark fails on truly unparseable input) is
  // a structural defect — surface it as UnparseableNoteError.
  let claim: ReturnType<typeof extractAndCheckClaim>;
  try {
    claim = extractAndCheckClaim(type, status, noteContent);
  } catch (extractErr) {
    throw new UnparseableNoteError(filePath, zodIssues(parseErr) ?? [], errorDetail(extractErr));
  }
  if (claim.kind === "claim-fail") {
    return {
      verdict: "deny",
      reason: denyReason(
        `${capitalize(type)}NoteSchema`,
        status,
        "the note to satisfy its terminal-status claim contract",
        claim.failing,
      ),
    };
  }

  // Step 3: claim passes — the throw is hygiene and/or structural.
  const issues = zodIssues(parseErr) ?? [];
  if (allIssuesAreHygiene(issues)) {
    return {
      verdict: "allow-with-warning",
      warning: `Schema warning: ${errorDetail(parseErr)} (non-blocking)`,
    };
  }
  throw new UnparseableNoteError(filePath, issues, errorDetail(parseErr));
}

/**
 * Route a Brain note to its claim validator and return a three-way verdict.
 *
 * @throws {UnparseableNoteError} when the input has a genuine structural defect
 *   AND its claim passes (a claim failure is always `deny`, never a throw).
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
    return classifyParseThrow(
      head.type as DispatchNoteType,
      head.status,
      noteContent,
      filePath,
      err,
    );
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
