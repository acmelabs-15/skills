import { z } from "zod";
import {
  ObservationSchema,
  PartIdSchema,
  RelationSchema,
  SessionStatusEnum,
  TaskIdSchema,
} from "./common.js";

/**
 * SessionNote Zod schema (ADR-003 D-2, D-4).
 *
 * SESSION is append-only event ledger. 10 typed event variants via discriminated
 * union on `type`. Event numbers must be continuous starting at 1. First event
 * must be session-start.
 */

const SessionStartEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("session-start"),
    title: z.string(),
    body: z.string().optional(),
    project: z.string().optional(),
    branch: z.string().optional(),
    starting_sha: z.string().optional(),
  })
  .strict();

const BootstrapEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("bootstrap"),
    title: z.string(),
    body: z.string().optional(),
    step: z.string().optional(),
  })
  .strict();

const PartTransitionEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("part-transition"),
    title: z.string(),
    body: z.string().optional(),
    part: PartIdSchema,
    from: z.string(),
    to: z.string(),
    outcome: z.string().optional(),
  })
  .strict();

const DecisionLockEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("decision-lock"),
    title: z.string(),
    body: z.string().optional(),
    part: PartIdSchema,
    decision_ids: z.array(z.string()).min(1),
  })
  .strict();

const TaskTransitionEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("task-transition"),
    title: z.string(),
    body: z.string().optional(),
    task: TaskIdSchema,
    from: z.string(),
    to: z.string(),
  })
  .strict();

const AgentDispatchEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("agent-dispatch"),
    title: z.string(),
    body: z.string().optional(),
    agent: z.string(),
    task: TaskIdSchema.optional(),
    part: PartIdSchema.optional(),
    token_usage: z.number().optional(),
    duration_seconds: z.number().optional(),
  })
  .strict();

const DebateResultEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("debate-result"),
    title: z.string(),
    body: z.string().optional(),
    target: z.string(),
    verdict: z.enum(["PASS", "FAIL", "CONCERNS", "BLOCK"]),
    tally: z.object({
      accept: z.number(),
      concerns: z.number(),
      block: z.number(),
    }),
    p0: z.number().optional(),
    p1: z.number().optional(),
    p2: z.number().optional(),
    artifact: z.string().optional(),
  })
  .strict();

const PudSurfacedEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("pending-decision-surfaced"),
    title: z.string(),
    body: z.string().optional(),
    pud_id: z.string(),
    part: PartIdSchema,
  })
  .strict();

const PudResolvedEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("pending-decision-resolved"),
    title: z.string(),
    body: z.string().optional(),
    pud_id: z.string(),
    selected_option: z.string(),
  })
  .strict();

const StateChangeEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("state-change"),
    title: z.string(),
    body: z.string().optional(),
    scope: z.enum(["plan", "artifact", "other"]),
    target: z.string(),
  })
  .strict();

export const EventSchema = z.discriminatedUnion("type", [
  SessionStartEventSchema,
  BootstrapEventSchema,
  PartTransitionEventSchema,
  DecisionLockEventSchema,
  TaskTransitionEventSchema,
  AgentDispatchEventSchema,
  DebateResultEventSchema,
  PudSurfacedEventSchema,
  PudResolvedEventSchema,
  StateChangeEventSchema,
]);

const BoundPlanRefSchema = z
  .object({
    ref: z.string().min(1),
    worked_parts: z.array(PartIdSchema).min(1),
  })
  .strict();

const SessionFrontmatterSchema = z
  .object({
    title: z.string().regex(/^SESSION-\d{4}-\d{2}-\d{2}_\d{2}:/),
    type: z.literal("session"),
    status: SessionStatusEnum,
    binds_to: z.array(z.string()).min(1),
    permalink: z.string().regex(/^sessions\//),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

export const SessionNoteSchema = z
  .object({
    frontmatter: SessionFrontmatterSchema,
    scope: z.string().min(1),
    bound_plans: z.array(BoundPlanRefSchema).min(1),
    events: z.array(EventSchema).min(1),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (let i = 0; i < data.events.length; i++) {
      const event = data.events[i];
      if (!event) continue;
      if (event.n !== i + 1) {
        ctx.addIssue({
          code: "custom",
          message: `Event n=${event.n} at index ${i}: expected n=${i + 1}`,
        });
      }
    }
    const first = data.events[0];
    if (first && first.type !== "session-start") {
      ctx.addIssue({ code: "custom", message: "First event must be type session-start" });
    }
  });

export type SessionNote = z.infer<typeof SessionNoteSchema>;
export type Event = z.infer<typeof EventSchema>;
export type BoundPlanRef = z.infer<typeof BoundPlanRefSchema>;
export type SessionFrontmatter = z.infer<typeof SessionFrontmatterSchema>;
