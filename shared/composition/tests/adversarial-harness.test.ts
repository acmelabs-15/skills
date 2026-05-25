import { describe, expect, test } from "bun:test";
import {
  DriftMarkerMismatchError,
  FixtureMalformedError,
  assertDriftMarkerMatchesTable,
  parseDriftMarker,
} from "./_helpers/adversarial.js";

/**
 * AC-7 drift-marker machinery (REQ-006-SPEC-008).
 *
 * Proves the harness treats each fixture's `<!-- drift-marker: ...;
 * expected-reject: <regex> -->` comment as a mechanically-validated artifact,
 * not stale documentation: the comment MUST be present, its `expected-reject:`
 * regex MUST parse, and that parsed regex MUST equal the runner-table value.
 *
 * The happy path (every real fixture's comment parses + matches its table row)
 * is exercised by `adversarial-claims.test.ts` running `testAdversarial` over
 * the whole fixture set. This file pins the FAILURE paths — a missing/garbled
 * comment and a comment-vs-table divergence — which no on-disk fixture is
 * allowed to trigger, so they must be asserted directly against the exports.
 */

const WELL_FORMED =
  "<!-- drift-marker: drift-01-sample; lying-behavior: claims done while a DoD item is unchecked; expected-reject: /commit SHA/ -->\n\n# Fixture\n";

describe("parseDriftMarker — presence + parse (AC-7, AC-3)", () => {
  test("parses the id and expected-reject regex from a well-formed comment", () => {
    const marker = parseDriftMarker("task/drift-01-sample.md", WELL_FORMED);
    expect(marker.id).toBe("drift-01-sample");
    expect(marker.expectedReject.source).toBe("commit SHA");
    expect(marker.expectedReject.flags).toBe("");
  });

  test("parses a regex literal carrying flags", () => {
    const md = "<!-- drift-marker: drift-02; lying-behavior: x; expected-reject: /fail/i -->\n";
    const marker = parseDriftMarker("task/drift-02.md", md);
    expect(marker.expectedReject.source).toBe("fail");
    expect(marker.expectedReject.flags).toBe("i");
  });

  test("preserves a source that itself contains a slash", () => {
    const md =
      "<!-- drift-marker: drift-03; lying-behavior: x; expected-reject: /tsc --noEmit a\\/b passes/ -->\n";
    const marker = parseDriftMarker("task/drift-03.md", md);
    expect(marker.expectedReject.source).toBe("tsc --noEmit a\\/b passes");
  });

  test("throws a distinct FixtureMalformedError when the drift-marker comment is absent", () => {
    const md = "# Fixture with no drift-marker comment\n\nbody text\n";
    expect(() => parseDriftMarker("task/no-comment.md", md)).toThrow(FixtureMalformedError);
    expect(() => parseDriftMarker("task/no-comment.md", md)).toThrow(/fixture malformed/);
    expect(() => parseDriftMarker("task/no-comment.md", md)).toThrow(/missing required/);
  });

  test("throws a distinct FixtureMalformedError when expected-reject: is missing", () => {
    const md = "<!-- drift-marker: drift-04; lying-behavior: x -->\n# Fixture\n";
    expect(() => parseDriftMarker("task/no-field.md", md)).toThrow(FixtureMalformedError);
    expect(() => parseDriftMarker("task/no-field.md", md)).toThrow(/missing the "expected-reject:" field/);
  });

  test("throws a distinct FixtureMalformedError when the regex literal is unparseable", () => {
    const md = "<!-- drift-marker: drift-05; lying-behavior: x; expected-reject: not-a-regex -->\n";
    expect(() => parseDriftMarker("task/bad-regex.md", md)).toThrow(FixtureMalformedError);
    expect(() => parseDriftMarker("task/bad-regex.md", md)).toThrow(/unparseable expected-reject regex/);
  });

  test("malformed-comment error is NOT a validator rejection — it names the fixture", () => {
    const md = "# no comment\n";
    let caught: unknown;
    try {
      parseDriftMarker("requirement/drift-99-x.md", md);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(FixtureMalformedError);
    expect((caught as Error).message).toContain("requirement/drift-99-x.md");
  });
});

describe("assertDriftMarkerMatchesTable — cross-check (AC-7)", () => {
  test("passes when comment regex equals table regex (source + flags)", () => {
    expect(() =>
      assertDriftMarkerMatchesTable("task/x.md", /commit SHA/, /commit SHA/),
    ).not.toThrow();
  });

  test("passes when both carry identical flags", () => {
    expect(() => assertDriftMarkerMatchesTable("task/x.md", /fail/i, /fail/i)).not.toThrow();
  });

  test("throws a drift error naming the fixture when sources diverge", () => {
    expect(() => assertDriftMarkerMatchesTable("requirement/drift-01.md", /Evidence line/, /Evidence/)).toThrow(
      DriftMarkerMismatchError,
    );
    expect(() => assertDriftMarkerMatchesTable("requirement/drift-01.md", /Evidence line/, /Evidence/)).toThrow(
      /drift: fixture comment regex != table expectedReject/,
    );
    expect(() => assertDriftMarkerMatchesTable("requirement/drift-01.md", /Evidence line/, /Evidence/)).toThrow(
      /requirement\/drift-01\.md/,
    );
  });

  test("throws when sources match but flags diverge", () => {
    expect(() => assertDriftMarkerMatchesTable("task/x.md", /fail/i, /fail/)).toThrow(
      DriftMarkerMismatchError,
    );
  });

  test("drift error is distinct from FixtureMalformedError", () => {
    let caught: unknown;
    try {
      assertDriftMarkerMatchesTable("task/x.md", /a/, /b/);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DriftMarkerMismatchError);
    expect(caught).not.toBeInstanceOf(FixtureMalformedError);
  });
});
