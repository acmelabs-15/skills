#!/usr/bin/env bun
/**
 * transition-impl-item mutation wrapper (build skill).
 *
 * Advances a PLAN `impl-TASK-NNN-SPEC-MMM` build-workflow item to a new status
 * via the deterministic `applyPlanMutation({ type: "transition-impl-item", ... })`
 * mutation. Per the rigid per-TASK build+qa cycle, every impl-item transition
 * MUST carry session context (owning-session + at-event); the mutation throws
 * when either is missing or malformed.
 *
 * Thin wrapper: reads PLAN markdown, applies the mutation, writes back via
 * Bun.write. Idempotent — re-running a transition that produces byte-identical
 * markdown skips the write and exits 0.
 *
 * Each skill owns its mutation wrappers; the strict path-containment rule
 * resolves the user path under projectRoot and accepts only when the resolved
 * path is the root or sits beneath root + path separator.
 *
 * Exit codes:
 *   0  success (transition applied, or already at target — no-op)
 *   1  mutation failure (schema cross-field invariant violation; stderr names it)
 *   2  usage error / path-containment violation / missing required flag
 */

import path from "node:path";
import { applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import type { BuildWorkflowStatus } from "@acmelabs/models/schemas/plan-note";

interface TransitionImplArgs {
  planPath: string;
  partId: string;
  taskRef: string;
  from: BuildWorkflowStatus;
  to: BuildWorkflowStatus;
  owningSession: string;
  atEvent: number;
  projectRoot: string;
}

const FLAG_MAP: Record<string, keyof TransitionImplArgs> = {
  "--plan-path": "planPath",
  "--part-id": "partId",
  "--task-ref": "taskRef",
  "--from": "from",
  "--to": "to",
  "--owning-session": "owningSession",
  "--at-event": "atEvent",
  "--project-root": "projectRoot",
};

type ParseResult = { ok: true; value: TransitionImplArgs } | { ok: false; error: string };

const STATUSES: readonly BuildWorkflowStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "FAILED",
];

function isStatus(value: string): value is BuildWorkflowStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function parseArgs(argv: string[]): ParseResult {
  const raw: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === undefined) continue;
    const key = FLAG_MAP[flag];
    if (!key) return { ok: false, error: `unknown flag: ${flag}` };
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
  ] as const;
  for (const flag of required) {
    if (raw[flag] === undefined) return { ok: false, error: `missing required flag: ${flag}` };
  }

  const from = raw["--from"] ?? "";
  const to = raw["--to"] ?? "";
  if (!isStatus(from))
    return { ok: false, error: `--from must be a build-workflow status: ${from}` };
  if (!isStatus(to)) return { ok: false, error: `--to must be a build-workflow status: ${to}` };

  const atEvent = Number.parseInt(raw["--at-event"] ?? "", 10);
  if (!Number.isInteger(atEvent) || atEvent <= 0) {
    return { ok: false, error: "--at-event must be a positive integer" };
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
    },
  };
}

/** D-8 path-containment: accept only paths resolving to root or beneath it. */
function isContained(projectRoot: string, userPath: string): boolean {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, userPath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

export async function transitionImplItemCli(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`Usage error: ${parsed.error}\n`);
    return 2;
  }
  const args = parsed.value;

  if (!isContained(args.projectRoot, args.planPath)) {
    process.stderr.write(
      `Path-containment violation: ${args.planPath} escapes ${args.projectRoot}\n`,
    );
    return 2;
  }

  const file = Bun.file(args.planPath);
  if (!(await file.exists())) {
    process.stderr.write(`Usage error: plan not found at ${args.planPath}\n`);
    return 2;
  }

  const before = await file.text();
  let after: string;
  try {
    after = applyPlanMutation(before, {
      type: "transition-impl-item",
      partId: args.partId,
      taskRef: args.taskRef,
      from: args.from,
      to: args.to,
      owning_session: args.owningSession,
      at_event: args.atEvent,
    });
  } catch (err) {
    process.stderr.write(`Mutation failure: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  if (after === before) return 0; // Idempotent no-op.

  await Bun.write(args.planPath, after);
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  transitionImplItemCli(Bun.argv.slice(2)).then((code) => process.exit(code));
}
