/**
 * Smoke-test harness: invoke a hook handler script END-TO-END via `bun run`.
 *
 * TASK-046-SPEC-008 DoD: smoke tests MUST invoke the actual handler scripts
 * through a child process (JSON on stdin → JSON on stdout), NOT via in-process
 * import. That is the whole point — the smoke surface includes the stdin-read /
 * stdout-write wiring (`readHookInput` / `readStopHookInput` / `emitResponse`),
 * not just the inner pure decision core that the unit tests already cover.
 *
 * BUILD-ISOLATION NOTE: the seven hook handlers live at `hooks/scripts.disabled/`
 * (not `hooks/scripts/`) for the duration of the SPEC-008 build, so the hook
 * layer cannot gate its own construction. These smoke tests reference the path
 * that EXISTS today (`scripts.disabled/`). When the layer goes live and the
 * directory is renamed `scripts.disabled` → `scripts`, update `HANDLER_DIR`.
 */

import { isAbsolute, join, resolve } from "node:path";

/** Repo root resolved from this file's location (…/hooks/__tests__/smoke/_helpers). */
const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..", "..");

/**
 * Directory holding the handler scripts. `scripts.disabled` today (build
 * isolation); becomes `scripts` when the hook layer is activated. Single source
 * of truth so the rename is a one-line change.
 */
export const HANDLER_DIR = join(REPO_ROOT, "hooks", "scripts.disabled");

/** Known handler script basenames (without extension), one per layer. */
export type HandlerName =
  | "pre-write-brain-note"
  | "pre-write-brain-note-mcp"
  | "pre-commit-validate"
  | "pre-push-validate"
  | "pre-pr-create-validate"
  | "stop-backstop"
  | "git-state-observer";

/** Outcome of a single end-to-end handler invocation. */
export interface HandlerRun {
  /** Process exit code (0 on a clean allow/deny/observe; non-zero on fail-open). */
  exitCode: number;
  /** Raw stdout text (a single-line JSON document, or empty for a no-op turn). */
  stdout: string;
  /** Raw stderr text (structured fail-open error JSON, when present). */
  stderr: string;
  /** Wall-clock duration of the `bun run` invocation, in milliseconds. */
  durationMs: number;
}

/** Resolve a handler name to its absolute script path. */
export function handlerPath(handler: HandlerName): string {
  return join(HANDLER_DIR, `${handler}.ts`);
}

/**
 * Spawn a handler via `bun run <script>` with `payload` serialized as JSON on
 * stdin, wait for exit, and return the captured stdout/stderr plus the
 * end-to-end duration. `cwd` controls the working directory the child process
 * (and therefore the handler's `cwd`-seeded git enumeration) runs in.
 */
export async function runHandler(
  handler: HandlerName,
  payload: unknown,
  cwd: string = REPO_ROOT,
): Promise<HandlerRun> {
  if (!isAbsolute(cwd)) {
    throw new Error(`runHandler requires an absolute cwd, received: ${cwd}`);
  }
  const script = handlerPath(handler);
  const start = performance.now();
  const proc = Bun.spawn(["bun", "run", script], {
    cwd,
    stdin: new TextEncoder().encode(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  const durationMs = performance.now() - start;
  return { exitCode, stdout, stderr, durationMs };
}

/** Parse a handler run's single-line stdout JSON document. Throws on empty/invalid. */
export function parseResponse<T = unknown>(run: HandlerRun): T {
  const trimmed = run.stdout.trim();
  if (trimmed === "") {
    throw new Error(
      `handler emitted no stdout payload (exit ${run.exitCode}); stderr: ${run.stderr.trim()}`,
    );
  }
  return JSON.parse(trimmed) as T;
}

/** Narrowed PreToolUse response shape used across the layer smoke tests. */
export interface PreToolUseResponse {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?: string;
  };
}

/** Narrowed Stop-backstop response shape. */
export interface StopResponse {
  decision: "block";
  reason: string;
}

/** Narrowed FileChanged observability response shape. */
export interface FileChangedResponse {
  hookSpecificOutput: {
    hookEventName: "FileChanged";
    additionalContext: string;
  };
}
