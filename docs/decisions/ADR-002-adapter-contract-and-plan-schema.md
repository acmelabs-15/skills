---
title: 'ADR-002: Adapter Contract and Plan Schema'
type: decision
status: ACCEPTED
date: 2026-05-19
updated: 2026-07-26
permalink: decisions/adr-002-adapter-contract-and-plan-schema
tags:
- decision
- skills-ecosystem
- adapter-contract
- plan-schema
- design
---

# ADR-002: Adapter Contract and Plan Schema

## Status

ACCEPTED (2026-05-19; brain:---adr-review Phase 4 convergence PASS round 2 unanimous 6 ACCEPT + 0 BLOCK + 0 P0 + 0 NEW P1/P2 across all 6 reviewers — architect + critic + independent-thinker + security + analyst + high-level-advisor; all 12 round-1 P1 findings / 10 deduplicated themes confirmed resolved per CRIT-002-ADR-002 round-2 verdict tally + updated Clarifications)

## Context and Problem Statement

ADR-001 locks the foundational and architectural choices for the composition library: Zod for plan validation (D-1), unified + remark for markdown AST (D-2), YAML for plan files (D-3), discriminated union on source_type (D-4), and brain:---adr-review as a BLOCKING gate (D-5). It also locks 8 foundational design decisions (F-1 through F-8) including the SHA-256 char-identity hash protocol with write-to-temp-then-rename rollback and BLOCKING injectivity validators on renumber/wikilink maps.

What ADR-001 does NOT specify is the design-level CONTRACT that every per-type adapter must satisfy, the concrete YAML schema shape that drives the deterministic script, or how the abstract hash protocol (F-8) maps to per-type extraction and mutation strategies. Without these locked design decisions, adapter implementors would make independent structural choices that diverge across the 5 source types, defeating the unified adapter contract that ADR-001 D-4 established as an architectural invariant.

This ADR specifies the adapter contract, plan YAML schema, per-type capability matrix, per-type hash extraction strategies, and modular Zod validator structure as 5 composite design decisions (D-1 through D-5) that build on top of the locked choices in ADR-001. Every D-N in this ADR honors a locked decision from ADR-001. See [[ADR-001: Composition Library Architecture]] for the upstream foundational and architectural decisions.

## Decision Drivers

1. **Deterministic execution requires an explicit contract.** The script consumes a plan YAML and dispatches to a per-type adapter. Without a formally specified adapter interface, each adapter implementor must reverse-engineer the expected method signatures from usage, creating silent divergence across the 5 types.

2. **Zod schema must catch malformed plans at script entry.** Per ADR-001 D-1 (Zod) and F-8 (hash protocol), invalid plans must be rejected before any file I/O occurs. The Zod schema shape must be specified at design time so that the script's entry point validation is unambiguous.

3. **Per-type variation deserves per-type adapters, not switch statements.** ADR-001 D-4 locks the discriminated union on source_type. ADR-002 D-3 specifies exactly which capabilities each adapter must provide and which are type-specific (e.g., regenerative content in PLAN, recursive subtree in SPEC), preventing switch-statement sprawl in the core library.

4. **Hash protocol from ADR-001 F-8 needs per-type extraction strategy.** F-8 defines the 4-step hash protocol abstractly (extract S, write D, reverse-mutate to D', compare SHA-256). Each source type has different section boundaries, mutation surfaces, and edge cases (e.g., PLAN's regenerative content, SESSION's cross-source mutations). Without per-type specification, adapter implementors must invent extraction strategies independently.

5. **SPEC subtree complexity demands earliest-possible capability matrix.** The SPEC subtree adapter (~500 LOC, recursive filename/relation rewrite) is the hardest adapter. Surfacing a capability matrix at design time forces the team to confront the full scope of per-type variation before any code is written, preventing mid-implementation scope surprises.

## Considered Options

### Axis 1: Adapter Interface Sync vs Async

#### Option A: Synchronous Adapter Interface (SELECTED)

All adapter methods (parse, extractByRange, applyMutations, reverseMutations, serialize, hash) are synchronous.

**Pros:**

- Markdown parsing is CPU-bound string processing with no I/O; async adds overhead without benefit
- Deterministic script invariant is easier to reason about when all operations are synchronous
- No need for Promise.all coordination or error propagation across async boundaries
- Bun.hash("sha256", ...) is synchronous; Bun.file().text() can be called at the script entry point and the result passed as a string argument to sync adapter methods

**Cons:**

- If a future adapter needs async I/O (e.g., fetching a remote note), the interface must be extended
- Large notes (>1 MB) could block the event loop during parse; mitigated by the 1 MB file-size guard in ADR-001 Confirmation

#### Option B: Asynchronous Adapter Interface

All adapter methods return Promises.

**Pros:**

- Future-proof for adapters that may need I/O
- Consistent with the broader Bun/Node.js async ecosystem

**Cons:**

- Adds unnecessary complexity for CPU-bound markdown operations
- Every caller must await; error handling requires try/catch in async context
- Makes the round-trip property test harder to read and debug (async assertion chains)

### Axis 2: SPEC Subtree Hash Validation Granularity

#### Option A: Per-File Hash Validation (SELECTED)

Each file in the SPEC subtree (root, each REQ, each DESIGN, each TASK) is hash-validated independently.

**Pros:**

- Pinpoints exactly which file has drift; error messages identify the drifting file
- Rollback granularity matches file granularity (write-to-temp-then-rename is per-file)
- Simpler implementation: the same hash protocol that works for ADR/ANALYSIS/SESSION works for each SPEC child file
- Composable: the SPEC adapter iterates over its children and delegates to the per-file hash protocol

**Cons:**

- More hash computations (N+1 for a SPEC with N children); mitigated by SHA-256 being sub-millisecond for note-sized files

#### Option B: Per-Subtree Hash Validation

Hash the entire serialized subtree (root + all children concatenated in deterministic order) as a single blob.

**Pros:**

- Single hash comparison for the entire SPEC

**Cons:**

- Cannot pinpoint which file drifted; error message says "SPEC subtree hash mismatch" without identifying the culprit
- Requires deterministic concatenation order (filename sort); an implementation bug in ordering silently breaks the hash chain
- Does not align with the per-file write-to-temp-then-rename rollback mechanism from ADR-001 F-8

### Axis 3: Zod Schema Modularity

#### Option A: Monolithic Schema File

Single file containing all Zod schemas (base + all 5 per-type extensions + discriminated union).

**Pros:**

- No import graph to manage; everything in one place

**Cons:**

- File grows to 500+ lines as adapters are added
- All adapters coupled in a single module; changing one type's schema requires navigating all types
- Does not align with the per-type adapter file layout in shared/composition/src/adapters/

#### Option B: Modular Per-Type Schema Files (SELECTED)

Base discriminator schema in base.plan.schema.ts; per-type extension schemas in {type}.plan.schema.ts; composed into the discriminated union in index.ts.

**Pros:**

- Per-type schema files mirror the per-type adapter files in src/adapters/
- Adding a new adapter type means adding one schema file and one line in the union composition
- Each schema file is self-contained and testable independently

**Cons:**

- Import graph across 6+ files; mitigated by a single index.ts re-export

## Decision

This ADR specifies the adapter contract and plan YAML schema as 5 composite design decisions building on the locked choices in ADR-001. Together they define the complete design-level interface between the plan YAML (LLM-authored, user-adjudicated) and the deterministic script (adapter-dispatched, hash-validated).

### D-1: Plan YAML Schema Shape

Two plan envelopes, one per direction: a distribution plan (1 to N split, used by /decompose) and a composition plan (N to 1 merge, used by /recompose). Both are discriminated on `plan_type`, and both carry `source_type` selecting the per-type adapter per ADR-001 D-4.

**As-built envelope (canonical).** The shipped envelope is the one the CLI loads, declared at `shared/composition/src/schemas/plan-yaml.ts`. A distribution plan is `source_path` plus top-level `renumber_map` and `wikilink_map` plus a `clusters` record; each cluster carries `range`, an optional `destination_path`, and optional per-cluster overrides (`frontmatter_map`, `regenerated_sections`, `disposition`, `scaffold`). A composition plan is `target_path` plus `sources[]` — each entry either a bare path or a path plus the `scaffold` decompose wrapped around it — plus top-level `renumber_map` and `wikilink_map`. Both envelopes are `.strict()`, so an unrecognised field is rejected rather than silently ignored.

One envelope per direction is the standard. Field primitives — paths, line ranges, mutation maps and their F-8 invariants, scaffolding, disposition — have a single definition site at `shared/composition/schemas/base.ts` and are imported, never re-declared; the envelope module declares only the two envelope shapes. The per-type envelope wrappers that previously restated those shapes were never loaded by either entry point and were retired rather than reconciled.

The YAML blocks that follow in this section predate the as-built envelope and are retained as intent-level illustrations of the per-type extension points (section delimiters, cross-source updates, subtree manifests). Where an illustration's field names differ from the as-built shape above, the as-built shape governs. In particular, the `frontmatter_map` blocks below are written field-keyed; the as-built semantics are value-keyed per D-2.

**Common envelope fields:**

```yaml
plan_type: "distribution" | "composition"
source_type: "adr" | "analysis" | "session" | "plan" | "spec"
version: 1                          # schema version for forward compat
created: "2026-05-19T14:30:00Z"     # ISO 8601
validation:
  sha256_protocol: true              # F-8 hash check enabled (always true)
  max_file_size_bytes: 1048576       # 1 MB guard per ADR-001 Confirmation
```

**Distribution plan envelope (decompose: 1 to N):**

```yaml
plan_type: "distribution"
source:                              # singular source for distribution
  path: "docs/decisions/ADR-001-brain.md"
  sha256: "abc123..."               # pre-operation hash of entire file
destinations:
  - id: "cluster-1"
    output_path: "docs/decisions/ADR-001a-brain.md"
    line_range: { start: 45, end: 120 }
    mutations:
      renumber_map: { "D-1": "D-1", "D-2": "D-2" }
      wikilink_map: {}
```

**Composition plan envelope (recompose: N to 1):**

```yaml
plan_type: "composition"
sources:                             # plural sources for composition
  - path: "docs/decisions/ADR-001a-brain.md"
    sha256: "abc123..."
    line_range: { start: 1, end: -1 }
  - path: "docs/decisions/ADR-001b-brain.md"
    sha256: "def456..."
    line_range: { start: 1, end: -1 }
destination:
  output_path: "docs/decisions/ADR-001-brain-merged.md"
  mutations:
    renumber_map: { "D-1": "D-3" }
    wikilink_map: {}
```

**Per-type discriminated extensions:**

The `source_type` field selects the per-type Zod schema extension, adding type-specific fields to the common envelope. Each extension is defined for BOTH plan_type variants (distribution and composition), yielding 10 total schema variants organized as a nested discriminated union.

**ADR extension (distribution variant):**

```yaml
plan_type: "distribution"
source_type: "adr"
source:
  path: "docs/decisions/ADR-001-brain.md"
  sha256: "abc123..."
section_delimiter: "### "
destinations:
  - id: "cluster-1"
    output_path: "docs/decisions/ADR-001a-brain.md"
    line_range: { start: 45, end: 120 }
    mutations:
      renumber_map: { "D-1": "D-100", "D-2": "D-101" }
      wikilink_map: {}
```

**ADR extension (composition variant):**

```yaml
plan_type: "composition"
source_type: "adr"
sources:
  - path: "docs/decisions/ADR-001a-brain.md"
    sha256: "abc123..."
    line_range: { start: 1, end: -1 }
  - path: "docs/decisions/ADR-001b-brain.md"
    sha256: "def456..."
    line_range: { start: 1, end: -1 }
section_delimiter: "### "
destination:
  output_path: "docs/decisions/ADR-001-brain-merged.md"
  mutations:
    renumber_map: { "D-1": "D-3" }
    wikilink_map: {}
```

For `source_type: "adr"`, the extension adds `section_delimiter: "### "` (H3 under `## Decision`) and validates that `renumber_map` keys match the D-N identifier pattern.

For `source_type: "analysis"`, the extension adds `section_delimiter: "## "` (H2 finding sections) and makes `renumber_map` optional (analysis items may not have numbered identifiers that require renumbering).

For `source_type: "session"`, the extension adds `section_delimiter: "## Event "` (H2 Event sections) and a `cross_source_updates` field specifying PLAN part mutations (owning_session, completing_session wikilink rewrites that the PLAN adapter processes independently).

**SESSION cross_source_updates concrete structure:**

```yaml
source_type: "session"
cross_source_updates:
  - target_file: "docs/planning/PLAN-001-brain.md"
    target_part_id: "research.1"
    updates:
      owning_session: "<SESSION-2026-05-19_02: New Session>"
      completing_session: "<SESSION-2026-05-19_02: New Session>"
  - target_file: "docs/planning/PLAN-001-brain.md"
    target_part_id: "decisions.1"
    updates:
      owning_session: "<SESSION-2026-05-19_02: New Session>"
```

Cross_source_updates handoff to PLAN adapter validated by PLAN adapter's own char-identity check; failure mode: SESSION adapter aborts if PLAN adapter rejects.

For `source_type: "plan"`, the extension adds `section_delimiter: "### "` for phase section boundaries. The `renumber_map` keys use `{phase}.{part-id}` format. The `regenerated_sections` field on MutationSpec lists sections excluded from hash validation (see D-2 MutationSpec and D-4 PLAN extraction strategy).

For `source_type: "spec"`, the extension adds a `subtree_manifest` field containing a structured manifest of the SPEC root and all child files, each with its own `renumber_map`, `wikilink_map`, `frontmatter_map`, and `filename_rewrite_map`. The `renumber_map` keys use `{ENTITY}-{NNN}` format (e.g., "REQ-001" to "REQ-003").

**SPEC subtree_manifest concrete structure:**

```yaml
source_type: "spec"
subtree_manifest:
  root:
    source_path: "docs/specs/SPEC-001-brain/SPEC-001-brain.md"
    mutations:
      renumber_map: { "SPEC-001": "SPEC-003" }
      wikilink_map:
        "<SPEC-001: Brain>": "<SPEC-003: Brain Reorg>"
      frontmatter_map:
        title: "SPEC-003: Brain Reorg"
        permalink: "specs/spec-003-brain-reorg/spec-003-brain-reorg"
  children:
    - source_path: "docs/specs/SPEC-001-brain/requirements/REQ-001-SPEC-001-injectable-data-source.md"
      dest_path: "docs/specs/SPEC-003-brain-reorg/requirements/REQ-001-SPEC-003-injectable-data-source.md"
      mutations:
        renumber_map: { "REQ-001-SPEC-001": "REQ-001-SPEC-003" }
        wikilink_map:
          "<REQ-001-SPEC-001: Injectable Data Source>": "<REQ-001-SPEC-003: Injectable Data Source>"
        frontmatter_map:
          title: "REQ-001-SPEC-003: Injectable Data Source"
          permalink: "specs/spec-003-brain-reorg/requirements/req-001-spec-003-injectable-data-source"
      filename_rewrite_map:
        "REQ-001-SPEC-001-injectable-data-source.md": "REQ-001-SPEC-003-injectable-data-source.md"
    - source_path: "docs/specs/SPEC-001-brain/tasks/TASK-001-SPEC-001-create-datasource-interface.md"
      dest_path: "docs/specs/SPEC-003-brain-reorg/tasks/TASK-001-SPEC-003-create-datasource-interface.md"
      mutations:
        renumber_map: { "TASK-001-SPEC-001": "TASK-001-SPEC-003" }
        wikilink_map:
          "<TASK-001-SPEC-001: Create DataSource Interface>": "<TASK-001-SPEC-003: Create DataSource Interface>"
        frontmatter_map:
          title: "TASK-001-SPEC-003: Create DataSource Interface"
          permalink: "specs/spec-003-brain-reorg/tasks/task-001-spec-003-create-datasource-interface"
      filename_rewrite_map:
        "TASK-001-SPEC-001-create-datasource-interface.md": "TASK-001-SPEC-003-create-datasource-interface.md"
```

The root vs children distinction ensures the SPEC root note and each child note have independent mutation specifications, enabling per-file hash validation per Considered Options Axis 2.

```yaml
# ... common envelope

destinations:

- id: "cluster-1"
    output_path: "docs/decisions/ADR-001a-brain.md"
    line_range: { start: 45, end: 120 }
    mutations:
      renumber_map: { "D-1": "D-1", "D-2": "D-2" }
      wikilink_map: {}
- id: "cluster-2"
    output_path: "docs/decisions/ADR-001b-brain.md"
    line_range: { start: 121, end: 250 }
    mutations:
      renumber_map: { "D-3": "D-1", "D-4": "D-2" }
      wikilink_map: {}

```

**Composition plan (recompose: N to 1):**

```yaml
plan_type: "composition"
source_type: "adr"
# ... common envelope but source is replaced by sources ...
sources:
  - path: "docs/decisions/ADR-001a-brain.md"
    sha256: "abc123..."
    line_range: { start: 1, end: -1 }   # -1 means entire file
  - path: "docs/decisions/ADR-001b-brain.md"
    sha256: "def456..."
    line_range: { start: 1, end: -1 }
destination:
  output_path: "docs/decisions/ADR-001-brain-merged.md"
  mutations:
    renumber_map: { "D-1": "D-3" }
    wikilink_map: {}
```

**Per-type discriminated extensions:**

The `source_type` field selects the per-type Zod schema extension, adding type-specific fields to the common envelope.

For `source_type: "adr"`, the extension adds `section_delimiter: "### "` (H3 under `## Decision`) and validates that `renumber_map` keys match the D-N identifier pattern.

For `source_type: "analysis"`, the extension adds `section_delimiter: "## "` (H2 finding sections) and makes `renumber_map` optional (analysis items may not have numbered identifiers).

For `source_type: "session"`, the extension adds `section_delimiter: "## Event "` (H2 Event sections) and a `cross_source_updates` field specifying PLAN part mutations (owning_session, completing_session wikilink rewrites that the PLAN adapter processes independently).

For `source_type: "plan"`, the extension adds `regenerated_sections: string[]` listing sections that are regenerated rather than hash-validated (e.g., "Progress Dashboard", "Cross-Part Dependency Graph") and `section_delimiter: "### "` for phase section boundaries. The `renumber_map` keys use `{phase}.{part-id}` format.

For `source_type: "spec"`, the extension adds a `subtree` manifest field containing an array of child file entries, each with its own `renumber_map`, `wikilink_map`, and `filename_rewrite_map`. The `renumber_map` keys use `{ENTITY}-{NNN}` format (e.g., "REQ-001" to "REQ-003").

### D-2: Adapter Interface Contract

Every per-type adapter implements the following TypeScript interface. The interface is synchronous per the Considered Options Axis 1 decision. The `hash()` utility is NOT part of the adapter interface; it is a shared utility at `shared/composition/src/core/hash.ts` exporting `function sha256(content: string): string { return Bun.hash("sha256", content) }`. Adapters compose with this utility via import, not via polymorphism (see P1-I resolution in Clarifications).

```typescript
import type { Root } from "mdast";

/** Line range within a source file (1-indexed, inclusive on both ends). */
interface LineRange {
  start: number;
  end: number; // -1 means "to end of file"
}

/** Maps from source identifier to destination identifier. */
type RenumberMap = Record<string, string>;

/** Maps from source wikilink to destination wikilink. */
type WikilinkMap = Record<string, string>;

/**
 * Maps an EXISTING frontmatter value to its replacement (VALUE-KEYED).
 * A frontmatter line is rewritten when its current value matches a key.
 *
 * Value-keyed rather than field-keyed because F-8 requires
 * reverseMutations to be an exact inverse of applyMutations. A
 * value-to-value map inverts by swapping keys and values. A field-keyed
 * map -- {field: newValue} -- cannot be inverted at all, because it never
 * records the old value: inverting {status: "SUPERSEDED"} yields
 * {SUPERSEDED: "status"}, which looks for a field named SUPERSEDED.
 */
type FrontmatterMap = Record<string, string>;

/**
 * Mutation specification from the plan YAML.
 *
 * renumber_map and wikilink_map govern body-content mutations.
 * frontmatter_map governs YAML frontmatter values (title,
 * permalink, tags, etc.) and is VALUE-KEYED: each entry maps an
 * existing value to its replacement, matched against the current
 * value of a frontmatter line rather than against its field name.
 * reverseMutations applies the inverse frontmatter_map (swap keys
 * and values) before hash-comparison so that frontmatter changes
 * do not break char-identity validation.
 *
 * regenerated_sections lists H2/H3 heading names whose content
 * is derived (Information Model Category 2) and therefore
 * excluded from both extraction and hash-comparison. The
 * validator REJECTS plans where regenerated_sections covers
 * more than 50% of source content lines (integrity floor).
 */
interface MutationSpec {
  renumber_map: RenumberMap;
  wikilink_map: WikilinkMap;
  frontmatter_map?: FrontmatterMap;
  regenerated_sections?: string[];
}

/**
 * Contract that every per-type adapter must implement.
 * All methods are synchronous -- markdown parsing is CPU-bound
 * string processing with no I/O requirement.
 *
 * Canonical call sequence:
 * 1. parse(content) -> AST             (used for round-trip property test validation)
 * 2. extractByRange(content, range) -> str  (operates on raw lines; output is a raw string slice)
 * 3. applyMutations(str, mutations) -> str  (string-level transforms on extracted content; NOT AST)
 * 4. reverseMutations(str, mutations) -> str (inverse of applyMutations for F-8 hash-compare)
 * 5. serialize(ast) -> content         (round-trip: serialize(parse(content)) === content)
 *
 * AST (parse/serialize) is used for round-trip char-identity validation only.
 * The production hash-validation path is string-based: extract -> mutate -> write;
 * then extract destination -> reverse-mutate -> hash-compare against source extraction.
 *
 * hash() is NOT on this interface. Use the shared sha256() utility from
 * shared/composition/src/core/hash.ts (wraps Bun.hash("sha256", content)).
 */
interface CompositionAdapter {
  /** The source_type this adapter handles. */
  readonly sourceType: string;

  /**
   * Parse raw markdown content into a typed remark MDAST.
   * Uses unified + remark-parse + remark-frontmatter per ADR-001 D-2.
   * parse(content) followed by serialize(parse(content)) MUST produce
   * char-identical output to content (round-trip identity).
   */
  parse(content: string): Root;

  /**
   * Extract content by line range from the source.
   * The line range comes from the plan YAML.
   * Operates on raw string lines, NOT on the AST.
   * Returns the raw string content within the specified lines.
   */
  extractByRange(content: string, range: LineRange): string;

  /**
   * Apply forward mutations (renumber + wikilink + frontmatter substitution)
   * to content. These are the ONLY permitted mutations per the LLM-script
   * division of labor. Applied AFTER extraction, BEFORE writing.
   * String-level transforms; does NOT use the AST.
   *
   * When mutations.frontmatter_map is present, applies frontmatter field
   * replacements (e.g., title, permalink) in the extracted content's
   * YAML frontmatter block.
   *
   * When mutations.regenerated_sections is present, lines belonging to
   * listed sections (matched by H2/H3 heading) are SKIPPED from the
   * mutation pass (they will be regenerated, not mutated).
   */
  applyMutations(content: string, mutations: MutationSpec): string;

  /**
   * Apply inverse mutations to content (reverse renumber + reverse
   * wikilink + reverse frontmatter substitution). Used in the F-8
   * hash validation protocol: reverse-mutate the destination content
   * to recover the source form, then compare SHA-256 hashes.
   *
   * When mutations.frontmatter_map is present, applies the inverse
   * mapping (swap keys and values) to frontmatter fields.
   *
   * When mutations.regenerated_sections is present, lines belonging to
   * listed sections are SKIPPED from the reverse-mutation pass and from
   * the hash-comparison scope.
   */
  reverseMutations(content: string, mutations: MutationSpec): string;

  /**
   * Serialize an MDAST back to markdown string.
   * remark-stringify deterministic output is part of the char-identity
   * chain per ADR-001 D-2 + F-8.
   */
  serialize(ast: Root): string;
}
```

Shared types (`LineRange`, `RenumberMap`, `WikilinkMap`, `FrontmatterMap`, `MutationSpec`) live at `shared/composition/src/core/types.ts`. The `CompositionAdapter` interface lives at `shared/composition/src/core/adapter.ts`. The shared `sha256()` utility lives at `shared/composition/src/core/hash.ts`. The `Root` type is the remark/mdast `Root` node type from the `@types/mdast` package.

The parse/serialize round-trip contract requires that for every adapter, `serialize(parse(content)) === content` holds. This is a precondition for the F-8 hash validation chain. If remark-stringify introduces whitespace normalization (a known risk noted in ADR-001 Confirmation), the adapter must configure remark-stringify to preserve the original formatting. This contract is enforced by the round-trip property test from KICKOFF-BRIEF.md.

The applyMutations/reverseMutations inverse contract requires that for every adapter and every injective MutationSpec, `reverseMutations(applyMutations(content, mutations), mutations) === content`. Injectivity of the mutation maps is validated by the Zod schema at plan load time (D-5), not by the adapter at runtime.

The frontmatter_map inverse contract requires that for every adapter, applying frontmatter_map then its inverse (swapping keys and values) recovers the original frontmatter field values. This is critical for the SPEC subtree adapter where title and permalink must be reverse-mutated before hash-comparison.

The regenerated_sections stripping contract requires that sections listed in `regenerated_sections` are excluded from BOTH the source extraction hash AND the destination reverse-mutation hash. The integrity floor (50% maximum coverage) is enforced at the Zod schema level (D-5), not at the adapter level.

### D-3: Per-Type Capability Matrix

Each adapter handles a specific source type with varying capabilities based on the structural characteristics of that note type.

**ADR adapter (~250 LOC; build order 1, PROOF)**

Sections delimited by H3 headings (`### D-N: Title`) nested under `## Decision`. The ADR adapter validates the core architecture: extract by H3 range, apply D-N renumber plus cross-cluster wikilink substitution, hash-validate, write via temp-then-rename. Both Distribution (split one ADR into multiple) and Composition (merge multiple ADRs into one) supported. This is the first adapter built because it exercises every code path in the composition library with the simplest structural complexity.

**ANALYSIS adapter (~50 LOC delta; build order 2)**

Sections delimited by H2 headings (`## Finding Title` or `## Item N`). Minimal mutation surface: only inter-cluster wikilink rewrites needed (analysis items rarely have numbered identifiers that require renumbering). Both Distribution and Composition supported.

**SESSION adapter (~100 LOC delta; build order 3)**

Sections delimited by `## Event NN` headings. Event-NN numbering restarts per new session note (decompose scenario: splitting a session by event ranges). Cross-source mutation: when a SESSION decompose splits events that reference PLAN parts (owning_session, completing_session fields), the SESSION adapter emits cross-source update instructions in the plan YAML but does NOT mutate the PLAN note itself. The PLAN adapter validates its own content independently. The cross_source_updates handoff to the PLAN adapter is validated by the PLAN adapter's own char-identity check; failure mode: SESSION adapter aborts if PLAN adapter rejects. Both Distribution and Composition supported.

**PLAN adapter (~250 LOC delta; build order 4)**

Sections delimited by `### {phase}.{part-id}` headings within the Workflow Plan. Phase plus part-id numbering restarts per new PLAN note. Regenerative content: the Progress Dashboard table and Cross-Part Dependency Graph (Mermaid) are derived views (Information Model Category 2 from CONVENTIONS) that are regenerated from the structural content rather than hash-validated against source. The plan YAML's `regenerated_sections` field (on MutationSpec) explicitly lists these sections; the adapter applies this declaratively via extractByRange + reverseMutations, skipping lines belonging to listed sections (matched by H2/H3 heading). The hash protocol applies only to narrative and structural content (Workflow Plan section bodies, Phase Progression rows, Decision Log entries). Both Distribution and Composition supported.

**SPEC subtree adapter (~500 LOC delta; build order 5, HARDEST)**

Unlike the other 4 adapters which operate on a single file, the SPEC adapter operates on an entire subtree: the SPEC root note plus child directories (`requirements/`, `design/`, `tasks/`) containing REQ, DESIGN, and TASK notes. Per-child operations include entity identifier renumber (e.g., REQ-001-SPEC-001 to REQ-003-SPEC-002), filename rewrite (via move_note), frontmatter update (title, permalink, tags) via MutationSpec.frontmatter_map, intra-spec relation preservation, and cross-spec relation rewrite. The plan YAML's `subtree_manifest` field contains a manifest of all child files with per-child mutation maps, distinguishing root vs children. Each file in the subtree is hash-validated independently (per Considered Options Axis 2). Atomicity per ADR-001 F-8 rollback protocol: all files in the cluster written to .tmp, all hash-validated, then all renamed atomically. SPEC subtree explicitly uses frontmatter_map for title/permalink reversal during the hash-comparison step. Both Distribution and Composition supported.

**Implementation pattern note**: ADR, ANALYSIS, and SESSION adapters extend a shared `BaseMarkdownAdapter` class with config-only overrides on `section_delimiter`, `identifier_pattern`, and related structural parameters. PLAN and SPEC adapters are distinct implementations due to regenerative content handling (PLAN) and recursive subtree mutations (SPEC). The ADR-002 interface contract (D-2 CompositionAdapter) is the public surface; BaseMarkdownAdapter is an internal implementation detail that reduces LOC duplication across the 3 simple adapters without changing the public contract.

**Capability matrix:**

| Adapter | Decompose | Recompose | Cross-Source Mutation | Regenerative Content | Recursive Subtree | Frontmatter Mutation | LOC Estimate | Build Order |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| ADR | Yes | Yes | No | No | No | No | ~250 | 1 (PROOF) |
| ANALYSIS | Yes | Yes | No | No | No | No | ~50 delta | 2 |
| SESSION | Yes | Yes | Yes (emits PLAN update instructions) | No | No | No | ~100 delta | 3 |
| PLAN | Yes | Yes | No | Yes (Dashboard, Mermaid) | No | No | ~250 delta | 4 |
| SPEC subtree | Yes | Yes | Yes (cross-spec relation rewrite) | No | Yes (root + children) | Yes (title, permalink) | ~500 delta | 5 |

### D-4: Hash Validation Per-Type Extraction Strategies

ADR-001 F-8 defines the abstract 4-step hash protocol. This section specifies how each adapter maps to that protocol.

Notation: S = source extraction (pre-mutation). D = destination content (post-write). D' = reverse-mutated destination. S_hash = SHA-256(S). D'_hash = SHA-256(D').

**Single-pass replacement semantics and key-value domain disjointness**

All renumber_map and wikilink_map replacements use single-pass semantics: every occurrence of a key in the content is replaced with its mapped value in ONE pass. For single-pass replacement to be deterministic and reversible, the keys and values MUST come from disjoint domains. Formally: `set(keys) intersection set(values) === empty set`. This constraint is enforced by the Zod injectivity validator in D-5.

Example of a REJECTED map: `{"D-1": "D-2", "D-2": "D-3"}` -- "D-2" appears as both a key AND a value.

The rule survives on forward-compatibility grounds, not on a present-day miscompare. As implemented, replacement compiles every key into ONE regular-expression alternation and makes a single pass, so each matched position is consumed once and no rule can observe another rule's output; the chained map above therefore happens to apply and invert correctly today. What the constraint protects is the property rather than the current implementation. Any future move to sequential per-key replacement, or any mutation surface that rewrites in more than one pass, reintroduces order dependence — and a map that is disjoint by construction cannot be broken by that change. Rejecting the collision at plan load also keeps the failure at the earliest possible point rather than inside a hash comparison, where the diagnosis is far more expensive.

Implementer note: the simplest renumbering scheme uses target IDs in a high-numbered range (e.g., source D-1..D-5 mapped to target D-100..D-104) to guarantee disjointness. A final-renumber phase in the destination then moves D-100..D-104 down to D-1..D-N target range. This two-phase approach is an implementation detail, not an interface concern.

**ADR**

Extract S by H3 line range from the plan YAML. The line range spans from one `### D-N:` heading to the next (exclusive) or to the start of the next H2 section. Mutations consist of D-N identifier renumber (e.g., D-3 to D-1 in the destination) applied via single-pass string replacement scoped to the extracted content, plus cross-cluster wikilink substitution applied globally within the extraction. Reverse-mutate D to D' by applying the inverse renumber map (swap keys and values) and inverse wikilink map to the destination content. Compare S_hash === D'_hash. Mismatch triggers ROLLBACK per F-8.

**ANALYSIS**

Extract S by H2 section line range. Each H2 finding or item section is one extraction unit. Mutations are minimal: only inter-cluster wikilink rewrites (e.g., when moving a finding from one ANALYSIS note to another, update self-referencing wikilinks). No identifier renumber unless the analysis uses numbered items. Reverse-mutate D to D' by applying the inverse wikilink map. Compare S_hash === D'_hash.

**SESSION**

Extract S by `## Event NN` line range. Each Event section is one extraction unit. Mutations include Event-NN renumber within the session (e.g., Event 05 becomes Event 01 in the destination session). Cross-source updates (references to PLAN parts such as owning_session and completing_session wikilinks) are recorded in the plan YAML's `cross_source_updates` field but are NOT part of the SESSION adapter's hash check. The SESSION adapter hash-validates only the session content itself; the PLAN adapter validates its own content separately. Cross_source_updates handoff to PLAN adapter validated by PLAN adapter's own char-identity check; failure mode: SESSION adapter aborts if PLAN adapter rejects. Reverse-mutate D to D' by applying the inverse Event-NN renumber. Cross-source PLAN references in the destination are left as-is (they are not part of the SESSION hash scope). Compare S_hash === D'_hash (SESSION content only; cross-source PLAN updates validated by PLAN adapter).

**PLAN**

Extract S by `### {phase}.{part-id}` section line range for structural/narrative content. Regenerative sections (Progress Dashboard, Cross-Part Dependency Graph) are excluded from extraction via the declarative `regenerated_sections` field on MutationSpec. The adapter applies this in extractByRange + reverseMutations: lines belonging to listed sections (matched by H2/H3 heading) are SKIPPED from extraction and hash-comparison. Mutations include phase plus part-id renumber and wikilink substitution for session and SPEC references that change across plans. The reverse-mutate step strips regenerative sections from both S and D' before comparison (or equivalently, excludes them from extraction on both sides). Compare S_hash === D'_hash (structural/narrative content only; regenerative content excluded from both sides).

**SPEC subtree**

Per-file extraction. Each file (SPEC root, each REQ, each DESIGN, each TASK) is extracted independently by its full content (line_range start=1, end=-1 for whole-file). Mutations per file include entity identifier renumber (e.g., REQ-001-SPEC-001 to REQ-003-SPEC-002), frontmatter title/permalink update via frontmatter_map, intra-spec relation preservation, and cross-spec relation rewrite. Filename rewrite is handled at the filesystem level (via move_note) and is not part of content hash. Reverse-mutate D to D' per-file by applying inverse renumber plus inverse wikilink plus inverse frontmatter_map (swap keys and values on frontmatter fields before hash-comparison). Compare per-file S_hash === D'_hash. Each file validated independently. A single file mismatch triggers ROLLBACK of the entire SPEC cluster (all .tmp files removed per ADR-001 F-8 rollback protocol).

### D-5: Plan YAML Validator Structure

The Zod validator is modular, mirroring the per-type adapter layout per Considered Options Axis 3. The top-level schema uses a nested discriminated union: outer discriminant on `plan_type`, inner discriminant on `source_type`, per P1-D resolution.

**File layout:**

```
shared/composition/schemas/
  base.ts                            # Common envelope + shared types + composed union
  distribution/
    adr.plan.schema.ts               # ADR distribution-specific fields
    analysis.plan.schema.ts          # ANALYSIS distribution-specific fields
    session.plan.schema.ts           # SESSION distribution-specific fields
    plan.plan.schema.ts              # PLAN distribution-specific fields
    spec.plan.schema.ts              # SPEC distribution-specific fields
  composition/
    adr.plan.schema.ts               # ADR composition-specific fields
    analysis.plan.schema.ts          # ANALYSIS composition-specific fields
    session.plan.schema.ts           # SESSION composition-specific fields
    plan.plan.schema.ts              # PLAN composition-specific fields
    spec.plan.schema.ts              # SPEC composition-specific fields
  index.ts                           # Nested discriminated union assembly + re-exports
```

**Base schema (base.ts):**

Defines the common envelope fields, shared types, and shared refinements:

```typescript
import { z } from "zod";

const lineRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int(), // -1 means "to end of file"
}).refine(
  (r) => r.end === -1 || r.end >= r.start,
  { message: "end must be >= start or -1" }
);

const renumberMapSchema = z.record(z.string(), z.string());
const wikilinkMapSchema = z.record(z.string(), z.string());
const frontmatterMapSchema = z.record(z.string(), z.string()).optional();

const mutationSpecSchema = z.object({
  renumber_map: renumberMapSchema,
  wikilink_map: wikilinkMapSchema,
  frontmatter_map: frontmatterMapSchema,
  regenerated_sections: z.array(z.string()).optional(),
});

const validationSchema = z.object({
  sha256_protocol: z.literal(true),
  max_file_size_bytes: z.number().int().positive().max(1_048_576),
});

/** Shared source entry (used in composition plans). */
const sourceEntrySchema = z.object({
  path: z.string(),
  sha256: z.string(),
  line_range: lineRangeSchema,
});

/** Shared destination entry (used in distribution plans). */
const destinationEntrySchema = z.object({
  id: z.string(),
  output_path: z.string(), // refined to containedPathSchema below
  line_range: lineRangeSchema,
  mutations: mutationSpecSchema,
});
```

**Injectivity validators (BLOCKING per ADR-001 F-8):**

Implemented as Zod `.refine()` rules on the renumber_map and wikilink_map fields. Validates BOTH injectivity (unique values: Set size === array length) AND key-value domain disjointness (keys and values come from disjoint sets). Without disjointness, single-pass string replacement is order-dependent and non-reversible.

```typescript
/** Validates that a map is injective AND has disjoint key-value domains. */
const injectiveDisjointMap = (fieldName: string) =>
  z.record(z.string(), z.string()).refine(
    (map) => {
      const keys = Object.keys(map);
      const values = Object.values(map);
      // Injectivity: no two source IDs map to the same target
      const uniqueValues = new Set(values).size === values.length;
      // Disjointness: keys and values come from disjoint domains
      const keySet = new Set(keys);
      const disjoint = values.every((v) => !keySet.has(v));
      return uniqueValues && disjoint;
    },
    {
      message: `${fieldName} must be injective (unique targets) with disjoint key-value domains (no key appears as a value). Example rejection: {"D-1":"D-2","D-2":"D-3"} fails because "D-2" is both key and value.`,
    }
  );

const injectiveRenumberMap = injectiveDisjointMap("renumber_map");
const injectiveWikilinkMap = injectiveDisjointMap("wikilink_map");
```

**Regenerated-sections integrity floor (BLOCKING):**

Prevents plans from declaring everything as regenerative, which would bypass hash validation entirely. The validator REJECTS plans where `regenerated_sections` covers more than 50% of source content lines.

```typescript
/**
 * Applied as a refinement on the per-plan schema (not on MutationSpec alone,
 * because the check requires reading source content length from the plan).
 * The actual line-count check runs at script execution time; the schema-level
 * guard validates that regenerated_sections is not suspiciously large relative
 * to the total section count.
 */
const regeneratedSectionsFloor = z.array(z.string()).refine(
  (sections) => sections.length <= 10,
  {
    message:
      "regenerated_sections declares more than 10 sections; likely integrity bypass. Maximum 10 sections (enforced at schema level); runtime validates <50% of source lines.",
  }
);
```

**Cross-source updates Zod shape (SESSION extension):**

```typescript
const crossSourceUpdateSchema = z.object({
  target_file: z.string(),
  target_part_id: z.string(),
  updates: z.record(z.string(), z.string()),
});
```

SESSION plan schemas extend the base with `cross_source_updates: z.array(crossSourceUpdateSchema).optional()`.

**SPEC subtree manifest Zod shape (SPEC extension):**

```typescript
const specSubtreeManifestSchema = z.object({
  root: z.object({
    source_path: z.string(),
    mutations: mutationSpecSchema,
  }),
  children: z.array(
    z.object({
      source_path: z.string(),
      dest_path: z.string(),
      mutations: mutationSpecSchema,
      filename_rewrite_map: z.record(z.string(), z.string()).optional(),
    })
  ),
});
```

SPEC plan schemas extend the base with `subtree_manifest: specSubtreeManifestSchema`.

**Path containment validator (BLOCKING per ADR-001 Confirmation):**

Implemented as a `.refine()` rule on all output path fields. Uses `realpath` on both the input path and the docs root to handle symlinks (architecturally relevant per ADR-001 F-1 symlink-based skill install). The `path.sep` suffix prevents prefix-match false positives (e.g., `docs-backup/` matching `docs/`).

```typescript
import { resolve, sep } from "node:path";
import { realpath } from "node:fs/promises";

/**
 * Async refinement. Zod supports async parse via .parseAsync().
 * Uses realpath to resolve symlinks before containment check,
 * preventing symlink bypass where a path resolves outside docs/
 * when dereferenced. The path.sep suffix ensures that
 * "docs-backup/" does not match "docs/".
 */
const containedPathSchema = z.string().refine(
  async (p) => {
    const docsRoot = resolve(process.env.SKILLS_DOCS_ROOT ?? "docs");
    const resolvedBase = await realpath(docsRoot);
    const resolvedPath = await realpath(resolve(p));
    return resolvedPath.startsWith(resolvedBase + sep);
  },
  { message: "Path escapes docs/ root via symlink or .. (CWE-22 mitigation; realpath-based)" }
);
```

Note: because containedPathSchema uses async `realpath`, the overall plan schema must be parsed via `planSchema.parseAsync(data)` rather than `planSchema.parse(data)`. This is the one async boundary in the validation pipeline; all adapter methods remain synchronous per Axis 1.

**Precondition — this mitigation FAILS OPEN.** The realpath containment layer runs only when a containment root is configured through the `SKILLS_DOCS_ROOT` environment variable. With the variable unset, the plan-level containment driver returns an empty offender list without examining any path, and the write-path refinement returns without adding an issue: containment is skipped silently rather than failing closed. The lexical half of the guard — traversal-segment and absolute-path rejection — still applies unconditionally to every path in the plan, so the residual exposure with the variable unset is symlink escape specifically, not arbitrary traversal. The shipped skill workflows ARM it: the decompose and recompose skill documents export `SKILLS_DOCS_ROOT` in their CLI invocation blocks with the tradeoff stated inline, so on the path this library actually ships, the realpath layer is active. The residual precondition is therefore narrower than fail-open alone suggests — a direct CLI invocation made outside those workflows does not inherit that arming, and because the default is open rather than closed, it degrades silently to the lexical guard rather than refusing to run. The open default is deliberate and documented in the code: failing closed would reject every plan in an unconfigured environment, including plans with no path issue at all. The clause worth carrying is that the CWE-22 symlink mitigation is a property of the invocation, not of the schema.

**Nested discriminated union assembly (index.ts):**

The outer discriminant is `plan_type` (distribution vs composition). Each branch is an inner `z.discriminatedUnion("source_type", [...])` selecting the per-type extension.

```typescript
import { z } from "zod";
// Distribution variants
import { adrDistributionSchema } from "./distribution/adr.plan.schema";
import { analysisDistributionSchema } from "./distribution/analysis.plan.schema";
import { sessionDistributionSchema } from "./distribution/session.plan.schema";
import { planDistributionSchema } from "./distribution/plan.plan.schema";
import { specDistributionSchema } from "./distribution/spec.plan.schema";
// Composition variants
import { adrCompositionSchema } from "./composition/adr.plan.schema";
import { analysisCompositionSchema } from "./composition/analysis.plan.schema";
import { sessionCompositionSchema } from "./composition/session.plan.schema";
import { planCompositionSchema } from "./composition/plan.plan.schema";
import { specCompositionSchema } from "./composition/spec.plan.schema";

/** Inner union per plan_type: source_type discriminant. */
const distributionPlanSchema = z.discriminatedUnion("source_type", [
  adrDistributionSchema,
  analysisDistributionSchema,
  sessionDistributionSchema,
  planDistributionSchema,
  specDistributionSchema,
]);

const compositionPlanSchema = z.discriminatedUnion("source_type", [
  adrCompositionSchema,
  analysisCompositionSchema,
  sessionCompositionSchema,
  planCompositionSchema,
  specCompositionSchema,
]);

/**
 * Outer union: plan_type discriminant.
 * Distribution plans have singular `source` field.
 * Composition plans have plural `sources` field.
 */
export const planSchema = z.discriminatedUnion("plan_type", [
  distributionPlanSchema,
  compositionPlanSchema,
]);

export type Plan = z.infer<typeof planSchema>;
```

Note on Zod nested discriminatedUnion: `z.discriminatedUnion` requires each variant to be a `z.object` with the discriminant key. The inner unions (distributionPlanSchema, compositionPlanSchema) are themselves discriminated unions, not z.objects. If Zod does not support nesting discriminated unions directly as variants of an outer discriminated union, the implementation falls back to a wrapper: each inner union is wrapped in a z.object with `plan_type: z.literal("distribution")` (or "composition") plus a `.passthrough()` that delegates to the inner union. The spec-phase DESIGN notes will resolve this implementation detail; the architectural intent (two-level type narrowing on plan_type then source_type) is locked here.

**Per-type extension schemas:**

Each per-type schema file exports a Zod schema that extends the base with type-specific fields. Distribution schemas include singular `source` plus `destinations` array; composition schemas include plural `sources` array plus singular `destination`.

The `adr.plan.schema.ts` (distribution) adds `section_delimiter: z.literal("### ")` and ADR-specific renumber_map key format validation (D-N pattern via regex refine).

The `analysis.plan.schema.ts` (distribution) adds `section_delimiter: z.literal("## ")` and optional renumber_map.

The `session.plan.schema.ts` (distribution) adds `section_delimiter: z.literal("## Event ")` and `cross_source_updates: z.array(crossSourceUpdateSchema).optional()`.

The `plan.plan.schema.ts` (distribution) adds `section_delimiter: z.literal("### ")` and MutationSpec's `regenerated_sections` field is validated against the regenerated-sections integrity floor.

The `spec.plan.schema.ts` (distribution) adds `subtree_manifest: specSubtreeManifestSchema`. No destinations array; the subtree_manifest defines per-file destination paths.

Composition variants mirror the structure with `sources` (plural) replacing `source` (singular) and `destination` (singular) replacing `destinations` (plural).

**Error reporting format:**

Zod parse errors are expanded into a structured array for human-readable output:

```typescript
interface PlanValidationError {
  path: string[];       // Zod error path (e.g., ["destinations", 0, "mutations", "renumber_map"])
  message: string;      // Human-readable message
  severity: "error" | "warning";
}
```

Zod's native `ZodError.issues` array is mapped to this format. No raw `_errors` blob is ever surfaced to the user. Warnings are used for non-blocking advisories (e.g., "renumber_map is empty; no renumbering will occur"). Errors are BLOCKING and prevent script execution.

### D-6: Destination Scaffolding and the Retention Disposition

Recorded as a decision rather than a clarification. This is a plan-schema shape absent from D-1 and a bound on the F-8 guarantee D-2 states, which is the same class of change the 2026-05-21 C-9 entry handled by pointing at a decision record rather than at a clarification.

**Disposition.** Every cluster in a distribution plan carries `disposition: "write" | "retain"`, defaulting to `write`. A `write` cluster produces a destination file. A `retain` cluster is counted by the byte-accountability proof but written nowhere, which lets a split account for every source byte without forcing the source's own frontmatter and trailing sections verbatim into a child note. A retained cluster's line range and the SHA-256 of its pre-mutation source extraction are recorded in the audit log; its content is not.

**Retention rejects destination-side fields.** A cluster with `disposition: "retain"` must declare neither `destination_path` nor `scaffold`. Both are rejected by a schema refinement rather than ignored, because on a cluster that writes no file those fields are contradictory rather than merely redundant.

**Scaffolding.** A `write` cluster may carry a `scaffold`: structured frontmatter (title, type, status, permalink, tags), observations, and relations, from which the executor renders a prologue (frontmatter block plus H1) and an epilogue (`## Observations` then `## Relations`) around the preserved content slice. A partitioned slice is not by itself a canonical note — only the cluster covering line 1 inherits the source's frontmatter and H1, and only the final cluster inherits its trailing sections — so scaffolding is what lets every destination satisfy the structural invariants on its own. The prologue's H1 is DERIVED from `frontmatter.title` rather than accepted as separate input, which makes "H1 matches the frontmatter title verbatim" impossible to violate through a plan.

**Scaffolding is asymmetric with regenerated_sections, not a mirror of it.** Both sit outside the hash chain, and the resemblance ends there:

| Property | `regenerated_sections` | `scaffold` |
|:--|:--|:--|
| Origin | Derived from source content that is itself hash-verified | Authored in the plan |
| Exclusion scope | Excluded from extraction AND from hash comparison | Excluded from hash comparison ONLY — scaffolding never exists in the source, so there is nothing to exclude from extraction |
| Volume bound | Max 10 sections at schema level; runtime check floors coverage at 50% of source lines | Max 10 tags, 15 observations, 15 relations, 500 characters per structural string; transitively bounded by the CWE-400 1 MB plan guard, which reads plan size from metadata before any content is loaded |

Stating the asymmetry matters because the derived-and-floored safety argument does not transfer to authored content. Scaffolding earns its exclusion a different way: it is a pure function of the plan, so the stripper RE-RENDERS the expected prologue and epilogue and exact-matches them against the written bytes before slicing, rather than trusting a recorded offset. Over the remaining body the proof is byte-for-byte as strong as the unscaffolded case.

**Strip failure is BLOCKING.** A failed strip throws an integrity error carrying exit code 2; the staged cluster is rolled back and nothing is renamed. It is not an advisory that may be logged and stepped past.

**The scaffold is a trust boundary, and the schema is the only gate on it.** The hash-excluded region is plan-controlled content rendered into markdown structure, and the byte proof deliberately does not look there — so a malformed string is not caught by it. Line breaks are the vector: a title containing a newline followed by `---` closes the frontmatter block early, and an observation containing a newline followed by `## Relations` forges the final-two-sections structure. Neither corrupts the preserved slice, but both produce a destination whose structure is not what the plan described, and because the stripper re-derives the SAME rendered scaffolding, the strip still succeeds and the comparison still passes over an untouched body. The plan is already untrusted for CWE-502 and CWE-22; treating it as trusted for rendered content would be inconsistent. Every structural scaffold string is therefore length-bounded and rejects carriage returns and newlines, and tags additionally reject whitespace.

**Re-derivation couples strippability to serializer stability.** Because the stripper re-renders the prologue, the frontmatter serializer's output is part of the recovery contract rather than a formatting choice. The options are pinned in one frozen constant (line wrapping disabled, quote style set explicitly) and js-yaml is pinned to a single major version. A serializer change in wrapping, quoting, or key spacing would make previously-written shards un-strippable and strand them. Recompose fails closed at exit 2, which is the right direction, but a dependency bump carries a named obligation, and that obligation is narrower than re-running the scaffold tests generally. The round-trip suites — `tests/decompose-scaffold.test.ts` and `tests/recompose-scaffold.test.ts` — are STRUCTURALLY BLIND to renderer drift, because strip re-renders the expected prologue and epilogue using the very functions that wrote them. A format change moves both sides of the comparison identically and simultaneously, so those suites keep passing while previously-written shards already on disk are stranded. What can catch the drift is the `renderPrologue` describe block in `tests/cluster-scaffold.test.ts`, which asserts against rendered text directly rather than against a re-render. Even that is currently partial: its assertions are substring checks on individual field lines, and nothing asserts on the rendered `tags:` sequence at all. A byte-exact golden over the full rendered frontmatter, tags included, is registered as the test follow-up. `tests/scaffold-hardening.test.ts` substitutes for none of this — it exercises the scaffold schema's structural-injection guards and pins no renderer formatting.

**Dead-path residue is counted, not read.** Four times in this library a definition existed, was tested, and was not the one running on the production path: the canonical map validator with no production import while a weaker local copy ran; a line-range primitive declared with a numeric type and therefore unreachable from any FAILSAFE-parsed YAML; per-type envelope wrappers that nothing loaded; and a frontmatter mutation variant correct in one adapter of three. Each was invisible to a reading of either implementation and immediately visible in a count. The check for a guard with a canonical home is therefore mechanical, and it is TWO counts rather than one: count its production call sites, and count its implementations. Zero call sites is a dead gate; more than one implementation is drift; and either count alone is a false negative for the other. The plan size guard is the live illustration — its call-site count is a healthy two, one per entry point, while its implementation count is also two, because the 1 MB constant is redeclared in each entry point rather than shared from a single definition site. A call-site census alone would pass it. The remedy in every instance above was deleting the alternative rather than reconciling the two. Scoped to this ADR's guards: ONE implementation, arbitrarily many call sites.

This is not licence to remove a legitimate second enforcement POINT. The exemplar to preserve is `f8Map`: one predicate consumed by both map primitives, so the F-8 rule has a single implementation reached from many call sites — which is exactly the shape this rule endorses.

Recorded as a known finding rather than blessed: the checkbox terminal-satisfaction rule is the counter-example living in this same library. That rule — an item is terminal when it is done, or carries a non-empty deferred rationale, or, for SPEC-root rows only, is marked `~` — is declared repeatedly across three shapes: inline in the per-note-type Zod item schemas, as a hand-written `isSatisfied` predicate inside each per-type claim validator, and as a marker-aware SPEC-root variant. The copies agree today by TYPE COINCIDENCE, not by contract. The inferred item types are structurally identical, so TypeScript accepts every copy interchangeably, but nothing forces them to stay identical: editing one — tightening the rationale constraint, adding a field, fixing a bug — compiles cleanly and diverges silently from the rest. The SPEC-root variant is itself duplicated, and the comment above the inline copy asserts a single-source status the code does not support. Hoisting the item schema and the terminal predicate into the shared common schema module is registered as the code follow-up. Until that lands this rule is a divergent-twin instance, and it must not be cited as an example of legitimate multiple enforcement.

## Technology Stack

No new dependencies beyond what ADR-001 specifies. This ADR is design-level, defining contracts and schemas that are implemented using the technology stack locked in ADR-001:

- **Zod** (ADR-001 D-1): plan schema validation plus injectivity validators plus path containment
- **unified + remark-parse + remark-stringify + remark-frontmatter** (ADR-001 D-2): adapter parse/serialize via mdast Root type
- **js-yaml** (ADR-001 D-3 implied): YAML plan file parsing
- **Bun** (ADR-001 F-6): runtime, Bun.hash for SHA-256, Bun.file/Bun.write for I/O
- **biome** (ADR-001 F-6): lint/format for adapter and schema source files

## Consequences

### Positive

- Explicit adapter interface contract eliminates silent divergence across 5 adapter implementations; every adapter author codes against the same method signatures with the same pre/post conditions
- Per-type capability matrix surfaces the full scope of variation at design time; prevents mid-implementation scope surprises (especially for SPEC subtree)
- Per-type hash extraction strategies resolve the abstract-to-concrete gap in ADR-001 F-8; each adapter knows exactly how to map extract/mutate/reverse-mutate to its note structure
- Modular Zod schemas mirror the adapter file layout; adding a new source type requires one schema file plus one adapter file plus one line in the discriminated union composition
- Injectivity validators catch non-injective renumber/wikilink maps at plan load time, before any file I/O occurs; this is the earliest possible detection point for plans that would produce irreversible mutations
- Synchronous adapter interface keeps the deterministic script simple and debuggable

### Negative

- Nested schema directory (base.ts plus 10 per-type files in distribution/ and composition/ subdirectories plus index.ts) and 5 adapter files create a moderate module count for a ~1,200 LOC library; mitigated by consistent structure, nested directory organization, and single-entry-point composition in index.ts
- Synchronous interface precludes future async adapter needs without an interface extension; mitigated by the 1 MB file-size guard making event-loop blocking a non-issue for note-sized files
- PLAN adapter's regenerative-section exclusion from hash validation creates a category of content that is not char-identity verified; mitigated by regenerating from structural content (which IS hash-verified) rather than from the source plan
- The F-8 char-identity guarantee is bounded, not universal: it holds over the preserved content slice, not over whole destination files. Retention-bearing plans do not round-trip — a retained range is proven by the coverage check and written nowhere, so the source cannot be reconstructed from the shards alone. Scaffolded no-retention plans DO round-trip, conditionally: recovery requires the composition plan to restate a byte-identical scaffold. Two artifacts bear on that condition, and the split between them is RECOVERY INPUT versus VERIFICATION EVIDENCE. The distribution plan is the recovery input and is durable: it persists as a file under the restructure directory, the executor reads it without rewriting, moving, or deleting it, and rejected plans are renamed rather than discarded. It carries each cluster's scaffold as a structured object, and the composition source schema accepts that SAME scaffold shape — so the object transplants plan-to-plan verbatim and the renderer reproduces the bytes deterministically. There is no hand re-authoring step anywhere in that path. The audit log is verification evidence and is caller-captured: it is emitted as JSON-lines on stdout with no durable sink, so what is lost when the caller does not capture it is the post-hoc byte accounting — the pre-mutation segment hash, the body hash, the scaffold byte count, the scaffold provenance flag, and the records of retained clusters. Recovery needs none of that, because recompose revalidates independently against the plan. Both over-readings are therefore wrong: an uncaptured audit does not make a shard unrecoverable, and a retained audit is not a substitute for the plan. Retained content is additionally not guaranteed ABSENT from destinations — nothing validates that a destination's scaffold epilogue does not reproduce a retained observation or relation — so retention is a bound on reversibility, not redaction

### Neutral

- Per-file hash validation for SPEC subtree produces more hash computations than per-subtree validation, but SHA-256 on note-sized files is sub-millisecond; performance is not a concern

## Confirmation

- [ ] Zod schema validates all 5 per-type test fixtures (one Distribution plus one Composition fixture per source type = 10 fixtures total)
- [ ] Adapter interface compiles across 5 stub implementations (one per source type) with no type errors
- [ ] Capability matrix table is consistent with per-adapter implementation scope (each capability checkbox maps to a code path in the adapter)
- [ ] Per-type hash extraction implemented and passing for ADR adapter (PROOF): extract by H3 range, apply D-N renumber plus wikilink substitution, reverse-mutate, SHA-256 compare
- [x] Injectivity validator rejects test fixtures with non-injective renumber_map (e.g., two source IDs mapping to the same target) and non-injective wikilink_map — satisfied by `shared/composition/tests/plan-yaml-map-invariants.test.ts`, which carries 12 test cases (basis: count of `test(` declarations in that file) covering both maps on both plan types, including one named for the non-disjoint map this ADR uses as its documented rejection example
- [ ] Path containment validator rejects test fixtures with output paths outside docs/ (e.g., path traversal attempts)
- [ ] PLAN adapter correctly excludes regenerated_sections from hash validation scope (Progress Dashboard and Mermaid graph changes do not trigger hash mismatch)
- [ ] SPEC subtree adapter hash-validates each child file independently; single-file drift triggers full-cluster ROLLBACK
- [ ] SESSION adapter emits cross_source_updates in plan output but does not mutate PLAN content directly; PLAN adapter validates its own content
- [ ] Round-trip property test passes for ADR adapter: serialize(parse(content)) === content (parse/serialize identity precondition)
- [ ] Error reporting surfaces structured PlanValidationError array, not raw Zod _errors blob
- [ ] Every BLOCKING guard named in this ADR has at least one production call site. Grep-checkable: for each guard, count the importers outside `tests/`; zero is a dead gate regardless of how thoroughly the guard is unit-tested. Two are open at the time of writing — the runtime regenerated-sections line-coverage check (the schema-level 10-section cap does reach the CLI, but the 50% runtime check has no production caller), and the existence-requiring path-containment refinement, which for destinations is superseded by the create-time variant that the plan-load boundary does call. Guard-set scope: the census covers the guards this ADR names BLOCKING, and only those — the map-invariant predicate plus the two map primitives carrying it, the lexical path predicate and its schema form, both containment refinements plus the plan-level driver that invokes them, the regenerated-sections schema floor and its runtime line-coverage counterpart, the cluster-scaffold schema, the plan size guard, and the subtree hash-comparison entry point. Guards outside that set — the per-note-type claim validators and note schemas, which enforce knowledge-graph invariants rather than the F-8 chain — are out of scope for this item and are not counted by it. The set definition is what decides the count, and two readings diverge without it: a census over the ten guards enumerated above finds exactly the two open cases named here, whereas a reading that admits every schema D-5 names by name additionally surfaces the SPEC subtree manifest schema, which no production code path imports at all — its only importer is a barrel that is itself imported by a single test, and the SPEC subtree adapter does its own containment and injectivity checks without it. That third case is real but belongs to D-5's as-built divergence rather than to the BLOCKING-guard census, which is why the scope clause fixes the set explicitly instead of leaving the reader to infer it

## Clarifications

**2026-05-19**: ADR-002 round 2 revision applied per CRIT-002 round-1 findings. 10 P1 themes A-J resolved in-ADR: MutationSpec extended with frontmatter_map + regenerated_sections + integrity floor (50%); cross_source_updates + SPEC subtree manifest Zod shapes defined; nested discriminatedUnion (plan_type x source_type) refactored; CompositionAdapter JSDoc clarifies AST/string call sequence; hash extracted to shared utility (5-method interface); BaseMarkdownAdapter pattern documented; containedPathSchema uses realpath + path.sep; injectivity validator enforces key-value domain disjointness for order-independent single-pass replacement. P2 items deferred to spec phase per CRIT-002 documentation. Status remains PROPOSED pending round-2 adr-review re-verification.

**2026-05-21 (C-9 from ADR-004)**: ADR-004 D-2 supersedes the crossSourceUpdateSchema element shape in D-1 SESSION extension. The original D-1 shape (target_file, target_part_id, updates record) was speculative; the implemented shape is target_source_type literal plan, target_path string min 1, optional frontmatter_map Record string string, optional wikilink_map Record string string. The cross_source_updates field name and array position in the SESSION plan schema remain locked per D-1. Only the element shape changed to align with the distribution pipeline map-based transform model. See ADR-004 D-2 and C-3.

**2026-07-26**: Destination scaffolding and the retention disposition are recorded as D-6 above; this entry is the provenance record, not the substance. Three corrections to how they were first stated. Scaffolding is excluded from hash comparison ONLY — it is authored into the destination and never exists in the source, so there is nothing to exclude from extraction. It is asymmetric with regenerated_sections rather than a mirror of them: regenerated sections are derived and floored, whereas scaffolding is authored, verified by re-derivation, and separately volume-bounded, transitively by the CWE-400 1 MB plan guard. And retention ALONE is the irreversibility bound: scaffolded no-retention plans do round-trip, given a composition plan that restates the identical scaffold — which the decompose audit log records, along with the scaffold's provenance and byte count and the hash of the content slice. Retained content is not guaranteed ABSENT from destinations, so retention bounds reversibility rather than redacting. Three further facts belong with them: strip failure is BLOCKING (integrity error, exit code 2, nothing renamed); a `retain` cluster must declare neither `destination_path` nor `scaffold`; and the prologue's H1 derives from `frontmatter.title`, which is what makes the H1-matches-title rule unviolable through a plan.

**2026-07-26**: Enforcement drift on the D-5 map rule. The production CLI schema (plan-yaml) had silently bypassed the canonical injectiveDisjointMap validator, carrying a second, weaker local copy — injectivity on renumber_map only, nothing on wikilink_map — while the modular per-type schemas applied the full rule. Fixed by deletion, and since generalized: the F-8 invariants now live INSIDE the map primitives at their single definition site, so every consumer inherits them and no consumer can forget them. One refinement to the account: the modular tree carrying the correct rule had no call site on the path the CLI loads, so the correct rule ran nowhere that mattered. The root cause is that dual-tree condition rather than duplication as such. The lesson is scoped to implementations, not to enforcement points: ONE implementation, arbitrarily many call sites. A second call site of a single validator is deliberate practice in this library and must not be deleted by citing this entry. The mechanical check is a call-site count, per D-6.

**2026-07-26 (amendment)**: Applied the owner-adjudicated resolution of the CRIT-005 round-1 review. Added D-6, recording the scaffolding and retention plan-schema shape, the asymmetry with regenerated_sections, the scaffold trust boundary, the serializer-stability coupling, and the dead-path call-site rule. Added a Consequences Negative bullet stating the F-8 guarantee's true scope. Corrected D-1 to record the as-built CLI envelope as canonical and to mark the illustrative YAML blocks as intent-level. Corrected D-2's frontmatter_map to value-keyed semantics. Corrected D-4's disjointness rationale, which had asserted a miscompare that single-pass replacement does not in fact produce; the rule now stands on forward-compatibility grounds. Ticked Confirmation item 5 on earned evidence and added a grep-checkable call-site item, which two guards currently fail. The two preceding 2026-07-26 entries were reduced in place rather than appended to, which this line records as the change: the first carried a round-trip clause shown to be empirically false, and the second an imperative that over-reached its own evidence, so leaving either standing would have preserved the defect this pass exists to remove. Their original wording, the evidence against it, and the reasoning for each replacement are quoted in full in [[CRIT-005-ADR-002: Clarifications Delta Debate Log]], which is the durable record of what they said and why it changed.

**2026-07-26 (round-2 micro-corrections)**: Six converged corrections from the round-2 register, recorded here per the self-documentation norm the preceding entry established. The recovery language in Consequences now names the split between recovery INPUT and verification EVIDENCE: the durable plan carries the structured scaffold, the composition schema accepts that same shape so it transplants verbatim with no hand re-authoring step, and what an uncaptured stdout audit costs is post-hoc byte accounting that recovery does not consume. The guard-census Confirmation item now fixes its guard set explicitly and records the two readings that diverge without it. The one-implementation carve-out exemplar is re-pointed at `f8Map`, and the checkbox terminal-satisfaction rule is recorded as the counter-example — declared across three shapes, agreeing by type coincidence rather than contract, with the hoist into the shared schema module registered as the code follow-up. The serializer obligation now names the render-assertion block that can actually catch drift and explains why the round-trip suites cannot: they re-render both sides with the same functions, so a format change moves the comparison with it. A byte-exact golden over the rendered frontmatter, tags included, is registered as the test follow-up. The mechanical dead-path check is now two counts rather than one, call sites and implementations, since a call-site count finds dead gates but not divergent twins and this ADR names both modes. And the path-containment mitigation now states its precondition correctly: it is fail-open by design, the shipped skill workflows arm it in their invocation blocks, and the residual gap is a direct CLI invocation made outside those workflows. An earlier draft of that last clause asserted the variable was set nowhere outside tests; that was false and is superseded by this entry. No locked decision changed in this pass — every correction narrows, qualifies, or adds evidence to an existing claim rather than reversing one. Superseded phrasings are quoted in [[CRIT-005-ADR-002: Clarifications Delta Debate Log]].

## Observations

- [decision] Synchronous adapter interface selected over async; markdown parsing is CPU-bound with no I/O requirement and deterministic script invariant is simpler to reason about synchronously #adapter-contract #sync-vs-async
- [decision] Per-file hash validation selected over per-subtree for SPEC adapter; pinpoints drifting file and aligns with per-file write-to-temp-then-rename rollback #hash-validation #spec-subtree
- [decision] Modular per-type Zod schema files selected over monolithic; mirrors adapter file layout and provides single-file extension point per new source type #zod-schema #modularity
- [design] Plan YAML uses discriminated union on source_type with common envelope plus per-type extensions; two plan_type variants (distribution and composition) cover both /decompose and /recompose directions #plan-schema #yaml
- [design] Adapter interface defines 5 methods (parse, extractByRange, applyMutations, reverseMutations, serialize) with explicit round-trip and inverse contracts; hash extracted to shared sha256() utility at shared/composition/src/core/hash.ts #adapter-contract #interface
- [design] PLAN adapter excludes regenerated sections (Progress Dashboard, Mermaid graph) from hash validation; these are Information Model Category 2 derived views regenerated from structural content #plan-adapter #regenerative-content
- [design] SESSION adapter emits cross-source PLAN update instructions but does not mutate PLAN content; each adapter validates only its own content scope #session-adapter #cross-source
- [constraint] Injectivity plus disjointness validators on renumber_map and wikilink_map are BLOCKING Zod .refine() rules at plan load time per ADR-001 F-8; disjointness ensures single-pass replacement is order-independent and reversible #injectivity #blocking-gate
- [constraint] Path containment validator on all output paths uses realpath plus path.sep to mitigate CWE-22 path traversal including symlink bypass; architecturally relevant per ADR-001 F-1 symlink install #security #path-traversal
- [design] MutationSpec extended with frontmatter_map (Record of string to string, optional) for SPEC subtree title/permalink reversal and regenerated_sections (string array, optional) for PLAN adapter declarative section exclusion with 50% integrity floor #mutation-spec #round-2
- [design] Nested discriminatedUnion on plan_type (outer) x source_type (inner) replaces flat 10-variant union; distribution plans use singular source, composition plans use plural sources #schema #nested-union
- [design] Concrete Zod shapes defined for cross_source_updates (SESSION) and subtree_manifest with root/children distinction (SPEC); eliminates implementor invention gap #schema #concrete-shapes
- [design] BaseMarkdownAdapter implementation pattern documented for ADR + ANALYSIS + SESSION adapters (config-only overrides); PLAN and SPEC remain distinct implementations #implementation-pattern #reuse
- [decision] Cluster disposition (write or retain) and destination scaffolding are locked as D-6 — a plan-schema shape absent from D-1 and a bound on D-2's inverse contract, recorded as a decision rather than a clarification under the same precedent that handled the C-9 schema-shape supersession #d-6 #plan-schema
- [constraint] The F-8 char-identity guarantee holds over the preserved content slice, not over whole destination files: retention-bearing plans do not round-trip, and scaffolded no-retention plans round-trip only against a byte-identical restated scaffold, carried durably by the distribution plan on disk and recorded secondarily in the caller-captured audit log #f-8 #round-trip-bound

## Relations

### implemented_by

- [[SPEC-001: Composition Core and ADR Adapter]]
- [[SPEC-002: Simple Adapters]]
- [[SPEC-003: PLAN Adapter]]
- [[SPEC-004: SPEC Subtree Adapter]]
- [[SPEC-005: Decompose and Recompose Skills]]
- [[SPEC-006: Defrag and Ingest Skills]]
- [[SPEC-007: Plan/Session Render Implementation]]
- [[SPEC-008: Protocol Hardening Wave 2]]

### implements

- [[ADR-001: Composition Library Architecture]]

### part_of

- [[PLAN-001: Skills Ecosystem]]

### relates_to

- [[CRIT-002-ADR-002: Adapter Contract and Plan Schema Debate Log]]
- [[CRIT-005-ADR-002: Clarifications Delta Debate Log]]
- [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- [[PLAN-002: Composition Tooling Follow-Up Register]]
- [[ANALYSIS-006: Brain Search and Impact-Detection Tool Surface]]
