import { describe, expect, test } from "bun:test";
import {
  AXES_BY_PR_TYPE,
  PR_TYPES,
  type PrType,
  main,
  renderReviewerBrief,
} from "../dispatch-reviewer.ts";

describe("renderReviewerBrief()", () => {
  test("determinism: same args yield byte-identical output (DoD #4)", () => {
    const first = renderReviewerBrief("CODE");
    const second = renderReviewerBrief("CODE");
    expect(first).toBe(second);
  });

  test("brief contains the PR type in the Scope section", () => {
    const brief = renderReviewerBrief("CONFIG");
    expect(brief).toContain("**PR type**: CONFIG");
  });

  // DoD #5: emitted axis list matches the PR-type-to-axes mapping for EACH of
  // the four PR types. Bound to the AXES_BY_PR_TYPE table, not a hardcoded list.
  for (const prType of PR_TYPES) {
    test(`brief lists exactly the mapped axes for PR type ${prType} (DoD #5)`, () => {
      const brief = renderReviewerBrief(prType);
      const expectedAxes = AXES_BY_PR_TYPE[prType];

      // Every mapped axis appears as a bullet line.
      for (const axis of expectedAxes) {
        expect(brief).toContain(`- ${axis}`);
      }

      // No axis from any OTHER PR type leaks in unless it is also mapped here.
      const allAxes = new Set(Object.values(AXES_BY_PR_TYPE).flat());
      const notMapped = [...allAxes].filter((a) => !expectedAxes.includes(a));
      for (const axis of notMapped) {
        expect(brief).not.toContain(`- ${axis}`);
      }
    });
  }

  test("brief contains the reviewer-asymmetry mandate", () => {
    const brief = renderReviewerBrief("CODE");
    expect(brief).toContain("Review this diff as a stranger");
    expect(brief).toContain("find failures");
    expect(brief).toContain("failure mode");
  });

  test("CODE PR type runs all eight axes", () => {
    expect(AXES_BY_PR_TYPE.CODE.length).toBe(8);
  });
});

describe("main() CLI", () => {
  test("exit 0 for each valid PR type (success path)", async () => {
    for (const prType of PR_TYPES) {
      const code = await main([prType]);
      expect(code).toBe(0);
    }
  });

  test("exit 2 when no PR-type arg provided (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 on unknown PR type (usage error)", async () => {
    const code = await main(["FRONTEND" as PrType]);
    expect(code).toBe(2);
  });

  test("exit 2 on lowercase PR type (case-sensitive; unknown)", async () => {
    const code = await main(["code"]);
    expect(code).toBe(2);
  });
});
