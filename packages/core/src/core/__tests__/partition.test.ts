/**
 * Unit tests for the partition core (src/core/partition.ts).
 *
 * The boundary-newline rule and the reconstruction oracle are what make the
 * REQ-006-SPEC-005 AC-2 round trip byte-exact, so they are tested directly here
 * rather than only through the decompose CLI.
 */
import { describe, expect, test } from "bun:test";
import {
  buildPartition,
  extractSegment,
  lineCount,
  resolveEndLine,
  verifyCoverage,
} from "@acmelabs/core/core/partition";
import type { LineRange } from "@acmelabs/core/core/types";

/** Raw slice with the same semantics as BaseMarkdownAdapter.extractByRange. */
const rawExtract = (content: string, range: LineRange): string => {
  const lines = content.split("\n");
  const end = range.end === -1 ? lines.length : range.end;
  return lines.slice(range.start - 1, end).join("\n");
};

const partitionOf = (content: string, ranges: readonly [string, LineRange][]) =>
  buildPartition(
    rawExtract,
    content,
    ranges.map(([clusterId, range]) => ({ clusterId, range })),
  );

const NEWLINE_TERMINATED = "one\ntwo\nthree\nfour\n";
const UNTERMINATED = "alpha\nbeta\ngamma";

describe("lineCount / resolveEndLine", () => {
  test("counts the empty trailing element of a newline-terminated file", () => {
    expect(lineCount(NEWLINE_TERMINATED)).toBe(5);
    expect(lineCount(UNTERMINATED)).toBe(3);
  });

  test("resolves the -1 sentinel to the final line", () => {
    expect(resolveEndLine({ start: 1, end: -1 }, 5)).toBe(5);
    expect(resolveEndLine({ start: 1, end: 3 }, 5)).toBe(3);
  });
});

describe("extractSegment boundary newline", () => {
  test("appends the separator when the range stops short of end-of-file", () => {
    // Raw slice drops the "\n" that separated line 2 from line 3.
    expect(rawExtract(NEWLINE_TERMINATED, { start: 1, end: 2 })).toBe("one\ntwo");
    expect(extractSegment(rawExtract, NEWLINE_TERMINATED, { start: 1, end: 2 })).toBe("one\ntwo\n");
  });

  test("does not append a separator when the range reaches end-of-file", () => {
    expect(extractSegment(rawExtract, NEWLINE_TERMINATED, { start: 3, end: -1 })).toBe(
      "three\nfour\n",
    );
    expect(extractSegment(rawExtract, UNTERMINATED, { start: 2, end: -1 })).toBe("beta\ngamma");
  });

  test("a whole-file range is byte-identical to the source", () => {
    expect(extractSegment(rawExtract, NEWLINE_TERMINATED, { start: 1, end: -1 })).toBe(
      NEWLINE_TERMINATED,
    );
    expect(extractSegment(rawExtract, UNTERMINATED, { start: 1, end: -1 })).toBe(UNTERMINATED);
  });
});

describe("buildPartition", () => {
  test("orders segments by range start, not by declaration order", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [
      ["late", { start: 3, end: -1 }],
      ["early", { start: 1, end: 2 }],
    ]);
    expect(segments.map((s) => s.clusterId)).toEqual(["early", "late"]);
  });
});

describe("verifyCoverage", () => {
  test("an exhaustive contiguous partition reconstructs the source", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [
      ["a", { start: 1, end: 2 }],
      ["b", { start: 3, end: -1 }],
    ]);
    const report = verifyCoverage(NEWLINE_TERMINATED, segments);
    expect(report.complete).toBe(true);
    expect(report.defects).toEqual([]);
    expect(report.reconstructedSha256).toBe(report.sourceSha256);
    expect(segments.map((s) => s.content).join("")).toBe(NEWLINE_TERMINATED);
  });

  test("holds for a source with no trailing newline", () => {
    const segments = partitionOf(UNTERMINATED, [
      ["a", { start: 1, end: 1 }],
      ["b", { start: 2, end: -1 }],
    ]);
    const report = verifyCoverage(UNTERMINATED, segments);
    expect(report.complete).toBe(true);
    expect(segments.map((s) => s.content).join("")).toBe(UNTERMINATED);
  });

  test("holds for a three-way split", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [
      ["a", { start: 1, end: 1 }],
      ["b", { start: 2, end: 3 }],
      ["c", { start: 4, end: -1 }],
    ]);
    expect(verifyCoverage(NEWLINE_TERMINATED, segments).complete).toBe(true);
  });

  test("reports a gap between clusters", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [
      ["a", { start: 1, end: 1 }],
      ["c", { start: 3, end: -1 }],
    ]);
    const report = verifyCoverage(NEWLINE_TERMINATED, segments);
    expect(report.complete).toBe(false);
    expect(report.defects.join(" ")).toContain("gap between clusters");
    expect(report.reconstructedSha256).not.toBe(report.sourceSha256);
  });

  test("reports an overlap between clusters", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [
      ["a", { start: 1, end: 3 }],
      ["b", { start: 2, end: -1 }],
    ]);
    const report = verifyCoverage(NEWLINE_TERMINATED, segments);
    expect(report.complete).toBe(false);
    expect(report.defects.join(" ")).toContain("overlap between clusters");
  });

  test("reports a partition that does not start at line 1", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [["b", { start: 2, end: -1 }]]);
    const report = verifyCoverage(NEWLINE_TERMINATED, segments);
    expect(report.complete).toBe(false);
    expect(report.defects.join(" ")).toContain("must start at line 1");
  });

  test("reports a partition truncated before end-of-file", () => {
    const segments = partitionOf(NEWLINE_TERMINATED, [["a", { start: 1, end: 2 }]]);
    const report = verifyCoverage(NEWLINE_TERMINATED, segments);
    expect(report.complete).toBe(false);
    expect(report.defects.join(" ")).toContain("the source has 5 lines");
  });

  test("an empty segment list is incomplete for non-empty content", () => {
    const report = verifyCoverage(NEWLINE_TERMINATED, []);
    expect(report.complete).toBe(false);
    expect(report.defects).toEqual(["no cluster declares a line range"]);
  });
});
