import { describe, expect, test } from "bun:test";
import { parseFigure, parseNumberWords } from "@acmelabs/core/core/number-words";

describe("parseNumberWords", () => {
  test("units and teens", () => {
    expect(parseNumberWords("eight")).toBe(8);
    expect(parseNumberWords("seventeen")).toBe(17);
  });

  test("tens, hyphenated and spaced", () => {
    expect(parseNumberWords("thirty")).toBe(30);
    expect(parseNumberWords("ninety-seven")).toBe(97);
    expect(parseNumberWords("eighty one")).toBe(81);
  });

  test("hundreds, with and without a leading unit", () => {
    expect(parseNumberWords("one hundred")).toBe(100);
    expect(parseNumberWords("hundred")).toBe(100);
    expect(parseNumberWords("two hundred and twelve")).toBe(212);
  });

  test("thousands bank the partial", () => {
    expect(parseNumberWords("two thousand and five")).toBe(2005);
  });

  test("case is irrelevant", () => {
    expect(parseNumberWords("Thirty")).toBe(30);
  });

  test("a stray word aborts rather than being skipped", () => {
    expect(parseNumberWords("one of the three")).toBeNull();
    expect(parseNumberWords("rows")).toBeNull();
    expect(parseNumberWords("")).toBeNull();
  });
});

describe("parseFigure", () => {
  test("reads digits, with thousands separators", () => {
    expect(parseFigure("197")).toBe(197);
    expect(parseFigure("1,024")).toBe(1024);
  });

  test("reads word forms", () => {
    expect(parseFigure("one hundred")).toBe(100);
  });

  test("a decimal is not a count", () => {
    expect(parseFigure("1.5")).toBeNull();
  });

  test("returns null for text that names no number", () => {
    expect(parseFigure("several")).toBeNull();
  });
});
