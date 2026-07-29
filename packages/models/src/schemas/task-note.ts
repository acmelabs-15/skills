import { z } from "zod";
import {
  EffortEnum,
  ObservationSchema,
  RelationSchema,
  SpecTaskIdSchema,
  StatusAtom,
} from "./common.js";

/**
 * TaskNote Zod schema (Phase X.D.5, 2026-05-20).
 *
 * Mirrors the canonical TASK note structure per
 * ~/KNOWLEDGE-GRAPH-STRUCTURES.md Section 4.8 and example
 * docs/specs/SPEC-007-plan-session-render/tasks/TASK-001-SPEC-007-implement-common-schema.md.
 *
 * Purpose: mechanical enforcement of the per-TASK build+qa cycle.
 * Status DONE requires every Definition of Done item to be checked or
 * deferred-with-rationale. Schema-rejected claims fail mechanically,
 * eliminating the silent-skip failure mode.
 *
 * Out of scope this round: TaskNote renderer (current write-path stays
 * through opaque spec-subtree mutations).
 */

/**
 * Status enum for TaskNote frontmatter — a work-progress subset, plus `TODO`.
 *
 * `TODO` is the same state the atoms call `PENDING`: not started. Two names for
 * one state is exactly what the shared vocabulary exists to prevent, and this is
 * the single case where the synonym is not local drift — `~/KNOWLEDGE-GRAPH-
 * CONVENTIONS.md` Section 8.1 item 6 specifies task-note values as
 * `TODO | IN_PROGRESS | DONE | BLOCKED`, and every TASK note on disk was authored
 * against that.
 *
 * So `TODO` stays, and it stays as the ONLY spelling: `PENDING` is deliberately
 * excluded here, because accepting both would put two names for one state inside
 * a single note type — the precise ambiguity the shared vocabulary exists to
 * remove. A test asserts the rejection. Renaming `TODO` to `PENDING` outright
 * would mean changing the home spec, the note corpus and every fixture together,
 * which is a decision about the spec rather than a schema tidy-up.
 *
 * The rest of the enum subsets the work-progress atoms normally, so only the
 * not-started state carries the exception.
 *
 * `CANCELLED` is deliberately absent despite having appeared on one real note.
 * That note was corrected to `ABANDONED`, which is the atom for
 * stopped-deliberately-with-a-rationale and matched what its own observations
 * already recorded. Admitting the value would have given one state two spellings.
 */
export const TaskNoteStatusEnum = z.enum([
  "TODO",
  ...StatusAtom.extract(["IN_PROGRESS", "BLOCKED", "DONE", "DEFERRED", "ABANDONED"]).options,
]);

const TaskFrontmatterSchema = z
  .object({
    title: z.string().regex(/^TASK-\d{3,}-SPEC-\d{3,}:/),
    type: z.literal("task"),
    permalink: z.string().regex(/^specs\/spec-\d{3,}-[a-z0-9-]+\/tasks\/task-\d{3,}-spec-\d{3,}/),
    status: TaskNoteStatusEnum,
    effort: EffortEnum.optional(),
    estimate: z.string().optional(),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const DodCheckboxItemSchema = z
  .object({
    text: z.string().min(1),
    done: z.boolean(),
    deferred_rationale: z.string().min(1).optional(),
  })
  .strict();

const FileAffectedActionEnum = z.enum(["NEW", "MODIFY", "DELETE"]);

const FileAffectedSchema = z
  .object({
    file: z.string().min(1),
    action: FileAffectedActionEnum,
    purpose: z.string().min(1),
  })
  .strict();

const EffortSummaryTierEnum = z.enum(["Human", "AI-Dominant", "AI-Assisted"]);

const EffortSummaryRowSchema = z
  .object({
    tier: EffortSummaryTierEnum,
    estimate: z.string().min(1),
    notes: z.string(),
  })
  .strict();

export const TaskNoteSchema = z
  .object({
    frontmatter: TaskFrontmatterSchema,
    design_context: z.string().optional(),
    objective: z.string().min(1),
    scope_in: z.array(z.string()),
    scope_out: z.array(z.string()),
    implementation_notes: z.string().optional(),
    files_affected: z.array(FileAffectedSchema),
    testing_requirements: z.array(z.string()),
    definition_of_done: z.array(DodCheckboxItemSchema).min(1),
    adr_compliance: z.array(DodCheckboxItemSchema).optional(),
    effort_summary: z.array(EffortSummaryRowSchema).optional(),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived TASK id (from frontmatter title) must
    // be valid per SpecTaskIdSchema. Extra defensive check beyond the title
    // regex which only asserts the prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(TASK-\d{3,}-SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = SpecTaskIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields TASK id ${derivedId} which fails SpecTaskIdSchema`,
        });
      }
    }

    // Cross-field invariant 2: status DONE requires every DoD item satisfied
    // (done === true OR deferred_rationale present). This is the load-bearing
    // protocol enforcement: a DONE claim with an open DoD item is rejected
    // mechanically rather than trusted.
    if (data.frontmatter.status === "DONE") {
      const unsatisfied = data.definition_of_done.filter(
        (item) => !item.done && !item.deferred_rationale,
      );
      if (unsatisfied.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status DONE requires every Definition of Done item checked or deferred-with-rationale; ${unsatisfied.length} unsatisfied: ${unsatisfied.map((i) => i.text).join(" | ")}`,
        });
      }
    }

    // Cross-field invariant 3: if adr_compliance section is present,
    // it must have at least one item (mirrors the structure of DoD).
    if (data.adr_compliance !== undefined && data.adr_compliance.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "adr_compliance section present but empty; omit field entirely if section absent",
      });
    }
  });

export type TaskNote = z.infer<typeof TaskNoteSchema>;
export type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
export type DodCheckboxItem = z.infer<typeof DodCheckboxItemSchema>;
export type FileAffected = z.infer<typeof FileAffectedSchema>;
export type FileAffectedAction = z.infer<typeof FileAffectedActionEnum>;
export type EffortSummaryRow = z.infer<typeof EffortSummaryRowSchema>;
export type TaskNoteStatus = z.infer<typeof TaskNoteStatusEnum>;
