import { parsePlanNote } from "../parsers/plan-note.js";
import { renderPlanNote } from "../renderers/plan-note.js";
import type {
  BuildWorkflowItem,
  BuildWorkflowStatus,
  DodItem,
  PendingDecision,
  PlanNote,
  Task,
} from "../schemas/plan-note.js";
import { PlanNoteSchema } from "../schemas/plan-note.js";

/**
 * Plan mutation API (ADR-003 D-3 deterministic typed mutations).
 *
 * Each mutation is a small declarative record. `applyPlanMutation` parses the
 * source markdown, applies the mutation to the model, re-validates via
 * PlanNoteSchema, and renders back. Auto-propagation of derived sections
 * (Progress Dashboard + Mermaid graph) happens automatically because the
 * renderer regenerates them from `parts[]` on every render.
 */

export type SetPartSubstatus = {
  type: "set-part-substatus";
  partId: string;
  from: string;
  to: string;
  completing_session?: string;
  outcome?: string;
};

export type LockDecision = {
  type: "lock-decision";
  partId: string;
  decisionId: string;
  topic: string;
};

export type FlipDodItem = {
  type: "flip-dod-item";
  partId: string;
  dodIndex: number;
  done: boolean;
};

export type AddTask = {
  type: "add-task";
  task: {
    id: string;
    subject: string;
    part: string;
    files: string[];
    status: "PENDING";
  };
};

export type TransitionTask = {
  type: "transition-task";
  taskId: string;
  from: string;
  to: string;
  atEvent?: number;
};

export type SurfacePendingDecision = {
  type: "surface-pending-decision";
  pud: {
    id: string;
    part: string;
    question: string;
    options: Array<{ label: string; description: string }>;
    surfaced_at_event: number;
    surfaced_session: string;
  };
};

export type ResolvePendingDecision = {
  type: "resolve-pending-decision";
  pudId: string;
  selectedOption: string;
};

export type AddBlocker = { type: "add-blocker"; text: string };
export type ClearBlockers = { type: "clear-blockers" };

/**
 * Advance an `impl-TASK-NNN-SPEC-MMM` workflow item to a new status.
 *
 * Per `feedback_per_task_build_qa_cycle` (TIER-1 BLOCKING), every transition
 * MANDATES session context (`owning_session` + `at_event`). These fields are
 * required at the type level AND defensively validated at runtime — the
 * mutation throws if either is missing or malformed.
 */
export type TransitionImplItem = {
  type: "transition-impl-item";
  partId: string;
  taskRef: string;
  from: BuildWorkflowStatus;
  to: BuildWorkflowStatus;
  owning_session: string;
  at_event: number;
  failed_iterations_delta?: number;
};

/**
 * Advance a `qa-TASK-NNN-SPEC-MMM` workflow item to a new status.
 *
 * Same context-mandate as TransitionImplItem. Additional defensive checks:
 * - transitioning to DONE or FAILED requires `test_report_ref`
 * - transitioning to IN_PROGRESS or DONE requires the paired impl item to
 *   already be DONE (the schema enforces this too — this throws earlier
 *   with a clearer message).
 */
export type TransitionQaItem = {
  type: "transition-qa-item";
  partId: string;
  taskRef: string;
  from: BuildWorkflowStatus;
  to: BuildWorkflowStatus;
  owning_session: string;
  at_event: number;
  test_report_ref?: string;
  fix_brief_for_event?: number;
};

export type PlanMutation =
  | SetPartSubstatus
  | LockDecision
  | FlipDodItem
  | AddTask
  | TransitionTask
  | SurfacePendingDecision
  | ResolvePendingDecision
  | AddBlocker
  | ClearBlockers
  | TransitionImplItem
  | TransitionQaItem;

export function applyPlanMutation(markdown: string, mutation: PlanMutation): string {
  const plan = parsePlanNote(markdown);
  const mutated = applyMutationToModel(plan, mutation);
  PlanNoteSchema.parse(mutated);
  return renderPlanNote(mutated);
}

function applyMutationToModel(plan: PlanNote, mutation: PlanMutation): PlanNote {
  switch (mutation.type) {
    case "set-part-substatus":
      return setPartSubstatus(plan, mutation);
    case "lock-decision":
      return lockDecision(plan, mutation);
    case "flip-dod-item":
      return flipDodItem(plan, mutation);
    case "add-task":
      return addTask(plan, mutation);
    case "transition-task":
      return transitionTask(plan, mutation);
    case "surface-pending-decision":
      return surfacePendingDecision(plan, mutation);
    case "resolve-pending-decision":
      return resolvePendingDecision(plan, mutation);
    case "add-blocker":
      return { ...plan, blockers: [...plan.blockers, mutation.text] };
    case "clear-blockers":
      return { ...plan, blockers: [] };
    case "transition-impl-item":
      return transitionImplItem(plan, mutation);
    case "transition-qa-item":
      return transitionQaItem(plan, mutation);
  }
}

function setPartSubstatus(plan: PlanNote, m: SetPartSubstatus): PlanNote {
  return {
    ...plan,
    parts: plan.parts.map((p) => {
      if (p.id !== m.partId) return p;
      if (p.substatus !== m.from) {
        throw new Error(`Part ${m.partId}: expected substatus ${m.from}, got ${p.substatus}`);
      }
      const next = { ...p, substatus: m.to as typeof p.substatus };
      if (m.completing_session) next.completing_session = m.completing_session;
      if (m.outcome) next.outcome = m.outcome;
      return next;
    }),
  };
}

function lockDecision(plan: PlanNote, m: LockDecision): PlanNote {
  return {
    ...plan,
    parts: plan.parts.map((p) => {
      if (p.id !== m.partId) return p;
      const decisions = [...(p.decisions ?? [])];
      const idx = decisions.findIndex((d) => d.id === m.decisionId);
      if (idx >= 0) {
        const existing = decisions[idx];
        if (existing) decisions[idx] = { ...existing, status: "LOCKED", topic: m.topic };
      } else {
        decisions.push({ id: m.decisionId, status: "LOCKED", topic: m.topic });
      }
      return { ...p, decisions };
    }),
  };
}

function flipDodItem(plan: PlanNote, m: FlipDodItem): PlanNote {
  return {
    ...plan,
    parts: plan.parts.map((p) => {
      if (p.id !== m.partId) return p;
      const dod: DodItem[] = p.dod.map((it, i) =>
        i === m.dodIndex ? { ...it, done: m.done } : it,
      );
      return { ...p, dod };
    }),
  };
}

function addTask(plan: PlanNote, m: AddTask): PlanNote {
  if (plan.tasks.some((t) => t.id === m.task.id)) {
    throw new Error(`Task ${m.task.id} already exists`);
  }
  const task: Task = {
    id: m.task.id,
    subject: m.task.subject,
    part: m.task.part,
    files: m.task.files,
    status: m.task.status,
  };
  return { ...plan, tasks: [...plan.tasks, task] };
}

function transitionTask(plan: PlanNote, m: TransitionTask): PlanNote {
  return {
    ...plan,
    tasks: plan.tasks.map((t) => {
      if (t.id !== m.taskId) return t;
      if (t.status !== m.from) {
        throw new Error(`Task ${m.taskId}: expected status ${m.from}, got ${t.status}`);
      }
      const next: Task = { ...t, status: m.to as typeof t.status };
      if (m.to === "DONE" && m.atEvent !== undefined) next.resolved_at_event = m.atEvent;
      return next;
    }),
  };
}

function surfacePendingDecision(plan: PlanNote, m: SurfacePendingDecision): PlanNote {
  if (plan.pending_decisions.some((p) => p.id === m.pud.id)) {
    throw new Error(`PUD ${m.pud.id} already exists`);
  }
  const pud: PendingDecision = {
    id: m.pud.id,
    part: m.pud.part,
    question: m.pud.question,
    surfaced_at_event: m.pud.surfaced_at_event,
    surfaced_session: m.pud.surfaced_session,
    options: m.pud.options,
  };
  return { ...plan, pending_decisions: [...plan.pending_decisions, pud] };
}

function assertSessionContext(
  mutationType: string,
  owning_session: string,
  at_event: number,
): void {
  if (typeof owning_session !== "string" || owning_session.trim().length === 0) {
    throw new Error(
      `${mutationType}: owning_session is required (per feedback_per_task_build_qa_cycle — every workflow transition MUST carry session context)`,
    );
  }
  if (!Number.isInteger(at_event) || at_event <= 0) {
    throw new Error(
      `${mutationType}: at_event must be a positive integer (got ${at_event}); every workflow transition MUST reference the authoring session event`,
    );
  }
}

function clampFailedIterations(current: number, delta: number | undefined): number {
  if (delta === undefined || delta === 0) return current;
  const next = current + delta;
  if (next < 0) return 0;
  if (next > 3) return 3;
  return next;
}

function transitionImplItem(plan: PlanNote, m: TransitionImplItem): PlanNote {
  assertSessionContext("transition-impl-item", m.owning_session, m.at_event);
  const part = plan.parts.find((p) => p.id === m.partId);
  if (!part) {
    throw new Error(`transition-impl-item: part ${m.partId} not found`);
  }
  const items = part.build_workflow_items;
  if (!items || items.length === 0) {
    throw new Error(`transition-impl-item: part ${m.partId} has no build_workflow_items`);
  }
  const item = items.find((i) => i.type === "impl" && i.task_ref === m.taskRef);
  if (!item) {
    throw new Error(
      `transition-impl-item: impl item for task ${m.taskRef} not found in part ${m.partId}`,
    );
  }
  if (item.status !== m.from) {
    throw new Error(
      `transition-impl-item: impl-${m.taskRef} expected status ${m.from}, got ${item.status}`,
    );
  }
  return {
    ...plan,
    parts: plan.parts.map((p) => {
      if (p.id !== m.partId) return p;
      const nextItems = (p.build_workflow_items ?? []).map((i) => {
        if (i.type !== "impl" || i.task_ref !== m.taskRef) return i;
        const next: BuildWorkflowItem = {
          ...i,
          status: m.to,
          owning_session: m.owning_session,
          transitioned_at_event: m.at_event,
          failed_iterations: clampFailedIterations(i.failed_iterations, m.failed_iterations_delta),
        };
        return next;
      });
      return { ...p, build_workflow_items: nextItems };
    }),
  };
}

function transitionQaItem(plan: PlanNote, m: TransitionQaItem): PlanNote {
  assertSessionContext("transition-qa-item", m.owning_session, m.at_event);
  const part = plan.parts.find((p) => p.id === m.partId);
  if (!part) {
    throw new Error(`transition-qa-item: part ${m.partId} not found`);
  }
  const items = part.build_workflow_items;
  if (!items || items.length === 0) {
    throw new Error(`transition-qa-item: part ${m.partId} has no build_workflow_items`);
  }
  const item = items.find((i) => i.type === "qa" && i.task_ref === m.taskRef);
  if (!item) {
    throw new Error(
      `transition-qa-item: qa item for task ${m.taskRef} not found in part ${m.partId}`,
    );
  }
  if (item.status !== m.from) {
    throw new Error(
      `transition-qa-item: qa-${m.taskRef} expected status ${m.from}, got ${item.status}`,
    );
  }
  if ((m.to === "DONE" || m.to === "FAILED") && !m.test_report_ref) {
    throw new Error(`transition-qa-item: qa-${m.taskRef} → ${m.to} requires test_report_ref`);
  }
  if (m.to === "IN_PROGRESS" || m.to === "DONE") {
    const impl = items.find((i) => i.type === "impl" && i.task_ref === m.taskRef);
    if (!impl || impl.status !== "DONE") {
      throw new Error(
        `transition-qa-item: qa-${m.taskRef} → ${m.to} requires paired impl-${m.taskRef} to be DONE (currently ${impl?.status ?? "missing"})`,
      );
    }
  }
  return {
    ...plan,
    parts: plan.parts.map((p) => {
      if (p.id !== m.partId) return p;
      const nextItems = (p.build_workflow_items ?? []).map((i) => {
        if (i.type !== "qa" || i.task_ref !== m.taskRef) return i;
        const next: BuildWorkflowItem = {
          ...i,
          status: m.to,
          owning_session: m.owning_session,
          transitioned_at_event: m.at_event,
        };
        if (m.test_report_ref !== undefined) next.test_report_ref = m.test_report_ref;
        if (m.fix_brief_for_event !== undefined) next.fix_brief_for_event = m.fix_brief_for_event;
        return next;
      });
      return { ...p, build_workflow_items: nextItems };
    }),
  };
}

function resolvePendingDecision(plan: PlanNote, m: ResolvePendingDecision): PlanNote {
  // Resolving removes the PUD from the active list — Information Model
  // Category 4 (history) is logged in the session event, not here.
  if (!plan.pending_decisions.some((p) => p.id === m.pudId)) {
    throw new Error(`PUD ${m.pudId} not found`);
  }
  // Mark the PUD as resolved by removing it; the selected option is recorded
  // in the corresponding session event.
  void m.selectedOption;
  return {
    ...plan,
    pending_decisions: plan.pending_decisions.filter((p) => p.id !== m.pudId),
  };
}
