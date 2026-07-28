#!/usr/bin/env bun
/**
 * transition-qa-item mutation wrapper (build skill).
 *
 * Advances a `qa-TASK-NNN-SPEC-MMM` build-workflow item to a new status via the
 * deterministic `applyPlanMutation({ type: "transition-qa-item", ... })`
 * mutation. The composition library enforces the cross-field invariants
 * centrally — this wrapper only assembles the mutation args and surfaces any
 * invariant violation as a non-zero exit:
 *   - session context (owning_session + at_event) is mandatory
 *   - transitioning to DONE or FAILED requires qa_ref
 *   - transitioning to IN_PROGRESS or DONE requires the paired impl item DONE
 *
 * Thin wrapper: reads PLAN markdown, applies the mutation, writes back via
 * Bun.write. Idempotent — a no-op transition produces byte-identical markdown
 * and skips the write.
 *
 * Exit codes:
 *   0  success (transition applied, or already in target state — no-op)
 *   1  mutation failure / cross-field-invariant violation (stderr names it)
 *   2  usage error / path-containment violation / missing required flag
 */

import path from "node:path";
import { applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import type { BuildWorkflowStatus } from "@acmelabs/models/schemas/plan-note";

const WORKFLOW_STATUSES: readonly BuildWorkflowStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "FAILED",
];

interface TransitionQaArgs {
  planPath: string;
  partId: string;
  taskRef: string;
  from: BuildWorkflowStatus;
  to: BuildWorkflowStatus;
  owningSession: string;
  atEvent: number;
  qaRef?: string;
  fixBriefForEvent?: number;
  projectRoot: string;
}

const FLAGS = new Set([
  "--plan-path",
  "--part-id",
  "--task-ref",
  "--from",
  "--to",
  "--owning-session",
  "--at-event",
  "--qa-ref",
  "--fix-brief-for-event",
  "--project-root",
]);

type ParseResult = { ok: true; value: TransitionQaArgs } | { ok: false; error: string };

function isWorkflowStatus(value: string): value is BuildWorkflowStatus {
  return (WORKFLOW_STATUSES as readonly string[]).includes(value);
}

function parseArgs(argv: string[]): ParseResult {
  const raw: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === undefined) continue;
    if (!FLAGS.has(flag)) return { ok: false, error: `unknown flag: ${flag}` };
    const value = argv[++i];
    if (value === undefined) return { ok: false, error: `missing value for ${flag}` };
    raw[flag] = value;
  }

  const required = [
    "--plan-path",
    "--part-id",
    "--task-ref",
    "--from",
    "--to",
    "--owning-session",
    "--at-event",
  ];
  for (const flag of required) {
    if (raw[flag] === undefined) return { ok: false, error: `missing required flag: ${flag}` };
  }

  const from = raw["--from"] ?? "";
  const to = raw["--to"] ?? "";
  if (!isWorkflowStatus(from))
    return { ok: false, error: `--from must be a workflow status, got ${from}` };
  if (!isWorkflowStatus(to))
    return { ok: false, error: `--to must be a workflow status, got ${to}` };

  const atEvent = Number.parseInt(raw["--at-event"] ?? "", 10);
  if (!Number.isInteger(atEvent) || atEvent <= 0) {
    return { ok: false, error: "--at-event must be a positive integer" };
  }

  let fixBriefForEvent: number | undefined;
  if (raw["--fix-brief-for-event"] !== undefined) {
    const parsed = Number.parseInt(raw["--fix-brief-for-event"], 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "--fix-brief-for-event must be a positive integer" };
    }
    fixBriefForEvent = parsed;
  }

  return {
    ok: true,
    value: {
      planPath: raw["--plan-path"] ?? "",
      partId: raw["--part-id"] ?? "",
      taskRef: raw["--task-ref"] ?? "",
      from,
      to,
      owningSession: raw["--owning-session"] ?? "",
      atEvent,
      projectRoot: raw["--project-root"] ?? process.cwd(),
      ...(raw["--qa-ref"] !== undefined ? { qaRef: raw["--qa-ref"] } : {}),
      ...(fixBriefForEvent !== undefined ? { fixBriefForEvent } : {}),
    },
  };
}

/** D-8 path-containment: accept only paths resolving to root or beneath it. */
function isContained(projectRoot: string, userPath: string): boolean {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, userPath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function transitionedMarkdown(markdown: string, args: TransitionQaArgs): string {
  return applyPlanMutation(markdown, {
    type: "transition-qa-item",
    partId: args.partId,
    taskRef: args.taskRef,
    from: args.from,
    to: args.to,
    owning_session: args.owningSession,
    at_event: args.atEvent,
    ...(args.qaRef !== undefined ? { qa_ref: args.qaRef } : {}),
    ...(args.fixBriefForEvent !== undefined ? { fix_brief_for_event: args.fixBriefForEvent } : {}),
  });
}

export async function transitionQaItemCli(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    console.error(`Usage error: ${parsed.error}`);
    return 2;
  }
  const args = parsed.value;

  if (!isContained(args.projectRoot, args.planPath)) {
    console.error(`Path-containment violation: ${args.planPath} escapes ${args.projectRoot}`);
    return 2;
  }

  const file = Bun.file(args.planPath);
  if (!(await file.exists())) {
    console.error(`Usage error: plan not found at ${args.planPath}`);
    return 2;
  }

  const before = await file.text();
  let after: string;
  try {
    after = transitionedMarkdown(before, args);
  } catch (err) {
    console.error(`Mutation failure: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (after === before) {
    return 0; // Idempotent no-op — already in target state.
  }

  await Bun.write(args.planPath, after);
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  transitionQaItemCli(Bun.argv.slice(2)).then((code) => process.exit(code));
}
