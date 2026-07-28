import { describe, expect, test } from "bun:test";
import type { EpicNote, EpicNoteStatus } from "@acmelabs/models/schemas/epic-note";
import type { SpecRootNote, SpecRootNoteStatus } from "@acmelabs/models/schemas/spec-root-note";
import {
  type EpicClaimResult,
  type SpecResolver,
  validateEpicDoneClaim,
} from "@acmelabs/models/validators/epic-claim-validator";

/**
 * Validator-level unit tests for `validateEpicDoneClaim` (SPEC-008 REQ-003,
 * TASK-009, Wave 2). This is the only Wave 2 validator with a cross-note
 * dependency — the cases below exercise the boundary behaviors locked in the
 * TASK-009 DoD:
 *
 *   - status NOT DONE → `{ ok: true }` trivially (resolver never invoked)
 *   - status DONE + zero contains relations → `{ ok: true }` (resolver never
 *     invoked, so a missing resolver is NOT an error here)
 *   - status DONE + every contained SPEC resolves DONE → `{ ok: true }`
 *   - status DONE + a non-DONE contained SPEC → `{ ok: false }` naming it
 *   - status DONE + contains relations + NO resolver → THROWS
 *   - resolver returns undefined for a referenced SPEC → THROWS
 *
 * Fixtures are plain objects cast to their note types (the same approach as
 * the PLAN validator suite) so the validator is exercised on inputs without
 * round-tripping through the schemas — proving it does not lean on the schema
 * having pre-rejected an illegitimate DONE claim.
 */

/** Build a minimal EpicNote, overriding status and the contains-relation set. */
function minimalEpic(status: EpicNoteStatus, containsTargets: readonly string[] = []): EpicNote {
  const containsRelations = containsTargets.map((target) => ({
    verb: "contains" as const,
    target,
  }));
  return {
    frontmatter: {
      title: "EPIC-001: Validator Fixture",
      type: "epic",
      status,
      permalink: "roadmap/epic-001-validator-fixture",
      tags: ["epic", "test"],
    },
    sections: { "Contained Specs": "fixture body" },
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "decision", text: "obs 2", tags: ["b"] },
      { category: "insight", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Test" },
      { verb: "relates_to", target: "ADR-001: Test" },
      ...containsRelations,
    ],
  };
}

/** Build a minimal SpecRootNote at the given status, for the resolver to return. */
function minimalSpec(status: SpecRootNoteStatus): SpecRootNote {
  return {
    frontmatter: {
      title: "SPEC-001: Resolved Fixture",
      type: "spec",
      status,
      permalink: "specs/spec-001-resolved-fixture/spec-001-resolved-fixture",
      tags: ["spec", "test"],
    },
    context: "Context text.",
    scope_in: [],
    scope_out: [],
    sections: { Context: "ctx" },
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "decision", text: "obs 2", tags: ["b"] },
      { category: "insight", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "EPIC-001: Test" },
      { verb: "relates_to", target: "ADR-001: Test" },
    ],
  };
}

/** A resolver that returns a SPEC at a fixed status regardless of the ref. */
function fixedResolver(status: SpecRootNoteStatus): SpecResolver {
  return () => minimalSpec(status);
}

/** A resolver driven by a ref→status map; refs absent from the map resolve undefined. */
function mapResolver(byRef: Readonly<Record<string, SpecRootNoteStatus>>): SpecResolver {
  return (specRef) => {
    const status = byRef[specRef];
    return status === undefined ? undefined : minimalSpec(status);
  };
}

describe("validateEpicDoneClaim", () => {
  test("ok=true when status is DRAFT (the trivial non-DONE branch)", () => {
    // DoD item 2: validator returns { ok: true } when input status is not DONE.
    // The resolver is intentionally omitted to prove it is never consulted.
    const epic = minimalEpic("DRAFT", ["SPEC-007: Plan Session Render"]);
    const result = validateEpicDoneClaim(epic);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is IN_PROGRESS even with a non-DONE child SPEC", () => {
    const epic = minimalEpic("IN_PROGRESS", ["SPEC-007: Plan Session Render"]);
    // Resolver returns a DRAFT SPEC, but the gate is dormant under non-DONE.
    const result = validateEpicDoneClaim(epic, { resolveSpec: fixedResolver("DRAFT") });
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is DONE and the EPIC has zero contains relations", () => {
    // DoD item 3: DONE + zero contains → ok=true, resolver never invoked.
    // Omitting the resolver entirely must NOT throw here (nothing to resolve).
    const epic = minimalEpic("DONE", []);
    const result = validateEpicDoneClaim(epic);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is DONE and every contained SPEC resolves to DONE", () => {
    // DoD item 4 happy path: all children DONE → ok=true.
    const epic = minimalEpic("DONE", [
      "SPEC-007: Plan Session Render",
      "SPEC-008: Protocol Hardening Wave 2",
    ]);
    const result = validateEpicDoneClaim(epic, { resolveSpec: fixedResolver("DONE") });
    expect(result).toEqual({ ok: true });
  });

  test("ok=false when status is DONE and one contained SPEC is not DONE — names it", () => {
    // DoD item 4 failure path: one non-DONE child → ok=false with one entry.
    const epic = minimalEpic("DONE", [
      "SPEC-007: Plan Session Render",
      "SPEC-008: Protocol Hardening Wave 2",
    ]);
    const resolver = mapResolver({
      "SPEC-007: Plan Session Render": "DONE",
      "SPEC-008: Protocol Hardening Wave 2": "IN_PROGRESS" as SpecRootNoteStatus,
    });
    const result: EpicClaimResult = validateEpicDoneClaim(epic, { resolveSpec: resolver });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { spec_ref: "SPEC-008: Protocol Hardening Wave 2", status: "IN_PROGRESS" },
    ]);
  });

  test("ok=false with one unsatisfied entry per non-DONE contained SPEC", () => {
    // Multi-failure case: every non-DONE child reported individually, in order.
    const epic = minimalEpic("DONE", ["SPEC-006: Alpha", "SPEC-007: Beta", "SPEC-008: Gamma"]);
    const resolver = mapResolver({
      "SPEC-006: Alpha": "DRAFT",
      "SPEC-007: Beta": "DONE",
      "SPEC-008: Gamma": "ACCEPTED",
    });
    const result = validateEpicDoneClaim(epic, { resolveSpec: resolver });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { spec_ref: "SPEC-006: Alpha", status: "DRAFT" },
      { spec_ref: "SPEC-008: Gamma", status: "ACCEPTED" },
    ]);
  });

  test("THROWS when status is DONE with contains relations but no resolver provided", () => {
    // DoD item 5: missing resolver under DONE+contains → loud throw naming the
    // missing dependency (ADR-005 D-5 Phase 3 critic P1.1 — no silent pass).
    const epic = minimalEpic("DONE", ["SPEC-007: Plan Session Render"]);
    expect(() => validateEpicDoneClaim(epic)).toThrow(/deps\.resolveSpec/);
    // Also throws when deps is given but resolveSpec is explicitly undefined.
    expect(() => validateEpicDoneClaim(epic, {})).toThrow(/deps\.resolveSpec/);
  });

  test("THROWS when the resolver returns undefined for a referenced SPEC", () => {
    // DoD item 6: unresolvable reference → loud throw naming the SPEC ref.
    const epic = minimalEpic("DONE", ["SPEC-099: Missing"]);
    const resolver = mapResolver({ "SPEC-007: Present": "DONE" }); // ref not in map
    expect(() => validateEpicDoneClaim(epic, { resolveSpec: resolver })).toThrow(
      /SPEC-099: Missing/,
    );
  });

  test("validator is pure — does not mutate the input EpicNote", () => {
    // DoD item 7: pure given the resolver (no I/O, no mutation). Snapshot the
    // input as JSON before + after; equality proves no in-place mutation.
    const epic = minimalEpic("DONE", ["SPEC-007: Plan Session Render"]);
    const snapshot = JSON.stringify(epic);
    validateEpicDoneClaim(epic, { resolveSpec: fixedResolver("DRAFT") });
    expect(JSON.stringify(epic)).toBe(snapshot);
  });

  test("resolver is never invoked when status is not DONE (proves trivial branch is short-circuit)", () => {
    const epic = minimalEpic("ACCEPTED", ["SPEC-007: Plan Session Render"]);
    let calls = 0;
    const counting: SpecResolver = () => {
      calls += 1;
      return minimalSpec("DONE");
    };
    const result = validateEpicDoneClaim(epic, { resolveSpec: counting });
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(0);
  });
});
