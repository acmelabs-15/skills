/**
 * English cardinal parsing, because this corpus writes its figures in words.
 *
 * "The table holds one hundred rows", "Thirty rows now carry an affirmative
 * blocking mark", "Seventeen bounded measurements gate named agenda items". A
 * figure checker that only reads digits cannot see any of those, which is to
 * say it cannot see the figures that actually go stale — a digit is usually a
 * count someone computed, while a word is usually a count someone remembered.
 *
 * Scope is 0 to 999 plus round thousands. Beyond that the corpus uses digits,
 * and a fuller parser would add ambiguity ("one two three") for no reader.
 */

const UNITS: ReadonlyMap<string, number> = new Map([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
]);

const TENS: ReadonlyMap<string, number> = new Map([
  ["twenty", 20],
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
]);

const MULTIPLIERS: ReadonlyMap<string, number> = new Map([
  ["hundred", 100],
  ["thousand", 1000],
]);

/** Every word this parser understands, for building a scanning regex. */
export const NUMBER_WORDS: readonly string[] = [
  ...UNITS.keys(),
  ...TENS.keys(),
  ...MULTIPLIERS.keys(),
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s-]+/)
    .map((token) => token.replace(/[^a-z]/g, ""))
    .filter((token) => token.length > 0 && token !== "and");
}

/**
 * Parse a word-form cardinal, or null when the text is not one.
 *
 * Accumulator form: units and tens add into a partial, a multiplier scales it
 * and (for thousand) banks the result. A stray non-number word aborts rather
 * than being skipped, so "one of the three" does not silently parse as four.
 */
export function parseNumberWords(text: string): number | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  let total = 0;
  let partial = 0;
  let sawNumber = false;
  for (const token of tokens) {
    const unit = UNITS.get(token);
    if (unit !== undefined) {
      partial += unit;
      sawNumber = true;
      continue;
    }
    const ten = TENS.get(token);
    if (ten !== undefined) {
      partial += ten;
      sawNumber = true;
      continue;
    }
    const multiplier = MULTIPLIERS.get(token);
    if (multiplier === undefined) return null;
    // A bare "hundred" means one hundred, so an empty partial counts as one.
    partial = (partial === 0 ? 1 : partial) * multiplier;
    if (multiplier >= 1000) {
      total += partial;
      partial = 0;
    }
    sawNumber = true;
  }
  return sawNumber ? total + partial : null;
}

const DIGITS_RE = /^-?\d[\d,]*$/;

/**
 * Parse a figure written either as digits or as English words. Thousands
 * separators are tolerated in the digit form; a decimal is not a count and is
 * rejected rather than truncated.
 */
export function parseFigure(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (DIGITS_RE.test(trimmed)) {
    const value = Number(trimmed.replace(/,/g, ""));
    return Number.isInteger(value) ? value : null;
  }
  return parseNumberWords(trimmed);
}
