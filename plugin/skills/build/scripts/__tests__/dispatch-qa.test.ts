import { describe, expect, test } from "bun:test";
import { validRelationTypes } from "@acmelabs/models/schemas/common";
import { main, renderQaBrief } from "../dispatch-qa.ts";

const TASK_REF = "TASK-018-SPEC-008";
const REQ_REF_0 = "REQ-005-SPEC-008";
const REQ_REF_1 = "REQ-001-SPEC-008";
const REQ_REFS = [REQ_REF_0, REQ_REF_1];

describe("renderQaBrief()", () => {
  test("determinism: same args yield byte-identical output (DoD #4)", () => {
    const args = { taskRef: TASK_REF, reqRefs: REQ_REFS };
    const first = renderQaBrief(args);
    const second = renderQaBrief(args);
    expect(first).toBe(second);
  });

  test("brief contains every validRelationTypes entry verbatim (DoD #5)", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    // Binding to the imported constant — NOT a hardcoded list or count.
    expect(validRelationTypes.every((v) => brief.includes(v))).toBe(true);
  });

  test("brief contains the TASK ref in the Scope section (DoD #2)", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    expect(brief).toContain(`**TASK**: ${TASK_REF}`);
  });

  test("brief contains all REQ refs in the Scope section (DoD #2)", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    for (const ref of REQ_REFS) {
      expect(brief).toContain(ref);
    }
  });

  test("brief contains reviewer asymmetry mandate", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    expect(brief).toContain("adversarial reviewer");
    expect(brief).toContain("find failures");
  });

  test("brief contains QA contract (checkbox-as-contract)", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    expect(brief).toContain("ENTIRE spec subtree");
    expect(brief).toContain("PASS");
    expect(brief).toContain("FAILED");
  });

  test("brief places the verification burden on the QA agent, promising no validator run", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: REQ_REFS });
    expect(brief).toContain("No validator runs behind you");
    expect(brief).toContain("passed + failed + skipped");
    // Regression guard: the brief must not promise mechanical enforcement that
    // no step performs. The QA agent's judgment is the verification.
    expect(brief).not.toContain("validators will be run");
    expect(brief).not.toContain("mechanically caught");
  });

  test("brief works with no REQ refs (graceful empty case)", () => {
    const brief = renderQaBrief({ taskRef: TASK_REF, reqRefs: [] });
    expect(brief).toContain("no REQ refs provided");
    // validRelationTypes still present
    expect(validRelationTypes.every((v) => brief.includes(v))).toBe(true);
  });

  test("validRelationTypes has the expected 16 entries (cross-schema consistency check)", () => {
    // Documents expected count; if common.ts changes this test detects the drift.
    expect(validRelationTypes.length).toBe(16);
  });
});

describe("main() CLI", () => {
  test("exit 0 with valid args (success path)", async () => {
    const code = await main(["--task-ref", TASK_REF, "--req-ref", REQ_REF_0]);
    expect(code).toBe(0);
  });

  test("exit 0 with multiple --req-ref flags (DoD #2)", async () => {
    const code = await main([
      "--task-ref",
      TASK_REF,
      "--req-ref",
      REQ_REF_0,
      "--req-ref",
      REQ_REF_1,
    ]);
    expect(code).toBe(0);
  });

  test("exit 0 with no REQ refs (task-ref only is sufficient)", async () => {
    const code = await main(["--task-ref", TASK_REF]);
    expect(code).toBe(0);
  });

  test("exit 0 determinism: render function called twice yields identical output (DoD #4)", () => {
    const args = { taskRef: TASK_REF, reqRefs: REQ_REFS };
    expect(renderQaBrief(args)).toBe(renderQaBrief(args));
  });

  test("exit 2 when --task-ref is missing (usage error)", async () => {
    const code = await main(["--req-ref", REQ_REF_0]);
    expect(code).toBe(2);
  });

  test("exit 2 when no args provided (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 on unknown flag (usage error)", async () => {
    const code = await main(["--task-ref", TASK_REF, "--bogus", "value"]);
    expect(code).toBe(2);
  });

  test("exit 2 when --task-ref flag value is missing", async () => {
    const code = await main(["--task-ref"]);
    // parseArgs: --task-ref has no next token, returns ok:false
    expect(code).toBe(2);
  });
});
