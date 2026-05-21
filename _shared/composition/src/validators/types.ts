/**
 * Shared validator types (Phase X.D.6, 2026-05-20).
 *
 * `ClaimResult` is the verdict shape returned by every claim validator in the
 * composition library — Task DoD, Task ADR-compliance, REQ acceptance-criteria,
 * DESIGN compliance, and future X.D-round validators. A single shape lets the
 * orchestrator's QA aggregation iterate uniformly: PASS carries the item
 * total; FAIL carries the total + zero-based indices of each unsatisfied item
 * so re-engagement instructions can cite specific bullets.
 *
 * Originally introduced as `DoDClaimResult` in task-claim-validator.ts (X.D.5).
 * Renamed and lifted to a shared module here so REQ/DESIGN validators can
 * reuse the same shape without redeclaring. `DoDClaimResult` is preserved as
 * an alias for backwards compatibility of the X.D.5 export.
 */

/**
 * Each unsatisfied entry carries the zero-based index within its source list
 * + the bullet text. X.D.7 adds an OPTIONAL `section` discriminator so
 * multi-source validators (SpecRootNote which gates DONE on TWO lists —
 * Success Criteria + Artifact Status) can report which list the failure came
 * from without polluting the `text` field. Existing single-source validators
 * (TASK DoD, TASK ADR-compliance, REQ AC, DESIGN compliance) leave `section`
 * undefined.
 */
export interface UnsatisfiedItem {
  index: number;
  text: string;
  section?: string;
}

export type ClaimResult =
  | { verdict: "PASS"; total: number }
  | {
      verdict: "FAIL";
      total: number;
      unsatisfied: UnsatisfiedItem[];
    };

/** Backwards-compatible alias for the X.D.5 task-claim-validator export. */
export type DoDClaimResult = ClaimResult;
