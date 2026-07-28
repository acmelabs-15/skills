import { describe, expect, test } from "bun:test";
import {
  type EditOperation,
  EditOperationError,
  applyEditOperation,
} from "../apply-edit-operation.ts";

describe("applyEditOperation - Edit", () => {
  test("replaces single occurrence", () => {
    const op: EditOperation = {
      tool: "Edit",
      filePath: "docs/sample.md",
      oldString: "status: TODO",
      newString: "status: DONE",
    };
    const result = applyEditOperation(op, "# Note\nstatus: TODO\n");
    expect(result).toBe("# Note\nstatus: DONE\n");
  });

  test("throws when oldString is missing", () => {
    const op: EditOperation = {
      tool: "Edit",
      filePath: "docs/sample.md",
      oldString: "no-such-string",
      newString: "replacement",
    };
    expect(() => applyEditOperation(op, "actual content")).toThrow(EditOperationError);
    expect(() => applyEditOperation(op, "actual content")).toThrow(
      /oldString not found in current content/,
    );
  });

  test("throws when oldString matches non-uniquely", () => {
    const op: EditOperation = {
      tool: "Edit",
      filePath: "docs/sample.md",
      oldString: "foo",
      newString: "bar",
    };
    expect(() => applyEditOperation(op, "foo and foo again")).toThrow(EditOperationError);
    expect(() => applyEditOperation(op, "foo and foo again")).toThrow(/non-uniquely/);
  });

  test("throws when oldString is empty", () => {
    const op: EditOperation = {
      tool: "Edit",
      filePath: "docs/sample.md",
      oldString: "",
      newString: "x",
    };
    expect(() => applyEditOperation(op, "anything")).toThrow(/oldString must be non-empty/);
  });

  test("throws when oldString field is undefined", () => {
    const op = { tool: "Edit", filePath: "x.md" } as EditOperation;
    expect(() => applyEditOperation(op, "x")).toThrow(
      /oldString and newString fields are required/,
    );
  });
});

describe("applyEditOperation - Write", () => {
  test("returns the full content overwrite", () => {
    const op: EditOperation = {
      tool: "Write",
      filePath: "docs/new.md",
      content: "# Fresh content\n",
    };
    const result = applyEditOperation(op, "anything previously here");
    expect(result).toBe("# Fresh content\n");
  });

  test("supports empty content overwrite", () => {
    const op: EditOperation = { tool: "Write", filePath: "docs/x.md", content: "" };
    expect(applyEditOperation(op, "previous")).toBe("");
  });

  test("throws when content field is undefined", () => {
    const op = { tool: "Write", filePath: "x.md" } as EditOperation;
    expect(() => applyEditOperation(op, "x")).toThrow(/Write: content field is required/);
  });
});

describe("applyEditOperation - MultiEdit", () => {
  test("applies edits sequentially", () => {
    const op: EditOperation = {
      tool: "MultiEdit",
      filePath: "docs/sample.md",
      edits: [
        { oldString: "alpha", newString: "AAA" },
        { oldString: "beta", newString: "BBB" },
      ],
    };
    const result = applyEditOperation(op, "alpha beta gamma");
    expect(result).toBe("AAA BBB gamma");
  });

  test("later edit operates on already-applied content", () => {
    const op: EditOperation = {
      tool: "MultiEdit",
      filePath: "docs/sample.md",
      edits: [
        { oldString: "foo", newString: "bar" },
        { oldString: "bar", newString: "baz" },
      ],
    };
    expect(applyEditOperation(op, "foo")).toBe("baz");
  });

  test("throws with edit index when one entry fails (missing oldString)", () => {
    const op: EditOperation = {
      tool: "MultiEdit",
      filePath: "docs/sample.md",
      edits: [
        { oldString: "ok", newString: "OK" },
        { oldString: "not-present", newString: "x" },
      ],
    };
    expect(() => applyEditOperation(op, "ok value")).toThrow(/MultiEdit\[1\]/);
  });

  test("throws with edit index when one entry is non-unique", () => {
    const op: EditOperation = {
      tool: "MultiEdit",
      filePath: "docs/sample.md",
      edits: [{ oldString: "x", newString: "y" }],
    };
    expect(() => applyEditOperation(op, "x x x")).toThrow(/MultiEdit\[0\].*non-uniquely/);
  });

  test("throws when edits array is empty", () => {
    const op: EditOperation = {
      tool: "MultiEdit",
      filePath: "docs/sample.md",
      edits: [],
    };
    expect(() => applyEditOperation(op, "x")).toThrow(/edits array must be present and non-empty/);
  });

  test("throws when edits array is missing", () => {
    const op = { tool: "MultiEdit", filePath: "x.md" } as EditOperation;
    expect(() => applyEditOperation(op, "x")).toThrow(/edits array must be present and non-empty/);
  });
});
