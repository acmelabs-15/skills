import { z } from "zod";
import { ObservationSchema, QaIdSchema, RelationSchema } from "./common.js";

/**
 * QaNote Zod schema (Phase X.D.7, 2026-05-21).
 *
 * Mirrors the canonical QA contract document. The type was renamed to `qa`
 * on 2026-05-21 (CONVENTIONS Section 3 canonical 16-type list); the schema
 * accepts ONLY the `qa` form:
 *   - title:     `QA-NNN-SPEC-NNN:`
 *   - type:      `"qa"`
 *   - permalink: `qa/qa-NNN-spec-NNN...`
 *
 * Example notes: docs/qa/QA-040-SPEC-006-..., docs/qa/QA-041-SPEC-006-...
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
 * Renderer companion: src/renderers/qa-note.ts.
 */

export const QaNoteStatusEnum = z.enum(["DRAFT", "DONE"]);

const QaFrontmatterSchema = z
  .object({
    title: z.string().regex(/^QA-\d{3,}-SPEC-\d{3,}:/),
    type: z.literal("qa"),
    permalink: z.string().regex(/^qa\/qa-\d{3,}-spec-\d{3,}/),
    status: QaNoteStatusEnum,
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const QaApproachSchema = z
  .object({
    test_types: z.array(z.string()).min(1),
    environment: z.string().min(1),
    data_strategy: z.string().min(1),
    test_file: z.string().min(1).optional(),
  })
  .strict();

const QaVerdictEnum = z.enum(["PASS", "FAIL", "PARTIAL"]);
const TestRowStatusEnum = z.enum(["PASS", "FAIL", "PARTIAL", "SKIPPED"]);

const QaSummarySchema = z
  .object({
    tests_run: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    assertions: z.number().int().nonnegative(),
    execution_time_ms: z.number().int().nonnegative().optional(),
    verdict: QaVerdictEnum,
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

export const QaNoteSchema = z
  .object({
    frontmatter: QaFrontmatterSchema,
    objective: z.string().min(1),
    feature: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    acceptance_criteria_refs: z.array(z.string()).optional(),
    approach: QaApproachSchema,
    summary: QaSummarySchema,
    test_results: z.array(TestResultRowSchema),
    findings: z.string().optional(),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived QA id (from frontmatter title) must be
    // valid per QaIdSchema.
    const titleMatch = data.frontmatter.title.match(/^(QA-\d{3,}-SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = QaIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields QA id ${derivedId} which fails QaIdSchema`,
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

export type QaNote = z.infer<typeof QaNoteSchema>;
export type QaFrontmatter = z.infer<typeof QaFrontmatterSchema>;
export type QaApproach = z.infer<typeof QaApproachSchema>;
export type QaSummary = z.infer<typeof QaSummarySchema>;
export type QaVerdict = z.infer<typeof QaVerdictEnum>;
export type TestResultRow = z.infer<typeof TestResultRowSchema>;
export type TestRowStatus = z.infer<typeof TestRowStatusEnum>;
export type QaNoteStatus = z.infer<typeof QaNoteStatusEnum>;
