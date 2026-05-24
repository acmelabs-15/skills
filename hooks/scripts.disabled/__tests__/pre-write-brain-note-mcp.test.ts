import { mkdtempSync, rmSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { HookInput } from "../../lib/parse-tool-input.ts";
import {
  type McpEditNoteInput,
  McpEditOperationError,
  PathContainmentError,
  UnsupportedToolError,
  applyMcpEditOperation,
  decide,
  handle,
  identifierToRelativePath,
  resolveWithinRoot,
} from "../pre-write-brain-note-mcp.ts";

/**
 * Layer 2 PreToolUse handler tests (SPEC-008 TASK-042). Covers the DoD set:
 *   - write_note happy path (allow)
 *   - edit_note find_replace path
 *   - edit_note replace_section path
 *   - deny path against a status-flip claim failure
 *   - traversal rejection (identifier escaping the project root)
 *   - MCP-tool-input-shape parsing for both tools
 *   - smoke test: invoking edit_note against a known-failing on-disk fixture
 *     triggers a Layer 2 deny (ADR-005 D-8 matcher-risk mitigation requirement)
 *
 * Passing fixtures are the canonical composition-library sample notes, read at
 * runtime so they stay authoritative as the schemas evolve. The deny fixture is
 * derived by flipping the sample to its terminal status with an unsatisfied
 * claim contract — the exact lying-claim transition the schemas reject.
 */

const MCP_WRITE_NOTE = "mcp__plugin_brain_brain__write_note";
const MCP_EDIT_NOTE = "mcp__plugin_brain_brain__edit_note";

const FIXTURE_DIR = new URL("../../../shared/composition/tests/fixtures/", import.meta.url);

async function sample(name: string): Promise<string> {
  return Bun.file(new URL(name, FIXTURE_DIR)).text();
}

/** Replace the first `status:` frontmatter value. */
function withStatus(content: string, status: string): string {
  return content.replace(/^status:.*$/m, `status: ${status}`);
}

function writeNoteInput(content: string, cwd: string): HookInput {
  return {
    tool_name: MCP_WRITE_NOTE,
    tool_input: {
      title: "TASK-099-SPEC-008: Sample",
      directory: "docs/specs/spec-008-protocol-hardening-wave-2/tasks",
      content,
      tags: ["task", "spec-008"],
    },
    cwd,
  };
}

function editNoteInput(
  identifier: string,
  operation: string,
  fields: Record<string, unknown>,
  cwd: string,
): HookInput {
  return {
    tool_name: MCP_EDIT_NOTE,
    tool_input: { identifier, operation, content: "", ...fields },
    cwd,
  };
}

describe("identifierToRelativePath", () => {
  test("bare permalink gets docs/ prefix and .md suffix", () => {
    expect(identifierToRelativePath("specs/spec-008/tasks/task-042")).toBe(
      "docs/specs/spec-008/tasks/task-042.md",
    );
  });

  test("identifier already prefixed with docs/ is idempotent", () => {
    expect(identifierToRelativePath("docs/decisions/adr-005.md")).toBe("docs/decisions/adr-005.md");
  });

  test("leading slashes are stripped", () => {
    expect(identifierToRelativePath("/analysis/analysis-001")).toBe(
      "docs/analysis/analysis-001.md",
    );
  });
});

describe("resolveWithinRoot — path containment", () => {
  test("a contained relative path resolves to an absolute path", () => {
    const root = "/repo";
    expect(resolveWithinRoot(root, "docs/specs/x.md")).toBe("/repo/docs/specs/x.md");
  });

  test("a `..` traversal escape throws PathContainmentError", () => {
    expect(() => resolveWithinRoot("/repo", "../../etc/passwd")).toThrow(PathContainmentError);
  });

  test("an absolute path outside the root throws PathContainmentError", () => {
    expect(() => resolveWithinRoot("/repo", "/etc/passwd")).toThrow(PathContainmentError);
  });
});

describe("applyMcpEditOperation", () => {
  const base: McpEditNoteInput = {
    identifier: "specs/spec-008/tasks/task-099",
    operation: "append",
    content: "",
  };

  test("append concatenates to the end", () => {
    const out = applyMcpEditOperation({ ...base, operation: "append", content: "TAIL" }, "HEAD");
    expect(out).toBe("HEADTAIL");
  });

  test("prepend concatenates to the start", () => {
    const out = applyMcpEditOperation({ ...base, operation: "prepend", content: "HEAD" }, "TAIL");
    expect(out).toBe("HEADTAIL");
  });

  test("find_replace replaces all occurrences of find_text", () => {
    const out = applyMcpEditOperation(
      { ...base, operation: "find_replace", find_text: "old", content: "new" },
      "old middle old",
    );
    expect(out).toBe("new middle new");
  });

  test("find_replace without find_text throws", () => {
    expect(() =>
      applyMcpEditOperation({ ...base, operation: "find_replace", content: "new" }, "old"),
    ).toThrow(McpEditOperationError);
  });

  test("find_replace with an absent target throws", () => {
    expect(() =>
      applyMcpEditOperation(
        { ...base, operation: "find_replace", find_text: "missing", content: "new" },
        "content without target",
      ),
    ).toThrow(McpEditOperationError);
  });

  test("replace_section swaps the heading section body", () => {
    const md = "# Title\n\n## Status\n\nDRAFT\n\n## Next\n\nbody\n";
    const out = applyMcpEditOperation(
      {
        ...base,
        operation: "replace_section",
        section: "## Status",
        content: "## Status\n\nDONE\n\n",
      },
      md,
    );
    expect(out).toContain("## Status\n\nDONE");
    expect(out).toContain("## Next\n\nbody");
    expect(out).not.toContain("DRAFT");
  });

  test("replace_section with a missing heading throws", () => {
    expect(() =>
      applyMcpEditOperation(
        { ...base, operation: "replace_section", section: "## Absent", content: "x" },
        "# Title\n\n## Status\n\nx\n",
      ),
    ).toThrow(McpEditOperationError);
  });

  test("an unsupported operation throws", () => {
    expect(() =>
      applyMcpEditOperation({ ...base, operation: "splice", content: "x" }, "y"),
    ).toThrow(McpEditOperationError);
  });
});

describe("decide — verdict mapping", () => {
  test("a clean note allows", async () => {
    const out = decide(await sample("task-note-sample.md"), "docs/sample.md");
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("a status-flip claim failure denies with a reason", async () => {
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    const out = decide(lying, "docs/sample.md");
    expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
    const deny = out as { hookSpecificOutput: { permissionDecisionReason: string } };
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain("status=DONE");
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain("failing:");
  });
});

describe("handle — write_note branch", () => {
  test("write_note happy path allows", async () => {
    const input = writeNoteInput(await sample("task-note-sample.md"), "/repo");
    const out = await handle(input);
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("write_note with a status-flip claim failure denies", async () => {
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    const out = await handle(writeNoteInput(lying, "/repo"));
    expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  test("write_note parses the MCP tool_input shape (title/directory/content/tags)", async () => {
    // A malformed write_note tool_input (missing title) surfaces as a parse
    // throw, which the runtime treats as fail-open.
    const input: HookInput = {
      tool_name: MCP_WRITE_NOTE,
      tool_input: { directory: "docs/x", content: "body", tags: ["t1"] },
      cwd: "/repo",
    };
    await expect(handle(input)).rejects.toThrow();
  });
});

describe("handle — unsupported tool", () => {
  test("a non-MCP tool throws UnsupportedToolError", async () => {
    const input: HookInput = { tool_name: "Edit", tool_input: {}, cwd: "/repo" };
    await expect(handle(input)).rejects.toThrow(UnsupportedToolError);
  });
});

describe("handle — edit_note branch (on-disk fixtures)", () => {
  let root: string;
  let notesDir: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "layer2-edit-"));
    notesDir = join(root, "docs", "specs", "spec-008", "tasks");
    mkdirSync(notesDir, { recursive: true });
    // Seed an on-disk note in a non-terminal status so edits can target it.
    const seed = withStatus(await sample("task-note-sample.md"), "IN_PROGRESS");
    await Bun.write(join(notesDir, "task-099.md"), seed);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("edit_note find_replace path applies and allows when claim still holds", async () => {
    // Replace a body word; status stays IN_PROGRESS so no claim gate fires.
    const input = editNoteInput(
      "specs/spec-008/tasks/task-099",
      "find_replace",
      { find_text: "TaskNote Schema", content: "TaskNote Schema (edited)" },
      root,
    );
    const out = await handle(input);
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("edit_note replace_section path applies and allows", async () => {
    const input = editNoteInput(
      "specs/spec-008/tasks/task-099",
      "replace_section",
      { section: "## Design Context", content: "## Design Context\n\nUpdated context.\n\n" },
      root,
    );
    const out = await handle(input);
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("edit_note traversal identifier rejection (fail-open)", async () => {
    const input = editNoteInput("../../../../etc/passwd", "append", { content: "x" }, root);
    await expect(handle(input)).rejects.toThrow(PathContainmentError);
  });

  test("edit_note against a non-existent target throws (fail-open)", async () => {
    const input = editNoteInput(
      "specs/spec-008/tasks/task-does-not-exist",
      "append",
      { content: "x" },
      root,
    );
    await expect(handle(input)).rejects.toThrow(McpEditOperationError);
  });
});

describe("handle — Layer 2 smoke test (ADR-005 D-8 matcher-risk mitigation)", () => {
  let root: string;
  let notesDir: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "layer2-smoke-"));
    notesDir = join(root, "docs", "specs", "spec-008", "tasks");
    mkdirSync(notesDir, { recursive: true });
    // Seed a known-failing fixture: a TASK already on disk at DONE status with
    // unchecked DoD items — the lying-claim transition the validator rejects.
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    await Bun.write(join(notesDir, "task-lying.md"), lying);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("invoking edit_note against a known-failing fixture triggers a Layer 2 deny", async () => {
    // A no-op-shaped append that leaves the lying claim intact must still be
    // denied — the handler validates the resulting full content, not the diff.
    const input = editNoteInput("specs/spec-008/tasks/task-lying", "append", { content: "" }, root);
    const out = await handle(input);
    expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
    const deny = out as { hookSpecificOutput: { permissionDecisionReason: string } };
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain("TaskNoteSchema");
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain("status=DONE");
  });
});
