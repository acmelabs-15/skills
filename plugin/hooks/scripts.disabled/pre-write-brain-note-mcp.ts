/**
 * Layer 2 PreToolUse handler — Brain MCP `write_note` / `edit_note`.
 *
 * Binds to the hooks.json declaration:
 *   matcher: "mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note"
 *
 * Layer 1 (`pre-write-brain-note.ts`) gates local Edit/Write/MultiEdit on
 * `docs/**`. It cannot reach the Brain MCP write path: an agent that edits a
 * note through `mcp__plugin_brain_brain__edit_note` never invokes a local file
 * tool, so without Layer 2 every MCP-mediated state-flip claim bypasses all
 * PreToolUse validation. This handler closes that gap.
 *
 * MCP tool_input shapes differ from local file tools:
 *   - write_note  carries `title`, `directory`, `content`, `tags` (+ note_type).
 *     `content` is treated as the proposed full note body; basic-memory
 *     augments frontmatter on write, but the body the agent supplies already
 *     carries the frontmatter the dispatch validator routes on.
 *   - edit_note   carries `identifier`, `operation` (append | prepend |
 *     find_replace | replace_section) plus operation-specific fields
 *     (`content`, `find_text`, `section`, `expected_replacements`). The handler
 *     resolves `identifier` to a file path within the project root, reads the
 *     current note, applies the operation in memory, and dispatches the result.
 *
 * On each invocation the handler:
 *   1. Reads the HookInput from stdin via `readHookInput()`.
 *   2. Routes on `tool_name` to the write_note or edit_note branch.
 *   3. For edit_note: resolves `identifier` to an absolute path and verifies
 *      containment within the project root (Phase 3 security P1 — no `..`
 *      traversal) BEFORE any disk read; reads current content; applies the
 *      operation in memory.
 *   4. Dispatches the proposed full content to `dispatchValidator` and emits
 *      the matching PreToolUse response (deny / allow-with-warning / allow).
 *
 * Failure semantics (DESIGN-004 asymmetric fail-mode): every step from input
 * parse through validation is wrapped so an unexpected exception emits a
 * structured stderr error and exits non-zero. PreToolUse treats non-zero exit
 * as a non-blocking infrastructure error (fail-open); the Stop backstop
 * (Layer 6) remains the conservative catch-all. Only a status-flip claim
 * failure produces a `deny`.
 */

import { isAbsolute, relative, resolve } from "node:path";

import { z } from "zod";

import { dispatchValidator } from "../lib/dispatch-validator.ts";
import {
  type PreToolUseAllow,
  type PreToolUseDeny,
  emitResponse,
} from "../lib/format-hook-response.ts";
import { type HookInput, readHookInput } from "../lib/parse-tool-input.ts";

const MCP_WRITE_NOTE = "mcp__plugin_brain_brain__write_note";
const MCP_EDIT_NOTE = "mcp__plugin_brain_brain__edit_note";

/** Thrown when a resolved identifier path escapes the project root. */
export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

/** Thrown when the hook fires for a tool this Layer 2 handler does not own. */
export class UnsupportedToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedToolError";
  }
}

/** Thrown when an edit_note operation cannot apply to the current content. */
export class McpEditOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpEditOperationError";
  }
}

/**
 * Brain MCP write_note tool_input shape (authoritative per the MCP tool
 * schema). `content` is the proposed full note body the validator routes on.
 *
 * NOTE: the shared `parse-tool-input.ts` `McpWriteNote` schema models
 * `{ permalink, content }`, which does not match the real MCP shape; this
 * handler parses the real shape locally. Flagged in the TASK return.
 */
const McpWriteNoteInputSchema = z
  .object({
    title: z.string().min(1),
    directory: z.string().min(1),
    content: z.string(),
    tags: z.union([z.array(z.string()), z.string()]).nullish(),
    note_type: z.string().optional(),
  })
  .passthrough();

/** Brain MCP edit_note operation discriminant. */
export type McpEditOperation = "append" | "prepend" | "find_replace" | "replace_section";

const MCP_EDIT_OPERATIONS: ReadonlySet<string> = new Set<McpEditOperation>([
  "append",
  "prepend",
  "find_replace",
  "replace_section",
]);

/**
 * Brain MCP edit_note tool_input shape. `operation` selects which of the
 * operation-specific fields are read. Validated narrowly per operation in
 * `applyMcpEditOperation` rather than via a discriminated union so that a
 * malformed operation surfaces as a typed error (fail-open) rather than a
 * generic Zod parse throw with an opaque message.
 */
const McpEditNoteInputSchema = z
  .object({
    identifier: z.string().min(1),
    operation: z.string().min(1),
    content: z.string(),
    find_text: z.string().nullish(),
    section: z.string().nullish(),
    expected_replacements: z.number().int().optional(),
  })
  .passthrough();

export type McpWriteNoteInput = z.infer<typeof McpWriteNoteInputSchema>;
export type McpEditNoteInput = z.infer<typeof McpEditNoteInputSchema>;

/**
 * Resolve a (possibly relative) path against the repo root and verify it stays
 * inside the root. Returns the absolute path; throws `PathContainmentError` on
 * any `..` escape or absolute path pointing outside the root. Runs before any
 * disk read per Phase 3 security P1.
 */
export function resolveWithinRoot(repoRoot: string, candidatePath: string): string {
  const absoluteRoot = resolve(repoRoot);
  const absoluteTarget = isAbsolute(candidatePath)
    ? resolve(candidatePath)
    : resolve(absoluteRoot, candidatePath);
  const rel = relative(absoluteRoot, absoluteTarget);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathContainmentError(
      `identifier ${candidatePath} resolves outside project root ${absoluteRoot}`,
    );
  }
  return absoluteTarget;
}

/**
 * Map a basic-memory note identifier to a repo-relative file path candidate.
 *
 * Brain notes live under `docs/**`; a permalink such as
 * `specs/spec-008-.../tasks/task-042-...` maps to
 * `docs/specs/spec-008-.../tasks/task-042-....md`. An identifier already
 * carrying the `docs/` prefix or a `.md` suffix is normalised idempotently.
 * Path containment is enforced separately by `resolveWithinRoot`.
 */
export function identifierToRelativePath(identifier: string): string {
  const trimmed = identifier.replace(/^\/+/, "");
  const withDocs = trimmed.startsWith("docs/") ? trimmed : `docs/${trimmed}`;
  return withDocs.endsWith(".md") ? withDocs : `${withDocs}.md`;
}

/** Replace a markdown section (identified by its heading text) wholesale. */
function replaceSection(currentContent: string, section: string, replacement: string): string {
  // basic-memory accepts the section heading with or without leading `#`
  // markers (e.g. "## Status" or "Status"); normalise to the bare heading text
  // so both forms match the same heading line.
  const headingText = section.replace(/^#{1,6}[ \t]+/, "").trim();
  const headingPattern = new RegExp(`^(#{1,6})[ \\t]+${escapeRegExp(headingText)}[ \\t]*$`, "m");
  const match = headingPattern.exec(currentContent);
  if (match === null || match.index === undefined) {
    throw new McpEditOperationError(
      `replace_section: heading "${section}" not found in current content`,
    );
  }
  const headingLevel = (match[1] ?? "#").length;
  const sectionStart = match.index;
  const afterHeading = sectionStart + match[0].length;
  // The section runs until the next heading of equal-or-shallower depth.
  const nextHeading = new RegExp(`^#{1,${headingLevel}}[ \\t]+`, "m");
  nextHeading.lastIndex = afterHeading;
  const rest = currentContent.slice(afterHeading);
  const nextMatch = nextHeading.exec(rest);
  const sectionEnd = nextMatch === null ? currentContent.length : afterHeading + nextMatch.index;
  return currentContent.slice(0, sectionStart) + replacement + currentContent.slice(sectionEnd);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply a single edit_note operation in memory and return the proposed full
 * post-edit content. Throws `McpEditOperationError` when an operation's
 * required field is absent or a `find_replace` target is not present.
 */
export function applyMcpEditOperation(input: McpEditNoteInput, currentContent: string): string {
  if (!MCP_EDIT_OPERATIONS.has(input.operation)) {
    throw new McpEditOperationError(`unsupported edit_note operation: ${input.operation}`);
  }
  const operation = input.operation as McpEditOperation;
  switch (operation) {
    case "append":
      return currentContent + input.content;
    case "prepend":
      return input.content + currentContent;
    case "find_replace": {
      const findText = input.find_text;
      if (findText === undefined || findText === null || findText === "") {
        throw new McpEditOperationError(
          "find_replace: find_text is required and must be non-empty",
        );
      }
      if (!currentContent.includes(findText)) {
        throw new McpEditOperationError("find_replace: find_text not found in current content");
      }
      return currentContent.split(findText).join(input.content);
    }
    case "replace_section": {
      const section = input.section;
      if (section === undefined || section === null || section === "") {
        throw new McpEditOperationError(
          "replace_section: section is required and must be non-empty",
        );
      }
      return replaceSection(currentContent, section, input.content);
    }
    default: {
      const exhaustive: never = operation;
      throw new McpEditOperationError(`unhandled edit_note operation: ${String(exhaustive)}`);
    }
  }
}

/** Read existing on-disk content; throws when the target note does not exist. */
async function readCurrentContent(absolutePath: string): Promise<string> {
  const file = Bun.file(absolutePath);
  if (!(await file.exists())) {
    throw new McpEditOperationError(`edit_note target does not exist on disk: ${absolutePath}`);
  }
  return file.text();
}

/**
 * Pure decision core. Given the proposed full note content and its
 * (repo-relative or descriptive) file path, dispatch to the validator and map
 * the three-way verdict to a PreToolUse response. Exposed for unit testing
 * without stdin/exit coupling.
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
 * write_note branch: the supplied `content` is the proposed full note body.
 * The dispatch path uses the directory + title as a descriptive file path for
 * the reason text (no disk read is required — the content is authoritative).
 */
function handleWriteNote(input: HookInput): PreToolUseDeny | PreToolUseAllow {
  const parsed = McpWriteNoteInputSchema.parse(input.tool_input);
  const descriptivePath = `${parsed.directory.replace(/\/+$/, "")}/${parsed.title}`;
  return decide(parsed.content, descriptivePath);
}

/**
 * edit_note branch: resolve the identifier to a path within the project root
 * (containment BEFORE disk read), read the current note, apply the operation
 * in memory, and dispatch the proposed result.
 */
async function handleEditNote(input: HookInput): Promise<PreToolUseDeny | PreToolUseAllow> {
  const parsed = McpEditNoteInputSchema.parse(input.tool_input);
  const relativePath = identifierToRelativePath(parsed.identifier);
  const absolutePath = resolveWithinRoot(input.cwd, relativePath);
  const currentContent = await readCurrentContent(absolutePath);
  const proposedContent = applyMcpEditOperation(parsed, currentContent);
  return decide(proposedContent, relativePath);
}

/**
 * End-to-end handler over an already-parsed HookInput. Routes on `tool_name`.
 * Exposed for unit testing (drives a HookInput directly, no stdin).
 */
export async function handle(input: HookInput): Promise<PreToolUseDeny | PreToolUseAllow> {
  switch (input.tool_name) {
    case MCP_WRITE_NOTE:
      return handleWriteNote(input);
    case MCP_EDIT_NOTE:
      return handleEditNote(input);
    default:
      throw new UnsupportedToolError(
        `Layer 2 handler invoked for unsupported tool: ${input.tool_name}`,
      );
  }
}

/**
 * Serialize an error to stderr in a structured, parseable shape and signal the
 * caller to exit non-zero. Keeps fail-open formatting in one place.
 */
export function reportFailOpen(error: unknown): void {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ hook: "pre-write-brain-note-mcp", failOpen: true, error: { name, message } })}\n`,
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
