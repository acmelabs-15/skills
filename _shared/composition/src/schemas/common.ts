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
    /^(research|decisions\.\d+|spec-decomposition|spec\.SPEC-\d+|build\.SPEC-\d+|review|end)$/,
  );
export const TaskIdSchema = z.string().regex(/^T-\d{2,}$/);
export const SessionIdSchema = z.string().regex(/^SESSION-\d{4}-\d{2}-\d{2}_\d{2}$/);
export const EventNumberSchema = z.number().int().positive();

// Status enums
export const PartSubstatusEnum = z.enum([
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "DONE",
  "DEFERRED",
  "ABANDONED",
  "BLOCKED",
]);
export const TaskStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "DEFERRED",
  "ABANDONED",
  "BLOCKED",
]);
export const PlanStatusEnum = z.enum(["IN_PROGRESS", "DONE", "PAUSED"]);
export const SessionStatusEnum = z.enum(["IN_PROGRESS", "PAUSED", "DONE"]);
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
