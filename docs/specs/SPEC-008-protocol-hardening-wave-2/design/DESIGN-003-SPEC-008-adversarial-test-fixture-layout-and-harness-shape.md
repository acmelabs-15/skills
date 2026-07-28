---
title: 'DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-003-spec-008-adversarial-test-fixture-layout-and-harness-shape
status: ACCEPTED
tags:
- design
- spec-008
- track-3
- adversarial
- harness
- fixtures
---

# DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-3 locks the shared fixture-driven harness pattern. This DESIGN specifies the concrete shape of the harness function, the on-disk layout of the fixture directory, the naming convention that turns each fixture filename into a drift regression marker (Audit E item 10), the extension path for the post-Track-1 validator additions (ADR / ANALYSIS / EPIC), and the integration boundaries between this harness and the Track 3 integration plus mutation tests. The composition library already establishes a `tests/fixtures/` directory containing per-type `*-sample.md` files (the canonical happy-path round-trip fixtures); the adversarial layout extends this directory rather than introducing a parallel structure.

## Design

### Fixture directory layout

The fixture root is `shared/composition/tests/fixtures/adversarial/`. Each validator type gets a subdirectory whose name matches the validator's canonical short name:

| Validator | Subdirectory | Status at Track 3 close |
| --- | --- | --- |
| `validateTaskDoneClaim` | `task/` | Populated by TASK-022 |
| `validateSpecDoneClaim` | `spec/` | Populated by TASK-022 |
| `validateRequirementAcClaim` | `requirement/` | Populated by TASK-022 |
| `validateDesignComplianceClaim` | `design/` | Populated by TASK-022 |
| `validateQaPassClaim` | `qa/` | Populated by TASK-022 |
| `validateAdrAcceptedClaim` | `adr/` | Populated by TASK-024 (depends on Track 1) |
| `validateAnalysisAcceptedClaim` | `analysis/` | Populated by TASK-024 (depends on Track 1) |
| `validateEpicDoneClaim` | `epic/` | Populated by TASK-024 (depends on Track 1) |

CRIT has no claim validator (per ADR-005 D-5 Implementation Notes) and so no adversarial harness coverage. The `task/spec/requirement/design/qa/` quintet is the Track 3 floor; the `adr/analysis/epic/` extension lands once Track 1 ships the matching validators.

### Fixture file naming convention

Each fixture filename takes the form `drift-NN-<slug>.md` where:

- `drift` is the literal prefix marking the file as a drift regression marker
- `NN` is a two-digit counter unique within its validator subdirectory (restarts per subdirectory; the `task/` subdir starts at `drift-01`, the `spec/` subdir starts at `drift-01`)
- `<slug>` is a lowercase kebab-case description of the lying behavior the fixture encodes (e.g., `all-deferred-bypass`, `checkbox-flip-without-evidence`, `ac-flip-without-evidence`)

Examples:

- `shared/composition/tests/fixtures/adversarial/task/drift-01-all-deferred-bypass.md`
- `shared/composition/tests/fixtures/adversarial/task/drift-02-checkbox-flip-without-evidence.md`
- `shared/composition/tests/fixtures/adversarial/requirement/drift-01-ac-flip-without-evidence.md`
- `shared/composition/tests/fixtures/adversarial/spec/drift-01-spec-done-with-all-deferred-success-criteria.md`

The filename IS the drift regression marker: a contributor who finds a new drift surface adds one fixture file with a descriptive slug and one row to the test runner. No registry, no separate marker database, no comment tagging required for the adversarial harness layer. (The drift-marker comment convention in REQ-007 is a separate mechanism for tagging existing pre-Wave-2 tests; the two mechanisms are complementary, not duplicative.)

### Harness function shape

The harness lives at `shared/composition/tests/_helpers/adversarial.ts` (matches the existing `tests/_helpers/` convention). Signature:

```typescript
import { expect, test } from "bun:test";

export type AdversarialCase = {
  fixture: string; // absolute or composition-root-relative path to the fixture .md file
  validator: "task" | "spec" | "requirement" | "design" | "qa" | "adr" | "analysis" | "epic";
  expectedReject: RegExp; // anchor on the validator's actual error message, not loose match
};

export function testAdversarial(label: string, c: AdversarialCase): void {
  test(`adversarial: ${label}`, async () => {
    const md = await Bun.file(c.fixture).text();
    const parsed = parseByValidatorType(c.validator, md); // throws on fixture malformed
    const result = invokeValidator(c.validator, parsed);
    expect(result.valid).toBe(false);
    expect(result.unsatisfied.length).toBeGreaterThan(0);
    const message = result.unsatisfied.map(u => u.message).join(" | ");
    expect(message).toMatch(c.expectedReject);
  });
}
```

Key design properties:

1. **Parser selection by validator type.** The harness exposes a single API but routes to the correct parser internally (`parseByValidatorType`). Callers do not import parsers; they pick a validator-type tag and the harness handles dispatch.
2. **Parse failure surfaces distinctly from validator rejection.** `parseByValidatorType` throws on a malformed fixture; the test reports "fixture malformed" via the throw, not via a confusing `valid: true` from the validator. This separation is non-negotiable per REQ-006 AC-3.
3. **Regex anchoring on validator error messages.** Callers MUST pass `expectedReject` as a specific anchor (e.g., `/all DoD items are deferred/`) rather than a loose match (e.g., `/error/`). The harness contract documents this in a JSDoc block above `testAdversarial`.
4. **No fixture loading by glob.** The runner explicitly enumerates fixtures in a table; mismatched fixture-file / table entry counts surface as test failures via an additional `tests/adversarial-claims.test.ts` assertion that walks the fixture directory and verifies every file is referenced.

### Test runner shape

The runner at `shared/composition/tests/adversarial-claims.test.ts` is table-driven:

```typescript
import { testAdversarial } from "./_helpers/adversarial.ts";

const cases: AdversarialCase[] = [
  { fixture: "tests/fixtures/adversarial/task/drift-01-all-deferred-bypass.md", validator: "task", expectedReject: /all DoD items.*deferred/ },
  { fixture: "tests/fixtures/adversarial/task/drift-02-checkbox-flip-without-evidence.md", validator: "task", expectedReject: /DoD item.*unchecked/ },
  // ... eight more entries covering Audit E top-10
];

for (const c of cases) {
  const label = c.fixture.split("/").pop()!.replace(/\.md$/, "");
  testAdversarial(label, c);
}
```

Plus one verification block that walks the on-disk fixture tree and asserts every fixture file is referenced in `cases` (no orphan fixtures; no broken table rows).

### Drift-surface to fixture mapping (Audit E item 10 alignment)

Each fixture's `drift-NN-<slug>` filename IS the drift regression marker; the slug names the drift surface. A contributor reading the test output sees the slug directly in the test label ("adversarial: drift-01-all-deferred-bypass"), and the slug greps back to the fixture file. No external mapping table is required because the filename IS the mapping.

For Phase X drift surfaces (per [[RETRO-003: Phase X Execution and Composition Library Completion]]), TASK-022 enumerates which fixture file regression-locks which Phase X surface in the fixture's frontmatter `tags` array (e.g., `tags: [drift-marker, phase-x-surface-12, task-validator]`). This keeps the linkage greppable without forcing an external registry.

### Extension path for Track 1 validators

When Track 1 lands `validateAdrAcceptedClaim`, `validateAnalysisAcceptedClaim`, `validateEpicDoneClaim` (and the PLAN-done-claim refinement), TASK-024 adds three new fixture subdirectories (`adr/`, `analysis/`, `epic/`), at least one drift fixture per new validator covering its highest-value rejection scenario, and the corresponding rows in `tests/adversarial-claims.test.ts`. The harness signature does NOT change; only the `validator` tag union expands, which is already encoded in the type definition above.

## Module Structure

```
shared/composition/tests/
├── _helpers/
│   └── adversarial.ts                    NEW (TASK-021)
├── fixtures/
│   ├── ... (existing happy-path fixtures unchanged)
│   ├── adversarial/                      NEW (TASK-022)
│   │   ├── task/
│   │   │   ├── drift-01-all-deferred-bypass.md
│   │   │   ├── drift-02-checkbox-flip-without-evidence.md
│   │   │   └── ... (further Track 3 + future additions)
│   │   ├── spec/
│   │   ├── requirement/
│   │   ├── design/
│   │   ├── qa/
│   │   ├── adr/                          (added by TASK-024 after Track 1)
│   │   ├── analysis/                     (added by TASK-024 after Track 1)
│   │   └── epic/                         (added by TASK-024 after Track 1)
│   └── integration/                      NEW (TASK-025)
│       └── ... (cross-note fixture pairs for integration tests)
├── adversarial-claims.test.ts            NEW (TASK-023)
├── integration/                          NEW (TASK-025)
│   ├── parse-mutate-validate-render.test.ts
│   ├── cross-note-spec-task-consistency.test.ts
│   └── qa-vs-task-dod.test.ts
└── mutation-invariants.test.ts           NEW (TASK-026 + TASK-027)
```

## Interfaces

### `testAdversarial(label, case)`

Input: `{ fixture: string; validator: ValidatorType; expectedReject: RegExp }`. Side effect: registers a Bun test that loads the fixture, parses it via the validator-appropriate parser, invokes the validator, and asserts rejection matching `expectedReject`. No return value.

### `parseByValidatorType(type, md)`

Internal helper inside `adversarial.ts`. Input: `(ValidatorType, string)`. Output: `ParsedNote` shape matching the validator's input contract. Throws on malformed fixture. Centralizes parser-selection logic so callers stay parser-agnostic.

### `invokeValidator(type, parsed)`

Internal helper inside `adversarial.ts`. Input: `(ValidatorType, ParsedNote)`. Output: `{ valid: boolean; unsatisfied: { message: string }[] }`. Maps validator-type tag to actual validator function from `shared/composition/src/validators/`.

## Compliance

- [x] Harness lives at `shared/composition/tests/_helpers/adversarial.ts` per ADR-005 D-3 verbatim
- [x] Fixture directory layout matches `tests/fixtures/adversarial/<type>/drift-NN-<slug>.md` per ADR-005 D-3 verbatim
- [x] `testAdversarial` signature matches `{fixture, validator, expectedReject}` per ADR-005 D-3 verbatim
- [x] Parse-error path surfaces distinctly from validator-rejection path
- [x] Harness regex contract documented in JSDoc to discourage loose matchers
- [x] Table runner verifies every fixture file is referenced and every reference resolves to an on-disk file (no orphans, no broken pointers)
- [x] Extension path for Track 1 validators (ADR / ANALYSIS / EPIC) is captured without harness signature changes

## Observations

- [design] Fixture filename IS the drift regression marker; no external registry needed because grep over filenames retrieves the marker set #naming-is-mapping #grep-friendly
- [decision] `_helpers/adversarial.ts` location chosen to match existing composition test-suite convention; co-locates helpers with the tests that import them #convention-alignment
- [constraint] Parse-error path MUST be distinguishable from validator-rejection path in test output; fixture-malformation debugging stays separate from validator-behavior debugging #separation-of-concerns
- [insight] Track 1 extension is a pure addition: new validator types extend the union tag, new fixture subdirs land alongside existing ones, harness signature untouched #zero-breaking-change
- [risk] Loose `expectedReject` regex (e.g., `/error/`) could let validator-behavior regressions slip through; mitigated by JSDoc contract requiring specific message anchors #regex-tightness
- [outcome] Audit E item 10 (37 Phase X drift surfaces uncaptured) becomes mechanically closable: each surface becomes one fixture file plus one runner row, with the filename as the citation #audit-e-closure

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- depends_on [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
