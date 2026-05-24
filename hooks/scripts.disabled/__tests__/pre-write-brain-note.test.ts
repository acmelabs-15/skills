import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { HookInput } from "../../lib/parse-tool-input.ts";
import {
  PathContainmentError,
  UnsupportedToolError,
  decide,
  handle,
  resolveWithinRoot,
  toEditOperation,
} from "../pre-write-brain-note.ts";

/**
 * Unit tests for the Layer 1 PreToolUse handler (SPEC-008 TASK-041).
 *
 * Coverage per the TASK-041 DoD: deny path (TASK DONE with unsatisfied DoD),
 * allow-with-warning path (clean parse with claim pass at the observation
 * floor), allow path (clean note), traversal rejection (Phase 3 security P1),
 * and exception fail-open (unparseable note throws so the caller routes to
 * fail-open).
 *
 * Passing fixtures are the canonical composition-library sample notes, read at
 * runtime so they stay authoritative as the schemas evolve. Denying fixtures
 * flip the sample to a terminal status with an unsatisfied claim contract.
 */

const FIXTURE_DIR = new URL("../../../shared/composition/tests/fixtures/", import.meta.url);

async function sample(name: string): Promise<string> {
  return Bun.file(new URL(name, FIXTURE_DIR)).text();
}

/** Replace the first `status:` frontmatter value. */
function withStatus(content: string, status: string): string {
  return content.replace(/^status:.*$/m, `status: ${status}`);
}

const REL_PATH = "docs/specs/spec-001-x/tasks/task-001-spec-001-sample.md";

// ── decide() — three-way verdict mapping ──────────────────────────────────

describe("decide — verdict to PreToolUse response", () => {
  test("deny: TASK DONE with unsatisfied DoD blocks the write", async () => {
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    const response = decide(lying, REL_PATH);
    expect(response.hookSpecificOutput.permissionDecision).toBe("deny");
    const reason =
      "permissionDecisionReason" in response.hookSpecificOutput
        ? response.hookSpecificOutput.permissionDecisionReason
        : "";
    expect(reason).toContain("TaskNoteSchema");
    expect(reason).toContain("status=DONE");
    expect(reason).toContain("failing:");
  });

  test("allow: clean note above the floor proceeds with no additionalContext", async () => {
    // Lift the canonical sample above the observation floor (3) and relation
    // floor (2) so the dispatch returns a bare allow (no warning).
    const above = (await sample("task-note-sample.md"))
      .replace(
        "- [constraint] TaskNote frontmatter status uses TODO not PENDING per CONVENTIONS Section 4.8 #enum #convention",
        "- [constraint] TaskNote frontmatter status uses TODO not PENDING per CONVENTIONS Section 4.8 #enum #convention\n- [insight] Four observations clears the structural floor #threshold",
      )
      .replace(
        "- implements [[REQ-005-SPEC-007: TaskNote Schema and Parser]]",
        "- implements [[REQ-005-SPEC-007: TaskNote Schema and Parser]]\n- depends_on [[DESIGN-001-SPEC-007: Sample]]",
      );
    const response = decide(above, REL_PATH);
    expect(response.hookSpecificOutput.permissionDecision).toBe("allow");
    expect("additionalContext" in response.hookSpecificOutput).toBe(false);
  });

  test("allow-with-warning: claim passes but observations at the floor warns", () => {
    const response = decide(REQUIREMENT_AT_FLOOR, REL_PATH);
    expect(response.hookSpecificOutput.permissionDecision).toBe("allow");
    const ctx =
      "additionalContext" in response.hookSpecificOutput
        ? response.hookSpecificOutput.additionalContext
        : undefined;
    expect(ctx).toContain("Schema warning:");
    expect(ctx).toContain("(non-blocking)");
  });

  test("unparseable note throws (caller routes to fail-open)", () => {
    expect(() => decide("# No frontmatter here\n", REL_PATH)).toThrow();
  });
});

// ── resolveWithinRoot() — Phase 3 security P1 path containment ─────────────

describe("resolveWithinRoot — path containment", () => {
  const root = "/repo/root";

  test("accepts a relative path inside the root", () => {
    expect(resolveWithinRoot(root, "docs/specs/a.md")).toBe("/repo/root/docs/specs/a.md");
  });

  test("accepts an absolute path inside the root", () => {
    expect(resolveWithinRoot(root, "/repo/root/docs/a.md")).toBe("/repo/root/docs/a.md");
  });

  test("rejects a `..` traversal escape", () => {
    expect(() => resolveWithinRoot(root, "../../etc/passwd")).toThrow(PathContainmentError);
  });

  test("rejects an absolute path outside the root", () => {
    expect(() => resolveWithinRoot(root, "/etc/passwd")).toThrow(PathContainmentError);
  });

  test("rejects the root itself (no file target)", () => {
    expect(() => resolveWithinRoot(root, ".")).toThrow(PathContainmentError);
  });
});

// ── toEditOperation() — tool_input shape mapping ───────────────────────────

describe("toEditOperation — tool_input to EditOperation", () => {
  const cwd = "/repo/root";

  test("maps Edit", () => {
    const op = toEditOperation({
      tool_name: "Edit",
      tool_input: { file_path: "docs/a.md", old_string: "x", new_string: "y" },
      cwd,
    });
    expect(op).toEqual({ tool: "Edit", filePath: "docs/a.md", oldString: "x", newString: "y" });
  });

  test("maps Write", () => {
    const op = toEditOperation({
      tool_name: "Write",
      tool_input: { file_path: "docs/a.md", content: "body" },
      cwd,
    });
    expect(op).toEqual({ tool: "Write", filePath: "docs/a.md", content: "body" });
  });

  test("maps MultiEdit", () => {
    const op = toEditOperation({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "docs/a.md",
        edits: [{ old_string: "a", new_string: "b" }],
      },
      cwd,
    });
    expect(op).toEqual({
      tool: "MultiEdit",
      filePath: "docs/a.md",
      edits: [{ oldString: "a", newString: "b" }],
    });
  });

  test("throws UnsupportedToolError for an unowned tool", () => {
    expect(() =>
      toEditOperation({ tool_name: "Bash", tool_input: { command: "ls" }, cwd }),
    ).toThrow(UnsupportedToolError);
  });
});

// ── handle() — end-to-end over a temp repo (exercises the disk read) ───────

describe("handle — end-to-end with on-disk content", () => {
  let repoRoot: string;
  const taskRel = "docs/specs/spec-001-x/tasks/task-001-spec-001-sample.md";

  beforeAll(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "pre-write-l1-"));
    await mkdir(join(repoRoot, "docs/specs/spec-001-x/tasks"), { recursive: true });
    // Seed the on-disk task note at a non-terminal status.
    const seed = await sample("task-note-sample.md");
    await Bun.write(join(repoRoot, taskRel), seed);
  });

  afterAll(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("Edit flipping status to DONE with unsatisfied DoD denies", async () => {
    const input: HookInput = {
      tool_name: "Edit",
      tool_input: {
        file_path: taskRel,
        old_string: "status: IN_PROGRESS",
        new_string: "status: DONE",
      },
      cwd: repoRoot,
    };
    const response = await handle(input);
    expect(response.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  test("Edit with a non-status change to a non-lying note allows", async () => {
    // A unique substring anchors the no-op edit (the H1 is unique in the body).
    const anchor = "# TASK-005-SPEC-007: Implement TaskNote Schema and Parser";
    const input: HookInput = {
      tool_name: "Edit",
      tool_input: { file_path: taskRel, old_string: anchor, new_string: anchor },
      cwd: repoRoot,
    };
    const response = await handle(input);
    // The canonical sample sits at the observation floor → allow (with a
    // non-blocking warning), never deny.
    expect(response.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("Write of a brand-new clean note (no existing file) allows", async () => {
    const newRel = "docs/specs/spec-001-x/tasks/task-002-spec-001-new.md";
    const body = (await sample("task-note-sample.md")).replace(
      /task-001-spec-001-sample/g,
      "task-002-spec-001-new",
    );
    const input: HookInput = {
      tool_name: "Write",
      tool_input: { file_path: newRel, content: body },
      cwd: repoRoot,
    };
    const response = await handle(input);
    expect(response.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  test("traversal attempt is rejected before any disk read", async () => {
    const input: HookInput = {
      tool_name: "Write",
      tool_input: { file_path: "../../../../etc/passwd", content: "x" },
      cwd: repoRoot,
    };
    await expect(handle(input)).rejects.toThrow(PathContainmentError);
  });

  test("unsupported tool throws UnsupportedToolError", async () => {
    const input: HookInput = {
      tool_name: "Bash",
      tool_input: { command: "git status" },
      cwd: repoRoot,
    };
    await expect(handle(input)).rejects.toThrow(UnsupportedToolError);
  });
});

/**
 * Inline REQUIREMENT fixture that parses cleanly with a passing claim (status
 * DRAFT, so the AC gate stays dormant) but carries exactly three observations —
 * the bare structural floor — to exercise the non-blocking warning path.
 */
const REQUIREMENT_AT_FLOOR = `---
title: 'REQ-001-SPEC-001: Minimal Requirement'
type: requirement
status: DRAFT
permalink: specs/spec-001-x/requirements/req-001-spec-001-minimal
tags:
  - requirement
  - spec-001
---

# REQ-001-SPEC-001: Minimal Requirement

## Requirement Statement

WHEN a minimal requirement is authored THE SYSTEM SHALL accept it SO THAT the
floor warning path is exercised.

## Acceptance Criteria

- [ ] GIVEN a draft requirement WHEN parsed THEN it validates

## Observations

- [requirement] Minimal requirement for the floor path #floor
- [technique] Three observations is the schema floor #threshold
- [decision] Status DRAFT keeps the AC gate dormant #status

## Relations

- part_of [[SPEC-001: Sample]]
- implements [[ADR-001: Sample]]
`;
