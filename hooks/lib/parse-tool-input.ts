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
 * Strict-shape input schema. `tool_input` is an open record so per-tool
 * downstream handlers (apply-edit-operation, dispatch-validator) can parse
 * the specific shape they expect — see ToolInputSchemas below for the
 * known per-tool shapes the handlers will further validate.
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
