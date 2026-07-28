import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPlanMarkdown, renderPlanNoteCli } from "../render-plan-note.ts";

/**
 * Round-trippable PLAN fixture authored from the canonical renderer output
 * shape (shared/composition/src/renderers/plan-note.ts) so it parses and
 * re-renders without drift. A spec-phase part in IN_PROGRESS keeps the fixture
 * free of build_workflow_items (which build.SPEC-NNN parts would require).
 */
function planFixture(): string {
  return [
    "---",
    'title: "PLAN-001: Render Fixture"',
    "type: plan",
    "status: IN_PROGRESS",
    "complexity_tier: TIER_3",
    "branches:",
    "  - feat/plan-001-render",
    "permalink: planning/plan-001-render",
    "tags:",
    "  - plan",
    "  - fixture",
    "  - render",
    "---",
    "",
    "# PLAN-001: Render Fixture",
    "",
    "## Scope",
    "",
    "Fixture exercising the render-plan-note CLI.",
    "",
    "## Objectives",
    "",
    "- [ ] Render the PLAN deterministically",
    "",
    "## Phase Progression",
    "",
    "### research",
    "",
    "- **Phase**: research",
    "- **Title**: Research",
    "- **Substatus**: DONE",
    "- **Completing Session**: SESSION-2026-05-23_01",
    "- **Outcome**: [[ANALYSIS-001: Sample]]",
    "- **Source Artifacts**: (none)",
    "- **Depends On**: (none)",
    "",
    "**DoD**:",
    "",
    "- [x] Findings captured",
    "",
    "### spec.SPEC-001",
    "",
    "- **Phase**: spec",
    "- **Title**: Author SPEC-001",
    "- **Substatus**: IN_PROGRESS",
    "- **Owning Session**: SESSION-2026-05-23_01",
    "- **Source Artifacts**: [[ADR-001: Sample]]",
    "- **Depends On**: research",
    "",
    "**DoD**:",
    "",
    "- [ ] SPEC ACCEPTED",
    "",
    "## Tasks",
    "",
    "### Active",
    "",
    "(none)",
    "",
    "### Backlog",
    "",
    "(none)",
    "",
    "### Archive",
    "",
    "(none)",
    "",
    "## Pending User Decisions",
    "",
    "(none)",
    "",
    "## Editor Mirror IDs",
    "",
    "(none)",
    "",
    "## Blockers",
    "",
    "(none)",
    "",
    "## Observations",
    "",
    "- [decision] Markdown is authoritative state #adr-003 #render",
    "- [fact] Determinism gated by double-render equality #proof",
    "- [constraint] No timestamps in rendered output #invariant",
    "",
    "## Relations",
    "",
    "- implements [[ADR-005: Per-Skill Scripts]]",
    "- depends_on [[ANALYSIS-002: Sample]]",
    "",
  ].join("\n");
}

describe("renderPlanMarkdown (determinism)", () => {
  test("rendering the same PLAN twice produces byte-identical output", () => {
    const first = renderPlanMarkdown(planFixture());
    const second = renderPlanMarkdown(planFixture());
    expect(second).toBe(first);
  });

  test("render is a fixed point: rendering canonical output again is byte-identical", () => {
    const once = renderPlanMarkdown(planFixture());
    const twice = renderPlanMarkdown(once);
    expect(twice).toBe(once);
  });

  test("throws on unparseable markdown (caller maps to exit 1)", () => {
    expect(() => renderPlanMarkdown("not a plan note")).toThrow();
  });
});

describe("renderPlanNoteCli", () => {
  let projectRoot: string;
  let planPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "render-plan-"));
    planPath = join(projectRoot, "docs", "planning", "PLAN-001-fixture.md");
    await Bun.write(planPath, planFixture());
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  test("exit 0; written output is byte-identical on a second run (determinism on disk)", async () => {
    const first = await renderPlanNoteCli(["--plan-path", planPath, "--project-root", projectRoot]);
    expect(first).toBe(0);
    const afterFirst = await Bun.file(planPath).text();

    const second = await renderPlanNoteCli([
      "--plan-path",
      planPath,
      "--project-root",
      projectRoot,
    ]);
    expect(second).toBe(0);
    const afterSecond = await Bun.file(planPath).text();

    expect(afterSecond).toBe(afterFirst);
  });

  test("re-rendering already-canonical markdown is a no-op (exit 0, no change)", async () => {
    // First render canonicalizes; capture it, then render again.
    await renderPlanNoteCli(["--plan-path", planPath, "--project-root", projectRoot]);
    const canonical = await Bun.file(planPath).text();

    const code = await renderPlanNoteCli(["--plan-path", planPath, "--project-root", projectRoot]);
    expect(code).toBe(0);
    expect(await Bun.file(planPath).text()).toBe(canonical);
  });

  test("exit 2 on missing required flag", async () => {
    const code = await renderPlanNoteCli(["--project-root", projectRoot]);
    expect(code).toBe(2);
  });

  test("exit 2 on unknown flag", async () => {
    const code = await renderPlanNoteCli(["--plan-path", planPath, "--bogus", "x"]);
    expect(code).toBe(2);
  });

  test("exit 2 on path-containment violation (plan outside project root)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "render-plan-outside-"));
    try {
      const code = await renderPlanNoteCli([
        "--plan-path",
        join(outside, "PLAN-001-evil.md"),
        "--project-root",
        projectRoot,
      ]);
      expect(code).toBe(2);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("exit 2 on traversal path that escapes project root", async () => {
    const code = await renderPlanNoteCli([
      "--plan-path",
      join(projectRoot, "..", "escape.md"),
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 when the plan file does not exist", async () => {
    const code = await renderPlanNoteCli([
      "--plan-path",
      join(projectRoot, "docs", "planning", "PLAN-999-missing.md"),
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 1 on render failure (unparseable PLAN content)", async () => {
    await Bun.write(planPath, "garbage that is not a plan note");
    const code = await renderPlanNoteCli(["--plan-path", planPath, "--project-root", projectRoot]);
    expect(code).toBe(1);
  });
});
