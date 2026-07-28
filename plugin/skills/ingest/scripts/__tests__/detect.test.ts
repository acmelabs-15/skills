import { describe, expect, test } from "bun:test";
import {
  SPEC_NESTED_TYPES,
  TYPE_TO_FOLDER,
  buildFilename,
  buildTitle,
  detectType,
  kebabize,
  nextCounter,
  resolveTargetFolder,
} from "../detect.ts";
import { parseSource } from "../parse.ts";

describe("detectType", () => {
  test("uses override when provided and canonical", () => {
    const r = detectType(parseSource("# H\n"), { override: "task", parentSpec: "SPEC-001-x" });
    expect(r.type).toBe("task");
    expect(r.source).toBe("override");
  });

  test("uses frontmatter when override missing", () => {
    const r = detectType(parseSource("---\ntype: design\n---\n# H\n"), {
      parentSpec: "SPEC-001-x",
    });
    expect(r.type).toBe("design");
    expect(r.source).toBe("frontmatter");
  });

  test("falls back to analysis when neither provided", () => {
    const r = detectType(parseSource("# H\n"));
    expect(r.type).toBe("analysis");
    expect(r.source).toBe("fallback");
  });

  test("flags missingParentSpec for spec-nested types", () => {
    const r = detectType(parseSource("---\ntype: task\n---\n"), {});
    expect(r.missingParentSpec).toBe(true);
  });

  test("missingParentSpec false when parent supplied", () => {
    const r = detectType(parseSource("---\ntype: task\n---\n"), { parentSpec: "SPEC-001-x" });
    expect(r.missingParentSpec).toBe(false);
  });
});

describe("TYPE_TO_FOLDER", () => {
  test("covers all 16 canonical types", () => {
    expect(Object.keys(TYPE_TO_FOLDER)).toHaveLength(16);
  });
});

describe("resolveTargetFolder", () => {
  test("resolves top-level type to fixed folder", () => {
    expect(resolveTargetFolder("decision")).toBe("docs/decisions");
  });

  test("expands {parentSpec} for spec-nested types", () => {
    expect(resolveTargetFolder("task", "SPEC-001-foo")).toBe("docs/specs/SPEC-001-foo/tasks");
  });

  test("throws when spec-nested type has no parent", () => {
    expect(() => resolveTargetFolder("requirement")).toThrow();
  });
});

describe("nextCounter", () => {
  test("returns 1 when no existing files", () => {
    expect(nextCounter("ADR", [])).toBe(1);
  });
  test("returns max+1", () => {
    expect(nextCounter("ADR", ["ADR-001-a.md", "ADR-003-b.md"])).toBe(4);
  });
  test("ignores non-matching prefixes", () => {
    expect(nextCounter("ADR", ["SPEC-005-x.md", "ADR-001-a.md"])).toBe(2);
  });
});

describe("buildTitle", () => {
  test("top-level type formats correctly", () => {
    expect(buildTitle("decision", 7, "My Topic")).toBe("ADR-007: My Topic");
  });
  test("spec-nested type includes parent id", () => {
    expect(buildTitle("task", 3, "Do The Thing", "SPEC-001-foo")).toBe(
      "TASK-003-SPEC-001: Do The Thing",
    );
  });
});

describe("buildFilename", () => {
  test("top-level filename is kebab", () => {
    expect(buildFilename("decision", 7, "My Cool Topic")).toBe("ADR-007-my-cool-topic.md");
  });
  test("spec-nested filename includes parent id", () => {
    expect(buildFilename("task", 3, "Do The Thing", "SPEC-001-foo")).toBe(
      "TASK-003-SPEC-001-do-the-thing.md",
    );
  });
});

describe("kebabize", () => {
  test("converts to lowercase kebab", () => {
    expect(kebabize("Hello World - Test")).toBe("hello-world-test");
  });
});

describe("SPEC_NESTED_TYPES", () => {
  test("contains requirement, design, task", () => {
    expect(SPEC_NESTED_TYPES.has("requirement")).toBe(true);
    expect(SPEC_NESTED_TYPES.has("design")).toBe(true);
    expect(SPEC_NESTED_TYPES.has("task")).toBe(true);
    expect(SPEC_NESTED_TYPES.has("decision")).toBe(false);
  });
});
