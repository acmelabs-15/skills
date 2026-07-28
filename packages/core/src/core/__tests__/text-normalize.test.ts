import { describe, expect, test } from "bun:test";
import {
  findQuoteMatches,
  normalizeForQuoteMatch,
  normalizeQuote,
} from "@acmelabs/core/core/text-normalize";

describe("normalizeForQuoteMatch", () => {
  test("drops emphasis, code and strike markers", () => {
    expect(normalizeForQuoteMatch("**bold** `code` ~~gone~~").normalized).toBe("bold code gone");
  });

  test("keeps underscores, which carry meaning inside identifiers", () => {
    expect(normalizeForQuoteMatch("SESSION-2026-04-15_01").normalized).toBe(
      "session-2026-04-15_01",
    );
  });

  test("collapses whitespace runs and newlines to a single space", () => {
    expect(normalizeForQuoteMatch("a  \n\t b c").normalized).toBe("a b c");
  });

  test("folds curly quotes and typographic dashes to ASCII", () => {
    expect(normalizeForQuoteMatch("“x” — y – z").normalized).toBe('"x" - y - z');
  });

  test("lowercases, so a re-capitalised quote still matches", () => {
    expect(normalizeForQuoteMatch("The Flag").normalized).toBe("the flag");
  });

  test("offsets map every normalised character back to its source position", () => {
    const { normalized, offsets } = normalizeForQuoteMatch("**ab**");
    expect(normalized).toBe("ab");
    expect(offsets).toEqual([2, 3]);
  });
});

describe("normalizeQuote", () => {
  test("strips the surrounding quotation marks of either flavour", () => {
    expect(normalizeQuote('"the claim"')).toBe("the claim");
    expect(normalizeQuote("“the claim”")).toBe("the claim");
  });
});

describe("findQuoteMatches", () => {
  const haystack = (text: string) => normalizeForQuoteMatch(text);

  test("matches across emphasis differences between source and target", () => {
    const target = "it is legitimately reset to `false` three times as often";
    const matches = findQuoteMatches(
      haystack(target),
      "is legitimately reset to false three times",
    );
    expect(matches).toHaveLength(1);
  });

  test("matches across a line wrap in the target", () => {
    const matches = findQuoteMatches(
      haystack("the per-field\nprovenance rule"),
      "per-field provenance rule",
    );
    expect(matches).toHaveLength(1);
  });

  test("reports every occurrence, not just the first", () => {
    expect(findQuoteMatches(haystack("alpha beta. alpha beta."), "alpha beta")).toHaveLength(2);
  });

  test("does not fuzzy-match a reworded assertion", () => {
    const matches = findQuoteMatches(
      haystack("reset to false twice as often"),
      "reset to false three times as often",
    );
    expect(matches).toHaveLength(0);
  });

  test("an empty needle yields nothing rather than a hit at every position", () => {
    expect(findQuoteMatches(haystack("anything"), "")).toEqual([]);
  });

  test("offsets point into the original text, past the stripped markers", () => {
    const original = "lead **target phrase** tail";
    const [match] = findQuoteMatches(haystack(original), "target phrase");
    expect(match).toBeDefined();
    expect(original.slice(match?.offset ?? 0, match?.endOffset ?? 0)).toBe("target phrase");
  });
});
