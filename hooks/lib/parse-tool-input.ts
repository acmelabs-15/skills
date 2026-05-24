/**
 * Read and validate Claude Code hook input JSON from stdin.
 *
 * Per DESIGN-004-SPEC-008 Interfaces section. The hook runtime invokes the
 * handler script with the hook payload as JSON on stdin and the handler
 * writes a response JSON on stdout.
 *
 * Handles per-tool tool_input shape variation:
 *   - Local Edit/Write/MultiEdit carry `file_path` plus edit-specific fields.
 *   - MCP edit_note/write_note carry `permalink` plus `content` instead.
 *
 * Validation uses Zod for shape safety; an unparseable payload throws so the
 * caller can emit a structured error and exit non-zero (PreToolUse fail-open
 * per DESIGN-004 asymmetric fail-mode).
 */

import { z } from "zod";

export interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  /** Present on Stop and FileChanged events. */
  transcript_path?: string;
  cwd: string;
}

/**
 * Strict-shape PreToolUse input schema. `tool_input` is an open record so
 * per-tool downstream handlers (apply-edit-operation, dispatch-validator) can
 * parse the specific shape they expect — see ToolInputSchemas below for the
 * known per-tool shapes the handlers will further validate.
 *
 * This schema is PreToolUse-specific: it REQUIRES `tool_name` and `tool_input`.
 * The `Stop` and `FileChanged` events carry a different shape (no tool fields)
 * and MUST be parsed via {@link parseStopHookInput} / {@link readStopHookInput}
 * instead — see {@link StopHookInputSchema}.
 */
const HookInputSchema = z
  .object({
    tool_name: z.string().min(1),
    tool_input: z.record(z.string(), z.unknown()),
    transcript_path: z.string().optional(),
    cwd: z.string().min(1),
  })
  .passthrough();

/**
 * Parsed shape of a Claude Code `Stop` (turn-end) hook event. A Stop event has
 * NO `tool_name` / `tool_input` — it carries session metadata plus the working
 * directory. The Stop backstop (Layer 6) only needs `cwd` (the repo-root seed
 * for its `git status --porcelain` enumeration); the remaining fields are
 * surfaced for completeness and future observability.
 */
export interface StopHookInput {
  /** Working directory of the session — the repo-root seed. */
  cwd: string;
  /** Always `"Stop"` for a turn-end event. */
  hook_event_name: "Stop";
  /** Session identifier, when the runtime supplies one. */
  session_id?: string;
  /** Path to the session transcript, when the runtime supplies one. */
  transcript_path?: string;
  /** True when a prior Stop hook is already active (re-entrancy guard). */
  stop_hook_active?: boolean;
}

/**
 * Strict-shape `Stop` event schema. Unlike {@link HookInputSchema}, it requires
 * NO tool fields — a normal Stop event provides only session metadata and
 * `cwd`. `cwd` is the sole REQUIRED field (the repo-root seed); the rest are
 * optional because the runtime does not guarantee every field on every event.
 * `passthrough()` tolerates additional runtime-supplied keys without failing.
 */
const StopHookInputSchema = z
  .object({
    cwd: z.string().min(1),
    hook_event_name: z.literal("Stop"),
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    stop_hook_active: z.boolean().optional(),
  })
  .passthrough();

/**
 * Per-tool tool_input schemas. Handlers parse `tool_input` with the schema
 * matching `tool_name` to extract a typed slice; failures here are routed
 * back as either deny (when claim-bearing) or fail-open (when shape only).
 */
export const ToolInputSchemas = {
  Edit: z
    .object({
      file_path: z.string().min(1),
      old_string: z.string(),
      new_string: z.string(),
    })
    .passthrough(),
  Write: z
    .object({
      file_path: z.string().min(1),
      content: z.string(),
    })
    .passthrough(),
  MultiEdit: z
    .object({
      file_path: z.string().min(1),
      edits: z
        .array(
          z
            .object({
              old_string: z.string(),
              new_string: z.string(),
            })
            .passthrough(),
        )
        .min(1),
    })
    .passthrough(),
  McpEditNote: z
    .object({
      permalink: z.string().min(1),
      content: z.string(),
    })
    .passthrough(),
  McpWriteNote: z
    .object({
      permalink: z.string().min(1),
      content: z.string(),
    })
    .passthrough(),
} as const;

export type LocalEditInput = z.infer<typeof ToolInputSchemas.Edit>;
export type LocalWriteInput = z.infer<typeof ToolInputSchemas.Write>;
export type LocalMultiEditInput = z.infer<typeof ToolInputSchemas.MultiEdit>;
export type McpEditNoteInput = z.infer<typeof ToolInputSchemas.McpEditNote>;
export type McpWriteNoteInput = z.infer<typeof ToolInputSchemas.McpWriteNote>;

export class HookInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HookInputError";
  }
}

async function readStdinToEnd(): Promise<string> {
  // Bun exposes stdin as a Web ReadableStream. Reading via the standard
  // async iterator pulls every chunk to EOF without buffering quirks.
  const chunks: Uint8Array[] = [];
  const decoder = new TextDecoder();
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }
  let total = 0;
  for (const chunk of chunks) total += chunk.byteLength;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(merged);
}

/**
 * Read stdin to EOF, parse JSON, validate against HookInputSchema, return
 * the typed HookInput. Throws HookInputError on malformed JSON or shape
 * violation; the handler script translates that to fail-open per DESIGN-004.
 */
export async function readHookInput(): Promise<HookInput> {
  const raw = await readStdinToEnd();
  return parseHookInput(raw);
}

/**
 * Pure parser exposed for unit testing — avoids the stdin coupling so the
 * tests can drive a string directly.
 */
export function parseHookInput(raw: string): HookInput {
  if (raw.trim() === "") {
    throw new HookInputError("Hook input is empty");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new HookInputError(
      `Hook input is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const result = HookInputSchema.safeParse(parsed);
  if (!result.success) {
    throw new HookInputError(`Hook input failed shape validation: ${result.error.message}`);
  }
  const { tool_name, tool_input, transcript_path, cwd } = result.data;
  const out: HookInput = { tool_name, tool_input, cwd };
  if (transcript_path !== undefined) {
    out.transcript_path = transcript_path;
  }
  return out;
}

/**
 * Read stdin to EOF, parse JSON, validate against {@link StopHookInputSchema},
 * return the typed StopHookInput. Throws HookInputError on malformed JSON or
 * shape violation. The Stop backstop translates a genuine error (malformed
 * payload) into a fail-CLOSED block — but a NORMAL Stop event (cwd-only, no
 * tool fields) validates cleanly and is NOT treated as an infrastructure error.
 */
export async function readStopHookInput(): Promise<StopHookInput> {
  const raw = await readStdinToEnd();
  return parseStopHookInput(raw);
}

/**
 * Pure `Stop`-event parser exposed for unit testing — avoids the stdin
 * coupling so tests can drive a string directly. Validates the real Stop-event
 * shape (`cwd` + `hook_event_name: "Stop"`, optional session metadata), NOT the
 * PreToolUse shape, so a Stop event with no `tool_name` / `tool_input` parses
 * successfully instead of failing shape validation.
 */
export function parseStopHookInput(raw: string): StopHookInput {
  if (raw.trim() === "") {
    throw new HookInputError("Hook input is empty");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new HookInputError(
      `Hook input is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const result = StopHookInputSchema.safeParse(parsed);
  if (!result.success) {
    throw new HookInputError(`Stop hook input failed shape validation: ${result.error.message}`);
  }
  const { cwd, hook_event_name, session_id, transcript_path, stop_hook_active } = result.data;
  const out: StopHookInput = { cwd, hook_event_name };
  if (session_id !== undefined) out.session_id = session_id;
  if (transcript_path !== undefined) out.transcript_path = transcript_path;
  if (stop_hook_active !== undefined) out.stop_hook_active = stop_hook_active;
  return out;
}
