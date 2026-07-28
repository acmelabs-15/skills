#!/usr/bin/env bun
/**
 * lock-decision mutation wrapper (decisions skill).
 *
 * Flips a PLAN `decisions.N` part's decision-list entry to LOCKED via the
 * deterministic `applyPlanMutation({ type: "lock-decision", ... })` mutation.
 * When the locked decision is the LAST pending decision in its part, the part
 * substatus also advances IN_PROGRESS → DONE (the decisions-part is complete
 * once every decision is locked).
 *
 * Thin wrapper: reads PLAN markdown, applies the mutation(s), writes back via
 * Bun.write. Idempotent — re-running the same lock produces byte-identical
 * markdown and skips the write.
 *
 * Per-skill scripts pattern (each skill owns its mutation wrappers) and the
 * strict path-containment rule (resolve under projectRoot, accept only when the
 * resolved path is the root or sits beneath root + path separator).
 *
 * Exit codes:
 *   0  success (lock applied, or already locked — no-op)
 *   1  mutation failure (stderr names the failing item)
 *   2  usage error / path-containment violation / missing required flag
 */

import path from "node:path";
import { applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";

interface LockDecisionArgs {
  planPath: string;
  decisionId: string;
  optionText: string;
  partId: string;
  owningSession: string;
  atEvent: number;
  projectRoot: string;
}

const FLAG_MAP: Record<string, keyof LockDecisionArgs> = {
  "--plan-path": "planPath",
  "--decision-id": "decisionId",
  "--option-text": "optionText",
  "--part-id": "partId",
  "--owning-session": "owningSession",
  "--at-event": "atEvent",
  "--project-root": "projectRoot",
};

type ParseResult = { ok: true; value: LockDecisionArgs } | { ok: false; error: string };

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

  const required: Array<[string, keyof LockDecisionArgs]> = [
    ["--plan-path", "planPath"],
    ["--decision-id", "decisionId"],
    ["--option-text", "optionText"],
    ["--part-id", "partId"],
    ["--owning-session", "owningSession"],
    ["--at-event", "atEvent"],
  ];
  for (const [flag] of required) {
    if (raw[flag] === undefined) return { ok: false, error: `missing required flag: ${flag}` };
  }

  const atEvent = Number.parseInt(raw["--at-event"] ?? "", 10);
  if (!Number.isInteger(atEvent) || atEvent <= 0) {
    return { ok: false, error: "--at-event must be a positive integer" };
  }

  return {
    ok: true,
    value: {
      planPath: raw["--plan-path"] ?? "",
      decisionId: raw["--decision-id"] ?? "",
      optionText: raw["--option-text"] ?? "",
      partId: raw["--part-id"] ?? "",
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

function lockedMarkdown(markdown: string, args: LockDecisionArgs): string {
  // Phase 1 — flip the decision-list entry to LOCKED (real mutation API).
  const afterLock = applyPlanMutation(markdown, {
    type: "lock-decision",
    partId: args.partId,
    decisionId: args.decisionId,
    topic: args.optionText,
  });

  // Phase 2 — when every decision in the part is now LOCKED and the part is
  // still IN_PROGRESS, advance the substatus to DONE.
  const plan = parsePlanNote(afterLock);
  const part = plan.parts.find((p) => p.id === args.partId);
  if (!part) {
    throw new Error(`lock-decision: part ${args.partId} not found`);
  }
  const decisions = part.decisions ?? [];
  const allLocked = decisions.length > 0 && decisions.every((d) => d.status === "LOCKED");
  if (allLocked && part.substatus === "IN_PROGRESS") {
    return applyPlanMutation(afterLock, {
      type: "set-part-substatus",
      partId: args.partId,
      from: "IN_PROGRESS",
      to: "DONE",
      completing_session: args.owningSession,
      outcome: `All decisions locked at event ${args.atEvent}`,
    });
  }
  return afterLock;
}

export async function lockDecisionCli(argv: string[]): Promise<number> {
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
    after = lockedMarkdown(before, args);
  } catch (err) {
    console.error(`Mutation failure: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (after === before) {
    return 0; // Idempotent no-op — already locked.
  }

  await Bun.write(args.planPath, after);
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  lockDecisionCli(Bun.argv.slice(2)).then((code) => process.exit(code));
}
