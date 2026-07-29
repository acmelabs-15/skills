#!/usr/bin/env bun
/**
 * set-part-done CLI (plan skill Contract-1 completion signal).
 *
 * A phase skill (research / decisions / spec / build / review / end) signals
 * completion of its PLAN part by calling this script. It flips the matching
 * part substatus IN_PROGRESS → DONE (default) or → DEFERRED / ABANDONED, via
 * the deterministic `applyPlanMutation({ type: "set-part-substatus", ... })`
 * mutation, setting `completing_session` and the `outcome` wikilink.
 *
 * Contract-1 invariant: DEFERRED and ABANDONED are non-DONE terminal states and
 * REQUIRE a rationale. The mutation layer does not enforce this, so the script
 * pre-checks: a missing rationale for a non-DONE terminal status is a usage
 * error (exit 2) before any mutation runs. When a rationale is supplied it is
 * folded into the persisted `outcome` text so the reason survives in the PLAN.
 *
 * Thin wrapper: `if (import.meta.main)` guard, exported `setPartDoneCli` fn,
 * strict D-8 path-containment before any file read. Idempotent — re-running the
 * same completion produces byte-identical markdown and skips the write.
 *
 * Exit codes:
 *   0  success (substatus flipped, or already at target — no-op)
 *   1  mutation failure (stderr names the failing item, e.g. unknown part-id
 *      or a `from` mismatch when the part is not IN_PROGRESS)
 *   2  usage error / path-containment violation / missing required flag /
 *      missing rationale for DEFERRED|ABANDONED
 */

// readdir is a directory listing with no Bun equivalent; all file I/O is Bun-native.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";

type TerminalStatus = "DONE" | "DEFERRED" | "ABANDONED";

const TERMINAL_STATUSES: readonly TerminalStatus[] = ["DONE", "DEFERRED", "ABANDONED"];

interface SetPartDoneArgs {
  readonly planPath: string;
  readonly partId: string;
  readonly status: TerminalStatus;
  readonly outcome: string;
  readonly completingSession: string;
  readonly atEvent: number;
  readonly rationale?: string;
  readonly projectRoot: string;
}

const FLAG_MAP: Record<string, string> = {
  "--plan-path": "planPath",
  "--part-id": "partId",
  "--status": "status",
  "--outcome": "outcome",
  "--completing-session": "completingSession",
  // Accepted alias. The old name said "owning" while populating `completing_session`
  // — the session that FINISHES a part is not the one that owns it, and a caller
  // reading the flag name would have recorded the wrong session deliberately.
  "--owning-session": "completingSession",
  "--at-event": "atEvent",
  "--rationale": "rationale",
  "--project-root": "projectRoot",
};

type ParseResult = { ok: true; value: SetPartDoneArgs } | { ok: false; error: string };

function isTerminalStatus(value: string): value is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(value);
}

/**
 * Accept the `key=value` form the documentation uses, alongside `--flag value`.
 *
 * Every documented invocation of this script is spelled
 * `set-part-done plan=PLAN-NNN part=<id> outcome=[[...]] status=DONE`, which this
 * parser rejected outright — so a call copied verbatim from any of the four doc
 * sites exited 2. Two separate mismatches caused that: the `key=value` spelling,
 * and `plan=` carrying an identifier where the script wanted a filesystem path.
 *
 * Normalising here rather than rewriting the docs is the deliberate choice: an
 * identifier is what a human types and what every skill step already passes, so the
 * script meets its callers instead of four documents being edited to match it.
 */
const KEY_VALUE_ALIASES: Record<string, string> = {
  plan: "--plan-path",
  "plan-path": "--plan-path",
  part: "--part-id",
  "part-id": "--part-id",
  outcome: "--outcome",
  status: "--status",
  rationale: "--rationale",
  session: "--completing-session",
  "completing-session": "--completing-session",
  "owning-session": "--completing-session",
  "at-event": "--at-event",
  event: "--at-event",
  "project-root": "--project-root",
};

/** Rewrite `key=value` tokens into the `--flag value` pairs the parser expects. */
function normalizeArgv(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (const token of argv) {
    // A leading `--` means it is already a flag; only bare `key=value` is rewritten,
    // so `--rationale=x` and a value that happens to contain `=` are left alone.
    if (!token.startsWith("--") && token.includes("=")) {
      const eq = token.indexOf("=");
      const key = token.slice(0, eq);
      const value = token.slice(eq + 1);
      const flag = KEY_VALUE_ALIASES[key];
      if (flag) {
        out.push(flag, value);
        continue;
      }
    }
    out.push(token);
  }
  return out;
}

/**
 * Resolve a PLAN identifier to its file path, leaving an actual path untouched.
 *
 * `PLAN-001` and `PLAN-001-skills-ecosystem` both resolve; anything containing a
 * path separator or ending `.md` is treated as already-a-path. Resolution is a
 * prefix match against `docs/planning`, so the caller does not have to know the
 * descriptor half of the filename.
 */
async function resolvePlanPath(value: string, projectRoot: string): Promise<string> {
  if (value.includes("/") || value.endsWith(".md")) return value;
  const dir = path.join(projectRoot, "docs", "planning");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    // No planning directory: hand back the original so the caller's not-found error
    // names what was asked for rather than a directory listing failure.
    return value;
  }
  const prefix = value.toLowerCase();
  const match = entries
    .filter((name) => name.endsWith(".md") && name.toLowerCase().startsWith(prefix))
    .sort()[0];
  // Joined to the project root, not left project-relative: every caller downstream
  // resolves against the process cwd, so a bare `docs/planning/…` only works when
  // cwd happens to BE the project root. It is not when `--project-root` is passed.
  return match ? path.join(dir, match) : value;
}

function parseArgs(argv: readonly string[]): ParseResult {
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

  // Each entry is the set of spellings that satisfy one requirement, so an accepted
  // alias counts. Checking `--completing-session` alone would reject a caller using
  // the older `--owning-session`, which the flag map still accepts.
  const required: ReadonlyArray<readonly string[]> = [
    ["--plan-path", "--plan"],
    ["--part-id", "--part"],
    ["--outcome"],
    ["--completing-session", "--owning-session"],
    ["--at-event"],
  ];
  for (const spellings of required) {
    if (spellings.every((flag) => raw[flag] === undefined)) {
      return { ok: false, error: `missing required flag: ${spellings[0]}` };
    }
  }

  const status = raw["--status"] ?? "DONE";
  if (!isTerminalStatus(status)) {
    return { ok: false, error: `--status must be one of DONE|DEFERRED|ABANDONED (got ${status})` };
  }

  const atEvent = Number.parseInt(raw["--at-event"] ?? "", 10);
  if (!Number.isInteger(atEvent) || atEvent <= 0) {
    return { ok: false, error: "--at-event must be a positive integer" };
  }

  // Contract-1 invariant: non-DONE terminal states require a rationale.
  const rationale = raw["--rationale"];
  if (status !== "DONE" && (rationale === undefined || rationale.trim().length === 0)) {
    return { ok: false, error: `--rationale is required when --status is ${status}` };
  }

  const value: SetPartDoneArgs = {
    planPath: raw["--plan-path"] ?? "",
    partId: raw["--part-id"] ?? "",
    status,
    outcome: raw["--outcome"] ?? "",
    completingSession: raw["--completing-session"] ?? raw["--owning-session"] ?? "",
    atEvent,
    projectRoot: raw["--project-root"] ?? process.cwd(),
    ...(rationale !== undefined ? { rationale } : {}),
  };
  return { ok: true, value };
}

/** D-8 path-containment: accept only paths resolving to root or beneath it. */
function isContained(projectRoot: string, userPath: string): boolean {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, userPath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

/**
 * Compose the persisted outcome text. For non-DONE terminal states the
 * rationale is appended so the reason survives in the PLAN's `outcome` field
 * (the mutation only carries `outcome` + `completing_session`).
 */
function composeOutcome(args: SetPartDoneArgs): string {
  if (args.status === "DONE" || args.rationale === undefined) return args.outcome;
  return `${args.outcome} (${args.status.toLowerCase()}: ${args.rationale})`;
}

/**
 * Apply the part-substatus mutation. Pure with respect to the markdown string —
 * parses, mutates, re-validates, re-renders. Throws on a `from` mismatch
 * (part not IN_PROGRESS) or unknown part-id; the caller maps that to exit 1.
 * Returns the input unchanged when the part is already at the target status
 * (idempotent no-op).
 */
function appliedMarkdown(markdown: string, args: SetPartDoneArgs): string {
  const plan = parsePlanNote(markdown);
  const part = plan.parts.find((p) => p.id === args.partId);
  if (!part) {
    throw new Error(`set-part-done: part ${args.partId} not found`);
  }
  if (part.substatus === args.status) {
    return markdown; // Idempotent no-op — already at target.
  }
  return applyPlanMutation(markdown, {
    type: "set-part-substatus",
    partId: args.partId,
    from: "IN_PROGRESS",
    to: args.status,
    completing_session: args.completingSession,
    at_event: args.atEvent,
    outcome: composeOutcome(args),
  });
}

export async function setPartDoneCli(argv: readonly string[]): Promise<number> {
  // `key=value` first, so a call copied verbatim from the documentation parses.
  const parsed = parseArgs(normalizeArgv(argv));
  if (!parsed.ok) {
    console.error(`Usage error: ${parsed.error}`);
    return 2;
  }
  // An identifier (`PLAN-001`) becomes a path; a path stays a path. Resolution runs
  // BEFORE the containment check so the check still sees a real path, and a resolved
  // path is still contained by construction — it is built from the project root.
  const resolvedPlanPath = await resolvePlanPath(parsed.value.planPath, parsed.value.projectRoot);
  const args = { ...parsed.value, planPath: resolvedPlanPath };

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
    after = appliedMarkdown(before, args);
  } catch (err) {
    console.error(`Mutation failure: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (after === before) {
    return 0; // Idempotent no-op — already at target status.
  }

  await Bun.write(args.planPath, after);
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  setPartDoneCli(Bun.argv.slice(2)).then((code) => process.exit(code));
}
