import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseQaNote } from "../src/parsers/qa-note.js";
import {
  QA_PARENTED_TITLE_RE,
  QA_UNPARENTED_TITLE_RE,
  QaFrontmatterSchema,
  QaNoteSchema,
} from "../src/schemas/qa-note.js";

/**
 * The defect this covers: `QaNoteSchema` required a `QA-NNN-SPEC-NNN` parented
 * title, so a QA report on work with no governing SPEC — registry-task and tooling
 * validation — was rejected by its own parser. QA-092 is exactly that note.
 *
 * Two fixtures, and the split is the point. `qa-092-...md` is a VERBATIM byte copy of
 * `docs/qa/QA-092-...md`, used to prove the real note's real identity fields now
 * validate. `qa-note-sample.md` is the pre-existing known-good PARENTED note, used as
 * the control for the disjointness cases: swapping only its title and permalink
 * isolates the variable to the two fields this change governs, instead of testing a
 * hand-built body that no parser ever produced.
 *
 * The copy is hermetic on purpose. A test reading a live knowledge-graph note fails
 * the day someone edits it, reporting a schema regression that never happened. The
 * cost of that choice is drift in the other direction — the fixture has to be
 * re-copied when the note legitimately changes, and it went stale once already before
 * the note gained its `status` field and parseable Approach labels.
 *
 * HISTORY, because the assertions below read oddly without it. This file originally
 * PINNED two further defects in the note itself: missing `status` frontmatter, and an
 * `## Approach` section that yielded no test_types, environment or data_strategy. Both
 * are now closed in the live note, so those assertions are INVERTED rather than
 * deleted — they now guard against the note regressing back to unparseable, which is
 * the more useful direction for a fixture that must stay in sync with a live note.
 */
const QA_092 = join(import.meta.dir, "fixtures", "qa-092-unparented-build-validation.md");
const CONTROL = join(import.meta.dir, "fixtures", "qa-note-sample.md");

const QA_092_TITLE = "QA-092: Pipeline Completion Build Validation";
const QA_092_PERMALINK = "qa/qa-092-pipeline-completion-build-validation";

describe("the real QA-092 note's identity fields", () => {
  test("its title and permalink are the unparented form, and not the parented one", async () => {
    const content = await Bun.file(QA_092).text();
    expect(content).toContain(`title: "${QA_092_TITLE}"`);
    expect(content).toContain(`permalink: ${QA_092_PERMALINK}`);
    expect(QA_UNPARENTED_TITLE_RE.test(QA_092_TITLE)).toBe(true);
    expect(QA_PARENTED_TITLE_RE.test(QA_092_TITLE)).toBe(false);
  });

  /**
   * The precise unit this change governs: the real note's own title, permalink, type
   * and tags now satisfy the frontmatter contract. Before the extension this exact
   * object was rejected on its title.
   */
  test("its frontmatter validates, which it did not before the extension", () => {
    const frontmatter = {
      title: QA_092_TITLE,
      type: "qa",
      permalink: QA_092_PERMALINK,
      status: "DONE",
      tags: ["qa", "composition-tooling", "repoint-executor", "brain-search", "validation"],
    };
    const result = QaFrontmatterSchema.safeParse(frontmatter);
    expect(result.success, JSON.stringify(result.error?.issues ?? [], null, 1)).toBe(true);
  });

  /**
   * INVERTED from a pinned-defect assertion. This test used to assert the note was
   * unparseable for two reasons unrelated to the title form — missing `status`
   * frontmatter and an `## Approach` section yielding no test_types, environment or
   * data_strategy. Both are closed in the live note, so the assertion now runs the
   * other way and guards against regression.
   *
   * Kept as a distinct test from the schema check below because it isolates the two
   * fields that were specifically broken: a future edit that drops `status` again, or
   * flattens the Approach labels, fails HERE with a named cause rather than as an
   * anonymous parse error.
   */
  test("the two formerly-missing pieces are present and parse", async () => {
    const content = await Bun.file(QA_092).text();
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(content)?.[1] ?? "";
    expect(frontmatter).toContain("status: DONE");

    const parsed = parseQaNote(content);
    expect(parsed.approach.test_types.length).toBeGreaterThan(0);
    expect(parsed.approach.environment.length).toBeGreaterThan(0);
    expect(parsed.approach.data_strategy.length).toBeGreaterThan(0);
  });

  /**
   * The end-to-end proof, and no patching. The fixture is byte-identical to the live
   * note, so this parses and validates exactly what is on disk in the graph.
   */
  test("the real note parses and satisfies the schema as written", async () => {
    const parsed = parseQaNote(await Bun.file(QA_092).text());
    expect(parsed.frontmatter.title).toBe(QA_092_TITLE);
    expect(parsed.frontmatter.permalink).toBe(QA_092_PERMALINK);
    expect(parsed.frontmatter.type).toBe("qa");
    expect(parsed.frontmatter.status).toBe("DONE");

    const result = QaNoteSchema.safeParse(parsed);
    expect(result.success, JSON.stringify(result.error?.issues ?? [], null, 1)).toBe(true);
  });

  /**
   * The fixture is documented as a byte copy, and it silently went stale once. Pinning
   * the byte length turns the next drift into a named failure here rather than a
   * confusing parse error somewhere downstream.
   */
  test("the fixture is the size the live note is, so drift is caught not absorbed", async () => {
    expect((await Bun.file(QA_092).arrayBuffer()).byteLength).toBe(23535);
  });

  test("its summary arithmetic gates, exactly as for a parented note", async () => {
    const parsed = parseQaNote(await Bun.file(QA_092).text());
    const { tests_run, passed, failed, skipped } = parsed.summary;
    expect(tests_run).toBe(passed + failed + skipped);
    const broken = { ...parsed, summary: { ...parsed.summary, tests_run: tests_run + 1 } };
    expect(QaNoteSchema.safeParse(broken).success).toBe(false);
  });
});

describe("the two QA forms stay disjoint", () => {
  /** The known-good parented note with only its identity fields swapped. */
  async function variant(title: string, permalink: string) {
    const parsed = parseQaNote(await Bun.file(CONTROL).text());
    return { ...parsed, frontmatter: { ...parsed.frontmatter, title, permalink } };
  }

  test("the control fixture is a valid parented note to begin with", async () => {
    const parsed = parseQaNote(await Bun.file(CONTROL).text());
    expect(QaNoteSchema.safeParse(parsed).success).toBe(true);
    expect(QA_PARENTED_TITLE_RE.test(parsed.frontmatter.title)).toBe(true);
  });

  test("the parented form still validates unchanged", async () => {
    const note = await variant("QA-040-SPEC-006: Parented Report", "qa/qa-040-spec-006-parented");
    expect(QaNoteSchema.safeParse(note).success).toBe(true);
  });

  test("the unparented form validates", async () => {
    const note = await variant(QA_092_TITLE, QA_092_PERMALINK);
    const result = QaNoteSchema.safeParse(note);
    expect(result.success, JSON.stringify(result.error?.issues ?? [], null, 1)).toBe(true);
  });

  /**
   * The weakening this extension must not introduce. Without the permalink's negative
   * lookahead a parented permalink also satisfies the unparented branch, so a note
   * whose parented title is malformed could validate through the branch that never
   * checks the parented title pattern.
   */
  test("a parented permalink cannot validate behind an unparented title", async () => {
    const note = await variant("QA-092: Mismatched", "qa/qa-040-spec-006-parented");
    expect(QaNoteSchema.safeParse(note).success).toBe(false);
  });

  test("a malformed parented title is still rejected", async () => {
    const note = await variant("QA-40-SPEC-6: Too Few Digits", "qa/qa-040-spec-006-x");
    expect(QaNoteSchema.safeParse(note).success).toBe(false);
  });

  test("a title in neither form is rejected", async () => {
    expect(QaNoteSchema.safeParse(await variant("QA Report", "qa/qa-092-x")).success).toBe(false);
    expect(
      QaNoteSchema.safeParse(await variant("ANALYSIS-092: Wrong", "qa/qa-092-x")).success,
    ).toBe(false);
  });

  test("a permalink outside the qa/ folder is rejected in both forms", async () => {
    expect(QaNoteSchema.safeParse(await variant("QA-092: X", "analysis/qa-092-x")).success).toBe(
      false,
    );
    expect(
      QaNoteSchema.safeParse(await variant("QA-040-SPEC-006: X", "analysis/qa-040-spec-006-x"))
        .success,
    ).toBe(false);
  });

  test("summary arithmetic still gates on the unparented form", async () => {
    const note = await variant(QA_092_TITLE, QA_092_PERMALINK);
    const broken = { ...note, summary: { ...note.summary, tests_run: note.summary.tests_run + 1 } };
    expect(QaNoteSchema.safeParse(broken).success).toBe(false);
  });
});
