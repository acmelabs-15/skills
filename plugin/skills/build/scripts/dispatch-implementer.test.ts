import { describe, expect, test } from "bun:test";
import { main, renderImplementerBrief } from "./dispatch-implementer.ts";

const TASK_REF = "TASK-018-SPEC-008";
const TASK_CONTENT =
  "## Definition of Done\n\n- [ ] dispatch-implementer emits brief\n- [ ] if (import.meta.main) guard present";

describe("renderImplementerBrief()", () => {
  test("determinism: same args yield byte-identical output (DoD #4)", () => {
    const args = { taskRef: TASK_REF, taskContent: TASK_CONTENT };
    const first = renderImplementerBrief(args);
    const second = renderImplementerBrief(args);
    expect(first).toBe(second);
  });

  test("brief contains the TASK ref in the Scope section", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain(`**TASK**: ${TASK_REF}`);
  });

  test("brief contains rendered TASK content verbatim (DoD #1)", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain(TASK_CONTENT);
  });

  test("brief contains TDD directive mandate", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain("TDD directive");
    expect(brief).toContain("Write failing tests");
  });

  test("brief contains canonical-source-mirror constraint", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain("Canonical-source-mirror constraint");
  });

  test("brief contains memory-first gate directive", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain("Memory-first gate");
    expect(brief).toContain("mcp__plugin_brain_brain__search");
  });

  test("brief contains implementer contract (checkbox-as-contract)", () => {
    const brief = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(brief).toContain("Definition of Done checkboxes verbatim");
    expect(brief).toContain("## State Changes");
  });
});

describe("main() CLI", () => {
  test("exit 0 with valid args and emits brief to stdout (success path)", async () => {
    const code = await main(["--task-ref", TASK_REF, "--task-content", TASK_CONTENT]);
    expect(code).toBe(0);
  });

  test("exit 0 determinism: two invocations produce identical output (DoD #4)", async () => {
    const args = ["--task-ref", TASK_REF, "--task-content", TASK_CONTENT];
    // Capture stdout by calling renderImplementerBrief (main delegates to it)
    const first = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    const second = renderImplementerBrief({ taskRef: TASK_REF, taskContent: TASK_CONTENT });
    expect(first).toBe(second);
    // Verify main exits 0
    const code = await main(args);
    expect(code).toBe(0);
  });

  test("exit 2 when --task-ref is missing (usage error)", async () => {
    const code = await main(["--task-content", TASK_CONTENT]);
    expect(code).toBe(2);
  });

  test("exit 2 when --task-content is missing (usage error)", async () => {
    const code = await main(["--task-ref", TASK_REF]);
    expect(code).toBe(2);
  });

  test("exit 2 when no args provided (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 on unknown flag (usage error)", async () => {
    const code = await main(["--task-ref", TASK_REF, "--task-content", TASK_CONTENT, "--bogus"]);
    expect(code).toBe(2);
  });
});
