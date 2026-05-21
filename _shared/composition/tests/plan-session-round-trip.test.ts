import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { sha256 } from "../src/core/hash.js";
import { applyPlanMutation } from "../src/mutations/plan-mutations.js";
import { applySessionMutation } from "../src/mutations/session-mutations.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";
import { parseSessionNote } from "../src/parsers/session-note.js";
import { renderPlanNote } from "../src/renderers/plan-note.js";
import { renderSessionNote } from "../src/renderers/session-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

describe("Plan/Session render round-trip property test (ADR-003 D-8 gate)", () => {
  test("THE PROOF — Plan: SHA-256(render(parse(fixture))) === SHA-256(fixture)", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const parsed = parsePlanNote(md);
    const rendered = renderPlanNote(parsed);
    expect(sha256(rendered)).toBe(sha256(md));
  });

  test("THE PROOF — Session: SHA-256(render(parse(fixture))) === SHA-256(fixture)", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const parsed = parseSessionNote(md);
    const rendered = renderSessionNote(parsed);
    expect(sha256(rendered)).toBe(sha256(md));
  });

  test("Plan mutation round-trip: applyPlanMutation output re-parses cleanly", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const mutated = applyPlanMutation(md, {
      type: "set-part-substatus",
      partId: "build.SPEC-007",
      from: "IN_PROGRESS",
      to: "DONE",
      completing_session: "SESSION-2026-05-20_04",
      outcome: "[[SPEC-007: Sample]]",
    });
    // Idempotence: re-rendering the parsed result gives the same hash.
    const reparsed = parsePlanNote(mutated);
    const rerendered = renderPlanNote(reparsed);
    expect(sha256(rerendered)).toBe(sha256(mutated));
  });

  test("Session mutation round-trip: append-event preserves continuity hash", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const mutated = applySessionMutation(md, {
      type: "append-event",
      event: {
        type: "state-change",
        title: "Wave 2 close",
        scope: "plan",
        target: "PLAN-001",
      },
    });
    const reparsed = parseSessionNote(mutated);
    const rerendered = renderSessionNote(reparsed);
    expect(sha256(rerendered)).toBe(sha256(mutated));
  });
});
