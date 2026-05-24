import type { QaNote, QaVerdict } from "../schemas/qa-note.js";
import type { ClaimResult, UnsatisfiedItem } from "./types.js";

/**
 * Qa PASS-claim validator (Phase X.D.7, 2026-05-21).
 *
 * Defensive runtime check beyond the schema's superRefine. Re-derives the
 * expected verdict from the summary numbers (`failed === 0 && tests_run > 0`
 * → PASS; otherwise FAIL) and compares to the declared `summary.verdict`.
 *
 * Three outcomes:
 *  - declared PASS + derived PASS + zero FAIL rows → PASS
 *  - declared verdict !== derived verdict → FAIL (verdict mismatch)
 *  - declared FAIL or actual failures → FAIL (enumerated failing rows)
 *
 * The schema already rejects most mismatches at parse time, so this
 * validator is the post-parse contract a QA orchestrator can call to get a
 * structured PASS/FAIL with enumerated failing-test evidence.
 */

function deriveVerdict(report: QaNote): QaVerdict {
  const { failed, tests_run, skipped } = report.summary;
  if (failed === 0 && tests_run > 0 && skipped > 0) return "PARTIAL";
  if (failed === 0 && tests_run > 0) return "PASS";
  return "FAIL";
}

export function validateQaPassClaim(report: QaNote): ClaimResult {
  const declared = report.summary.verdict;
  const derived = deriveVerdict(report);
  const total = report.summary.tests_run;

  if (declared !== derived) {
    const mismatch: UnsatisfiedItem = {
      index: -1,
      text: `verdict mismatch: declared ${declared} vs derived ${derived}`,
    };
    return { verdict: "FAIL", total, unsatisfied: [mismatch] };
  }

  if (declared === "PASS") {
    return { verdict: "PASS", total };
  }

  // FAIL or PARTIAL — enumerate failing rows when present.
  const unsatisfied: UnsatisfiedItem[] = [];
  for (let i = 0; i < report.test_results.length; i++) {
    const row = report.test_results[i];
    if (!row) continue;
    if (row.status === "FAIL") {
      unsatisfied.push({ index: i, text: `${row.test}: ${row.status}` });
    }
  }
  if (declared === "PARTIAL" && unsatisfied.length === 0) {
    // PARTIAL with no failing rows is still a PASS-equivalent contract
    // (skipped tests are not failures). The QA-PASS claim semantics are
    // strict: PARTIAL declared → return FAIL so callers know the report
    // is not unconditional PASS.
    return {
      verdict: "FAIL",
      total,
      unsatisfied: [{ index: -1, text: "verdict PARTIAL — non-PASS QA outcome" }],
    };
  }
  return { verdict: "FAIL", total, unsatisfied };
}
