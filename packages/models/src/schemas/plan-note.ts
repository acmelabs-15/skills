import { z } from "zod";
import {
  ComplexityTierEnum,
  EffortEnum,
  EventNumberSchema,
  ObservationSchema,
  PartIdSchema,
  PartSubstatusEnum,
  PlanStatusEnum,
  QaIdSchema,
  RelationSchema,
  SessionIdSchema,
  SpecTaskIdSchema,
  TERMINAL_WORK_ATOMS,
  TaskIdSchema,
  TaskStatusEnum,
} from "./common.js";

/**
 * Headings the renderer deliberately does not emit.
 *
 * Both were derived rollups regenerated on every render: a status summary and a
 * Mermaid dependency diagram, each computed from `parts`. They are no longer part
 * of a plan note. A source file that still carries one parses without error and
 * the section is simply absent from the output — dropped, never diagnosed, since
 * their presence is a historical artifact rather than an authoring mistake.
 *
 * This list is deliberately closed and deliberately short. Every H2 not named
 * here and not modelled by a field is PRESERVED verbatim via
 * `unmodelled_sections`; adding a heading here converts it from preserved to
 * deleted, which is why it takes a decision rather than a convenience.
 */
export const DROPPED_H2_HEADINGS = ["Progress Dashboard", "Cross-Part Dependency Graph"] as const;

/** An H2 section carried verbatim because no field models it. */
export const RawSectionSchema = z
  .object({
    heading: z.string().min(1),
    text: z.string().min(1),
    index: z.number().int().min(0),
  })
  .strict();

/**
 * BuildWorkflow primitives — per-TASK impl + qa items inside build.SPEC-NNN parts.
 *
 * Added by Phase X (Protocol Hardening, 2026-05-20) to mechanically enforce the
 * rigid per-TASK build+qa cycle: a TASK is built and QA'd as one atomic unit
 * before the next TASK starts, and every workflow phase carries that rigor at
 * each enforcement layer — schema, mutation, and validator alike.
 *
 * Every TASK in a spec yields TWO PLAN items: impl-TASK-NNN-SPEC-MMM and
 * qa-TASK-NNN-SPEC-MMM. Each carries its own status enum. Cross-field
 * invariants enforce pairing + sequencing (qa cannot advance unless impl DONE).
 */

export const BuildWorkflowStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "FAILED",
]);

export const BuildWorkflowItemIdSchema = z.string().regex(/^(impl|qa)-TASK-\d{3,}-SPEC-\d{3,}$/);

const BuildWorkflowItemSchema = z
  .object({
    id: BuildWorkflowItemIdSchema,
    type: z.enum(["impl", "qa"]),
    task_ref: SpecTaskIdSchema,
    status: BuildWorkflowStatusEnum,
    owning_session: SessionIdSchema.optional(),
    transitioned_at_event: EventNumberSchema.optional(),
    failed_iterations: z.number().int().min(0).max(3).default(0),
    qa_ref: QaIdSchema.optional(),
    fix_brief_for_event: EventNumberSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const expected = `${data.type}-${data.task_ref}`;
    if (data.id !== expected) {
      ctx.addIssue({
        code: "custom",
        message: `BuildWorkflowItem id ${data.id} must equal ${expected} (type-task_ref)`,
      });
    }
    if (data.type === "qa" && (data.status === "DONE" || data.status === "FAILED")) {
      if (!data.qa_ref) {
        ctx.addIssue({
          code: "custom",
          message: `qa item ${data.id} with status ${data.status} requires qa_ref`,
        });
      }
    }
  });

export type BuildWorkflowItem = z.infer<typeof BuildWorkflowItemSchema>;
export type BuildWorkflowStatus = z.infer<typeof BuildWorkflowStatusEnum>;

/**
 * PlanNote Zod schema (ADR-003 D-4, D-6, D-9, D-10, D-11).
 *
 * Enforces:
 * - PLAN owns forward-looking state (D-2).
 * - T-NN task IDs plan-scoped, consolidated at PLAN top level (D-5, D-6).
 * - Pending User Decisions at PLAN top level (D-9). D-9's editor-mirror half is
 *   dropped: it recorded a task-id sync with editor task lists that nothing ever
 *   performed, so all four of its columns were nullable and every row read (none).
 * - No Decision Log / Progress Log / Workflow Plan prose (D-10, D-11) — by omission.
 * - Cross-field invariants: tasks reference existing parts; part dependencies are valid.
 */

const PlanFrontmatterSchema = z
  .object({
    title: z.string().regex(/^PLAN-\d+:/),
    type: z.literal("plan"),
    status: PlanStatusEnum,
    complexity_tier: ComplexityTierEnum,
    branches: z.array(z.string()).min(1),
    /**
     * `planning/plan-nnn-…`, optionally preceded by a project segment.
     *
     * The bare form is canonical: `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` Section
     * 1.7.2 specifies it, and a `project/`-prefixed permalink is documented there
     * as the legacy signal that an outdated brain build wrote the note.
     *
     * Both are accepted anyway, because five of seven real plan notes carry the
     * prefixed form and rejecting them buys nothing: the permalink is not what
     * this schema is for, and a note that fails to parse over a stale prefix
     * cannot have any of its actual state validated. Tolerating the legacy form
     * here does mean the schema is no longer a place that would flag those notes
     * — that belongs to a graph audit, which can see the whole corpus at once and
     * has somewhere to report.
     */
    permalink: z.string().regex(/^(?:[a-z0-9-]+\/)?planning\//),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const ObjectiveSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
  })
  .strict();

const DodItemSchema = z
  .object({
    text: z.string(),
    done: z.boolean(),
    deferred_rationale: z.string().optional(),
  })
  .strict();

/**
 * A single D-N decision's state inside a decisions part.
 *
 * `topic` and `decision` are different things, and conflating them is what this
 * schema previously did. The topic is what was being decided — a short label, "the
 * parser strategy". The decision is what was chosen, verbatim, in the words the
 * option was presented in.
 *
 * Why the verbatim text has to live here: a later phase audits whether an authored
 * ADR carries the same detail as the decision it records. Without this field that
 * audit compares against `topic`, a short label, and so passes trivially — it was
 * comparing against nothing. The audit is only meaningful if the exact wording the
 * decision was locked with is recoverable.
 *
 * `decision` is optional, and deliberately not required even when LOCKED.
 *
 * Requiring it on LOCKED was tried and reverted: every decision locked before this
 * field existed has no text, so the rule failed 45 tests and would fail every real
 * plan note on disk. A schema that rejects the whole document cannot validate any
 * of the state inside it — the same reason the part-id grammar reports instead of
 * rejecting. What matters is that new locks record the text, which the mutation now
 * requires at the type level: `LockDecision.decision` is non-optional, so a caller
 * cannot omit it. Enforcement sits at the writing edge, where it prevents the gap,
 * rather than at the reading edge, where it only punishes history.
 *
 * `missingDecisionText` reports LOCKED decisions with no text, for a caller that
 * wants to surface them.
 */
const DecisionStateSchema = z
  .object({
    id: z.string(),
    /**
     * Status of this decision.
     *
     * Four values, not the two the prose specified (`PENDING|LOCKED`). REJECTED and
     * DEFERRED are real outcomes — an option can be considered and turned down, or
     * consciously postponed — and the enum has always accepted them. The
     * reconciliation runs toward the implementation and the prose is corrected,
     * because narrowing to two would delete the ability to record either.
     */
    status: z.enum(["PENDING", "LOCKED", "REJECTED", "DEFERRED"]),
    /** What is being decided — a short label, not the answer. */
    topic: z.string(),
    /** What was chosen, verbatim, in the words the option was presented in. */
    decision: z.string().optional(),
  })
  .strict();

/**
 * LOCKED decisions that record no verbatim text.
 *
 * These are the decisions a downstream detail audit cannot check, because there is
 * nothing to compare an authored ADR against. Reported rather than rejected: notes
 * predate the field, and failing a whole document over it would validate nothing.
 */
export function missingDecisionText(plan: PlanNote): Array<{ partId: string; id: string }> {
  const out: Array<{ partId: string; id: string }> = [];
  for (const part of plan.parts) {
    for (const decision of part.decisions ?? []) {
      if (decision.status !== "LOCKED") continue;
      if (!decision.decision || decision.decision.trim().length === 0) {
        out.push({ partId: part.id, id: decision.id });
      }
    }
  }
  return out;
}

const PartSchema = z
  .object({
    id: PartIdSchema,
    phase: z.string(),
    title: z.string(),
    substatus: PartSubstatusEnum,
    owning_session: SessionIdSchema.optional(),
    completing_session: SessionIdSchema.optional(),
    outcome: z.string().optional(),
    /**
     * The session event number at which this part reached its current substatus.
     *
     * Added because `set-part-done` has always REQUIRED `--at-event`, validated it,
     * and then never recorded it: the flag was parsed, checked for being a positive
     * integer, stored on the args object, and omitted from the mutation payload. So
     * the event linkage that the two-step edit pattern exists to guarantee was not
     * written by the script performing the state change — a required argument with
     * no effect, which is worse than no argument, because it reads as evidence the
     * linkage is enforced.
     *
     * Build workflow items and tasks already carried their event
     * (`transitioned_at_event`, `resolved_at_event`); a part was the level that
     * could not answer "when did this happen". Optional, since parts transitioned
     * before this field existed have no value to backfill.
     */
    transitioned_at_event: EventNumberSchema.optional(),
    source_artifacts: z.array(z.string()),
    depends_on: z.array(PartIdSchema),
    dod: z.array(DodItemSchema),
    decisions: z.array(DecisionStateSchema).optional(),
    // build_workflow_items: per-TASK impl + qa pairs for build.SPEC-NNN parts.
    // MANDATORY for build.SPEC-NNN parts when substatus is not PENDING — once a
    // build part is under way, every TASK in it must carry its impl + qa pair.
    build_workflow_items: z.array(BuildWorkflowItemSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.substatus === "DONE" && !data.outcome) {
      ctx.addIssue({ code: "custom", message: "DONE part must have outcome" });
    }
    // build.SPEC-NNN parts MUST carry build_workflow_items once they leave PENDING
    if (data.id.startsWith("build.SPEC-") && data.substatus !== "PENDING") {
      if (!data.build_workflow_items || data.build_workflow_items.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `build.SPEC-NNN part ${data.id} with substatus ${data.substatus} must have build_workflow_items (per-TASK impl+qa pairs)`,
        });
        return;
      }
      // Each TASK must have BOTH impl + qa items
      const taskRefs = new Set(data.build_workflow_items.map((i) => i.task_ref));
      for (const taskRef of taskRefs) {
        const items = data.build_workflow_items.filter((i) => i.task_ref === taskRef);
        const hasImpl = items.some((i) => i.type === "impl");
        const hasQa = items.some((i) => i.type === "qa");
        if (!hasImpl || !hasQa) {
          ctx.addIssue({
            code: "custom",
            message: `Task ${taskRef} in part ${data.id} must have both impl and qa items (has impl=${hasImpl}, qa=${hasQa})`,
          });
        }
      }
      // qa item IN_PROGRESS/DONE requires its paired impl item to be DONE
      for (const qa of data.build_workflow_items.filter((i) => i.type === "qa")) {
        if (qa.status === "IN_PROGRESS" || qa.status === "DONE") {
          const impl = data.build_workflow_items.find(
            (i) => i.type === "impl" && i.task_ref === qa.task_ref,
          );
          if (!impl || impl.status !== "DONE") {
            ctx.addIssue({
              code: "custom",
              message: `qa item ${qa.id} status ${qa.status} requires paired impl-${qa.task_ref} to be DONE (currently ${impl?.status ?? "missing"})`,
            });
          }
        }
      }
      // build.SPEC-NNN part DONE requires every build_workflow_item to be DONE
      if (data.substatus === "DONE") {
        const notDone = data.build_workflow_items.filter((i) => i.status !== "DONE");
        if (notDone.length > 0) {
          ctx.addIssue({
            code: "custom",
            message: `build.SPEC-NNN part ${data.id} DONE requires every build_workflow_item DONE; ${notDone.length} not done: ${notDone.map((i) => `${i.id}=${i.status}`).join(", ")}`,
          });
        }
      }
    }
  });

const TaskSchema = z
  .object({
    id: TaskIdSchema,
    subject: z.string().min(1),
    part: PartIdSchema,
    agent: z.string().optional(),
    files: z.array(z.string()),
    effort: EffortEnum.optional(),
    status: TaskStatusEnum,
    created_at_event: z.number().int().positive().optional(),
    resolved_at_event: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "DONE" && !data.resolved_at_event) {
      ctx.addIssue({ code: "custom", message: "DONE task must reference resolving event" });
    }
  });

const PendingDecisionSchema = z
  .object({
    id: z.string().regex(/^PUD-\d+$/),
    part: PartIdSchema,
    question: z.string().min(1),
    surfaced_at_event: z.number().int().positive(),
    surfaced_session: SessionIdSchema,
    options: z
      .array(z.object({ label: z.string(), description: z.string() }))
      .min(2)
      .max(4),
  })
  .strict();

/**
 * Terminal part substatuses for the PLAN done-claim invariant (SPEC-008
 * REQ-001, TASK-010). A PLAN whose `frontmatter.status === "DONE"` requires
 * every part to be in a terminal state — `DONE`, `DEFERRED`, or `ABANDONED`.
 * Any other substatus (`PENDING`, `READY`, `IN_PROGRESS`, `BLOCKED`) means
 * the PLAN cannot legitimately claim DONE.
 *
 * Mirrors the Wave 1 part-substatus enum from `common.ts`; redeclared as a
 * literal tuple so the schema's `superRefine` arm and the runtime
 * `validatePlanDoneClaim` validator share the same source-of-truth.
 */
// Re-exported from the shared atoms rather than restated here: this list used to
// be a second literal copy of the same three values, which is exactly the
// duplication the status-atom vocabulary exists to remove.
const TERMINAL_PART_SUBSTATUSES = TERMINAL_WORK_ATOMS;
type TerminalPartSubstatus = (typeof TERMINAL_WORK_ATOMS)[number];

export function isTerminalPartSubstatus(value: string): value is TerminalPartSubstatus {
  return (TERMINAL_PART_SUBSTATUSES as readonly string[]).includes(value);
}

export const PlanNoteSchema = z
  .object({
    frontmatter: PlanFrontmatterSchema,
    scope: z.string().min(1),
    source_reference: z.string().optional(),
    objectives: z.array(ObjectiveSchema).min(1),
    parts: z.array(PartSchema).min(1),
    tasks: z.array(TaskSchema),
    pending_decisions: z.array(PendingDecisionSchema),
    blockers: z.array(z.string()),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
    /**
     * H2 sections the model does not describe, carried verbatim so a parse-render
     * round trip cannot delete them.
     *
     * Before this field existed the parser read nine named H2s and dropped every
     * other one before validation, and the renderer rebuilt the document from the
     * model alone — so a successful render deleted whatever it had not understood.
     * That was masked only because parsing failed on every real plan note; fixing
     * the parser without this field would have turned a silent no-op into silent
     * deletion of authored content.
     *
     * Not a dumping ground: a section belongs here precisely as long as nothing
     * models it. When one earns a schema, it moves out of this array and into a
     * typed field, and the round trip keeps proving byte-identity throughout.
     */
    unmodelled_sections: z.array(RawSectionSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const partIds = new Set(data.parts.map((p) => p.id));
    for (const task of data.tasks) {
      if (!partIds.has(task.part)) {
        ctx.addIssue({
          code: "custom",
          message: `Task ${task.id}: part ${task.part} not found in parts`,
        });
      }
    }
    for (const part of data.parts) {
      for (const dep of part.depends_on) {
        if (!partIds.has(dep)) {
          ctx.addIssue({
            code: "custom",
            message: `Part ${part.id}: depends_on ${dep} not found in parts`,
          });
        }
      }
    }
  })
  // SPEC-008 REQ-001 / TASK-010: PLAN done-claim gate. When PLAN status is
  // DONE, every part substatus must be terminal (DONE / DEFERRED / ABANDONED).
  // This closes the Wave 1 gap where PLAN had schema + mutations + renderer +
  // parser but no parse-time done-claim guard. Additive arm — preserves all
  // existing PlanNoteSchema cross-field invariants.
  .superRefine((data, ctx) => {
    if (data.frontmatter.status !== "DONE") return;
    for (const part of data.parts) {
      if (!isTerminalPartSubstatus(part.substatus)) {
        ctx.addIssue({
          code: "custom",
          message: `PLAN status DONE requires every part substatus terminal; part ${part.id} has substatus ${part.substatus} (terminal set: DONE, DEFERRED, ABANDONED)`,
        });
      }
    }
  });

export type PlanNote = z.infer<typeof PlanNoteSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type DodItem = z.infer<typeof DodItemSchema>;
export type DecisionState = z.infer<typeof DecisionStateSchema>;
export type PendingDecision = z.infer<typeof PendingDecisionSchema>;
export type PlanFrontmatter = z.infer<typeof PlanFrontmatterSchema>;
