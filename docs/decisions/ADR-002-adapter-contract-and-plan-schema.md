---
title: 'ADR-002: Adapter Contract and Plan Schema'
type: decision
status: PROPOSED
date: 2026-05-19
updated: 2026-05-19
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

PROPOSED (2026-05-19)

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
- Does not align with the per-type adapter file layout in _shared/composition/src/adapters/

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

The plan YAML uses a discriminated union on `source_type` per ADR-001 D-4. Two top-level plan types exist: Distribution (1 source to N destinations, used by /decompose) and Composition (N sources to 1 destination, used by /recompose). Both share a common envelope with per-type extensions.

**Common envelope fields:**

```yaml
plan_type: "distribution" | "composition"
source_type: "adr" | "analysis" | "session" | "plan" | "spec"
version: 1                          # schema version for forward compat
created: "2026-05-19T14:30:00Z"     # ISO 8601
source:                              # for distribution: the 1 source
  path: "docs/decisions/ADR-001-brain.md"
  sha256: "abc123..."               # pre-operation hash of entire file
validation:
  sha256_protocol: true              # F-8 hash check enabled (always true)
  max_file_size_bytes: 1048576       # 1 MB guard per ADR-001 Confirmation
```

**Distribution plan (decompose: 1 to N):**

```yaml
plan_type: "distribution"
source_type: "adr"
# ... common envelope ...
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

Every per-type adapter implements the following TypeScript interface. The interface is synchronous per the Considered Options Axis 1 decision.

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

/** Mutation specification from the plan YAML. */
interface MutationSpec {
  renumber_map: RenumberMap;
  wikilink_map: WikilinkMap;
}

/**
 * Contract that every per-type adapter must implement.
 * All methods are synchronous -- markdown parsing is CPU-bound
 * string processing with no I/O requirement.
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
   * Extract content by line range from the parsed source.
   * The line range comes from the plan YAML.
   * Returns the raw string content within the specified lines.
   */
  extractByRange(content: string, range: LineRange): string;

  /**
   * Apply forward mutations (renumber + wikilink substitution) to content.
   * These are the ONLY two permitted mutations per the LLM-script
   * division of labor. Applied AFTER extraction, BEFORE writing.
   */
  applyMutations(content: string, mutations: MutationSpec): string;

  /**
   * Apply inverse mutations to content (reverse renumber + reverse
   * wikilink substitution). Used in the F-8 hash validation protocol:
   * reverse-mutate the destination content to recover the source form,
   * then compare SHA-256 hashes.
   */
  reverseMutations(content: string, mutations: MutationSpec): string;

  /**
   * Serialize an MDAST back to markdown string.
   * remark-stringify deterministic output is part of the char-identity
   * chain per ADR-001 D-2 + F-8.
   */
  serialize(ast: Root): string;

  /**
   * SHA-256 hash of content string.
   * Wraps Bun.hash("sha256", content) per ADR-001 F-6 + F-8.
   * Returns lowercase hex string.
   */
  hash(content: string): string;
}
```

Shared types (`LineRange`, `RenumberMap`, `WikilinkMap`, `MutationSpec`) live at `_shared/composition/src/core/types.ts`. The `CompositionAdapter` interface lives at `_shared/composition/src/core/adapter.ts`. The `Root` type is the remark/mdast `Root` node type from the `@types/mdast` package.

The parse/serialize round-trip contract requires that for every adapter, `serialize(parse(content)) === content` holds. This is a precondition for the F-8 hash validation chain. If remark-stringify introduces whitespace normalization (a known risk noted in ADR-001 Confirmation), the adapter must configure remark-stringify to preserve the original formatting. This contract is enforced by the round-trip property test from KICKOFF-BRIEF.md.

The applyMutations/reverseMutations inverse contract requires that for every adapter and every injective MutationSpec, `reverseMutations(applyMutations(content, mutations), mutations) === content`. Injectivity of the mutation maps is validated by the Zod schema at plan load time (D-5), not by the adapter at runtime.

### D-3: Per-Type Capability Matrix

Each adapter handles a specific source type with varying capabilities based on the structural characteristics of that note type.

**ADR adapter (~250 LOC; build order 1, PROOF)**

Sections delimited by H3 headings (`### D-N: Title`) nested under `## Decision`. The ADR adapter validates the core architecture: extract by H3 range, apply D-N renumber plus cross-cluster wikilink substitution, hash-validate, write via temp-then-rename. Both Distribution (split one ADR into multiple) and Composition (merge multiple ADRs into one) supported. This is the first adapter built because it exercises every code path in the composition library with the simplest structural complexity.

**ANALYSIS adapter (~50 LOC delta; build order 2)**

Sections delimited by H2 headings (`## Finding Title` or `## Item N`). Minimal mutation surface: only inter-cluster wikilink rewrites needed (analysis items rarely have numbered identifiers that require renumbering). Both Distribution and Composition supported.

**SESSION adapter (~100 LOC delta; build order 3)**

Sections delimited by `## Event NN` headings. Event-NN numbering restarts per new session note (decompose scenario: splitting a session by event ranges). Cross-source mutation: when a SESSION decompose splits events that reference PLAN parts (owning_session, completing_session fields), the SESSION adapter emits cross-source update instructions in the plan YAML but does NOT mutate the PLAN note itself. The PLAN adapter validates its own content independently. Both Distribution and Composition supported.

**PLAN adapter (~250 LOC delta; build order 4)**

Sections delimited by `### {phase}.{part-id}` headings within the Workflow Plan. Phase plus part-id numbering restarts per new PLAN note. Regenerative content: the Progress Dashboard table and Cross-Part Dependency Graph (Mermaid) are derived views (Information Model Category 2 from CONVENTIONS) that are regenerated from the structural content rather than hash-validated against source. The plan YAML's `regenerated_sections` field explicitly lists these sections. The hash protocol applies only to narrative and structural content (Workflow Plan section bodies, Phase Progression rows, Decision Log entries). Both Distribution and Composition supported.

**SPEC subtree adapter (~500 LOC delta; build order 5, HARDEST)**

Unlike the other 4 adapters which operate on a single file, the SPEC adapter operates on an entire subtree: the SPEC root note plus child directories (`requirements/`, `design/`, `tasks/`) containing REQ, DESIGN, and TASK notes. Per-child operations include entity identifier renumber (e.g., REQ-001-SPEC-001 to REQ-003-SPEC-002), filename rewrite (via move_note), frontmatter update (title, permalink, tags), intra-spec relation preservation, and cross-spec relation rewrite. The plan YAML's `subtree` field contains a manifest of all child files with per-child mutation maps. Each file in the subtree is hash-validated independently (per Considered Options Axis 2). Atomicity per ADR-001 F-8 rollback protocol: all files in the cluster written to .tmp, all hash-validated, then all renamed atomically. Both Distribution and Composition supported.

**Capability matrix:**

| Adapter | Decompose | Recompose | Cross-Source Mutation | Regenerative Content | Recursive Subtree | LOC Estimate | Build Order |
|:--|:--|:--|:--|:--|:--|:--|:--|
| ADR | Yes | Yes | No | No | No | ~250 | 1 (PROOF) |
| ANALYSIS | Yes | Yes | No | No | No | ~50 delta | 2 |
| SESSION | Yes | Yes | Yes (emits PLAN update instructions) | No | No | ~100 delta | 3 |
| PLAN | Yes | Yes | No | Yes (Dashboard, Mermaid) | No | ~250 delta | 4 |
| SPEC subtree | Yes | Yes | Yes (cross-spec relation rewrite) | No | Yes (root + children) | ~500 delta | 5 |

### D-4: Hash Validation Per-Type Extraction Strategies

ADR-001 F-8 defines the abstract 4-step hash protocol. This section specifies how each adapter maps to that protocol.

Notation: S = source extraction (pre-mutation). D = destination content (post-write). D' = reverse-mutated destination. S_hash = SHA-256(S). D'_hash = SHA-256(D').

**ADR**

Extract S by H3 line range from the plan YAML. The line range spans from one `### D-N:` heading to the next (exclusive) or to the start of the next H2 section. Mutations consist of D-N identifier renumber (e.g., D-3 to D-1 in the destination) applied via string replacement scoped to the extracted content, plus cross-cluster wikilink substitution applied globally within the extraction. Reverse-mutate D to D' by applying the inverse renumber map (swap keys and values) and inverse wikilink map to the destination content. Compare S_hash === D'_hash. Mismatch triggers ROLLBACK per F-8.

**ANALYSIS**

Extract S by H2 section line range. Each H2 finding or item section is one extraction unit. Mutations are minimal: only inter-cluster wikilink rewrites (e.g., when moving a finding from one ANALYSIS note to another, update self-referencing wikilinks). No identifier renumber unless the analysis uses numbered items. Reverse-mutate D to D' by applying the inverse wikilink map. Compare S_hash === D'_hash.

**SESSION**

Extract S by `## Event NN` line range. Each Event section is one extraction unit. Mutations include Event-NN renumber within the session (e.g., Event 05 becomes Event 01 in the destination session). Cross-source updates (references to PLAN parts such as owning_session and completing_session wikilinks) are recorded in the plan YAML's `cross_source_updates` field but are NOT part of the SESSION adapter's hash check. The SESSION adapter hash-validates only the session content itself; the PLAN adapter validates its own content separately. Reverse-mutate D to D' by applying the inverse Event-NN renumber. Cross-source PLAN references in the destination are left as-is (they are not part of the SESSION hash scope). Compare S_hash === D'_hash (SESSION content only; cross-source PLAN updates validated by PLAN adapter).

**PLAN**

Extract S by `### {phase}.{part-id}` section line range for structural/narrative content. Regenerative sections (Progress Dashboard, Cross-Part Dependency Graph) are excluded from extraction. The plan YAML MUST include a `regenerated_sections` field listing these excluded sections. Mutations include phase plus part-id renumber and wikilink substitution for session and SPEC references that change across plans. The reverse-mutate step strips regenerative sections from both S and D' before comparison (or equivalently, excludes them from extraction on both sides). Compare S_hash === D'_hash (structural/narrative content only; regenerative content excluded from both sides).

**SPEC subtree**

Per-file extraction. Each file (SPEC root, each REQ, each DESIGN, each TASK) is extracted independently by its full content (line_range start=1, end=-1 for whole-file). Mutations per file include entity identifier renumber (e.g., REQ-001-SPEC-001 to REQ-003-SPEC-002), frontmatter title/permalink update, intra-spec relation preservation, and cross-spec relation rewrite. Filename rewrite is handled at the filesystem level (via move_note) and is not part of content hash. Reverse-mutate D to D' per-file by applying inverse renumber plus inverse wikilink plus inverse frontmatter mutation. Compare per-file S_hash === D'_hash. Each file validated independently. A single file mismatch triggers ROLLBACK of the entire SPEC cluster (all .tmp files removed per ADR-001 F-8 rollback protocol).

### D-5: Plan YAML Validator Structure

The Zod validator is modular, mirroring the per-type adapter layout per Considered Options Axis 3.

**File layout:**

```
_shared/composition/schemas/
  base.plan.schema.ts        # Common envelope + shared types
  adr.plan.schema.ts         # ADR-specific extension fields
  analysis.plan.schema.ts    # ANALYSIS-specific extension fields
  session.plan.schema.ts     # SESSION-specific extension fields
  plan.plan.schema.ts        # PLAN-specific extension fields
  spec.plan.schema.ts        # SPEC-specific extension fields
  index.ts                   # Composed discriminated union + re-exports
```

**Base schema (base.plan.schema.ts):**

Defines the common envelope fields shared by all plan types:

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

const mutationSpecSchema = z.object({
  renumber_map: renumberMapSchema,
  wikilink_map: wikilinkMapSchema,
});

const basePlanSchema = z.object({
  plan_type: z.enum(["distribution", "composition"]),
  source_type: z.enum(["adr", "analysis", "session", "plan", "spec"]),
  version: z.literal(1),
  created: z.string().datetime(),
  validation: z.object({
    sha256_protocol: z.literal(true),
    max_file_size_bytes: z.number().int().positive().max(1_048_576),
  }),
});
```

**Injectivity validators (BLOCKING per ADR-001 F-8):**

Implemented as Zod `.refine()` rules on the renumber_map and wikilink_map fields. Validates that the values array has no duplicates (Set size === array length). Applied to every MutationSpec in every plan variant.

```typescript
const injectiveRenumberMap = renumberMapSchema.refine(
  (map) => {
    const values = Object.values(map);
    return new Set(values).size === values.length;
  },
  { message: "renumber_map must be injective: duplicate target IDs detected" }
);

const injectiveWikilinkMap = wikilinkMapSchema.refine(
  (map) => {
    const values = Object.values(map);
    return new Set(values).size === values.length;
  },
  { message: "wikilink_map must be injective: duplicate target wikilinks detected" }
);
```

**Path containment validator (BLOCKING per ADR-001 Confirmation):**

Implemented as a `.refine()` rule on all output path fields. Uses `path.resolve()` to normalize the path and verifies it resolves within the project's `docs/` directory. Mitigates CWE-22 path traversal from LLM-authored plan injection.

```typescript
import { resolve, relative } from "node:path";

const containedPathSchema = z.string().refine(
  (p) => {
    const resolved = resolve(p);
    const rel = relative(docsRoot, resolved);
    return !rel.startsWith("..") && !resolve(rel).startsWith("/");
  },
  { message: "output path must resolve within docs/ (CWE-22 mitigation)" }
);
```

**Per-type extension schemas:**

Each per-type schema file exports a Zod schema that extends the base with type-specific fields. The `adr.plan.schema.ts` file adds `section_delimiter: z.literal("### ")` and ADR-specific renumber_map key format validation (D-N pattern). The `analysis.plan.schema.ts` file adds `section_delimiter: z.literal("## ")` and optional renumber_map. The `session.plan.schema.ts` file adds `section_delimiter: z.literal("## Event ")` and a `cross_source_updates` field for PLAN part mutations. The `plan.plan.schema.ts` file adds `regenerated_sections: z.array(z.string())` and `section_delimiter: z.literal("### ")`. The `spec.plan.schema.ts` file adds a `subtree` manifest field (array of child file entries with per-child mutations and filename_rewrite_map).

**Composed discriminated union (index.ts):**

```typescript
import { z } from "zod";
import { adrDistributionSchema, adrCompositionSchema } from "./adr.plan.schema";
import { analysisDistributionSchema, analysisCompositionSchema } from "./analysis.plan.schema";
// ... other type imports ...

export const planSchema = z.discriminatedUnion("source_type", [
  adrDistributionSchema,
  adrCompositionSchema,
  analysisDistributionSchema,
  analysisCompositionSchema,
  sessionDistributionSchema,
  sessionCompositionSchema,
  planDistributionSchema,
  planCompositionSchema,
  specDistributionSchema,
  specCompositionSchema,
]);

export type Plan = z.infer<typeof planSchema>;
```

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

- 11 schema files (base plus 5 types x 2 directions) and 5 adapter files create a moderate module count for a ~1,200 LOC library; mitigated by consistent structure and single-entry-point composition in index.ts
- Synchronous interface precludes future async adapter needs without an interface extension; mitigated by the 1 MB file-size guard making event-loop blocking a non-issue for note-sized files
- PLAN adapter's regenerative-section exclusion from hash validation creates a category of content that is not char-identity verified; mitigated by regenerating from structural content (which IS hash-verified) rather than from the source plan

### Neutral

- Per-file hash validation for SPEC subtree produces more hash computations than per-subtree validation, but SHA-256 on note-sized files is sub-millisecond; performance is not a concern

## Confirmation

- [ ] Zod schema validates all 5 per-type test fixtures (one Distribution plus one Composition fixture per source type = 10 fixtures total)
- [ ] Adapter interface compiles across 5 stub implementations (one per source type) with no type errors
- [ ] Capability matrix table is consistent with per-adapter implementation scope (each capability checkbox maps to a code path in the adapter)
- [ ] Per-type hash extraction implemented and passing for ADR adapter (PROOF): extract by H3 range, apply D-N renumber plus wikilink substitution, reverse-mutate, SHA-256 compare
- [ ] Injectivity validator rejects test fixtures with non-injective renumber_map (e.g., two source IDs mapping to the same target) and non-injective wikilink_map
- [ ] Path containment validator rejects test fixtures with output paths outside docs/ (e.g., path traversal attempts)
- [ ] PLAN adapter correctly excludes regenerated_sections from hash validation scope (Progress Dashboard and Mermaid graph changes do not trigger hash mismatch)
- [ ] SPEC subtree adapter hash-validates each child file independently; single-file drift triggers full-cluster ROLLBACK
- [ ] SESSION adapter emits cross_source_updates in plan output but does not mutate PLAN content directly; PLAN adapter validates its own content
- [ ] Round-trip property test passes for ADR adapter: serialize(parse(content)) === content (parse/serialize identity precondition)
- [ ] Error reporting surfaces structured PlanValidationError array, not raw Zod _errors blob

## Clarifications

_No clarifications yet._

## Observations

- [decision] Synchronous adapter interface selected over async; markdown parsing is CPU-bound with no I/O requirement and deterministic script invariant is simpler to reason about synchronously #adapter-contract #sync-vs-async
- [decision] Per-file hash validation selected over per-subtree for SPEC adapter; pinpoints drifting file and aligns with per-file write-to-temp-then-rename rollback #hash-validation #spec-subtree
- [decision] Modular per-type Zod schema files selected over monolithic; mirrors adapter file layout and provides single-file extension point per new source type #zod-schema #modularity
- [design] Plan YAML uses discriminated union on source_type with common envelope plus per-type extensions; two plan_type variants (distribution and composition) cover both /decompose and /recompose directions #plan-schema #yaml
- [design] Adapter interface defines 6 methods (parse, extractByRange, applyMutations, reverseMutations, serialize, hash) with explicit round-trip and inverse contracts #adapter-contract #interface
- [design] PLAN adapter excludes regenerated sections (Progress Dashboard, Mermaid graph) from hash validation; these are Information Model Category 2 derived views regenerated from structural content #plan-adapter #regenerative-content
- [design] SESSION adapter emits cross-source PLAN update instructions but does not mutate PLAN content; each adapter validates only its own content scope #session-adapter #cross-source
- [constraint] Injectivity validators on renumber_map and wikilink_map are BLOCKING Zod .refine() rules at plan load time per ADR-001 F-8 #injectivity #blocking-gate
- [constraint] Path containment validator on all output paths mitigates CWE-22 path traversal from LLM-authored plan injection per ADR-001 Confirmation #security #path-traversal

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- pairs_with [[brain:---adr-review]]