import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  type FileChangedObserve,
  type PreToolUseAllow,
  type PreToolUseDeny,
  type StopBlock,
  emitResponse,
} from "../format-hook-response.ts";

const originalWrite = process.stdout.write.bind(process.stdout);
let captured: string[] = [];

beforeEach(() => {
  captured = [];
  // biome-ignore lint/suspicious/noExplicitAny: stubbing a readonly stream method
  (process.stdout as any).write = (chunk: string | Uint8Array): boolean => {
    if (typeof chunk === "string") {
      captured.push(chunk);
    } else {
      captured.push(new TextDecoder().decode(chunk));
    }
    return true;
  };
});

afterEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: restoring the stub from above
  (process.stdout as any).write = originalWrite;
});

describe("emitResponse - PreToolUseDeny", () => {
  test("emits exact byte sequence for deny response", () => {
    const response: PreToolUseDeny = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "TASK-039 DoD checkbox 2 unsatisfied",
      },
    };
    emitResponse(response);
    expect(captured.join("")).toBe(
      `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"TASK-039 DoD checkbox 2 unsatisfied"}}\n`,
    );
  });
});

describe("emitResponse - PreToolUseAllow", () => {
  test("emits exact byte sequence for allow without additionalContext", () => {
    const response: PreToolUseAllow = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
      },
    };
    emitResponse(response);
    expect(captured.join("")).toBe(
      `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n`,
    );
  });

  test("emits exact byte sequence for allow with additionalContext warning", () => {
    const response: PreToolUseAllow = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        additionalContext: "Observation count below quality threshold (2 < 3)",
      },
    };
    emitResponse(response);
    expect(captured.join("")).toBe(
      `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","additionalContext":"Observation count below quality threshold (2 < 3)"}}\n`,
    );
  });
});

describe("emitResponse - StopBlock", () => {
  test("emits exact byte sequence for stop block", () => {
    const response: StopBlock = {
      decision: "block",
      reason: "Backstop: 2 unvalidated docs/** modifications in transcript",
    };
    emitResponse(response);
    expect(captured.join("")).toBe(
      `{"decision":"block","reason":"Backstop: 2 unvalidated docs/** modifications in transcript"}\n`,
    );
  });
});

describe("emitResponse - FileChangedObserve", () => {
  test("emits exact byte sequence for file changed observation", () => {
    const response: FileChangedObserve = {
      hookSpecificOutput: {
        hookEventName: "FileChanged",
        additionalContext: "Commit abc1234 touched 3 docs/** notes; all validated PASS",
      },
    };
    emitResponse(response);
    expect(captured.join("")).toBe(
      `{"hookSpecificOutput":{"hookEventName":"FileChanged","additionalContext":"Commit abc1234 touched 3 docs/** notes; all validated PASS"}}\n`,
    );
  });
});

describe("emitResponse - protocol invariants", () => {
  test("emits a single line ending with \\n (no pretty-print)", () => {
    emitResponse({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
      },
    });
    const joined = captured.join("");
    // Single trailing newline only.
    expect(joined.endsWith("\n")).toBe(true);
    // No internal newlines (would indicate pretty-printing).
    const bodyWithoutTrailing = joined.slice(0, -1);
    expect(bodyWithoutTrailing.includes("\n")).toBe(false);
    // No extra whitespace at start.
    expect(joined.startsWith("{")).toBe(true);
  });
});
