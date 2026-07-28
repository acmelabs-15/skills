import { describe, expect, test } from "bun:test";
import { validRelationTypes } from "@acmelabs/models/schemas/common";
import { main, renderArchitectBrief } from "../dispatch-architect.ts";

describe("renderArchitectBrief", () => {
  test("determinism: same args produce byte-identical output", () => {
    const args = { adrRef: "ADR-005: Protocol Hardening Wave 2 Architecture", dnCount: 8 };
    const first = renderArchitectBrief(args);
    const second = renderArchitectBrief(args);
    expect(first).toBe(second);
  });

  test('output contains the required "## Structural ADR Requirements" section header', () => {
    const out = renderArchitectBrief({ adrRef: "ADR-001: Test ADR", dnCount: 3 });
    expect(out.includes("## Structural ADR Requirements")).toBe(true);
  });

  test("output contains all validRelationTypes from common.ts (import-bound assertion)", () => {
    const out = renderArchitectBrief({ adrRef: "ADR-001: Test ADR", dnCount: 3 });
    for (const verb of validRelationTypes) {
      expect(out.includes(verb)).toBe(true);
    }
  });

  test("output contains Considered Options ACCEPTED-gate requirement", () => {
    const out = renderArchitectBrief({ adrRef: "ADR-001: Test ADR", dnCount: 3 });
    expect(out.includes("Considered Options")).toBe(true);
    expect(out.includes("non-empty rationale")).toBe(true);
  });

  test("output contains Clarifications section ACCEPTED-gate requirement", () => {
    const out = renderArchitectBrief({ adrRef: "ADR-001: Test ADR", dnCount: 3 });
    expect(out.includes("Clarifications")).toBe(true);
    expect(out.includes("checked")).toBe(true);
  });

  test("output contains detail-parity mandate", () => {
    const out = renderArchitectBrief({ adrRef: "ADR-001: Test ADR", dnCount: 3 });
    expect(out.includes("Preserve every detail from SESSION events; do not summarize")).toBe(true);
  });

  test("adrRef and dnCount appear in scope section", () => {
    const out = renderArchitectBrief({ adrRef: "ADR-042: Some Decision", dnCount: 12 });
    expect(out.includes("ADR-042: Some Decision")).toBe(true);
    expect(out.includes("12")).toBe(true);
  });
});

describe("main (CLI entry)", () => {
  test("exit 2 when no args provided", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 when only adr-ref provided (missing dn-count)", async () => {
    const code = await main(["ADR-001: Test"]);
    expect(code).toBe(2);
  });

  test("exit 2 when dn-count is not a positive integer", async () => {
    const code = await main(["ADR-001: Test", "0"]);
    expect(code).toBe(2);
  });

  test("exit 2 when dn-count is non-numeric", async () => {
    const code = await main(["ADR-001: Test", "banana"]);
    expect(code).toBe(2);
  });

  test("exit 0 with valid args", async () => {
    const code = await main(["ADR-005: Protocol Hardening", "8"]);
    expect(code).toBe(0);
  });
});
