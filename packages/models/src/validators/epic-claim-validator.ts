import type { EpicNote } from "../schemas/epic-note.js";
import type { SpecRootNote } from "../schemas/spec-root-note.js";

/**
 * EPIC done-claim validator (SPEC-008 REQ-003, TASK-009, Wave 2).
 *
 * The ONLY Wave 2 validator with a cross-note dependency. Given an
 * already-parsed `EpicNote`, returns whether the note legitimately claims
 * status DONE — which, for an EPIC, requires every SPEC it `contains` to have
 * itself reached terminal status DONE. Because that check spans note
 * boundaries, the validator cannot be pure over its single argument the way
 * the PLAN/TASK/REQ/DESIGN/SPEC validators are; it takes an injected
 * `resolveSpec` callback (DESIGN-001-SPEC-008 Coverage Module Layout) that the
 * caller (Track 5 hook handler / per-skill scripts) supplies. Given that
 * callback, the validator is pure — no filesystem reads, no mutation, no
 * logging side effects.
 *
 * Contract per REQ-003 + TASK-009 DoD:
 * - When EPIC status is NOT `"DONE"` → `{ ok: true }`. The validator only gates
 *   DONE claims; non-DONE notes pass trivially and the resolver is never
 *   invoked.
 * - When EPIC status IS `"DONE"` and the note has zero `contains` relations →
 *   `{ ok: true }`. No SPEC scope means nothing to resolve; the resolver is
 *   never invoked (so a missing resolver is NOT an error in this case).
 * - When EPIC status IS `"DONE"` and every contained SPEC resolves to status
 *   `"DONE"` → `{ ok: true }`.
 * - When EPIC status IS `"DONE"` and any contained SPEC resolves to a non-DONE
 *   status → `{ ok: false, unsatisfied: [...] }`, one entry per offending SPEC.
 *
 * THROWS (loud failure, never a silent pass) per ADR-005 D-5 Phase 3 critic
 * P1.1 resolution:
 * - when status is `"DONE"` and at least one `contains` relation exists AND no
 *   resolver was provided — the cross-note mechanism is mandatory whenever
 *   there is scope to resolve; and
 * - when the resolver returns `undefined` for any referenced SPEC — an
 *   unresolvable reference is a defect in the caller's resolver wiring, not a
 *   "SPEC not done" finding, so it must surface explicitly.
 *
 * Result shape deliberately mirrors `PlanClaimResult` (an `ok` discriminant
 * over a flat `unsatisfied` array of cross-note findings) rather than the
 * checkbox-oriented `ClaimResult` used by TASK/REQ/DESIGN/SPEC/QA validators,
 * per TASK-009 DoD which locks the result type verbatim.
 *
 * Terminal-status note: `SpecRootNoteStatusEnum` is
 * `DRAFT | PROPOSED | ACCEPTED | DONE | DEPRECATED` — DONE is the SPEC's only
 * terminal/complete status (the enum has no DEFERRED/ABANDONED, unlike PLAN
 * part substatuses). So "child SPEC is satisfied" reduces to `status === "DONE"`.
 */

/**
 * Caller-supplied resolver: maps a `contains` SPEC reference (the relation
 * `target` string, e.g. `"SPEC-007: Plan Session Render"`) to its parsed
 * `SpecRootNote`, or `undefined` when no such SPEC can be located. Returning
 * `undefined` is treated as a wiring defect and causes the validator to throw
 * (per ADR-005 D-5 Phase 3 critic P1.1 — no silent pass).
 */
export type SpecResolver = (specRef: string) => SpecRootNote | undefined;

export type EpicClaimResult =
  | { ok: true }
  | { ok: false; unsatisfied: ReadonlyArray<{ spec_ref: string; status: string }> };

/** The relation verb that lists an EPIC's SPEC scope. */
const CONTAINS_VERB = "contains";

/**
 * Validate an EpicNote's done-claim. PASS when status is not DONE, when status
 * is DONE with zero contains relations, or when status is DONE and every
 * contained SPEC resolves to status DONE.
 *
 * @throws when status is DONE with contains relations but no resolver is
 *   provided, or when the resolver returns undefined for a referenced SPEC.
 */
export function validateEpicDoneClaim(
  epicNote: EpicNote,
  deps: { resolveSpec?: SpecResolver } = {},
): EpicClaimResult {
  if (epicNote.frontmatter.status !== "DONE") {
    return { ok: true };
  }

  const containsTargets = epicNote.relations
    .filter((rel) => rel.verb === CONTAINS_VERB)
    .map((rel) => rel.target);

  if (containsTargets.length === 0) {
    return { ok: true };
  }

  const { resolveSpec } = deps;
  if (resolveSpec === undefined) {
    throw new Error(
      `validateEpicDoneClaim: EPIC status is DONE with ${containsTargets.length} \`contains\` relation(s) but no \`deps.resolveSpec\` resolver was provided; the cross-note resolver is mandatory whenever contains relations exist (ADR-005 D-5 Phase 3 critic P1.1 — no silent pass). Missing dependency: deps.resolveSpec. Unresolved targets: ${containsTargets.join(" | ")}`,
    );
  }

  const unsatisfied: Array<{ spec_ref: string; status: string }> = [];
  for (const specRef of containsTargets) {
    const resolved = resolveSpec(specRef);
    if (resolved === undefined) {
      throw new Error(
        `validateEpicDoneClaim: \`deps.resolveSpec\` returned undefined for contained SPEC reference "${specRef}"; an unresolvable reference is a resolver-wiring defect, not a non-DONE finding (ADR-005 D-5 Phase 3 critic P1.1 — no silent pass). Missing SPEC reference: ${specRef}`,
      );
    }
    if (resolved.frontmatter.status !== "DONE") {
      unsatisfied.push({ spec_ref: specRef, status: resolved.frontmatter.status });
    }
  }

  if (unsatisfied.length === 0) {
    return { ok: true };
  }
  return { ok: false, unsatisfied };
}
