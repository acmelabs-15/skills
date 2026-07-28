import { describe, expect, test } from "bun:test";
import { validRelationTypes } from "@acmelabs/models/schemas/common";
import {
  ADVERSARIAL_ASYMMETRY_MANDATE_MARKER,
  main,
  renderDecisionCriticBrief,
} from "./dispatch-decision-critic.ts";

describe("renderDecisionCriticBrief", () => {
  test("determinism: same args produce byte-identical output", () => {
    const args = { dnId: "D-3", topicDescription: "storage backend choice" };
    const first = renderDecisionCriticBrief(args);
    const second = renderDecisionCriticBrief(args);
    expect(first).toBe(second);
  });

  test("determinism: same args with optionsBlock produce byte-identical output", () => {
    const args = {
      dnId: "D-3",
      topicDescription: "storage backend choice",
      optionsBlock: "- Option A: SQLite\n- Option B: Postgres",
    };
    const first = renderDecisionCriticBrief(args);
    const second = renderDecisionCriticBrief(args);
    expect(first).toBe(second);
  });

  test("output contains the adversarial asymmetry mandate marker", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-1", topicDescription: "test decision" });
    expect(out.includes(ADVERSARIAL_ASYMMETRY_MANDATE_MARKER)).toBe(true);
  });

  test("output contains the critic role definition (find problems, not rubber-stamp)", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-1", topicDescription: "test decision" });
    expect(out.includes("find problems, not rubber-stamp")).toBe(true);
  });

  test("output contains the assume-reasoning-is-flawed instruction", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-1", topicDescription: "test decision" });
    expect(out.includes("Assume the reasoning is flawed until evidence proves otherwise")).toBe(
      true,
    );
  });

  test("output contains hidden-assumptions framing", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-1", topicDescription: "test decision" });
    expect(out.includes("hidden assumptions")).toBe(true);
  });

  test("output contains all validRelationTypes from common.ts (import-bound assertion)", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-1", topicDescription: "test decision" });
    for (const verb of validRelationTypes) {
      expect(out.includes(verb)).toBe(true);
    }
  });

  test("dnId and topicDescription appear in scope section", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-7", topicDescription: "caching strategy" });
    expect(out.includes("D-7")).toBe(true);
    expect(out.includes("caching strategy")).toBe(true);
  });

  test("optionsBlock is included verbatim when provided", () => {
    const optionsBlock = "- Option A: Redis (fast)\n- Option B: Memcached (simpler)";
    const out = renderDecisionCriticBrief({
      dnId: "D-2",
      topicDescription: "caching backend",
      optionsBlock,
    });
    expect(out.includes(optionsBlock)).toBe(true);
  });

  test("placeholder message appears when no optionsBlock provided", () => {
    const out = renderDecisionCriticBrief({ dnId: "D-2", topicDescription: "caching backend" });
    expect(out.includes("Read the options verbatim from the source ANALYSIS note")).toBe(true);
  });
});

describe("main (CLI entry)", () => {
  test("exit 2 when no args provided", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 when only dn-id provided (missing topic-description)", async () => {
    const code = await main(["D-3"]);
    expect(code).toBe(2);
  });

  test("exit 0 with valid dn-id and topic-description", async () => {
    const code = await main(["D-3", "storage backend choice"]);
    expect(code).toBe(0);
  });

  test("exit 0 with dn-id, topic-description, and optional options-block", async () => {
    const code = await main(["D-3", "storage backend choice", "- Option A\n- Option B"]);
    expect(code).toBe(0);
  });
});
