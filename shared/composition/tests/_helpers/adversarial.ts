import { expect, test } from "bun:test";
import { isAbsolute, join } from "node:path";
import { parseDesignNote } from "../../src/parsers/design-note.js";
import { parseRequirementNote } from "../../src/parsers/requirement-note.js";
import { parseSpecRootNote } from "../../src/parsers/spec-root-note.js";
import { parseTaskNote } from "../../src/parsers/task-note.js";
import { parseTestReportNote } from "../../src/parsers/test-report-note.js";
import { validateDesignComplianceClaim } from "../../src/validators/design-claim-validator.js";
import { validateRequirementAcClaim } from "../../src/validators/requirement-claim-validator.js";
import { validateSpecDoneClaim } from "../../src/validators/spec-claim-validator.js";
import { validateTaskDoneClaim } from "../../src/validators/task-claim-validator.js";
import { validateTestReportPassClaim } from "../../src/validators/test-report-claim-validator.js";
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
  | "test-report"
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
 * Thrown when a fixture cannot be parsed into its note model. Distinct type so
 * the harness surfaces fixture-malformation separately from validator
 * rejection: a malformed fixture is an authoring bug, not a validator verdict.
 */
class FixtureMalformedError extends Error {
  constructor(validator: ValidatorType, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`fixture malformed (${validator}): ${detail}`);
    this.name = "FixtureMalformedError";
  }
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
      case "test-report":
        return parseTestReportNote(md);
      default:
        throw new Error(`no parser registered for validator type "${type}"`);
    }
  } catch (cause) {
    if (cause instanceof FixtureMalformedError) throw cause;
    throw new FixtureMalformedError(type, cause);
  }
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
    case "test-report":
      return validateTestReportPassClaim(
        parsed as Parameters<typeof validateTestReportPassClaim>[0],
      );
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
 * Parse failures surface distinctly: a malformed fixture fails the test with a
 * "fixture malformed" message (a `FixtureMalformedError` thrown by the parser
 * dispatch), keeping fixture-authorship debugging separate from
 * validator-behavior debugging. The harness never short-circuits a parse
 * failure into a passing assertion.
 */
export function testAdversarial(label: string, c: AdversarialCase): void {
  test(`adversarial: ${label}`, async () => {
    const md = await Bun.file(resolveFixturePath(c.fixture)).text();
    const parsed = parseByValidatorType(c.validator, md); // throws → "fixture malformed"
    const result = invokeValidator(c.validator, parsed);

    expect(result.verdict).toBe("FAIL");
    if (result.verdict !== "FAIL") return; // narrows the union for the lines below
    expect(result.unsatisfied.length).toBeGreaterThan(0);

    const message = result.unsatisfied.map((u) => u.text).join(" | ");
    expect(message).toMatch(c.expectedReject);
  });
}
