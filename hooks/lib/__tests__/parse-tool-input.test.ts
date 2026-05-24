import { describe, expect, test } from "bun:test";
import { HookInputError, ToolInputSchemas, parseHookInput } from "../parse-tool-input.ts";

describe("parseHookInput", () => {
  test("parses local Edit hook input", () => {
    const raw = JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: "/repo/docs/specs/SPEC-008/task-001.md",
        old_string: "status: TODO",
        new_string: "status: DONE",
      },
      cwd: "/repo",
    });
    const out = parseHookInput(raw);
    expect(out.tool_name).toBe("Edit");
    expect(out.cwd).toBe("/repo");
    expect(out.transcript_path).toBeUndefined();

    const editInput = ToolInputSchemas.Edit.parse(out.tool_input);
    expect(editInput.file_path).toBe("/repo/docs/specs/SPEC-008/task-001.md");
    expect(editInput.old_string).toBe("status: TODO");
    expect(editInput.new_string).toBe("status: DONE");
  });

  test("parses MCP edit_note hook input (permalink + content shape)", () => {
    const raw = JSON.stringify({
      tool_name: "mcp__plugin_brain_brain__edit_note",
      tool_input: {
        permalink: "specs/spec-008/task-001",
        content: "# updated body",
      },
      cwd: "/repo",
    });
    const out = parseHookInput(raw);
    expect(out.tool_name).toBe("mcp__plugin_brain_brain__edit_note");

    const mcpInput = ToolInputSchemas.McpEditNote.parse(out.tool_input);
    expect(mcpInput.permalink).toBe("specs/spec-008/task-001");
    expect(mcpInput.content).toBe("# updated body");

    // The local Edit schema MUST reject the MCP shape (no file_path).
    expect(ToolInputSchemas.Edit.safeParse(out.tool_input).success).toBe(false);
  });

  test("preserves transcript_path when present (Stop/FileChanged)", () => {
    const raw = JSON.stringify({
      tool_name: "Stop",
      tool_input: {},
      transcript_path: "/tmp/transcript-123.jsonl",
      cwd: "/repo",
    });
    const out = parseHookInput(raw);
    expect(out.transcript_path).toBe("/tmp/transcript-123.jsonl");
  });

  test("rejects malformed JSON", () => {
    expect(() => parseHookInput("{ not json")).toThrow(HookInputError);
    expect(() => parseHookInput("{ not json")).toThrow(/not valid JSON/);
  });

  test("rejects empty input", () => {
    expect(() => parseHookInput("")).toThrow(/Hook input is empty/);
    expect(() => parseHookInput("   \n")).toThrow(/Hook input is empty/);
  });

  test("rejects payload missing tool_name", () => {
    const raw = JSON.stringify({ tool_input: {}, cwd: "/repo" });
    expect(() => parseHookInput(raw)).toThrow(HookInputError);
    expect(() => parseHookInput(raw)).toThrow(/shape validation/);
  });

  test("rejects payload missing cwd", () => {
    const raw = JSON.stringify({ tool_name: "Edit", tool_input: {} });
    expect(() => parseHookInput(raw)).toThrow(/shape validation/);
  });

  test("rejects payload with non-object tool_input", () => {
    const raw = JSON.stringify({ tool_name: "Edit", tool_input: "nope", cwd: "/repo" });
    expect(() => parseHookInput(raw)).toThrow(/shape validation/);
  });
});

describe("ToolInputSchemas - per-tool shape variation", () => {
  test("MultiEdit requires non-empty edits array", () => {
    expect(ToolInputSchemas.MultiEdit.safeParse({ file_path: "x.md", edits: [] }).success).toBe(
      false,
    );
    expect(
      ToolInputSchemas.MultiEdit.safeParse({
        file_path: "x.md",
        edits: [{ old_string: "a", new_string: "b" }],
      }).success,
    ).toBe(true);
  });

  test("Write requires file_path and content", () => {
    expect(ToolInputSchemas.Write.safeParse({ file_path: "x.md", content: "" }).success).toBe(true);
    expect(ToolInputSchemas.Write.safeParse({ file_path: "x.md" }).success).toBe(false);
  });
});
