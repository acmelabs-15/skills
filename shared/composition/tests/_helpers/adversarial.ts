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
      { category: "fact", text: "Synthetic child SPEC stub for EPIC cross-note resolution", tags: ["stub"] },
      { category: "fact", text: "Status is ACCEPTED (non-DONE) so the EPIC done-claim must fail", tags: ["stub"] },
      { category: "fact", text: "Only the status field is load-bearing for the validator", tags: ["stub"] },
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
