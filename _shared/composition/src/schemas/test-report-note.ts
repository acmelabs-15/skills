import { z } from "zod";
import { ObservationSchema, RelationSchema, TestReportIdSchema } from "./common.js";

/**
 * TestReportNote Zod schema (Phase X.D.7, 2026-05-21; widened for QA rename
 * 2026-05-21 Wave 4 retro).
 *
 * Mirrors the canonical QA contract document. Originally authored against the
 * TEST-REPORT-NNN-SPEC-NNN convention; on 2026-05-21 the user-locked rename
 * `test-report` → `qa` (CONVENTIONS Section 3 canonical 16-type list)
 * established `qa` as the canonical type and `QA-NNN-SPEC-NNN` as the file
 * prefix. Schema accepts BOTH forms for backward compatibility:
 *   - title:     `TEST-REPORT-NNN-SPEC-NNN:` OR `QA-NNN-SPEC-NNN:`
 *   - type:      `"test-report"` (legacy) OR `"qa"` (current)
 *   - permalink: `qa/test-report-NNN-spec-NNN...` OR `qa/qa-NNN-spec-NNN...`
 *
 * Pre-rename example fixture: docs/qa/TEST-REPORT-007-SPEC-001-atomic-write-helper.md
 * Post-rename example notes: docs/qa/QA-040-SPEC-006-..., docs/qa/QA-041-SPEC-006-...
 *
 * QA is the contract document — when QA returns PASS/FAIL on a TASK, the
 * verdict is recorded here with per-test evidence. Schema must enforce
 * structure so a QA claim "verdict PASS" is mechanically verifiable against
 * the per-row test_results data. The cross-field invariants below make
 * verdict mismatches reject at parse time: PASS requires zero failed rows
 * AND tests_run > 0; tests_run must equal passed+failed+skipped.
 *
 * Status enum is intentionally narrow (DRAFT | DONE): QA notes are typically
 * authored in one shot when QA returns; DRAFT covers in-progress authoring.
 *
 * Renderer companion: src/renderers/test-report-note.ts.
 */

export const TestReportNoteStatusEnum = z.enum(["DRAFT", "DONE"]);

const TestReportFrontmatterSchema = z
  .object({
    title: z.string().regex(/^(TEST-REPORT|QA)-\d{3,}-SPEC-\d{3,}:/),
    type: z.enum(["test-report", "qa"]),
    permalink: z.string().regex(/^qa\/(test-report|qa)-\d{3,}-spec-\d{3,}/),
    status: TestReportNoteStatusEnum,
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const TestReportApproachSchema = z
  .object({
    test_types: z.array(z.string()).min(1),
    environment: z.string().min(1),
    data_strategy: z.string().min(1),
    test_file: z.string().min(1).optional(),
  })
  .strict();

const TestReportVerdictEnum = z.enum(["PASS", "FAIL", "PARTIAL"]);
const TestRowStatusEnum = z.enum(["PASS", "FAIL", "PARTIAL", "SKIPPED"]);

const TestReportSummarySchema = z
  .object({
    tests_run: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    assertions: z.number().int().nonnegative(),
    execution_time_ms: z.number().int().nonnegative().optional(),
    verdict: TestReportVerdictEnum,
  })
  .strict();

const TestResultRowSchema = z
  .object({
    test: z.string().min(1),
    category: z.string().min(1),
    status: TestRowStatusEnum,
    notes: z.string().optional(),
  })
  .strict();

export const TestReportNoteSchema = z
  .object({
    frontmatter: TestReportFrontmatterSchema,
    objective: z.string().min(1),
    feature: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    acceptance_criteria_refs: z.array(z.string()).optional(),
    approach: TestReportApproachSchema,
    summary: TestReportSummarySchema,
    test_results: z.array(TestResultRowSchema),
    findings: z.string().optional(),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived QA/TEST-REPORT id (from frontmatter
    // title) must be valid per TestReportIdSchema. Both prefixes accepted
    // per the 2026-05-21 rename (see file header).
    const titleMatch = data.frontmatter.title.match(/^((?:TEST-REPORT|QA)-\d{3,}-SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = TestReportIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields QA/TEST-REPORT id ${derivedId} which fails TestReportIdSchema`,
        });
      }
    }

    // Cross-field invariant 2: tests_run must equal passed + failed + skipped.
    const { tests_run, passed, failed, skipped, verdict } = data.summary;
    const computed = passed + failed + skipped;
    if (tests_run !== computed) {
      ctx.addIssue({
        code: "custom",
        message: `Summary.tests_run (${tests_run}) does not equal passed+failed+skipped (${computed})`,
      });
    }

    // Cross-field invariant 3: PASS verdict requires failed===0 AND
    // tests_run > 0 AND every test_results row status !== "FAIL".
    if (verdict === "PASS") {
      if (failed > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Verdict PASS but summary.failed=${failed}; verdict cannot mask failing rows`,
        });
      }
      if (tests_run === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Verdict PASS requires tests_run > 0; cannot pass with zero tests",
        });
      }
      const failingRows = data.test_results.filter((r) => r.status === "FAIL");
      if (failingRows.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Verdict PASS but ${failingRows.length} test_results row(s) marked FAIL: ${failingRows.map((r) => r.test).join(" | ")}`,
        });
      }
    }

    // Cross-field invariant 4: FAIL verdict should correspond to a real
    // failure signal (failed > 0 OR at least one FAIL row). This catches
    // copy-paste errors where someone declares FAIL but every row passed.
    if (verdict === "FAIL") {
      const failingRows = data.test_results.filter((r) => r.status === "FAIL");
      if (failed === 0 && failingRows.length === 0) {
        ctx.addIssue({
          code: "custom",
          message:
            "Verdict FAIL but summary.failed=0 and no test_results row marked FAIL; verdict must match data",
        });
      }
    }
  });

export type TestReportNote = z.infer<typeof TestReportNoteSchema>;
export type TestReportFrontmatter = z.infer<typeof TestReportFrontmatterSchema>;
export type TestReportApproach = z.infer<typeof TestReportApproachSchema>;
export type TestReportSummary = z.infer<typeof TestReportSummarySchema>;
export type TestReportVerdict = z.infer<typeof TestReportVerdictEnum>;
export type TestResultRow = z.infer<typeof TestResultRowSchema>;
export type TestRowStatus = z.infer<typeof TestRowStatusEnum>;
export type TestReportNoteStatus = z.infer<typeof TestReportNoteStatusEnum>;
