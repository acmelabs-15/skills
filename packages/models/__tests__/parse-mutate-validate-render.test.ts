/**
 * Integration test — full parse → mutate → validate → render pipeline.
 *
 * Closes REQ-007-SPEC-008 AC-1 (Audit E ZERO-dedicated-integration-tests
 * finding) by exercising the composition library's end-to-end contract on
 * PLAN, SPEC, and TASK note types. Each pipeline stages:
 *
 *   1. parse — fixture markdown → typed model via the type's parser
 *   2. mutate — apply a representative mutation against the model or markdown
 *   3. validate — assert the mutated note schema-parses cleanly OR
 *      validator returns PASS (per the touched note's claim contract)
 *   4. render — emit markdown; re-parse confirms semantic equality
 *
 * The TASK pipeline uses `applyCheckboxMutation` (markdown-string mutation)
 * since the composition library does not yet ship a TaskNote renderer
 * (deferred per the schema docs). The mutation's re-parse step provides the
 * post-render contract: applyCheckboxMutation returns valid TaskNote
 * markdown by construction.
 *
 * The SPEC pipeline applies an in-model mutation (no SPEC schema mutation
 * API ships beyond the SPEC root renderer) — the test mutates the parsed
 * model directly, re-runs the schema, validates via validateSpecDoneClaim,
 * renders, and verifies semantic round-trip equality.
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  type FlipCheckboxMutation,
  applyCheckboxMutation,
} from "@acmelabs/models/mutations/checkbox-mutations";
import { type PlanMutation, applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";
import { parseSpecRootNote } from "@acmelabs/models/parsers/spec-root-note";
import { parseTaskNote } from "@acmelabs/models/parsers/task-note";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import { renderSpecRootNote } from "@acmelabs/models/renderers/spec-root-note";
import { PlanNoteSchema } from "@acmelabs/models/schemas/plan-note";
import { type SpecRootNote, SpecRootNoteSchema } from "@acmelabs/models/schemas/spec-root-note";
import { validateSpecDoneClaim } from "@acmelabs/models/validators/spec-claim-validator";
import { validateTaskDoneClaim } from "@acmelabs/models/validators/task-claim-validator";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadSharedFixture(name: string): Promise<string> {
  return Bun.file(join(fixtureDir, name)).text();
}

describe("Integration: PLAN parse → mutate → validate → render pipeline", () => {
  test("flip-dod-item mutation round-trips through parse → schema → render", async () => {
    // 1. parse
    const md = await loadSharedFixture("plan-note-sample.md");
    const parsedBefore = parsePlanNote(md);
    expect(parsedBefore.frontmatter.title).toBe("PLAN-001: Sample Render Fixture");

    // Locate the build.SPEC-007 part — its DoD has two [ ] items we can flip.
    const buildPart = parsedBefore.parts.find((p) => p.id === "build.SPEC-007");
    expect(buildPart).toBeDefined();
    expect(buildPart?.dod.length ?? 0).toBeGreaterThanOrEqual(2);

    // 2. mutate — flip first DoD item to done
    const mutation: PlanMutation = {
      type: "flip-dod-item",
      partId: "build.SPEC-007",
      dodIndex: 0,
      done: true,
    };
    const mutatedMd = applyPlanMutation(md, mutation);

    // 3. validate — the mutated markdown re-parses AND the typed model
    //    passes PlanNoteSchema strict validation.
    const parsedAfter = parsePlanNote(mutatedMd);
    const schemaResult = PlanNoteSchema.safeParse(parsedAfter);
    expect(schemaResult.success).toBe(true);

    // Mutation actually changed the targeted DoD item.
    const buildPartAfter = parsedAfter.parts.find((p) => p.id === "build.SPEC-007");
    expect(buildPartAfter?.dod[0]?.done).toBe(true);

    // 4. render — applyPlanMutation already invokes renderPlanNote internally;
    //    re-rendering the parsed model must be byte-identical (determinism).
    const reRendered = renderPlanNote(parsedAfter);
    expect(reRendered).toBe(mutatedMd);
  });
});

describe("Integration: SPEC parse → mutate → validate → render pipeline", () => {
  test("model mutation flips success_criteria item; validator + renderer agree", async () => {
    // 1. parse
    const md = await loadSharedFixture("spec-root-note-sample.md");
    const parsedBefore = parseSpecRootNote(md);
    expect(parsedBefore.frontmatter.title).toBe("SPEC-099: Sample Spec Root Note");

    // 2. mutate — flip the first unchecked success_criteria item to done.
    //    The fixture's success_criteria has 2 [x], 1 [ ], 1 [ ] deferred.
    expect(parsedBefore.success_criteria).toBeDefined();
    const beforeSc = parsedBefore.success_criteria;
    expect(beforeSc).toBeDefined();
    if (!beforeSc) throw new Error("success_criteria missing on fixture");
    const targetIdx = beforeSc.findIndex((item) => !item.done && !item.deferred_rationale);
    expect(targetIdx).toBeGreaterThanOrEqual(0);

    const mutated: SpecRootNote = {
      ...parsedBefore,
      success_criteria: beforeSc.map((item, idx) =>
        idx === targetIdx ? { ...item, done: true } : item,
      ),
    };

    // 3. validate — schema parse succeeds AND validator reports the
    //    mutated row as no-longer-unsatisfied.
    const schemaResult = SpecRootNoteSchema.safeParse(mutated);
    expect(schemaResult.success).toBe(true);

    const claimResult = validateSpecDoneClaim(mutated);
    // The fixture also has an artifact_status section with 4 unchecked
    // items, so the SPEC-done claim still FAILs overall — but the flipped
    // success_criteria item must no longer appear in the unsatisfied list.
    expect(claimResult.verdict).toBe("FAIL");
    if (claimResult.verdict === "FAIL") {
      const flippedItem = beforeSc[targetIdx];
      expect(flippedItem).toBeDefined();
      const unsatisfiedTexts = claimResult.unsatisfied.map((u) => u.text);
      expect(unsatisfiedTexts).not.toContain(flippedItem?.text ?? "<missing>");
    }

    // 4. render — emit markdown, re-parse, confirm semantic equality.
    const rendered = renderSpecRootNote(mutated);
    const reparsed = parseSpecRootNote(rendered);
    expect(reparsed).toEqual(mutated);
  });
});

describe("Integration: TASK parse → mutate → validate → render pipeline", () => {
  test("flip-checkbox dod mutation round-trips through parse → validator", async () => {
    // 1. parse
    const md = await loadSharedFixture("task-note-sample.md");
    const parsedBefore = parseTaskNote(md);
    expect(parsedBefore.frontmatter.title).toBe(
      "TASK-005-SPEC-007: Implement TaskNote Schema and Parser",
    );

    // 2. mutate — flip every DoD item to done so validateTaskDoneClaim
    //    returns PASS. applyCheckboxMutation IS the TASK write-path (no
    //    dedicated TASK renderer exists; the mutation re-parses on every
    //    apply so its output is parser-valid markdown by construction).
    const total = parsedBefore.definition_of_done.length;
    expect(total).toBeGreaterThanOrEqual(1);

    let currentMd = md;
    for (let idx = 0; idx < total; idx++) {
      const flip: FlipCheckboxMutation = {
        type: "flip-checkbox",
        target: "dod",
        index: idx,
        done: true,
      };
      currentMd = applyCheckboxMutation(currentMd, flip);
    }

    // 3. validate — every DoD item now [x]; claim validator PASSes.
    const parsedAfter = parseTaskNote(currentMd);
    const claim = validateTaskDoneClaim(parsedAfter);
    expect(claim.verdict).toBe("PASS");
    if (claim.verdict === "PASS") {
      expect(claim.total).toBe(total);
    }

    // 4. render — the mutation output IS the rendered post-state.
    //    Re-parsing yields a model with every DoD done === true.
    expect(parsedAfter.definition_of_done.every((item) => item.done)).toBe(true);
  });

  test("flip-checkbox single item satisfies validator at item-level granularity", async () => {
    const md = await loadSharedFixture("task-note-sample.md");
    const parsedBefore = parseTaskNote(md);
    const total = parsedBefore.definition_of_done.length;

    // Flip ONLY the first DoD item; validator still FAILS overall but the
    // first item is no longer in the unsatisfied list.
    const flip: FlipCheckboxMutation = {
      type: "flip-checkbox",
      target: "dod",
      index: 0,
      done: true,
    };
    const mutatedMd = applyCheckboxMutation(md, flip);
    const parsedAfter = parseTaskNote(mutatedMd);
    const claim = validateTaskDoneClaim(parsedAfter);

    if (total === 1) {
      expect(claim.verdict).toBe("PASS");
    } else {
      expect(claim.verdict).toBe("FAIL");
      if (claim.verdict === "FAIL") {
        expect(claim.unsatisfied.find((u) => u.index === 0)).toBeUndefined();
      }
    }
  });
});
