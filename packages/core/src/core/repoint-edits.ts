/**
 * Addressed substitution over a note's lines, and the proof that it is reversible.
 *
 * A repoint is a set of substitutions each pinned to a `line:column` recorded by
 * an earlier scan. Two properties make that harder than a find-and-replace, and
 * both are measured facts about the real manifest rather than hypotheticals:
 * `referencingFile:line:column` is unique across all 497 findings while
 * `referencingFile:line:matchedText` collides on 26 of them, so the column is the
 * only unambiguous address; and an address goes stale the instant anything to its
 * left on the same line changes length.
 *
 * The answer to staleness is to apply strictly right-to-left, which leaves every
 * not-yet-applied address untouched. The answer to trusting that arithmetic is
 * `invertEdits`, which reconstructs the addresses of the substituted text and
 * lets the caller prove byte-for-byte that undoing the pass restores the input.
 *
 * Everything here is pure: lines in, lines out. No file I/O.
 */

/** One substitution, addressed the way the manifest addresses a finding. */
export interface AddressedEdit {
  /** 1-indexed. */
  readonly line: number;
  /** 1-indexed offset within the line. */
  readonly column: number;
  readonly oldText: string;
  readonly newText: string;
}

/**
 * What is actually sitting at an edit's address.
 *
 * - `old` — the recorded text; the edit applies.
 * - `new` — the repointed text is already there; a previous run did this.
 * - `drift` — neither. The file changed by some other hand and the executor
 *   declines to guess where the reference went.
 */
export type AddressVerdict = "old" | "new" | "drift";

export function verifyAddress(lines: readonly string[], edit: AddressedEdit): AddressVerdict {
  const line = lines[edit.line - 1];
  if (line === undefined) return "drift";
  const offset = edit.column - 1;
  const oldHit = line.startsWith(edit.oldText, offset);
  const newHit = line.startsWith(edit.newText, offset);
  // When one text is a prefix of the other both probes hit, and the LONGER one is
  // what is really there. Preferring `old` unconditionally would re-apply a
  // completed repoint whenever the old permalink is a prefix of the new one,
  // which is the one shape that silently breaks idempotence.
  if (oldHit && newHit) return edit.oldText.length >= edit.newText.length ? "old" : "new";
  if (oldHit) return "old";
  return newHit ? "new" : "drift";
}

/** Descending by line then column — the order that keeps addresses valid. */
function descending(a: AddressedEdit, b: AddressedEdit): number {
  return b.line - a.line || b.column - a.column;
}

/**
 * Indices of every edit that overlaps another on the same line.
 *
 * An overlap is a nested reference: a bare entity ID for one target sitting
 * inside a wikilink for another, which the scanner's containment suppression
 * does not remove because it only suppresses within a single target. Applying
 * both corrupts the line; applying one silently discards the other. Callers
 * surface both instead, which is why this returns the participants rather than a
 * winner.
 */
export function overlappingEdits(edits: readonly AddressedEdit[]): ReadonlySet<number> {
  const byLine = new Map<number, number[]>();
  for (let index = 0; index < edits.length; index++) {
    const edit = edits[index];
    if (!edit) continue;
    const bucket = byLine.get(edit.line) ?? [];
    bucket.push(index);
    byLine.set(edit.line, bucket);
  }
  const conflicted = new Set<number>();
  for (const bucket of byLine.values()) {
    const ordered = [...bucket].sort((a, b) => (edits[a]?.column ?? 0) - (edits[b]?.column ?? 0));
    for (let i = 0; i < ordered.length - 1; i++) {
      const left = edits[ordered[i] ?? -1];
      const right = edits[ordered[i + 1] ?? -1];
      if (!left || !right) continue;
      if (right.column < left.column + left.oldText.length) {
        conflicted.add(ordered[i] ?? -1);
        conflicted.add(ordered[i + 1] ?? -1);
      }
    }
  }
  return conflicted;
}

/**
 * Apply every edit, right-to-left. Addresses are assumed verified — an edit whose
 * `oldText` is not at its address is applied blindly and would corrupt the line,
 * so `verifyAddress` is not optional at the call site.
 */
export function applyEdits(lines: readonly string[], edits: readonly AddressedEdit[]): string[] {
  const out = [...lines];
  for (const edit of [...edits].sort(descending)) {
    const line = out[edit.line - 1];
    if (line === undefined) continue;
    const offset = edit.column - 1;
    out[edit.line - 1] =
      line.slice(0, offset) + edit.newText + line.slice(offset + edit.oldText.length);
  }
  return out;
}

/**
 * The edit set that undoes `edits` when applied to their result.
 *
 * Columns are RE-DERIVED rather than reused. After a right-to-left pass, the
 * leftmost substitution on a line still sits at its original column, but every
 * substitution to its right has moved by the accumulated length change of
 * everything left of it. Inverting with the original columns is therefore correct
 * only for single-edit lines — and 26 lines in the measured manifest carry more
 * than one edit, so the shift is the common case rather than the corner.
 */
export function invertEdits(edits: readonly AddressedEdit[]): AddressedEdit[] {
  const byLine = new Map<number, AddressedEdit[]>();
  for (const edit of edits) {
    const bucket = byLine.get(edit.line) ?? [];
    bucket.push(edit);
    byLine.set(edit.line, bucket);
  }
  const out: AddressedEdit[] = [];
  for (const bucket of byLine.values()) {
    let shift = 0;
    for (const edit of [...bucket].sort((a, b) => a.column - b.column)) {
      out.push({
        line: edit.line,
        column: edit.column + shift,
        oldText: edit.newText,
        newText: edit.oldText,
      });
      shift += edit.newText.length - edit.oldText.length;
    }
  }
  return out;
}

/** Every line that differs, paired before and after, for review. */
export function lineDiff(
  before: readonly string[],
  after: readonly string[],
): Array<{ line: number; before: string; after: string }> {
  const out: Array<{ line: number; before: string; after: string }> = [];
  const length = Math.max(before.length, after.length);
  for (let index = 0; index < length; index++) {
    const left = before[index] ?? "";
    const right = after[index] ?? "";
    if (left !== right) out.push({ line: index + 1, before: left, after: right });
  }
  return out;
}
