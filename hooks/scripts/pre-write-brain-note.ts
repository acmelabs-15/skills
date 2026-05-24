/**
 * Layer 1 PreToolUse handler — local Edit/Write/MultiEdit on docs/** Brain notes.
 *
 * Binds to the hooks.json declaration:
 *   matcher: "Edit|Write|MultiEdit"
 *   if:      "Edit(docs/**\/*.md)|Write(docs/**\/*.md)|MultiEdit(docs/**\/*.md)"
 *
 * On each invocation the handler:
 *   1. Reads the HookInput from stdin via `readHookInput()`.
 *   2. Builds a typed `EditOperation` from `tool_name` + `tool_input`.
 *   3. Validates the resolved `file_path` falls within the project root
 *      (Phase 3 security P1 — no `..` traversal escape) BEFORE any disk read.
 *   4. Reads the existing on-disk content via `Bun.file` (empty string for a
 *      Write of a new file).
 *   5. Applies the edit in memory via `applyEditOperation`.
 *   6. Dispatches the proposed content to `dispatchValidator` and emits the
 *      matching PreToolUse response (deny / allow-with-warning / allow).
 *
 * Failure semantics (DESIGN-004 asymmetric fail-mode): every step from input
 * parse through validation is wrapped so an unexpected exception emits a
 * structured stderr error and exits non-zero. PreToolUse treats non-zero exit
 * as a non-blocking infrastructure error (fail-open), so the tool call proceeds
 * and the Stop backstop (Layer 6) remains the conservative catch-all. Only a
 * status-flip claim failure produces a `deny` — schema rejections that are not
 * lying-claim transitions surface as `allow-with-warning`.
 */

import { isAbsolute, relative, resolve } from "node:path";

import { type EditOperation, applyEditOperation } from "../lib/apply-edit-operation.ts";
import { dispatchValidator } from "../lib/dispatch-validator.ts";
import {
  type PreToolUseAllow,
  type PreToolUseDeny,
  emitResponse,
} from "../lib/format-hook-response.ts";
import { type HookInput, ToolInputSchemas, readHookInput } from "../lib/parse-tool-input.ts";

/** Thrown when a resolved file path escapes the project root. */
export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

/** Thrown when the hook fires for a tool this Layer 1 handler does not own. */
export class UnsupportedToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedToolError";
  }
}

const LOCAL_EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

/**
 * Resolve a (possibly relative) file path against the repo root and verify it
 * stays inside the root. Returns the absolute path; throws
 * `PathContainmentError` on any `..` escape or absolute path pointing outside
 * the root. Runs before any disk read per Phase 3 security P1.
 */
export function resolveWithinRoot(repoRoot: string, filePath: string): string {
  const absoluteRoot = resolve(repoRoot);
  const absoluteTarget = isAbsolute(filePath) ? resolve(filePath) : resolve(absoluteRoot, filePath);
  const rel = relative(absoluteRoot, absoluteTarget);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathContainmentError(
      `file_path ${filePath} resolves outside project root ${absoluteRoot}`,
    );
  }
  return absoluteTarget;
}

/**
 * Build a typed `EditOperation` from the hook input. Each branch parses the
 * tool_input slice with its `ToolInputSchemas` entry so a malformed payload
 * surfaces as a parse throw (fail-open), not a silent wrong edit.
 */
export function toEditOperation(input: HookInput): EditOperation {
  switch (input.tool_name) {
    case "Edit": {
      const parsed = ToolInputSchemas.Edit.parse(input.tool_input);
      return {
        tool: "Edit",
        filePath: parsed.file_path,
        oldString: parsed.old_string,
        newString: parsed.new_string,
      };
    }
    case "Write": {
      const parsed = ToolInputSchemas.Write.parse(input.tool_input);
      return { tool: "Write", filePath: parsed.file_path, content: parsed.content };
    }
    case "MultiEdit": {
      const parsed = ToolInputSchemas.MultiEdit.parse(input.tool_input);
      return {
        tool: "MultiEdit",
        filePath: parsed.file_path,
        edits: parsed.edits.map((e) => ({ oldString: e.old_string, newString: e.new_string })),
      };
    }
    default:
      throw new UnsupportedToolError(
        `Layer 1 handler invoked for unsupported tool: ${input.tool_name}`,
      );
  }
}

/** Read existing on-disk content; empty string when the file does not exist. */
async function readCurrentContent(absolutePath: string): Promise<string> {
  const file = Bun.file(absolutePath);
  if (!(await file.exists())) {
    return "";
  }
  return file.text();
}

/**
 * Pure decision core. Given the proposed post-edit content and the repo-relative
 * file path, dispatch to the validator and map the three-way verdict to a
 * PreToolUse response. Exposed for unit testing without stdin/exit coupling.
 *
 * Throws when the dispatcher throws (unparseable note) so the caller routes the
 * failure to fail-open — a genuinely unparseable note is an infrastructure-like
 * condition, not a lying-claim transition.
 */
export function decide(
  proposedContent: string,
  filePath: string,
): PreToolUseDeny | PreToolUseAllow {
  const outcome = dispatchValidator(proposedContent, filePath);
  switch (outcome.verdict) {
    case "deny":
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: outcome.reason ?? "status-flip claim rejected",
        },
      };
    case "allow-with-warning":
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          additionalContext: outcome.warning ?? "Schema warning (non-blocking)",
        },
      };
    case "allow":
      return {
        hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" },
      };
    default: {
      const exhaustive: never = outcome.verdict;
      throw new Error(`Unhandled dispatch verdict: ${String(exhaustive)}`);
    }
  }
}

/**
 * End-to-end handler over an already-parsed HookInput. Resolves + contains the
 * path, reads current content, applies the edit, and returns the decision.
 * Exposed for unit testing (drives a HookInput directly, no stdin).
 */
export async function handle(input: HookInput): Promise<PreToolUseDeny | PreToolUseAllow> {
  if (!LOCAL_EDIT_TOOLS.has(input.tool_name)) {
    throw new UnsupportedToolError(
      `Layer 1 handler invoked for unsupported tool: ${input.tool_name}`,
    );
  }
  const op = toEditOperation(input);
  // Phase 3 security P1: containment check runs BEFORE the disk read so a
  // `..` traversal attempt cannot escape the repo root to read an arbitrary
  // file's content.
  const absolutePath = resolveWithinRoot(input.cwd, op.filePath);
  const currentContent = await readCurrentContent(absolutePath);
  const proposedContent = applyEditOperation(op, currentContent);
  return decide(proposedContent, op.filePath);
}

/**
 * Serialize an error to stderr in a structured, parseable shape and signal the
 * caller to exit non-zero. Keeps fail-open formatting in one place.
 */
export function reportFailOpen(error: unknown): void {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ hook: "pre-write-brain-note", failOpen: true, error: { name, message } })}\n`,
  );
}

/* istanbul ignore next -- @preserve */
async function main(): Promise<void> {
  try {
    const input = await readHookInput();
    const response = await handle(input);
    emitResponse(response);
  } catch (error) {
    // Fail-open per DESIGN-004: structured stderr + non-zero exit; the runtime
    // treats this as a non-blocking infrastructure error and the tool proceeds.
    reportFailOpen(error);
    process.exit(1);
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  await main();
}
