import { parsePlanNote } from "../parsers/plan-note.js";
import { renderPlanNote } from "../renderers/plan-note.js";
import type { DodItem, PendingDecision, PlanNote, Task } from "../schemas/plan-note.js";
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

export type PlanMutation =
  | SetPartSubstatus
  | LockDecision
  | FlipDodItem
  | AddTask
  | TransitionTask
  | SurfacePendingDecision
  | ResolvePendingDecision
  | AddBlocker
  | ClearBlockers;

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
