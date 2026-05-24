import { z } from "zod";
import {
  ComplexityTierEnum,
  EffortEnum,
  EventNumberSchema,
  ObservationSchema,
  PartIdSchema,
  PartSubstatusEnum,
  PlanStatusEnum,
  RelationSchema,
  SessionIdSchema,
  SpecTaskIdSchema,
  TaskIdSchema,
  TaskStatusEnum,
  TestReportIdSchema,
} from "./common.js";

/**
 * BuildWorkflow primitives — per-TASK impl + qa items inside build.SPEC-NNN parts.
 *
 * Added by Phase X (Protocol Hardening, 2026-05-20) to mechanically enforce
 * the rigid per-TASK build+qa cycle. See:
 * - ~/.claude/memory/feedback_per_task_build_qa_cycle.md (TIER-1 BLOCKING protocol)
 * - ~/.claude/memory/feedback_workflow_phase_rigor_at_every_layer.md (meta-rule)
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
    test_report_ref: TestReportIdSchema.optional(),
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
      if (!data.test_report_ref) {
        ctx.addIssue({
          code: "custom",
          message: `qa item ${data.id} with status ${data.status} requires test_report_ref`,
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
 * - PUD + Editor Mirror IDs at PLAN top level (D-9).
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
    permalink: z.string().regex(/^planning\//),
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

const DecisionStateSchema = z
  .object({
    id: z.string(),
    status: z.enum(["PENDING", "LOCKED", "REJECTED", "DEFERRED"]),
    topic: z.string(),
  })
  .strict();

const PartSchema = z
  .object({
    id: PartIdSchema,
    phase: z.string(),
    title: z.string(),
    substatus: PartSubstatusEnum,
    owning_session: SessionIdSchema.optional(),
    completing_session: SessionIdSchema.optional(),
    outcome: z.string().optional(),
    source_artifacts: z.array(z.string()),
    depends_on: z.array(PartIdSchema),
    dod: z.array(DodItemSchema),
    decisions: z.array(DecisionStateSchema).optional(),
    // build_workflow_items: per-TASK impl + qa pairs for build.SPEC-NNN parts.
    // MANDATORY for build.SPEC-NNN parts when substatus is not PENDING
    // (per feedback_per_task_build_qa_cycle protocol).
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

const EditorMirrorEntrySchema = z
  .object({
    task_id: TaskIdSchema,
    cc_id: z.string().nullable(),
    cursor_id: z.string().nullable(),
    last_synced: z.string().nullable(),
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
const TERMINAL_PART_SUBSTATUSES = ["DONE", "DEFERRED", "ABANDONED"] as const;
type TerminalPartSubstatus = (typeof TERMINAL_PART_SUBSTATUSES)[number];

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
    editor_mirror: z.array(EditorMirrorEntrySchema),
    blockers: z.array(z.string()),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
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
export type EditorMirrorEntry = z.infer<typeof EditorMirrorEntrySchema>;
export type PlanFrontmatter = z.infer<typeof PlanFrontmatterSchema>;
