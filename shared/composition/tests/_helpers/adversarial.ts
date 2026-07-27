import { expect, test } from "bun:test";
import { isAbsolute, join } from "node:path";
import { parseDesignNote } from "../../src/parsers/design-note.js";
import { parseEpicNote } from "../../src/parsers/epic-note.js";
import { parseQaNote } from "../../src/parsers/qa-note.js";
import { parseRequirementNote } from "../../src/parsers/requirement-note.js";
import { parseSpecRootNote } from "../../src/parsers/spec-root-note.js";
import { parseTaskNote } from "../../src/parsers/task-note.js";
import type { EpicNote } from "../../src/schemas/epic-note.js";
import type { SpecRootNote } from "../../src/schemas/spec-root-note.js";
import { SpecRootNoteSchema } from "../../src/schemas/spec-root-note.js";
import { validateDesignComplianceClaim } from "../../src/validators/design-claim-validator.js";
import {
  type SpecResolver,
  validateEpicDoneClaim,
} from "../../src/validators/epic-claim-validator.js";
import { validateQaPassClaim } from "../../src/validators/qa-claim-validator.js";
import { validateRequirementAcClaim } from "../../src/validators/requirement-claim-validator.js";
import { validateSpecDoneClaim } from "../../src/validators/spec-claim-validator.js";
import { validateTaskDoneClaim } from "../../src/validators/task-claim-validator.js";
import type { ClaimResult } from "../../src/validators/types.js";

/**
 * Composition-root directory (the parent of `tests/`). This file lives at
 * `tests/_helpers/adversarial.ts`, so the root is two levels up. Used to
 * resolve composition-root-relative fixture paths (e.g.
 * `tests/fixtures/adversarial/task/drift-01-...md`).
 */
const COMPOSITION_ROOT = join(import.meta.dir, "..", "..");

/**
 * The set of claim-validator types the harness can dispatch to. Mirrors the
 * fixture subdirectory names one-to-one. The `adr` / `analysis` / `epic` tags
 * are reserved for the Track 1 extension (TASK-024); they are part of the
 * union so the harness signature never changes when those validators land, but
 * dispatching to them throws until their parsers/validators exist.
 */
export type ValidatorType =
  | "task"
  | "spec"
  | "requirement"
  | "design"
  | "qa"
  | "adr"
  | "analysis"
  | "epic";

/**
 * One adversarial (agent-lying) scenario. The `fixture` markdown encodes a
 * claim that SHOULD be rejected; the harness parses it, runs the matching
 * validator, and asserts the rejection message matches `expectedReject`.
 */
export type AdversarialCase = {
  /** Absolute or composition-root-relative path to the fixture `.md` file. */
  fixture: string;
  /** Selects the parser + validator pair; mirrors the fixture subdirectory. */
  validator: ValidatorType;
  /** Anchor on the validator's actual rejection message, not a loose match. */
  expectedReject: RegExp;
};

/**
 * Thrown when a fixture cannot be parsed into its note model OR when a fixture's
 * mandatory `drift-marker` comment is absent / unparseable. Distinct type so the
 * harness surfaces fixture-malformation separately from validator rejection: a
 * malformed fixture is an authoring bug, not a validator verdict.
 *
 * Two construction forms:
 * - `(validator, cause)` — a parser threw while loading the note model; the
 *   cause's message is wrapped with the validator tag for context.
 * - `(message)` — the drift-marker comment is missing or its `expected-reject:`
 *   field cannot be parsed; the verbatim message names the offending fixture.
 *
 * Both forms keep the "fixture malformed" prefix so REQ-006 AC-3's distinct
 * surfacing holds: a malformed fixture never masquerades as a validator verdict.
 */
class FixtureMalformedError extends Error {
  constructor(validatorOrMessage: ValidatorType | string, cause?: unknown) {
    if (cause === undefined) {
      super(validatorOrMessage);
    } else {
      const detail = cause instanceof Error ? cause.message : String(cause);
      super(`fixture malformed (${validatorOrMessage}): ${detail}`);
    }
    this.name = "FixtureMalformedError";
  }
}

/**
 * Thrown when a fixture's parsed `drift-marker` comment regex diverges from the
 * runner-table `expectedReject` for the same fixture. The two values must be
 * byte-identical (`.source` + `.flags`) so the in-file comment is a *validated*
 * artifact rather than stale documentation: if a contributor edits one without
 * the other, this fires and names the fixture. Distinct from
 * `FixtureMalformedError` because the comment IS well-formed — the fault is a
 * cross-source drift between the comment and the table, not a malformation.
 */
class DriftMarkerMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriftMarkerMismatchError";
  }
}

/**
 * The parsed contents of a fixture's mandatory `drift-marker` HTML comment.
 * Only `expectedReject` is load-bearing for the rejection assertion; `id` is
 * retained for error messages so a malformed/divergent comment names the
 * fixture by its `drift-NN-<slug>` marker.
 */
type DriftMarker = {
  /** The `drift-NN-<slug>` identifier from the `drift-marker:` field. */
  id: string;
  /** The `RegExp` parsed from the comment's `expected-reject:` field. */
  expectedReject: RegExp;
};

/**
 * Compile a regex-literal string of the form `/source/flags` (the form the
 * fixture authors use in the `expected-reject:` field) into a `RegExp`.
 * The final `/` separates the source from optional trailing flags, so we split
 * on the LAST slash to tolerate sources that themselves contain `/`.
 */
function compileRegexLiteral(literal: string): RegExp {
  const trimmed = literal.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error(`expected a /regex/ literal, got: ${trimmed}`);
  }
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash === 0) {
    throw new Error(`unterminated /regex/ literal: ${trimmed}`);
  }
  const source = trimmed.slice(1, lastSlash);
  const flags = trimmed.slice(lastSlash + 1);
  return new RegExp(source, flags);
}

/**
 * Assert the fixture's mandatory `drift-marker` comment is present, then parse
 * its `expected-reject:` field into a `RegExp`. The comment format (REQ-006
 * AC-7) is:
 *
 *   <!-- drift-marker: <id>; lying-behavior: <one-line>; expected-reject: <regex> -->
 *
 * The `expected-reject:` value runs from after its label to the comment's
 * closing ` -->`. A missing comment, a missing `expected-reject:` field, or an
 * unparseable regex literal all throw `FixtureMalformedError` naming the
 * fixture — keeping a garbled comment a loud authoring failure (AC-3), never a
 * silent pass.
 */
function parseDriftMarker(fixture: string, md: string): DriftMarker {
  const comment = md.match(/<!--\s*drift-marker:\s*([\s\S]*?)\s*-->/);
  if (comment === null) {
    throw new FixtureMalformedError(
      `fixture malformed (${fixture}): missing required <!-- drift-marker: ...; expected-reject: <regex> --> comment`,
    );
  }
  const body = comment[1] ?? "";
  const id = body.split(";", 1)[0]?.trim() ?? "";
  const rejectField = body.match(/expected-reject:\s*([\s\S]*)$/);
  if (rejectField === null) {
    throw new FixtureMalformedError(
      `fixture malformed (${fixture}): drift-marker comment is missing the "expected-reject:" field`,
    );
  }
  try {
    const expectedReject = compileRegexLiteral(rejectField[1] ?? "");
    return { id, expectedReject };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new FixtureMalformedError(
      `fixture malformed (${fixture}): unparseable expected-reject regex in drift-marker comment: ${detail}`,
    );
  }
}

/**
 * Cross-check the regex parsed from the fixture's `drift-marker` comment
 * against the runner-table `expectedReject`. They must be byte-identical in
 * both `.source` and `.flags`; any divergence throws `DriftMarkerMismatchError`
 * naming the fixture. This is the guard that turns the in-file comment from
 * stale documentation into a mechanically-validated artifact (REQ-006 AC-7):
 * once cross-checked, the comment value and the table value are proven
 * identical, so either may serve as the rejection assertion.
 */
function assertDriftMarkerMatchesTable(fixture: string, comment: RegExp, table: RegExp): void {
  if (comment.source === table.source && comment.flags === table.flags) return;
  throw new DriftMarkerMismatchError(
    `drift: fixture comment regex != table expectedReject for "${fixture}": ` +
      `comment /${comment.source}/${comment.flags} vs table /${table.source}/${table.flags}`,
  );
}

/**
 * Resolve a composition-root-relative fixture path to an absolute path.
 * Absolute paths pass through unchanged.
 */
function resolveFixturePath(fixture: string): string {
  return isAbsolute(fixture) ? fixture : join(COMPOSITION_ROOT, fixture);
}

/**
 * Parse a fixture's markdown into the note model the validator expects.
 *
 * Dispatches to the correct parser by validator type so callers stay
 * parser-agnostic. Re-throws any parser failure as a `FixtureMalformedError`
 * so a malformed fixture surfaces with a distinct "fixture malformed" message
 * rather than a confusing validator verdict. Unknown / not-yet-landed validator
 * types (`adr` / `analysis` / `epic`) throw a `FixtureMalformedError` naming
 * the missing dispatch.
 */
function parseByValidatorType(type: ValidatorType, md: string): unknown {
  try {
    switch (type) {
      case "task":
        return parseTaskNote(md);
      case "spec":
        return parseSpecRootNote(md);
      case "requirement":
        return parseRequirementNote(md);
      case "design":
        return parseDesignNote(md);
      case "qa":
        return parseQaNote(md);
      case "epic":
        return parseEpicNote(md);
      default:
        throw new Error(`no parser registered for validator type "${type}"`);
    }
  } catch (cause) {
    if (cause instanceof FixtureMalformedError) throw cause;
    throw new FixtureMalformedError(type, cause);
  }
}

/**
 * Synthesize a schema-valid, NON-DONE `SpecRootNote` for an EPIC `contains`
 * reference. This is the harness's stand-in for the cross-note resolution that
 * `validateEpicDoneClaim` requires: the EPIC validator is the only Wave 2
 * validator with a cross-note dependency, so the fixture alone cannot encode
 * the lie — the harness must supply a resolver that resolves the contained ref
 * to a SPEC whose status is NOT `"DONE"`. Returning a status of `IN_PROGRESS`
 * makes the contained SPEC "unfinished", so the validator rejects the EPIC's
 * DONE claim.
 *
 * The synthetic note carries the SPEC number derived from the reference (e.g.
 * `"SPEC-099: Unfinished Child Spec"` → 099) so the frontmatter title/permalink
 * pass `SpecRootNoteSchema`; only the `status` field is load-bearing for the
 * cross-note check. `ACCEPTED` is the chosen non-DONE status: per
 * `SpecRootNoteStatusEnum` (DRAFT | PROPOSED | ACCEPTED | DONE | DEPRECATED),
 * DONE is the SPEC's sole terminal status, so any other value (here ACCEPTED —
 * "accepted but not yet shipped") models an unfinished child SPEC.
 */
function synthUnfinishedSpec(specRef: string): SpecRootNote {
  const num = specRef.match(/SPEC-(\d{3,})/)?.[1] ?? "099";
  return SpecRootNoteSchema.parse({
    frontmatter: {
      title: `SPEC-${num}: Unfinished Child Spec`,
      type: "spec",
      permalink: `specs/spec-${num}-unfinished/spec-${num}-unfinished`,
      status: "ACCEPTED",
      tags: ["drift-marker", "epic-cross-note"],
    },
    context: "Synthetic non-DONE child SPEC supplied by the adversarial harness resolver.",
    scope_in: [],
    scope_out: [],
    sections: { Context: "Synthetic." },
    observations: [
      {
        category: "fact",
        text: "Synthetic child SPEC stub for EPIC cross-note resolution",
        tags: ["stub"],
      },
      {
        category: "fact",
        text: "Status is ACCEPTED (non-DONE) so the EPIC done-claim must fail",
        tags: ["stub"],
      },
      {
        category: "fact",
        text: "Only the status field is load-bearing for the validator",
        tags: ["stub"],
      },
    ],
    relations: [
      { verb: "part_of", target: "EPIC-092: Sample Adversarial Epic Roadmap" },
      { verb: "relates_to", target: "SPEC-008: Protocol Hardening Wave 2" },
    ],
  });
}

/**
 * Resolver the harness injects into `validateEpicDoneClaim` for the `epic`
 * adversarial case. Every contained SPEC reference resolves to a synthetic
 * NON-DONE SpecRootNote, so a DONE EPIC that `contains` any SPEC is rejected —
 * the exact cross-note lie the fixture encodes.
 */
const adversarialSpecResolver: SpecResolver = (specRef) => synthUnfinishedSpec(specRef);

/**
 * Adapt the EPIC validator's cross-note result (`{ ok, unsatisfied: [{spec_ref,
 * status}] }`) to the harness's `ClaimResult` contract (`{ verdict, total,
 * unsatisfied: [{index, text}] }`). The EPIC validator does not share the
 * checkbox-oriented `ClaimResult` shape used by the other five validators
 * (it predates a flat `{ ok }` discriminant per TASK-009 DoD), so the harness
 * normalizes here. Each offending SPEC becomes one `unsatisfied` entry whose
 * `text` carries the SPEC reference + resolved status, so `expectedReject`
 * anchors on the specific unfinished child SPEC.
 */
function invokeEpicValidator(parsed: EpicNote): ClaimResult {
  const result = validateEpicDoneClaim(parsed, { resolveSpec: adversarialSpecResolver });
  if (result.ok) {
    return { verdict: "PASS", total: 0 };
  }
  const unsatisfied = result.unsatisfied.map((u, index) => ({
    index,
    text: `${u.spec_ref} (status ${u.status})`,
  }));
  return { verdict: "FAIL", total: unsatisfied.length, unsatisfied };
}

/**
 * Invoke the claim validator matching the validator type against the parsed
 * note. The parsed shape is validated by `parseByValidatorType`, so the cast
 * to each validator's input type is safe at this point.
 */
function invokeValidator(type: ValidatorType, parsed: unknown): ClaimResult {
  switch (type) {
    case "task":
      return validateTaskDoneClaim(parsed as Parameters<typeof validateTaskDoneClaim>[0]);
    case "spec":
      return validateSpecDoneClaim(parsed as Parameters<typeof validateSpecDoneClaim>[0]);
    case "requirement":
      return validateRequirementAcClaim(parsed as Parameters<typeof validateRequirementAcClaim>[0]);
    case "design":
      return validateDesignComplianceClaim(
        parsed as Parameters<typeof validateDesignComplianceClaim>[0],
      );
    case "qa":
      return validateQaPassClaim(parsed as Parameters<typeof validateQaPassClaim>[0]);
    case "epic":
      return invokeEpicValidator(parsed as EpicNote);
    default:
      throw new Error(`no validator registered for validator type "${type}"`);
  }
}

/**
 * Register a Bun test that proves a lying claim is mechanically rejected.
 *
 * The harness loads the fixture markdown, parses it via the validator-matched
 * parser, invokes the validator, and asserts the verdict is `FAIL` with at
 * least one unsatisfied item whose joined message matches `expectedReject`.
 *
 * Regex-anchoring contract (NON-NEGOTIABLE): `expectedReject` MUST anchor on a
 * SPECIFIC fragment of the validator's actual rejection text — for example
 * `/all DoD items.*deferred/` or `/verdict mismatch: declared/`. A loose
 * matcher such as `/./`, `/fail/i`, or `/error/` is FORBIDDEN: it would let a
 * validator-behavior regression (rejecting for the WRONG reason) pass silently.
 * Anchor on the message the specific lying scenario should provoke, not on the
 * mere fact that some rejection occurred.
 *
 * Drift-marker validation (REQ-006 AC-7) runs FIRST, before parsing: the
 * harness asserts the fixture carries a `<!-- drift-marker: ...; expected-reject:
 * <regex> -->` comment, parses the regex from it, and cross-checks that parsed
 * regex against the table `expectedReject`. A missing/garbled comment throws a
 * distinct "fixture malformed" error (AC-3); a comment whose regex diverges from
 * the table throws a "drift: fixture comment regex != table expectedReject"
 * error naming the fixture. Both fire loudly rather than passing silently. Once
 * cross-checked, the comment value and the table value are proven identical, so
 * the rejection assertion uses the validated (comment-parsed) regex.
 *
 * Parse failures surface distinctly: a malformed fixture fails the test with a
 * "fixture malformed" message (a `FixtureMalformedError` thrown by the parser
 * dispatch), keeping fixture-authorship debugging separate from
 * validator-behavior debugging. The harness never short-circuits a parse
 * failure into a passing assertion.
 */
export function testAdversarial(label: string, c: AdversarialCase): void {
  test(`adversarial: ${label}`, async () => {
    const md = await Bun.file(resolveFixturePath(c.fixture)).text();

    // AC-7: assert + parse the drift-marker comment, then cross-check it against
    // the table value so the comment is a validated artifact, not stale docs.
    const marker = parseDriftMarker(c.fixture, md); // throws → "fixture malformed"
    assertDriftMarkerMatchesTable(c.fixture, marker.expectedReject, c.expectedReject);

    const parsed = parseByValidatorType(c.validator, md); // throws → "fixture malformed"
    const result = invokeValidator(c.validator, parsed);

    expect(result.verdict).toBe("FAIL");
    if (result.verdict !== "FAIL") return; // narrows the union for the lines below
    expect(result.unsatisfied.length).toBeGreaterThan(0);

    // Assert against the validated (comment-parsed) regex; proven identical to
    // the table value by the cross-check above.
    const message = result.unsatisfied.map((u) => u.text).join(" | ");
    expect(message).toMatch(marker.expectedReject);
  });
}

/**
 * Exported for direct unit testing of the AC-7 drift-marker machinery
 * (presence + parse + cross-check). The `testAdversarial` registration path
 * exercises these on every real fixture; these exports let the failure paths
 * (missing/garbled comment, comment-vs-table divergence) be asserted directly
 * without authoring a deliberately-broken fixture file on disk.
 */
export {
  DriftMarkerMismatchError,
  FixtureMalformedError,
  assertDriftMarkerMatchesTable,
  parseDriftMarker,
};
export type { DriftMarker };
