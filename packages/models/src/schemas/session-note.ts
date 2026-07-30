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

/**
 * Session lifecycle beyond opening: a pause, a resume, a close.
 *
 * A session that spans several sittings had no way to say so — `session-start`
 * existed and nothing marked the boundaries after it, which is why a paused session
 * looked identical to an abandoned one.
 */
const SessionLifecycleEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.enum(["session-pause", "session-resume", "session-close"]),
    title: z.string(),
    body: z.string().optional(),
    /** Why, for a pause; what closed it, for a close. */
    reason: z.string().optional(),
  })
  .strict();

/** A note or file written during the session. */
const ArtifactWriteEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("artifact-write"),
    title: z.string(),
    body: z.string().optional(),
    /** Permalink or path of what was written. */
    artifact: z.string().min(1),
    action: z.enum(["created", "modified", "deleted"]).optional(),
  })
  .strict();

/**
 * A ruling the user made, recorded with the question that produced it.
 *
 * Both halves are required. A recorded answer without its question is unreadable
 * six weeks later, and this session type exists precisely so a ruling survives the
 * conversation it was made in.
 */
const UserRulingEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("user-ruling"),
    title: z.string(),
    body: z.string().optional(),
    question: z.string().min(1),
    /** The chosen option, verbatim — not a summary of it. */
    answer: z.string().min(1),
  })
  .strict();

/** A commit made during the session. */
const CommitEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("commit"),
    title: z.string(),
    body: z.string().optional(),
    sha: z.string().min(7),
    message: z.string().optional(),
  })
  .strict();

/**
 * A halt: work stopped and something is needed before it resumes.
 *
 * `halt_id` names which gate stopped, so the halt is traceable to the rule that
 * raised it rather than being a bare "stopped here".
 */
const HaltEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("halt"),
    title: z.string(),
    body: z.string().optional(),
    halt_id: z.string().min(1),
    resolved_at_event: z.number().int().positive().optional(),
  })
  .strict();

/** A note restructuring: a split, a merge, or content placed into an existing note. */
const CurationOpEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("curation-op"),
    title: z.string(),
    body: z.string().optional(),
    operation: z.enum(["decompose", "recompose", "place", "audit"]),
    targets: z.array(z.string()).min(1),
  })
  .strict();

/**
 * A correction to something recorded earlier.
 *
 * The ledger is append-only, so a mistake is not edited away — it is corrected by a
 * later event that names the one it supersedes. `corrects_event` is what makes the
 * earlier entry findable rather than quietly wrong.
 */
const CorrectionEventSchema = z
  .object({
    n: z.number().int().positive(),
    type: z.literal("correction"),
    title: z.string(),
    body: z.string().optional(),
    corrects_event: z.number().int().positive(),
    what_changed: z.string().min(1),
  })
  .strict();

/**
 * The typed session-event union.
 *
 * Home per R-6: the enum lives in the composition library, not in a skill body, so
 * the parser, renderer and validators share one definition.
 *
 * Membership is prompt 10's to finalise. This is R-6's candidate list landed as the
 * starting set: five of its fourteen already shipped (`session-start`,
 * `part-transition`, `agent-dispatch`, `decision-lock`, `debate-result`), and the
 * nine additions above cover the rest. Five shipped types are NOT in R-6's list —
 * `bootstrap`, `task-transition`, `state-change`, and the two pending-decision types
 * — and are kept rather than dropped: real session notes use them, and prompt 10 can
 * retire one deliberately where guessing here would delete a working type.
 */
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
  SessionLifecycleEventSchema,
  ArtifactWriteEventSchema,
  UserRulingEventSchema,
  CommitEventSchema,
  HaltEventSchema,
  CurationOpEventSchema,
  CorrectionEventSchema,
]);

const BoundPlanRefSchema = z
  .object({
    ref: z.string().min(1),
    worked_parts: z.array(PartIdSchema).min(1),
  })
  .strict();

/**
 * A date written in frontmatter, normalised to an ISO string.
 *
 * YAML parses a bare `2026-07-29` into a Date object, so a plain `z.string()`
 * rejects the most natural way to write the key. `z.coerce.string()` accepts it but
 * yields `"Wed Jul 29 2026 00:00:00 GMT+0000 …"` — technically a string and useless
 * for filtering or reading.
 *
 * A Date is therefore converted deliberately: a midnight-UTC value keeps its
 * date-only form, anything with a time keeps the full instant. Strings pass through
 * untouched, so an author who quoted the value gets exactly what they wrote.
 */
const IsoDateSchema = z.preprocess((value) => {
  if (!(value instanceof Date)) return value;
  const iso = value.toISOString();
  // Date-only in, date-only out. Widening it to a timestamp would invent precision
  // the author did not write.
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}, z.string());

/**
 * Session frontmatter.
 *
 * Five keys are added here — `started`, `ended`, `branch`, `plan`, `parts` — on one
 * rule: frontmatter is for FILTERING, Relations are for traversal. A question like
 * "which sessions touched this plan last week" is answerable from indexed
 * frontmatter and not from prose, and the explicit date keys are what make date
 * filtering real: search filters on the index's modified timestamp, which is when a
 * note was last touched rather than when its work happened.
 *
 * All five are optional. Every session note on disk predates them, and requiring
 * one would fail ten real notes to enforce a convention on notes already written —
 * the same reason the part-id grammar reports instead of rejecting. New sessions
 * carry them because the session skill writes them.
 *
 * `plan` and `parts` overlap with `binds_to` and the Relations section by design.
 * That is the point of the rule: the same fact appears in a filterable place and a
 * traversable one, and a validator checks the two agree rather than picking a
 * winner. `validateFrontmatterAgreesWithRelations` below is that check.
 *
 * Not `.strict()` any more. One real note carries `status_history`, which strict
 * mode rejects outright — so a key someone deliberately wrote made the whole note
 * unreadable. Unknown keys now pass through and are reported by
 * `unspecifiedFrontmatterKeys`, because silently discarding them is what R-4
 * explicitly rules out.
 */
const SessionFrontmatterSchema = z
  .object({
    title: z.string().regex(/^SESSION-\d{4}-\d{2}-\d{2}_\d{2}:/),
    type: z.literal("session"),
    status: SessionStatusEnum,
    /**
     * Plans and parts this session binds to, in the pre-R-4 spelling.
     *
     * Optional because only 3 of 10 real session notes carry it while the schema
     * required it — so the requirement was already fictional. `plan` and `parts`
     * are the R-4 replacements; this stays readable rather than being deleted.
     */
    binds_to: z.array(z.string()).min(1).optional(),
    permalink: z.string().regex(/^sessions\//),
    tags: z.array(z.string()).min(2).max(5),
    /**
     * ISO date or date-time the session opened.
     *
     * Coerced, because YAML parses a bare `2026-07-29` into a Date rather than a
     * string — so requiring a string rejects the most natural way to write the key.
     * Both `started: 2026-07-29` and `started: "2026-07-29T09:00:00Z"` are accepted,
     * and both normalise to a string the index can filter on.
     */
    started: IsoDateSchema.optional(),
    /** ISO date or date-time the session closed; absent while it is open. */
    ended: IsoDateSchema.optional(),
    /** Git branch the work happened on. */
    branch: z.string().optional(),
    /** Permalink of the plan this session binds to. */
    plan: z.string().optional(),
    /** Part ids this session worked on. */
    parts: z.array(z.string()).optional(),
  })
  .passthrough();

/**
 * Frontmatter keys the schema does not describe.
 *
 * Reported rather than rejected. A note carrying `status_history` was written by
 * someone who wanted that field; `.strict()` made the entire note unparseable over
 * it, which is a worse outcome than an unrecognised key. Surfacing them keeps R-4's
 * no-silent-discard rule honest — the keys survive a read, and a caller can see
 * which ones are outside the schema.
 */
const SPECIFIED_FRONTMATTER_KEYS = new Set([
  "title",
  "type",
  "status",
  "binds_to",
  "permalink",
  "tags",
  "started",
  "ended",
  "branch",
  "plan",
  "parts",
]);

export function unspecifiedFrontmatterKeys(frontmatter: Record<string, unknown>): string[] {
  return Object.keys(frontmatter).filter((key) => !SPECIFIED_FRONTMATTER_KEYS.has(key));
}

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

/** A disagreement between filterable frontmatter and traversable body state. */
export interface FrontmatterDisagreement {
  key: "plan" | "parts";
  /** What frontmatter claims. */
  frontmatter: string | string[];
  /** What the body's bound_plans actually says. */
  body: string | string[];
}

/**
 * Check that the frontmatter's filterable copy agrees with the body's real state.
 *
 * R-4's rule deliberately stores the same fact twice: frontmatter so it can be
 * filtered, `bound_plans` so it can be traversed. Duplication is only safe when
 * something checks the copies match — otherwise a filter silently returns the wrong
 * sessions, which is worse than not being able to filter at all.
 *
 * Absent frontmatter keys are not disagreements. Every existing note omits them, and
 * "not stated" is not the same as "stated wrongly".
 */
export function validateFrontmatterAgreesWithRelations(
  session: SessionNote,
): FrontmatterDisagreement[] {
  const out: FrontmatterDisagreement[] = [];
  const fm = session.frontmatter;

  if (fm.plan !== undefined) {
    // A session binds to one plan (R-3), so the first bound plan is the plan.
    const bodyPlan = session.bound_plans[0]?.ref;
    if (bodyPlan !== undefined && !refsMatch(fm.plan, bodyPlan)) {
      out.push({ key: "plan", frontmatter: fm.plan, body: bodyPlan });
    }
  }

  if (fm.parts !== undefined) {
    const bodyParts = session.bound_plans.flatMap((b) => b.worked_parts);
    const missing = fm.parts.filter((p) => !bodyParts.includes(p));
    const extra = bodyParts.filter((p) => !fm.parts?.includes(p));
    if (missing.length > 0 || extra.length > 0) {
      out.push({ key: "parts", frontmatter: fm.parts, body: bodyParts });
    }
  }

  return out;
}

/**
 * Do two references point at the same note?
 *
 * The frontmatter form is a permalink (`planning/plan-001-x`) while the body form is
 * a wikilink title (`PLAN-001: X`), so they are compared on the entity id both
 * contain rather than as strings. Comparing raw would report every session as
 * disagreeing with itself.
 */
function refsMatch(permalink: string, wikilinkTitle: string): boolean {
  const idOf = (s: string): string | undefined =>
    s.match(/PLAN-\d+/i)?.[0]?.toUpperCase() ?? undefined;
  const a = idOf(permalink);
  const b = idOf(wikilinkTitle);
  // Neither carrying an id means there is nothing to contradict.
  if (a === undefined || b === undefined) return true;
  return a === b;
}
