/**
 * The vocabulary of declined repairs: why a finding was not repointed, and the
 * per-finding record of that decision.
 *
 * A LEAF, deliberately. Both the repoint plan (whose report embeds a work brief)
 * and the work brief itself (whose entries are keyed by reason) need this
 * vocabulary, and putting it in either one makes the other import back into it. A
 * circular import in this package collapses at build time rather than at
 * type-check time, which is the same trap `note-identity.ts` was extracted to
 * avoid — one leaf both sides depend on, importing nothing from either.
 */

import { z } from "zod";
import { ReferenceFindingSchema } from "./reference-manifest.js";

/**
 * Why a finding was not repaired. Every unrepaired finding carries exactly one, so
 * the residue is triageable by reason rather than read site by site.
 *
 * - `judgment-class` — a bi-directional closure finding or an index-staleness
 *   entry. Its repair is inserting an edge or re-indexing, not substituting text,
 *   and the note to edit is often not even the note the finding sits in. Never
 *   automated.
 * - `malformed-reference` — the reference is not in a form this executor can
 *   repoint. Either a `wikilink-malformed` finding, which was already broken
 *   before anything moved and whose remedy is repair to the canonical form rather
 *   than a repoint; or a matched text that does not have the shape its class
 *   implies, which a hand-edited manifest produces.
 * - `advisory` — a SEARCH-leg entry. Advisory entries never gate closure and are
 *   never written from, because they are not reproducible enough to write from.
 * - `no-mapping` — the plan declares no replacement for this reference. The common
 *   benign case: a manifest covering 28 targets executed against a plan that
 *   renumbers 3 of them.
 * - `section-absent` — the cited section could not be located at the repoint
 *   destination. Downgraded rather than written, because writing the repoint anyway
 *   produces a citation that points at a section that is not there.
 * - `destination-unresolved` — no note in the tree carries the mapped-to entity ID,
 *   so the section check has nothing to check against.
 * - `address-drift` — neither the old nor the new text sits at the recorded
 *   `line:column`. The file changed since the scan by some other hand.
 * - `overlapping-edit` — two findings on one line have overlapping spans, so
 *   applying both would corrupt the line and applying one silently discards the
 *   other. Both are surfaced instead.
 */
export const RESIDUAL_REASONS = [
  "judgment-class",
  "malformed-reference",
  "advisory",
  "no-mapping",
  "section-absent",
  "destination-unresolved",
  "address-drift",
  "overlapping-edit",
] as const;
export const ResidualReasonSchema = z.enum(RESIDUAL_REASONS);
export type ResidualReason = z.infer<typeof ResidualReasonSchema>;

/**
 * One declined finding with its reason. The intermediate form: the executor
 * produces these, and the work brief enriches and groups them into what an agent
 * actually reads.
 */
export const RepointResidualSchema = z.object({
  finding: ReferenceFindingSchema,
  reason: ResidualReasonSchema,
  detail: z.string(),
});
export type RepointResidual = z.infer<typeof RepointResidualSchema>;

/** Exact per-reason counters, for a summary block that shows its zeros. */
export function emptyReasonCounts(): Record<ResidualReason, number> {
  return Object.fromEntries(RESIDUAL_REASONS.map((reason) => [reason, 0])) as Record<
    ResidualReason,
    number
  >;
}

/** Zod shape for an exact per-reason count object. */
export const reasonCountsShape = Object.fromEntries(
  RESIDUAL_REASONS.map((reason) => [reason, z.number().int().nonnegative()]),
) as Record<ResidualReason, z.ZodNumber>;
