import { describe, expect, test } from "bun:test";
import { TaskNoteSchema } from "@acmelabs/models/schemas/task-note";
import { extractAndCheckClaim } from "@acmelabs/models/validators/lenient-claim-extract";

/**
 * Unit tests for the hygiene-independent claim extractor (SPEC-008 REQ-011
 * LAYERED-SEVERITY, Event 114). The extractor exists to determine
 * claim-satisfaction WITHOUT the strict schema, so a claim lie is never masked
 * by a co-occurring hygiene defect that fails the base parse before Zod's
 * `superRefine` (the claim arm) runs.
 *
 * The decisive coverage is `superRefine is skipped on base-field failure` — the
 * empirical fact that justifies this whole module (approach b over approach a).
 */

const FIXTURE_DIR = new URL("../../fixtures/", import.meta.url);

async function sample(name: string): Promise<string> {
  return Bun.file(new URL(name, FIXTURE_DIR)).text();
}

function withStatus(content: string, status: string): string {
  return content.replace(/^status:.*$/m, `status: ${status}`);
}

describe("Zod superRefine is skipped when a base-object field fails", () => {
  test("a TASK DONE with unchecked DoD AND a bad observation category emits ONLY the hygiene issue", () => {
    // This is the load-bearing fact: when the base object schema fails (bad
    // category enum), `superRefine` (the DONE-claim arm) never runs, so the
    // ZodError carries the hygiene issue but NOT the "Status DONE requires ..."
    // claim issue. Partitioning the thrown issues (approach a) would therefore
    // mask the lie. This test documents why the lenient extractor exists.
    const model = {
      frontmatter: {
        title: "TASK-001-SPEC-001: Probe",
        type: "task",
        permalink: "specs/spec-001-x/tasks/task-001-spec-001-probe",
        status: "DONE",
        tags: ["task", "spec-001"],
      },
      objective: "Probe superRefine ordering.",
      scope_in: [],
      scope_out: [],
      files_affected: [],
      testing_requirements: [],
      definition_of_done: [{ text: "Do the thing", done: false }],
      observations: [
        { category: "NOT_A_CATEGORY", text: "bad cat", tags: ["x"] },
        { category: "fact", text: "ok", tags: ["x"] },
        { category: "insight", text: "ok2", tags: ["x"] },
      ],
      relations: [
        { verb: "implements", target: "ADR-001: X" },
        { verb: "part_of", target: "SPEC-001: X" },
      ],
    };
    const result = TaskNoteSchema.safeParse(model);
    expect(result.success).toBe(false);
    if (result.success) return;
    const hasClaimIssue = result.error.issues.some((i) =>
      i.message.includes("Status DONE requires"),
    );
    const hasHygieneIssue = result.error.issues.some((i) =>
      i.path.join(".").startsWith("observations"),
    );
    expect(hasHygieneIssue).toBe(true);
    expect(hasClaimIssue).toBe(false); // ← the trap approach (a) would fall into
  });
});

describe("extractAndCheckClaim — claim-pass / claim-fail per type", () => {
  test("task DONE + all DoD checked → claim-pass", async () => {
    const md = withStatus(await sample("task-note-sample.md"), "DONE").replace(/- \[ \]/g, "- [x]");
    expect(extractAndCheckClaim("task", "DONE", md).kind).toBe("claim-pass");
  });

  test("task DONE + unchecked DoD → claim-fail", async () => {
    const md = withStatus(await sample("task-note-sample.md"), "DONE");
    const out = extractAndCheckClaim("task", "DONE", md);
    expect(out.kind).toBe("claim-fail");
    if (out.kind === "claim-fail") expect(out.failing.length).toBeGreaterThan(0);
  });

  test("task non-terminal status → claim-pass (gate dormant)", async () => {
    const md = await sample("task-note-sample.md"); // IN_PROGRESS
    expect(extractAndCheckClaim("task", "IN_PROGRESS", md).kind).toBe("claim-pass");
  });

  test("requirement ACCEPTED + unchecked AC → claim-fail", async () => {
    const md = withStatus(await sample("requirement-note-sample.md"), "ACCEPTED");
    expect(extractAndCheckClaim("requirement", "ACCEPTED", md).kind).toBe("claim-fail");
  });

  test("design ACCEPTED + unchecked compliance → claim-fail", async () => {
    const md = withStatus(await sample("design-note-sample.md"), "ACCEPTED");
    // The design sample carries a compliance section with unchecked items.
    expect(extractAndCheckClaim("design", "ACCEPTED", md).kind).toBe("claim-fail");
  });

  test("spec DONE + unchecked success criteria → claim-fail", async () => {
    const md = withStatus(await sample("spec-root-note-sample.md"), "DONE");
    expect(extractAndCheckClaim("spec", "DONE", md).kind).toBe("claim-fail");
  });

  test("spec with all [x]/[~] success+artifact rows → claim-pass (honours [~] marker)", async () => {
    const md = withStatus(await sample("spec-root-with-deferred.md"), "DONE");
    expect(extractAndCheckClaim("spec", "DONE", md).kind).toBe("claim-pass");
  });
});

describe("extractAndCheckClaim — CRITICAL hygiene independence", () => {
  test("claim-lie + bad observation category → claim-fail (hygiene does not mask the lie)", async () => {
    // Inject a bad category into the DONE+unchecked-DoD task. The strict schema
    // would fail on the category before superRefine runs, but the lenient
    // extractor reads only the DoD and still reports claim-fail.
    const base = withStatus(await sample("task-note-sample.md"), "DONE");
    const withBadCategory = base.replace(
      "## Observations",
      "## Observations\n\n- [NOT_A_CATEGORY] hygiene defect that suppresses superRefine #trap",
    );
    const out = extractAndCheckClaim("task", "DONE", withBadCategory);
    expect(out.kind).toBe("claim-fail");
  });

  test("claim satisfied + bad observation category → claim-pass (only hygiene remains)", async () => {
    const base = withStatus(await sample("task-note-sample.md"), "DONE").replace(
      /- \[ \]/g,
      "- [x]",
    );
    const withBadCategory = base.replace(
      "## Observations",
      "## Observations\n\n- [NOT_A_CATEGORY] hygiene defect #trap",
    );
    expect(extractAndCheckClaim("task", "DONE", withBadCategory).kind).toBe("claim-pass");
  });
});
