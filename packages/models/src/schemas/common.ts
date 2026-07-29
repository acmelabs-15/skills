import { z } from "zod";

/**
 * Shared schemas for plan-note and session-note (ADR-003 D-4).
 * Common file is intentional (per CRIT-003 F-1 in-ADR resolution) — both note
 * types share entity-ID regexes, status enums, observation/relation primitives.
 */

// Entity ID schemas
export const EntityIdSchema = z.string().regex(/^[A-Z]+-\d+/);
export const PartIdSchema = z
  .string()
  .regex(
    /^(research|decisions\.\d+|spec-decomposition|spec\.SPEC-\d+|build\.SPEC-\d+|review|end|protocol-hardening|protocol-hardening\.[A-Z]+\.\d+)$/,
  );
export const TaskIdSchema = z.string().regex(/^T-\d{2,}$/);
export const SessionIdSchema = z.string().regex(/^SESSION-\d{4}-\d{2}-\d{2}_\d{2}$/);
export const EventNumberSchema = z.number().int().positive();

// SPEC-scoped entity IDs (distinct from session-scoped T-NN above).
// Used by TaskNote/RequirementNote/DesignNote/QaNote schemas (added X.D).
// PLAN's per-TASK build-workflow items reference these IDs.
export const SpecIdSchema = z.string().regex(/^SPEC-\d{3,}$/);
export const SpecTaskIdSchema = z.string().regex(/^TASK-\d{3,}-SPEC-\d{3,}$/);
export const ReqIdSchema = z.string().regex(/^REQ-\d{3,}-SPEC-\d{3,}$/);
export const DesignIdSchema = z.string().regex(/^DESIGN-\d{3,}-SPEC-\d{3,}$/);
// QA-NNN-SPEC-NNN convention (CONVENTIONS Section 3 canonical 16-type list,
// type `qa`, folder docs/qa/, file prefix QA-NNN). Renamed to the `qa` type
// on 2026-05-21; only the `qa` form is accepted — qa-claim-validator inputs
// and all fixtures use QA-NNN-SPEC-NNN.
export const QaIdSchema = z.string().regex(/^QA-\d{3,}-SPEC-\d{3,}/);

/**
 * ============================================================================
 * Status atoms — one vocabulary, three families, subset per note type
 * ============================================================================
 *
 * The rule: the same atom means the same thing everywhere. A note type declares
 * the subset it uses and the transitions it allows; it never redefines an atom
 * and never invents a synonym for one that exists.
 *
 * The problem this replaces: nine independent `z.enum` declarations across as
 * many files, each written for its own note type, with no shared vocabulary to
 * check against. Two consequences were already measurable. TASK notes said
 * `TODO` where every other work enum said `PENDING` — the same state under two
 * names, so no cross-note-type reasoning about "not started" could be written.
 * And one real TASK note carried `status: CANCELLED`, a value no enum anywhere
 * admitted, so that note could not parse at all; with per-file enums there was no
 * single place where such a gap would surface. It has since been corrected to
 * `ABANDONED`, which is the atom for stopped-deliberately-with-a-rationale and
 * was what the note's own observations already described.
 *
 * Three families, because status answers three different questions:
 *
 * - ARTIFACT LIFECYCLE — how settled is this document? Drafts become proposals
 *   become accepted things, and accepted things are eventually deprecated or
 *   superseded. Applies to ADR, REQ, DESIGN, SPEC, ANALYSIS, EPIC, PRD.
 * - WORK PROGRESS — how far along is this unit of work? Applies to plan parts,
 *   tasks, build-workflow items. Terminal states are deliberately three, not
 *   one: finished, consciously not doing it, and stopped for a reason.
 * - SESSION — is this sitting open, parked, or over? Deliberately tiny. A
 *   session is not an artifact and not a unit of work; conflating it with either
 *   is what produced `PAUSED` leaking into the plan enum.
 *
 * Subsetting is `z.enum(StatusAtom.extract([...]))`, which fails at build time
 * if a name is not an atom. That is the enforcement: a typo or an invented
 * synonym cannot compile, so drift is caught where it is written rather than
 * discovered later in a note that will not parse.
 */

/** Every legal status value, across all three families. */
export const StatusAtom = z.enum([
  // Artifact lifecycle
  "DRAFT",
  "PROPOSED",
  "ACCEPTED",
  "IN_REVIEW",
  "DEPRECATED",
  "SUPERSEDED",
  // Work progress
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "FAILED",
  "DONE",
  "DEFERRED",
  "ABANDONED",
  // Sessions
  "PAUSED",
]);
export type StatusAtom = z.infer<typeof StatusAtom>;

/**
 * The work-progress family in full. Note types subset this; they do not extend
 * it. `READY` distinguishes "dependencies satisfied, not started" from plain
 * `PENDING`, which is why both exist.
 */
export const WORK_PROGRESS_ATOMS = [
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "FAILED",
  "DONE",
  "DEFERRED",
  "ABANDONED",
] as const;

/** The artifact-lifecycle family in full. */
export const ARTIFACT_LIFECYCLE_ATOMS = [
  "DRAFT",
  "PROPOSED",
  "IN_REVIEW",
  "ACCEPTED",
  "DEPRECATED",
  "SUPERSEDED",
] as const;

/**
 * Work-progress states from which nothing further happens.
 *
 * Three, not one, and the distinction is load-bearing: a phase may close over a
 * `DEFERRED` or `ABANDONED` item because someone decided that explicitly, but
 * never over a `PENDING` one. That is what makes "closed by an explicit terminal
 * transition" a real alternative to closing over an item on a written rationale.
 */
export const TERMINAL_WORK_ATOMS = ["DONE", "DEFERRED", "ABANDONED"] as const;

// Status enums — each a declared subset of the atoms above.

/**
 * Plan-part substatus: the full work-progress family.
 *
 * Parts are work, not artifacts, so `DRAFT` and `PROPOSED` are correctly absent
 * — as is `SPLIT`, which a removed plan mode once required. A `SPLIT` part would
 * also have been non-terminal, permanently blocking its plan from reaching DONE.
 */
export const PartSubstatusEnum = z.enum(StatusAtom.extract([...WORK_PROGRESS_ATOMS]).options);

/** Plan-scoped task status: work progress without `READY` or `FAILED`. */
export const TaskStatusEnum = z.enum(
  StatusAtom.extract(["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "DEFERRED", "ABANDONED"])
    .options,
);

/**
 * Plan status.
 *
 * `PAUSED` is included, resolving a documented contradiction: the plan-note
 * schema reference asserted "PAUSED is invalid for PLANs (PAUSED is a SESSION
 * state)" while this enum has always accepted it. The enum wins, because a plan
 * genuinely can be parked between sittings and nothing else expresses that; the
 * prose is corrected rather than the code narrowed. It is the one atom shared
 * between the session and plan subsets, and it means the same thing in both.
 */
export const PlanStatusEnum = z.enum(StatusAtom.extract(["IN_PROGRESS", "PAUSED", "DONE"]).options);

/** Session status: the whole session family. */
export const SessionStatusEnum = z.enum(
  StatusAtom.extract(["IN_PROGRESS", "PAUSED", "DONE"]).options,
);
export const EffortEnum = z.enum(["XS", "S", "M", "L", "XL"]);
export const ComplexityTierEnum = z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4", "TIER_5", "TBD"]);
export const PhaseEnum = z.enum([
  "research",
  "decisions",
  "spec-decomposition",
  "spec",
  "build",
  "review",
  "end",
]);

// Observation + relation primitives
export const ObservationCategoryEnum = z.enum([
  "fact",
  "decision",
  "requirement",
  "technique",
  "insight",
  "problem",
  "solution",
  "constraint",
  "risk",
  "outcome",
]);

export const RelationVerbEnum = z.enum([
  "implements",
  "depends_on",
  "relates_to",
  "extends",
  "part_of",
  "inspired_by",
  "contains",
  "pairs_with",
  "supersedes",
  "leads_to",
  "caused_by",
  "implemented_by",
  "required_by",
  "extended_by",
  "superseded_by",
  "inspires",
]);
export const validRelationTypes = RelationVerbEnum.options;

export const ObservationSchema = z
  .object({
    category: ObservationCategoryEnum,
    text: z.string().min(1),
    tags: z.array(z.string()).min(1).max(3),
  })
  .strict();

export const RelationSchema = z
  .object({
    verb: RelationVerbEnum,
    target: z.string().min(1),
  })
  .strict();

export type Observation = z.infer<typeof ObservationSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type PartSubstatus = z.infer<typeof PartSubstatusEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
