/**
 * Runtime validators for the composition library.
 *
 * Currently exports the source-coverage integrity-floor validator per
 * REQ-003-SPEC-003 and DESIGN-002-SPEC-003 Component 3. The schema-level guard
 * (max-10 regenerated_sections entries) lives in `schemas/base.ts` so it runs
 * at plan-parse time before the source file is loaded. This runtime validator
 * runs AFTER the source file is loaded, measuring actual line coverage of the
 * declared regenerative sections against the source content.
 */

import { PlanAdapter } from "../adapters/plan.js";

export interface IntegrityFloorResult {
  valid: boolean;
  coveragePercent: number;
  message?: string;
}

/**
 * Validate that the named `regeneratedSections` cover at most 50% of the total
 * line count of `sourceContent`. Per REQ-003 AC-3/AC-4: greater-than 50% triggers
 * rejection; exactly 50% passes; less-than 50% passes.
 *
 * Sections are matched by H2 OR H3 heading text (matching the adapter's
 * `findRegeneratedSpans` contract). A section's line count is computed as the
 * count of newlines within its byte span.
 *
 * Returns `{ valid, coveragePercent, message }`. On failure, `message` describes
 * the breach; on success, `message` is undefined.
 */
export function validateIntegrityFloor(
  sourceContent: string,
  regeneratedSections: readonly string[],
): IntegrityFloorResult {
  const totalLines = sourceContent.split("\n").length;
  if (totalLines === 0) {
    return { valid: true, coveragePercent: 0 };
  }

  const adapter = new PlanAdapter();
  const spans = adapter.findRegeneratedSpans(sourceContent, regeneratedSections);

  let regeneratedLineCount = 0;
  for (const span of spans) {
    const sectionContent = sourceContent.slice(span.start, span.end);
    // Number of lines in the span = newlines + 1 if the slice is non-empty.
    if (sectionContent.length === 0) continue;
    const lineCount = sectionContent.split("\n").length;
    regeneratedLineCount += lineCount;
  }

  const coverageRatio = regeneratedLineCount / totalLines;
  const coveragePercent = coverageRatio * 100;

  // Per REQ-003 AC-4: exactly 50% passes; greater-than triggers rejection.
  if (coverageRatio > 0.5) {
    return {
      valid: false,
      coveragePercent,
      message: `Integrity floor violation: regenerated_sections cover ${coveragePercent.toFixed(1)}% of source lines (${regeneratedLineCount}/${totalLines}); floor is 50%`,
    };
  }

  return { valid: true, coveragePercent };
}
