import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { type AdversarialCase, testAdversarial } from "./_helpers/adversarial.js";

/**
 * Table-driven adversarial-claims runner (TASK-023-SPEC-008).
 *
 * One row per fixture authored by TASK-022 (Audit E top-10 across the five
 * existing claim validators). Each row points at a `drift-NN-<slug>.md` fixture
 * encoding an agent-lying scenario; `testAdversarial` parses it, runs the
 * matching validator, and asserts the rejection text matches `expectedReject`.
 *
 * Adding a new scenario is exactly two file operations (REQ-006 AC-6): drop one
 * fixture under `tests/fixtures/adversarial/<type>/` and add one row here. The
 * COVERAGE block below enforces both halves of that contract — every on-disk
 * fixture must appear as a row (no orphans) and every row's `fixture` path must
 * resolve to an on-disk file (no broken pointers).
 *
 * Each `expectedReject` regex anchors on the SPECIFIC text the matching
 * validator emits for that scenario, never a loose `/error/`. For the task /
 * requirement / design / spec validators the emitted `unsatisfied[].text` is the
 * verbatim checkbox-item text from the fixture; for the qa validator it
 * is the structured `verdict mismatch: declared <X> vs derived <Y>` message. The
 * anchor for each row matches the `expected-reject:` value the fixture author
 * encoded in that fixture's `drift-marker` HTML comment.
 */

/** Composition-root-relative directory holding the adversarial fixture tree. */
const ADVERSARIAL_DIR = join("tests", "fixtures", "adversarial");

const cases: AdversarialCase[] = [
  // --- task validator (validateTaskDoneClaim) ---
  {
    fixture: join(ADVERSARIAL_DIR, "task", "drift-01-all-deferred-bypass.md"),
    validator: "task",
    // All five DoD items fake an empty "(deferred:)" suffix → all unsatisfied.
    expectedReject: /TaskNoteSchema exported with strict objects/,
  },
  {
    fixture: join(ADVERSARIAL_DIR, "task", "drift-02-checkbox-flip-without-evidence.md"),
    validator: "task",
    // The single evidence-bearing DoD item ("cited commit SHA") stays unchecked.
    expectedReject: /commit SHA/,
  },
  {
    fixture: join(ADVERSARIAL_DIR, "task", "drift-03-dod-partial-flip-bypass.md"),
    validator: "task",
    // Two DoD items unchecked; one names the tsc gate.
    expectedReject: /tsc --noEmit passes/,
  },

  // --- requirement validator (validateRequirementAcClaim) ---
  {
    fixture: join(ADVERSARIAL_DIR, "requirement", "drift-01-ac-flip-without-evidence.md"),
    validator: "requirement",
    // The AC bullet demanding an "**Evidence**" line is left unchecked.
    expectedReject: /Evidence/,
  },
  {
    fixture: join(ADVERSARIAL_DIR, "requirement", "drift-02-ac-text-only-flip.md"),
    validator: "requirement",
    // The first unsatisfied AC names the file-changed observability event.
    expectedReject: /file-changed observability event/,
  },

  // --- design validator (validateDesignComplianceClaim) ---
  {
    fixture: join(ADVERSARIAL_DIR, "design", "drift-01-design-compliance-flip-without-evidence.md"),
    validator: "design",
    // The unchecked compliance item is the ADR-005 D-1 evidence row.
    expectedReject: /Honors ADR-005 D-1/,
  },
  {
    fixture: join(ADVERSARIAL_DIR, "design", "drift-02-compliance-silent-unchecked.md"),
    validator: "design",
    // Every compliance row is unchecked; the first is the ADR-005 D-3 row.
    expectedReject: /Honors ADR-005 D-3/,
  },

  // --- spec validator (validateSpecDoneClaim) ---
  {
    fixture: join(
      ADVERSARIAL_DIR,
      "spec",
      "drift-01-spec-done-with-all-deferred-success-criteria.md",
    ),
    validator: "spec",
    // All Success Criteria fake an empty "(deferred:)" → first names the schema row.
    expectedReject: /Schema rejects mismatched verdict declarations/,
  },
  {
    fixture: join(ADVERSARIAL_DIR, "spec", "drift-02-artifact-status-unchecked.md"),
    validator: "spec",
    // Success Criteria all checked; the unchecked Artifact Status Design row fails.
    expectedReject: /DESIGN-001-SPEC-092: Coverage Design/,
  },

  // --- qa validator (validateQaPassClaim) ---
  {
    fixture: join(ADVERSARIAL_DIR, "qa", "drift-01-qa-all-deferred-verdict.md"),
    validator: "qa",
    // Declared PASS, but skipped>0 → derived PARTIAL → verdict-mismatch message.
    expectedReject: /verdict mismatch: declared PASS vs derived PARTIAL/,
  },

  // --- epic validator (validateEpicDoneClaim) — CROSS-NOTE (Track 1, TASK-024) ---
  {
    fixture: join(ADVERSARIAL_DIR, "epic", "drift-01-done-with-unfinished-contained-spec.md"),
    validator: "epic",
    // EPIC DONE but a `contains` SPEC resolves (via the harness SpecResolver) to
    // a non-DONE status; the cross-note check names the unfinished child SPEC.
    // This lie passes EpicNoteSchema.parse() (the schema only gates the
    // structural Contained-Specs-section invariant, not child-SPEC status), so
    // only the resolver-driven validator rejects it.
    expectedReject: /SPEC-099: Unfinished Child Spec/,
  },
];

/** Strip directory + `.md` extension to a greppable label (the fixture stem). */
function labelFor(fixture: string): string {
  const base = fixture.split("/").pop() ?? fixture;
  return base.replace(/\.md$/, "");
}

for (const c of cases) {
  testAdversarial(labelFor(c.fixture), c);
}

// --- COVERAGE: no orphan fixtures, no broken table-row pointers ---

const COMPOSITION_ROOT = join(import.meta.dir, "..");

/** Resolve a composition-root-relative fixture path to an absolute path. */
function resolveFixture(fixture: string): string {
  return isAbsolute(fixture) ? fixture : join(COMPOSITION_ROOT, fixture);
}

/** Walk `tests/fixtures/adversarial/<type>/` and collect every `.md` fixture. */
async function listOnDiskFixtures(): Promise<string[]> {
  const root = join(COMPOSITION_ROOT, ADVERSARIAL_DIR);
  const types = await readdir(root, { withFileTypes: true });
  const found: string[] = [];
  for (const type of types) {
    if (!type.isDirectory()) continue;
    const files = await readdir(join(root, type.name));
    for (const file of files) {
      if (file.endsWith(".md")) {
        found.push(join(ADVERSARIAL_DIR, type.name, file));
      }
    }
  }
  return found.sort();
}

test("coverage: every on-disk adversarial fixture appears as a cases row", async () => {
  const onDisk = await listOnDiskFixtures();
  const referenced = new Set(cases.map((c) => c.fixture));
  const orphans = onDisk.filter((f) => !referenced.has(f));
  expect(orphans).toEqual([]);
});

test("coverage: every cases row points at an on-disk fixture", async () => {
  const broken: string[] = [];
  for (const c of cases) {
    if (!(await Bun.file(resolveFixture(c.fixture)).exists())) {
      broken.push(c.fixture);
    }
  }
  expect(broken).toEqual([]);
});

test("coverage: the table covers all ten Audit E top-10 scenarios", () => {
  expect(cases.length).toBeGreaterThanOrEqual(10);
});
