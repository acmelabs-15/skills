/**
 * Per-cluster partition assembly for the /decompose executor.
 *
 * Implements the extraction half of DESIGN-001-SPEC-005 Component 3 ("for each
 * destination in the plan: extract source content by range, apply mutations,
 * hash-validate, write via temp-then-rename") and the byte-accountability
 * invariant that REQ-006-SPEC-005 AC-2 requires of the pair:
 *
 *   recompose(decompose(source)) === source, byte-for-byte.
 *
 * `recompose.ts` merges its sources with `contents.join("")`. For that join to
 * recover the source exactly, the N destinations written by decompose must
 * concatenate to the source with nothing added, dropped, or duplicated. Two
 * consequences follow, and both live here rather than in `extractByRange`:
 *
 *  1. **Boundary newline.** `extractByRange` is a raw slice: for lines
 *     `L[0..m-1]` it returns `L.slice(a, b).join("\n")`, which omits the "\n"
 *     that separated `L[b-1]` from `L[b]`. A segment whose range stops short of
 *     end-of-file therefore has to carry that separator, or the concatenation
 *     welds the last line of one shard onto the first line of the next.
 *     The separator is part of S (the hashed source extraction), so both sides
 *     of the F-8 comparison see it and char-identity still holds.
 *
 *  2. **Exhaustive, non-overlapping cover.** Every source line must belong to
 *     exactly one cluster. `verifyCoverage` proves this by reconstruction
 *     rather than by arithmetic: the ordered segments are concatenated and
 *     compared to the source, so the check cannot pass on a plan that silently
 *     drops or duplicates content.
 *
 * The adapter is injected as a plain extraction function, mirroring the narrow
 * `SubtreeReverseMutator` seam in `cluster-rollback.ts`, so this module never
 * imports `CompositionAdapter` and stays cycle-free and directly testable.
 */

import { sha256 } from "./hash.js";
import type { LineRange } from "./types.js";

/** Raw line-range slice, satisfied by `CompositionAdapter.extractByRange`. */
export type RangeExtractor = (content: string, range: LineRange) => string;

/** A cluster id paired with the line range the plan assigned to it. */
export interface ClusterRange {
  readonly clusterId: string;
  readonly range: LineRange;
}

/** One cluster's extracted source content (S in the F-8 hash protocol). */
export interface PartitionSegment extends ClusterRange {
  readonly content: string;
}

/** Result of proving that the segments account for every source byte. */
export interface CoverageReport {
  readonly complete: boolean;
  readonly sourceSha256: string;
  readonly reconstructedSha256: string;
  /** Human-readable structural findings; populated for diagnostics only. */
  readonly defects: readonly string[];
}

/** Number of newline-delimited lines, counting the empty trailing element. */
export function lineCount(content: string): number {
  return content.split("\n").length;
}

/**
 * Inclusive 1-indexed end line of a range, resolving the `-1` sentinel to the
 * final line. Also the exclusive bound for a 0-indexed slice.
 */
export function resolveEndLine(range: LineRange, total: number): number {
  return range.end === -1 ? total : range.end;
}

/**
 * Extract one cluster's source content, restoring the boundary newline when the
 * range stops short of end-of-file (see rule 1 in the module header).
 */
export function extractSegment(extract: RangeExtractor, content: string, range: LineRange): string {
  const total = lineCount(content);
  const slice = extract(content, range);
  return resolveEndLine(range, total) < total ? `${slice}\n` : slice;
}

/**
 * Extract every cluster in ascending range order. Ordering is taken from the
 * ranges rather than from plan key order so the coverage proof does not depend
 * on YAML mapping iteration order.
 */
export function buildPartition(
  extract: RangeExtractor,
  content: string,
  clusters: readonly ClusterRange[],
): PartitionSegment[] {
  return [...clusters]
    .sort((a, b) => a.range.start - b.range.start)
    .map((cluster) => ({
      ...cluster,
      content: extractSegment(extract, content, cluster.range),
    }));
}

/**
 * Prove that the ordered segments reconstruct the source byte-for-byte. The
 * reconstruction comparison is authoritative; `defects` only explains a
 * failure in terms of line numbers.
 */
export function verifyCoverage(
  content: string,
  segments: readonly PartitionSegment[],
): CoverageReport {
  const reconstructed = segments.map((s) => s.content).join("");
  const sourceSha256 = sha256(content);
  const reconstructedSha256 = sha256(reconstructed);
  const complete = reconstructed === content;
  return {
    complete,
    sourceSha256,
    reconstructedSha256,
    defects: complete ? [] : describeDefects(content, segments),
  };
}

/** Locate gaps, overlaps, and truncation in ascending-ordered segments. */
function describeDefects(content: string, segments: readonly PartitionSegment[]): string[] {
  if (segments.length === 0) return ["no cluster declares a line range"];
  const total = lineCount(content);
  const defects: string[] = [];
  const first = segments[0];
  if (first && first.range.start !== 1) {
    defects.push(
      `cluster "${first.clusterId}" starts at line ${first.range.start}; the partition must start at line 1`,
    );
  }
  for (let i = 1; i < segments.length; i += 1) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (!prev || !cur) continue;
    const expected = resolveEndLine(prev.range, total) + 1;
    if (cur.range.start !== expected) {
      const kind = cur.range.start > expected ? "gap" : "overlap";
      defects.push(
        `${kind} between clusters "${prev.clusterId}" and "${cur.clusterId}": next range starts at line ${cur.range.start}, expected ${expected}`,
      );
    }
  }
  const last = segments[segments.length - 1];
  if (last) {
    const lastEnd = resolveEndLine(last.range, total);
    if (lastEnd < total) {
      defects.push(
        `cluster "${last.clusterId}" ends at line ${lastEnd}; the source has ${total} lines (use end: -1 to reach end-of-file)`,
      );
    }
  }
  return defects;
}
