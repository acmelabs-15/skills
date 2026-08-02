/**
 * The integrity floor, enforced by the CLI rather than only by a unit test.
 *
 * `validateIntegrityFloor` shipped fully built with three invocations, all inside one
 * test file, while `schemas/base.ts` advertised it as live — "runtime validates <=50%
 * of source lines" — and capped only the section COUNT at 10.
 *
 * So a distribution plan declaring 10 regenerated sections covering 90% of a note
 * passed every gate, after which the SHA-256 round trip trivially succeeded because
 * almost nothing was left to mutate. A gate that certifies its own bypass, and the
 * reason the count cap is not a substitute: ten sections can cover any proportion of a
 * document, and the proportion is what matters.
 *
 * Why regenerated content is dangerous at all: it is EXCLUDED from hash validation, on
 * the grounds that a derived view is recomputed rather than preserved. That is correct
 * for a small rollup and meaningless for a majority of the file — a
 * majority-regenerated cluster proves nothing about what survived.
 *
 * These tests exercise the CLI, not the validator. The validator's own arithmetic is
 * covered in `packages/core/__tests__/plan-integrity-floor.test.ts`; what was missing
 * was any proof that a real decompose run consults it.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeDistributionPlan, loadPlanYaml } from "@acmelabs/cli/decompose";
import { DistributionPlanSchema } from "@acmelabs/core/schemas/plan-yaml";

/**
 * A note whose `## Progress Dashboard` is the clear majority of its lines.
 *
 * Deliberately lopsided: the dashboard runs long and everything else is short, so
 * declaring it regenerated puts coverage well past half and the breach is unambiguous
 * rather than sitting on the boundary.
 */
const LOPSIDED = `# PLAN-001: Lopsided

## Scope

One line of real content.

## Progress Dashboard

${Array.from({ length: 40 }, (_, i) => `| row ${i + 1} | PENDING | 0 | 0 |`).join("\n")}

## Blockers

(none)
`;

/** The same note with a dashboard small enough to sit under the floor. */
const BALANCED = `# PLAN-001: Balanced

## Scope

${Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1} of preserved content.`).join("\n\n")}

## Progress Dashboard

| row 1 | PENDING | 0 | 0 |

## Blockers

(none)
`;

describe("decompose enforces the integrity floor", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "decompose-floor-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  /** Write a source note plus a one-cluster plan that regenerates `sections`. */
  const setup = async (
    source: string,
    sections: readonly string[],
  ): Promise<{ planPath: string; plan: ReturnType<typeof DistributionPlanSchema.parse> }> => {
    const sourceRel = "PLAN-001-source.md";
    await Bun.write(join(root, sourceRel), source);
    const planPath = join(root, "plan.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: distribution",
        "source_type: plan",
        `source_path: ${sourceRel}`,
        "renumber_map:",
        '  "SPEC-001": "SPEC-100"',
        "clusters:",
        "  whole:",
        "    range:",
        '      start: "1"',
        '      end: "-1"',
        "    destination_path: PLAN-001-out.md",
        // Omit the key entirely when there is nothing to declare: an empty YAML
        // sequence parses as null, not as [], and the schema rejects it.
        ...(sections.length > 0
          ? ["    regenerated_sections:", ...sections.map((s) => `      - ${s}`)]
          : []),
      ].join("\n"),
    );
    const plan = DistributionPlanSchema.parse(await loadPlanYaml(planPath));
    return { planPath, plan };
  };

  test("a majority-regenerated cluster is REJECTED", async () => {
    // The bypass, closed. Under the old behaviour this reached staging and passed,
    // because the hash it then compared covered almost nothing.
    const { planPath, plan } = await setup(LOPSIDED, ["Progress Dashboard"]);
    await expect(executeDistributionPlan(plan, planPath, root)).rejects.toThrow(
      /breaches the integrity floor/,
    );
  });

  test("the rejection names the cluster and the coverage it measured", async () => {
    // A bare failure is not actionable — the caller has to know which cluster and by
    // how much, since the fix is to narrow the declaration rather than to retry.
    const { planPath, plan } = await setup(LOPSIDED, ["Progress Dashboard"]);
    await expect(executeDistributionPlan(plan, planPath, root)).rejects.toThrow(
      /cluster "whole".*%/s,
    );
  });

  test("nothing is written when the floor is breached", async () => {
    // Exit code 2 means nothing was renamed. A partially-written split is worse than a
    // refused one, because the source no longer matches any single state.
    const { planPath, plan } = await setup(LOPSIDED, ["Progress Dashboard"]);
    await expect(executeDistributionPlan(plan, planPath, root)).rejects.toThrow();
    expect(await Bun.file(join(root, "PLAN-001-out.md")).exists()).toBe(false);
  });

  test("a small regenerated section passes", async () => {
    // The floor exists to catch a majority, not to ban regeneration. A one-row
    // dashboard is exactly what the carve-out is for.
    const { planPath, plan } = await setup(BALANCED, ["Progress Dashboard"]);
    const audit = await executeDistributionPlan(plan, planPath, root);
    expect(audit.length).toBeGreaterThan(0);
    expect(await Bun.file(join(root, "PLAN-001-out.md")).exists()).toBe(true);
  });

  test("a cluster declaring no regenerated sections is unaffected", async () => {
    // No declaration means nothing is excluded from the hash, so there is no coverage
    // question to answer and the check must not invent one.
    const { planPath, plan } = await setup(LOPSIDED, []);
    const audit = await executeDistributionPlan(plan, planPath, root);
    expect(audit.length).toBeGreaterThan(0);
  });
});
