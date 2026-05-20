import { z } from "zod";
import {
  ComplexityTierEnum,
  EffortEnum,
  ObservationSchema,
  PartIdSchema,
  PartSubstatusEnum,
  PlanStatusEnum,
  RelationSchema,
  SessionIdSchema,
  TaskIdSchema,
  TaskStatusEnum,
} from "./common.js";

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
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.substatus === "DONE" && !data.outcome) {
      ctx.addIssue({ code: "custom", message: "DONE part must have outcome" });
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
