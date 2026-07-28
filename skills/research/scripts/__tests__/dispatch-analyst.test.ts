import { describe, expect, test } from "bun:test";
import { ObservationCategoryEnum } from "@acmelabs/models/schemas/common";
import { main, renderAnalystBrief } from "../dispatch-analyst.ts";

const REQ_SCOPE = "REQ-005-SPEC-008";

describe("renderAnalystBrief()", () => {
  test("determinism: same args yield byte-identical output (DoD #4)", () => {
    const args = { reqScope: REQ_SCOPE };
    const first = renderAnalystBrief(args);
    const second = renderAnalystBrief(args);
    expect(first).toBe(second);
  });

  test("brief contains the no-open-questions mandate marker NO OPEN QUESTIONS", () => {
    const brief = renderAnalystBrief({ reqScope: REQ_SCOPE });
    expect(brief.includes("NO OPEN QUESTIONS")).toBe(true);
  });

  test("brief contains the rubric-as-floor mandate marker RUBRIC IS FLOOR", () => {
    const brief = renderAnalystBrief({ reqScope: REQ_SCOPE });
    expect(brief.includes("RUBRIC IS FLOOR")).toBe(true);
  });

  test("brief contains the analysis-surfaces-options mandate as inline prose", () => {
    const brief = renderAnalystBrief({ reqScope: REQ_SCOPE });
    expect(brief).toContain("options-with-pros/cons");
    expect(brief).toContain("/decisions phase adjudicates");
  });

  test("brief contains the requirement scope in the Scope section", () => {
    const brief = renderAnalystBrief({ reqScope: REQ_SCOPE });
    expect(brief).toContain(`**Requirement**: ${REQ_SCOPE}`);
  });

  test("brief contains every observation category from common.ts (import-bound assertion)", () => {
    const brief = renderAnalystBrief({ reqScope: REQ_SCOPE });
    for (const category of ObservationCategoryEnum.options) {
      expect(brief.includes(category)).toBe(true);
    }
  });
});

describe("main() CLI", () => {
  test("exit 0 with a valid req-scope arg (success path)", async () => {
    const code = await main([REQ_SCOPE]);
    expect(code).toBe(0);
  });

  test("exit 2 when no scope arg provided (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });
});
