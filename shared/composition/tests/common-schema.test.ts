import { describe, expect, test } from "bun:test";
import {
  EntityIdSchema,
  ObservationSchema,
  PartIdSchema,
  RelationSchema,
  SessionIdSchema,
  TaskIdSchema,
} from "../src/schemas/common.js";

describe("common schema — entity IDs", () => {
  test("EntityIdSchema accepts canonical IDs", () => {
    expect(EntityIdSchema.safeParse("ADR-001").success).toBe(true);
    expect(EntityIdSchema.safeParse("SPEC-042").success).toBe(true);
    expect(EntityIdSchema.safeParse("SESSION-2026-05-20_01").success).toBe(true);
  });

  test("EntityIdSchema rejects malformed IDs", () => {
    expect(EntityIdSchema.safeParse("adr-001").success).toBe(false);
    expect(EntityIdSchema.safeParse("ADR001").success).toBe(false);
    expect(EntityIdSchema.safeParse("123-ADR").success).toBe(false);
  });

  test("PartIdSchema accepts all canonical part forms", () => {
    expect(PartIdSchema.safeParse("research").success).toBe(true);
    expect(PartIdSchema.safeParse("decisions.1").success).toBe(true);
    expect(PartIdSchema.safeParse("spec-decomposition").success).toBe(true);
    expect(PartIdSchema.safeParse("spec.SPEC-007").success).toBe(true);
    expect(PartIdSchema.safeParse("build.SPEC-007").success).toBe(true);
    expect(PartIdSchema.safeParse("review").success).toBe(true);
    expect(PartIdSchema.safeParse("end").success).toBe(true);
  });

  test("PartIdSchema rejects unknown part forms", () => {
    expect(PartIdSchema.safeParse("decisions").success).toBe(false);
    expect(PartIdSchema.safeParse("spec.007").success).toBe(false);
    expect(PartIdSchema.safeParse("post-review").success).toBe(false);
  });

  test("TaskIdSchema enforces T-NN with min 2 digits", () => {
    expect(TaskIdSchema.safeParse("T-01").success).toBe(true);
    expect(TaskIdSchema.safeParse("T-123").success).toBe(true);
    expect(TaskIdSchema.safeParse("T-1").success).toBe(false);
    expect(TaskIdSchema.safeParse("T-1a").success).toBe(false);
  });

  test("SessionIdSchema enforces SESSION-YYYY-MM-DD_NN", () => {
    expect(SessionIdSchema.safeParse("SESSION-2026-05-20_01").success).toBe(true);
    expect(SessionIdSchema.safeParse("SESSION-2026-05-20_99").success).toBe(true);
    expect(SessionIdSchema.safeParse("SESSION-2026-5-20_01").success).toBe(false);
    expect(SessionIdSchema.safeParse("SESSION-2026-05-20-01").success).toBe(false);
  });
});

describe("common schema — observation and relation primitives", () => {
  test("ObservationSchema accepts valid observation", () => {
    const obs = { category: "decision", text: "Use Zod", tags: ["schema", "validation"] };
    expect(ObservationSchema.safeParse(obs).success).toBe(true);
  });

  test("ObservationSchema rejects empty text and out-of-range tags", () => {
    expect(ObservationSchema.safeParse({ category: "fact", text: "", tags: ["x"] }).success).toBe(
      false,
    );
    expect(ObservationSchema.safeParse({ category: "fact", text: "x", tags: [] }).success).toBe(
      false,
    );
    expect(
      ObservationSchema.safeParse({ category: "fact", text: "x", tags: ["a", "b", "c", "d"] })
        .success,
    ).toBe(false);
  });

  test("ObservationSchema rejects invalid category", () => {
    expect(
      ObservationSchema.safeParse({ category: "narrative", text: "x", tags: ["t"] }).success,
    ).toBe(false);
  });

  // drift-marker: qa-027-validates-relation-verb — QA-027 forbidden 'validates' relation-type drift
  test("RelationSchema accepts valid verbs and rejects unknown", () => {
    expect(RelationSchema.safeParse({ verb: "implements", target: "ADR-001" }).success).toBe(true);
    expect(RelationSchema.safeParse({ verb: "pairs_with", target: "PLAN-001" }).success).toBe(true);
    expect(RelationSchema.safeParse({ verb: "reviews", target: "ADR-001" }).success).toBe(false);
  });
});
