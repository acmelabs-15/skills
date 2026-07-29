/**
 * Round-trip preservation for plan notes authored in the phase-H2 shape.
 *
 * The gap this closes: every round-trip test in the repo ran against a note
 * already in the renderer's own shape, so none of them could catch the renderer
 * deleting a section it did not model. Meanwhile the parser read nine named H2s
 * and discarded the rest before validation, and the renderer rebuilt the document
 * from that model alone — so a successful render silently dropped `## Risks`,
 * `## Workflow Plan`, `## Decision Log`, `## Progress Log` and every phase heading.
 * That was masked only because parsing failed on all seven real notes; fixing the
 * parser first would have converted a no-op into silent deletion of real work.
 *
 * These fixtures are therefore deliberately in the shape those notes use: parts
 * under phase H2s, `## Phase Progression` as a short summary table rather than a
 * container, and the unmodelled sections present. They are synthetic — the real
 * notes live outside this repo and cannot be test inputs — but structurally
 * faithful to what they do, including the `## Risks (pre-mortem)` heading variant
 * that an exact-match section list would miss.
 *
 * Companion to plan-001-migration.test.ts, which covers the renderer's own shape.
 * That one proves byte-identity for a note with nothing to preserve; this one
 * proves it for a note that is mostly things to preserve.
 */
import { describe, expect, test } from "bun:test";
import { sha256 } from "@acmelabs/core/core/hash";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";

/**
 * A plan note carrying seven unmodelled sections, in the renderer's canonical
 * form so byte-identity is a meaningful assertion.
 *
 * Canonical means the modelled parts of this fixture are spelled exactly as the
 * renderer spells them — double-quoted title, every part field present including
 * the `(none)` placeholders, the three empty Tasks sub-tables. That is deliberate:
 * an identity assertion against non-canonical modelled content fails for reasons
 * that have nothing to do with preservation, which is noise in a test whose whole
 * subject is preservation. Verified a fixed point — rendering twice returns the
 * same bytes.
 */
const PHASE_H2_SHAPE = `---
title: "PLAN-009: Phase H2 Shape"
type: plan
status: IN_PROGRESS
complexity_tier: TIER_3
branches:
  - feat/phase-h2-shape
permalink: planning/plan-009-phase-h2-shape
tags:
  - plan
  - fixture
---

# PLAN-009: Phase H2 Shape

## Scope

A plan authored the way the real notes are authored, for preservation testing.

## Objectives

- [ ] O-1 Prove unmodelled sections survive a round trip

## First-Principles (create-mode forcing questions)

Why does this work exist at all? Because the parser used to answer that question
by deleting it.

## Workflow Plan

Phases run research then decisions then spec then build. This is protocol prose:
it describes how work happens, not what state the work is in.

## Phase Progression

### research

- **Phase**: research
- **Title**: Bootstrap
- **Substatus**: DONE
- **Owning Session**: SESSION-2026-07-29_01
- **Outcome**: ANALYSIS-001 authored
- **Source Artifacts**: (none)
- **Depends On**: (none)

**DoD**:

- (none)

## Decision Log

- 2026-07-29 — locked the preservation approach.

## Progress Log

- Event 01 — opened the plan.

## Risks (pre-mortem)

### R1 — A renderer that rebuilds what it does not understand

Mitigation: carry unmodelled sections verbatim and prove it with a hash.

## Open Parallel Threads (DO NOT FORGET)

- The heading variant above must not be matched by an exact-name list.

## Build

### build.SPEC-001 — narrative notes

Phase-heading sections like this one are where the real notes keep their parts.
Until the parser reads parts from here, the section is unmodelled — and being
unmodelled is exactly why it must survive verbatim.

## Tasks

### Active

(none)

### Archive

(none)

## Pending User Decisions

(none)

## Editor Mirror IDs

(none)

## Blockers

(none)

## Observations

- [fact] Parts live under phase H2s in this shape #plan #shape
- [constraint] Unmodelled sections must survive byte-identical #preservation
- [insight] Heading variants defeat exact-match section lists #parsing

## Relations

- part_of [[SPEC-007: Plan/Session Render]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
`;

describe("plan note round trip preserves unmodelled sections", () => {
  test("parses a phase-H2-shaped note without error", () => {
    const parsed = parsePlanNote(PHASE_H2_SHAPE);
    expect(parsed.frontmatter.title).toBe("PLAN-009: Phase H2 Shape");
  });

  test("captures every unmodelled section, including the heading variant", () => {
    const parsed = parsePlanNote(PHASE_H2_SHAPE);
    const headings = (parsed.unmodelled_sections ?? []).map((s) => s.heading);
    expect(headings).toEqual([
      "First-Principles (create-mode forcing questions)",
      "Workflow Plan",
      "Decision Log",
      "Progress Log",
      "Risks (pre-mortem)",
      "Open Parallel Threads (DO NOT FORGET)",
      "Build",
      // `Editor Mirror IDs` became unmodelled when that field was removed, so it is
      // now PRESERVED rather than generated — a note carrying one keeps it, and
      // nothing writes a new one. That is the intended landing: the field recorded
      // an editor task-list sync that was never built, but deleting text a human
      // wrote is a separate act from deleting a model field.
      "Editor Mirror IDs",
    ]);
  });

  test("SHA-256 round-trip identity holds", () => {
    const rendered = renderPlanNote(parsePlanNote(PHASE_H2_SHAPE));
    expect(sha256(rendered)).toBe(sha256(PHASE_H2_SHAPE));
  });

  test("every unmodelled section survives with its body intact", () => {
    const rendered = renderPlanNote(parsePlanNote(PHASE_H2_SHAPE));
    // Headings alone would pass on an empty section; assert body content too.
    expect(rendered).toMatch(/^## Risks \(pre-mortem\)$/m);
    expect(rendered).toMatch(/### R1 — A renderer that rebuilds what it does not understand/);
    expect(rendered).toMatch(/^## Workflow Plan$/m);
    expect(rendered).toMatch(/it describes how work happens/);
    expect(rendered).toMatch(/^## Build$/m);
    expect(rendered).toMatch(/being\nunmodelled is exactly why it must survive verbatim/);
  });

  test("document order is preserved, not appended", () => {
    const rendered = renderPlanNote(parsePlanNote(PHASE_H2_SHAPE));
    const order = rendered
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3));
    // Regression guard: an implementation that appends preserved sections rather
    // than re-inserting them at their recorded index passes every assertion above
    // and fails this one.
    expect(order.indexOf("Workflow Plan")).toBeLessThan(order.indexOf("Phase Progression"));
    expect(order.indexOf("Risks (pre-mortem)")).toBeLessThan(order.indexOf("Build"));
    expect(order.indexOf("Build")).toBeLessThan(order.indexOf("Observations"));
    expect(order[order.length - 1]).toBe("Relations");
  });
});
