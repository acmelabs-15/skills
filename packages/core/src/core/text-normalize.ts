/**
 * Quote normalisation for correction reconciliation.
 *
 * A correction quotes the stale text it retires, and the quote is transcribed
 * by a human: emphasis markers get dropped, a line wrap turns into a space, a
 * typographic dash replaces a hyphen, curly quotes replace straight ones. None
 * of those differences mean the assertion changed, so comparing raw substrings
 * reports OUTSTANDING on text that was in fact corrected.
 *
 * What this module deliberately does NOT do is fuzzy matching. No stemming, no
 * token-subset scoring, no edit distance. After normalisation the comparison is
 * an exact substring test, because the whole value of the check is that a
 * verdict of LANDED means the retired wording is gone — not that something
 * similar to it is gone. A rewritten sentence that preserves the meaning is a
 * different assertion and must be judged by a reader, not by a threshold.
 *
 * The offset map is what makes the exactness usable: every normalised character
 * remembers where it came from, so a match reports the line in the file the
 * author will open rather than a position in a scrubbed string.
 */

/** Normalised text plus, per normalised character, its index in the original. */
export interface NormalizedText {
  readonly normalized: string;
  /** `offsets[i]` is the 0-indexed position of `normalized[i]` in the source. */
  readonly offsets: readonly number[];
}

/**
 * Characters dropped outright: markdown emphasis, inline code, and strike
 * markers. `_` is NOT dropped — it carries meaning inside identifiers such as
 * `SESSION-2026-04-15_01`, and underscore emphasis is vanishingly rare in this
 * corpus, so dropping it would trade a real false-match risk for a cosmetic
 * one.
 */
const DROPPED = new Set(["*", "`", "~"]);

/** Typographic variants folded to their ASCII equivalent. */
const FOLDED = new Map<string, string>([
  ["‘", "'"],
  ["’", "'"],
  ["‚", "'"],
  ["“", '"'],
  ["”", '"'],
  ["„", '"'],
  ["–", "-"],
  ["—", "-"],
  ["‑", "-"],
  ["−", "-"],
  ["…", "..."],
]);

function isWhitespace(char: string): boolean {
  return /\s| /.test(char);
}

/**
 * Fold a string to its comparable form, recording provenance per character.
 *
 * Whitespace runs collapse to a single space and the result is lowercased, so
 * a re-wrapped or re-capitalised quote still matches. A folded character that
 * expands to several characters (an ellipsis) maps every output character back
 * to the single source position, which keeps the map monotonic.
 */
export function normalizeForQuoteMatch(text: string): NormalizedText {
  const source = text.normalize("NFC");
  const chars: string[] = [];
  const offsets: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index] ?? "";
    if (DROPPED.has(char)) continue;
    if (isWhitespace(char)) {
      if (chars.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      chars.push(" ");
      offsets.push(index);
      pendingSpace = false;
    }
    const folded = FOLDED.get(char) ?? char;
    for (const out of folded.toLowerCase()) {
      chars.push(out);
      offsets.push(index);
    }
  }
  return { normalized: chars.join(""), offsets };
}

/** Fold a needle the same way, with the surrounding quotation marks stripped. */
export function normalizeQuote(quote: string): string {
  const stripped = quote
    .normalize("NFC")
    .replace(/^[\s"'‘’“”]+/, "")
    .replace(/[\s"'‘’“”]+$/, "");
  return normalizeForQuoteMatch(stripped).normalized;
}

/** A normalised-substring hit, reported at its position in the ORIGINAL text. */
export interface QuoteMatch {
  /** 0-indexed offset into the original text. */
  readonly offset: number;
  /** Exclusive end offset into the original text. */
  readonly endOffset: number;
}

/**
 * Every occurrence of `quote` in `haystack` after normalising both. Overlapping
 * hits are not possible for a fixed needle scanned left to right, and an empty
 * needle yields nothing rather than a hit at every position.
 */
export function findQuoteMatches(haystack: NormalizedText, quote: string): QuoteMatch[] {
  const needle = normalizeQuote(quote);
  if (needle.length === 0) return [];
  const out: QuoteMatch[] = [];
  let from = 0;
  for (;;) {
    const at = haystack.normalized.indexOf(needle, from);
    if (at < 0) return out;
    const offset = haystack.offsets[at];
    const lastOffset = haystack.offsets[at + needle.length - 1];
    if (offset !== undefined && lastOffset !== undefined) {
      out.push({ offset, endOffset: lastOffset + 1 });
    }
    from = at + needle.length;
  }
}
