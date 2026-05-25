---
title: 'ADR-001: Composition Library Architecture'
type: decision
status: ACCEPTED
date: 2026-05-19
updated: 2026-05-20
permalink: decisions/adr-001-composition-library-architecture
tags:
- decision
- skills-ecosystem
- composition-library
- architecture
- anti-drift
---

# ADR-001: Composition Library Architecture

## Status

ACCEPTED (2026-05-19; brain:---adr-review Phase 4 convergence PASS round 1, 5 ACCEPT + 1 D&C + 0 BLOCK; see CRIT-001-ADR-001 debate log + ADR Clarifications for P1 resolution + deferral rationale)

## Context and Problem Statement

A `/plan PLAN-001 --split` attempt on a 3,680-line Brain ADR (ADR-001 in the brain project) tried to retroactively split the ADR into 5 sub-ADRs via a brain:architect dispatch with a "verbatim extraction" brief. The architect returned with 35% content compression on 10 of 12 D-Ns (bullet sub-items converted to paragraph prose under perceived line-count pressure), used the filesystem Write tool instead of Brain MCP write_note as an undocumented tactical exception, and unilaterally shifted the wikilinks-in-bullets convention. The split was reverted.

Root cause: LLMs drift on structural and content-preservation tasks under perceived pressure. The fix is architectural. Take the LLM out of the content-modifying loop entirely. LLM authors a structured plan (cohesion analysis, cluster boundaries, renumber maps, cross-reference rewrites); a deterministic script executes the plan with cryptographic hash validation against char-identity.

This ADR establishes the architecture for a composition library that makes content drift mathematically impossible via a round-trip property test. The library decomposes Brain knowledge-graph notes (1 to N split) and recomposes them (N to 1 merge) with SHA-256 char-identity hash validation as a BLOCKING invariant. Failed validation triggers ROLLBACK with no partial write. Two primitive skills (/decompose and /recompose) expose the library. Two higher-level skills (/defrag and /ingest) compose on top. Brain-first scope with Basic Memory as a subset (auto-detected from frontmatter type field).

The architecture addresses 5 source-type adapters in build order from simplest to hardest: ADR (proof of architecture, ~250 LOC), ANALYSIS (~50 LOC delta), SESSION (~100 LOC delta), PLAN (~250 LOC delta), and SPEC subtree (hardest, ~500 LOC delta with recursive filename/relation rewrite). Total estimated scope is ~1,200 LOC across all adapters. The ADR adapter ships first as the architectural PROOF; subsequent adapters extend incrementally only after the round-trip property test validates the core.

This composite ADR captures 8 foundational locked design decisions established in the KICKOFF-BRIEF.md project brief plus 5 architectural decisions (D-1 through D-5) adjudicated via AskUserQuestion on 2026-05-19 during SESSION-2026-05-19_01.

## Decision Drivers

1. **Anti-drift mathematical guarantee via round-trip property test.** The bootstrapping incident proved that LLM-mediated content restructuring produces undetectable drift. The composition library requires SHA-256(original) === SHA-256(decompose then recompose(original)) for every adapter. This is a mathematical identity check, not a heuristic.

2. **LLM removed from content-modifying loop.** The LLM's role is strictly cognitive: classify source type, identify cluster seams, author a structured plan YAML. The LLM never touches content bytes. A deterministic script executes the plan and applies only two permitted mutations: identifier renumbering and cross-cluster wikilink substitution, both specified in the plan.

3. **SHA-256 char-identity invariant as BLOCKING gate.** The script computes the hash of source extraction (pre-mutation) and the hash of destination extraction (post-reverse-mutation). If hashes differ, the script refuses to write and triggers ROLLBACK. No partial write state is possible.

4. **Per-type adapter contract with unified plan schema.** Each source type (ADR, ANALYSIS, SESSION, PLAN, SPEC subtree) gets a dedicated adapter implementing parse, extract-by-range, renumber, wikilink-rewrite, and serialize. A unified discriminated union on source_type provides clean type narrowing while keeping adapter addition to a single extension point.

5. **Brain-first with Basic Memory subset.** The library auto-detects Brain vs Basic Memory notes from frontmatter type field. Brain notes (16 canonical entity types under CONVENTIONS) get full adapter coverage. Basic Memory notes work as a subset with reduced adapter specificity.

6. **Auditable plan artifact at docs/_restructure/.** Every decompose and recompose operation produces a YAML plan file that humans can review before script execution. The LLM authors the plan; the user adjudicates via AskUserQuestion; the script consumes the adjudicated plan. No silent execution path exists.

## Considered Options

### Axis 1: Plan Validation Library

#### Option A: JSON Schema

JSON Schema is portable across languages and LLM-friendly for generation. It is a well-known standard with broad tooling support.

**Pros:**

- Language-agnostic; works with any JSON Schema validator
- LLMs have extensive training data for JSON Schema generation
- Can be consumed by non-TypeScript tooling in the future

**Cons:**

- Requires maintaining separate type definitions in TypeScript and separate JSON Schema files, creating sync drift between the two
- No type inference from schema to TypeScript types
- Verbose syntax for discriminated unions
- Adding a JSON-Schema-to-TypeScript export step (Zod+JSON-Schema-export hybrid) adds build complexity without clear benefit for a local-only TS project

#### Option B: Zod (SELECTED)

Zod is a TypeScript-native validation library providing runtime validation with compile-time type inference from a single schema definition.

**Pros:**

- Single source of truth: TS types and runtime validation derive from the same Zod schema
- Type inference eliminates separate type definitions and the sync drift between types and schemas
- Discriminated unions are first-class via z.discriminatedUnion()
- Battle-tested in the TypeScript ecosystem; MIT license; ubiquitous adoption

**Cons:**

- TypeScript-only; not portable to non-TS consumers
- Adds a runtime dependency (~50KB)

#### Option C: Zod + JSON Schema Export

Combines Zod for TS-native authoring with zod-to-json-schema for external portability.

**Pros:**

- Gets both TS type inference and JSON Schema portability

**Cons:**

- Extra build step and dependency for portability that this local-only TS project does not need
- Adds maintenance surface for marginal benefit

### Axis 2: Markdown AST Library

#### Option A: Custom Regex Parser

Build a regex-based parser targeting the specific H2/H3 structure of Brain notes.

**Pros:**

- Zero dependencies; simpler for ADR-only scope (structured H2/H3 sections)
- Full control over parsing behavior

**Cons:**

- Brittle when handling SPEC subtree notes (recursive child notes with frontmatter, varied heading depths, nested code blocks containing markdown-like content)
- Maintaining two parsing strategies (regex for simple types, AST for complex types) doubles the testing surface
- Edge cases in markdown (indented code blocks, HTML comments, YAML frontmatter boundaries) require progressively more complex regex

#### Option B: unified + remark + remark-frontmatter (SELECTED)

The unified ecosystem provides a battle-tested markdown AST (mdast) with plugin-based frontmatter extraction.

**Pros:**

- Battle-tested AST required for SPEC subtree accuracy (recursive child notes with cross-cluster wikilink rewrites)
- Frontmatter extraction via remark-frontmatter handles YAML boundary edge cases
- AST manipulation is deterministic and auditable (tree transformations, not string surgery)
- Extensible via the unified plugin pipeline for future adapter needs

**Cons:**

- Dependency footprint: unified + remark-parse + remark-stringify + remark-frontmatter (~4 packages)
- Learning curve for the unified/mdast API (mitigated by strong documentation and widespread usage)

#### Option C: Hybrid (regex for simple types, AST for SPEC subtree)

Use regex parsing for ADR, ANALYSIS, SESSION; use AST for PLAN and SPEC subtree.

**Pros:**

- Minimal dependencies for simple adapters

**Cons:**

- Two parsing strategies to maintain creates inconsistency in the adapter contract
- Harder to reason about round-trip guarantees when source and destination may use different parsers
- Less rigorous overall; the round-trip property test must exercise both paths

### Axis 3: Plan File Format

#### Option A: JSON

**Pros:**

- Native to JavaScript/TypeScript; no parser needed (JSON.parse)
- Strict syntax eliminates ambiguity

**Cons:**

- Less readable for humans (no comments, awkward multiline strings, verbose nesting)
- Harder for LLMs to produce cleanly (trailing commas, missing brackets)
- Not friendly for user adjudication before execution

#### Option B: YAML at docs/_restructure/*.yaml (SELECTED)

YAML plan files live at docs/_restructure/{decompose,recompose}-{id}-plan.yaml, authored by LLM, adjudicated by user, consumed by script.

**Pros:**

- Human-readable format supports user adjudication workflow (comments, clean multiline, compact syntax)
- LLM-friendly authoring (LLMs produce valid YAML more reliably than JSON for structured plans)
- Comments allowed (documenting rationale inline in the plan)
- Strict Zod validation on load mitigates YAML type coercion quirks (e.g., "yes"/"no" as booleans, unquoted strings)

**Cons:**

- YAML type coercion quirks require defensive Zod validation on load
- Requires a YAML parser dependency (js-yaml or similar)
- Indentation-sensitive format can cause subtle parse failures

#### Option C: Sidecar Markdown Table in PLAN Body

Embed the plan as a markdown table inside the PLAN note's body.

**Pros:**

- No additional file format; stays within the Brain note ecosystem

**Cons:**

- Mixes plan data with prose content in the PLAN note, violating separation of concerns
- Harder to schema-validate (must parse markdown to extract table, then validate table content)
- Table format constrains expressiveness for complex plan structures (nested sections, conditional mappings)

### Axis 4: Plan Schema Shape

#### Option A: Per-Adapter Schemas

Separate Zod schemas per source type (adrPlanSchema, analysisPlanSchema, etc.).

**Pros:**

- Each adapter's plan is self-contained; easier to understand in isolation
- Allows adapter-specific fields without compromise

**Cons:**

- Code duplication across shared fields (source metadata, hash validation, output manifest)
- Adding a new adapter means creating an entirely new schema from scratch
- Harder to enforce consistency across adapters (shared fields may drift)

#### Option B: Unified Discriminated Union on source_type (SELECTED)

A single Zod schema using z.discriminatedUnion("source_type", [...]) with a shared base and per-adapter extensions.

**Pros:**

- Clean type narrowing per adapter via TypeScript discriminated union pattern
- Shared fields (source metadata, hash validation config, output manifest) are defined once
- Single extension point for adding new adapters (add a variant to the union)
- Consistency across adapters is structural, not conventional

**Cons:**

- Union schema is more complex to read initially than flat per-adapter schemas
- All adapters must share the base shape, which may require optional fields for type-specific data

### Axis 5: ADR Review Gate Policy

#### Option A: BLOCKING Gate (SELECTED)

/brain:---adr-review PASS verdict required before ADR-001 (and subsequent architecture ADRs) can transition from PROPOSED to ACCEPTED. No spec, plan, or implementation work proceeds until the gate passes.

**Pros:**

- Catches architectural issues early, before they propagate into specs and code
- Adheres to the adr-review-blocking-gate memory rule already established in the orchestrator protocol
- Multi-agent debate (architect, critic, independent-thinker, security, analyst, high-level-advisor) provides thorough stress-testing

**Cons:**

- Adds latency to the decisions pipeline (debate rounds take time)
- Potential for false-negative blocks on time-sensitive decisions

#### Option B: ADVISORY

adr-review runs but findings are non-blocking; ADR can flip to ACCEPTED regardless.

**Pros:**

- Faster pipeline; no blocking on review

**Cons:**

- Findings get ignored under schedule pressure (defeats the purpose of review)
- No enforcement mechanism for acting on findings

#### Option C: SKIP

No adr-review on architecture ADRs.

**Pros:**

- Zero overhead

**Cons:**

- Bypasses the quality gate entirely; no multi-agent stress-testing before locking architectural choices
- Contradicts the established protocol

## Decision

This ADR composites 8 foundational locked design decisions from the KICKOFF-BRIEF.md project brief plus 5 architectural decisions (D-1 through D-5) adjudicated via AskUserQuestion on 2026-05-19 during SESSION-2026-05-19_01 Skills Bootstrap and PLAN-001. All 5 AskUserQuestion responses selected the Recommended option.

### F-1: Skills Installed via Symlinks

**Decision**: Skills installed via symlinks at `~/.claude/skills/<name>` pointing to `~/Dev/skills/<name>`; canonical source at `~/Dev/skills/`.

**Rationale**: Symlinks allow Claude Code to discover skills at the standard location while keeping canonical source in a single development repository. Edits to source propagate instantly without copy steps. Install.sh provides both symlink and copy modes; if symlinks misbehave on Claude Code reload semantics, fall back to rsync-copy install.

**Reversibility**: [PASS] -- Switch from symlinks to copy-based install via install.sh flag change. No data loss; effort is under 1 hour.

### F-2: Brain-First Scope with Basic Memory Subset

**Decision**: Brain-first scope; Basic Memory works as a subset. Auto-detect from frontmatter `type` field.

**Rationale**: Brain notes use 16 canonical entity types with strict conventions (naming, numbering, wikilinks, observations, relations). Basic Memory notes are a subset that lack some of these fields. The library auto-detects the note flavor from the frontmatter type field and applies the appropriate adapter specificity. Brain notes get full adapter coverage; Basic Memory notes get reduced but functional coverage.

**Reversibility**: [PASS] -- Dropping Basic Memory support narrows scope but does not break the Brain path. Effort is under 2 hours (remove auto-detect branch and Basic Memory test fixtures).

### F-3: Coexist with Existing memory-ingest and memory-defrag

**Decision**: Coexist with existing `~/Dev/basic-memory-skills/memory-ingest` and `memory-defrag`. Do NOT delete or rename those skills. The new /ingest and /defrag are Brain-aware variants.

**Rationale**: The existing skills serve Basic Memory-only contexts. The new skills add Brain-awareness (CONVENTIONS compliance, Pattern 2 three-phase write, 16 canonical entity types, observation category prefix + tags, final-two-sections invariant). Both sets can be installed simultaneously without conflict because they have distinct skill names.

**Reversibility**: [PASS] -- Either skill set can be uninstalled independently. No shared state between old and new skills.

### F-4: Standalone Local-Only Git Repo

**Decision**: Standalone local-only git repo (no remote initially).

**Rationale**: The composition library is a local development tool. Adding a remote introduces publishing, CI, and access-control concerns that are orthogonal to the core mission. A remote can be added later when the library is battle-tested. Local git provides full version control, branching, and rollback without remote infrastructure.

**Reversibility**: [PASS] -- Adding a remote is a single `git remote add` command. No architectural impact.

### F-5: Naming Convention (composition, decompose, recompose)

**Decision**: "composition" for the shared library (covers both directions); "decompose" and "recompose" for the verbs.

**Rationale**: "Composition" captures the bidirectional nature of the library (both splitting and merging are composition operations). "Decompose" and "recompose" are precise mathematical terms that communicate the inverse relationship. The round-trip property test (decompose followed by recompose equals identity) is expressible directly in the naming.

**Reversibility**: [PASS] -- Renaming is a search-and-replace across skill names, directory names, and documentation. Effort under 2 hours for a greenfield project.

### F-6: Runtime (Bun + TypeScript with Bun-Native APIs)

**Decision**: Runtime is Bun + TypeScript. Bun-native APIs throughout: Bun.file, Bun.write, Bun.hash, Bun.$, Bun.glob. Biome for lint and format.

**Rationale**: Bun provides a unified runtime, test runner, and package manager. Bun-native APIs (Bun.file for reading, Bun.write for writing, Bun.hash for SHA-256, Bun.$ for shell, Bun.glob for file discovery) eliminate Node.js polyfills and reduce dependency count. Biome replaces ESLint + Prettier with a single tool for both linting and formatting.

**Reversibility**: [WARNING] -- Migrating from Bun-native APIs to Node.js requires replacing ~15-20 Bun.file/Bun.write/Bun.hash call sites with fs/crypto equivalents. Effort is 1-2 days for the full codebase. The core architecture (adapters, plan schema, hash validation) is runtime-agnostic.

### F-7: Plan Artifacts as YAML Files

**Decision**: Plan artifacts are YAML files at `docs/_restructure/{decompose,recompose}-<id>-plan.yaml`. LLM-authored, user-adjudicated, script-consumed.

**Rationale**: YAML files provide a human-readable, LLM-friendly artifact that sits in the project tree for auditability. The three-phase workflow (LLM authors, user reviews via AskUserQuestion, script executes) requires an intermediate artifact format. YAML supports comments for inline rationale. Files live under docs/ but in a separate _restructure/ directory to avoid collision with Brain note directories.

**Reversibility**: [PASS] -- Switching plan format (e.g., to JSON) requires updating the plan parser and Zod schema. Plan files are ephemeral artifacts consumed once; no migration needed for existing plans.

### F-8: SHA-256 Char-Identity Validation Invariant

**Decision**: SHA-256 char-identity hash check on source extraction vs destination extraction (modulo deterministic renumber/wikilink mutations). Script REFUSES to write if hash mismatch. Failed validation triggers ROLLBACK, never partial write.

**Rationale**: This is the core anti-drift mechanism. The hash check guarantees that the script's output is character-identical to the input (modulo the two permitted deterministic mutations: identifier renumbering and wikilink substitution). If any byte differs unexpectedly, the script stops and rolls back. This makes content drift mathematically impossible rather than conventionally discouraged.

**Hash protocol** (formal specification per Phase 3 review resolution to critic + analyst P1):

1. **Source-side extraction (S)**: extract source content by the line range specified in the plan YAML. Compute `S_hash = SHA-256(S)`.
2. **Destination-side extraction (D)**: after the script writes destination content, extract that content. Apply the inverse renumber map and inverse wikilink-substitution map specified in the plan YAML to produce the de-mutated form `D'`. Compute `D'_hash = SHA-256(D')`.
3. **Compare**: `S_hash === D'_hash`. If not equal, the script aborts the entire operation and triggers ROLLBACK.
4. **Injectivity constraint** (BLOCKING validator gate): the plan YAML's renumber map and wikilink-substitution map MUST be injective — no two source IDs map to the same target ID; no two source wikilinks map to the same target wikilink. The Zod validator REJECTS non-injective plans at script entry. Without injectivity, the inverse maps are non-unique and the hash check has silent collision classes.

**Rollback mechanism** (formal specification per Phase 3 review resolution to critic P1): atomicity via write-to-temp-then-rename. For each destination file:

1. **Stage**: write content to `<dest-path>.tmp` (sibling file with `.tmp` suffix).
2. **Hash-validate**: compute the hash protocol above on the staged content. On mismatch, abort.
3. **Per-cluster all-or-nothing**: only after ALL destinations in the cluster have passed hash validation, atomically rename each `<dest-path>.tmp` to `<dest-path>` (POSIX filesystem rename is atomic). If any destination fails, remove ALL `.tmp` files for the cluster; source files remain untouched.

The source files are never mutated until ALL destinations validate AND rename successfully. A crash mid-rename leaves a recoverable state (some `.tmp` files present, source intact; rerun the plan).

**Reversibility**: [WARNING] -- Removing the hash check removes the zero-drift guarantee. The check is the architectural reason this project exists. Disabling it would regress to the pre-incident state where LLM drift is undetectable.

### D-1: Zod for Plan Validation

**Decision**: Use Zod as the plan validation library.

**Rationale**: Zod provides TypeScript-native runtime validation with compile-time type inference from a single schema definition. This eliminates the sync drift between separate TypeScript type definitions and separate JSON Schema files that would be required with JSON Schema. For a local-only TypeScript project using Bun, the portability benefit of JSON Schema does not justify the maintenance overhead of keeping two representations synchronized. Zod's z.discriminatedUnion() directly supports the unified plan schema shape decided in D-4.

**Alternatives Considered**:

- **JSON Schema**: Rejected because it requires maintaining separate type definitions in TypeScript alongside the schema, creating sync drift. JSON Schema's language-agnosticism is not needed for a TS-only local project.
- **Zod + JSON Schema Export** (via zod-to-json-schema): Rejected because it adds an extra build step and dependency for portability that this project does not need.

**Cross-cluster implications**: D-1 directly enables D-4 (unified discriminated union) because z.discriminatedUnion() is the mechanism for clean type narrowing per adapter. D-1 also interacts with D-3 (YAML plan files) because Zod validates the parsed YAML output, mitigating YAML type coercion quirks (e.g., bare "yes"/"no" parsed as booleans). D-1 interacts with F-6 (Bun + TypeScript) because Zod is TypeScript-native, aligning with the single-language constraint.

**Reversibility**: [PASS] -- Replacing Zod with JSON Schema or another validation library requires rewriting schema definitions (~200-300 lines) and updating type imports across adapters. Effort is 1-2 days. No data loss; plan YAML files are format-agnostic.

### D-2: unified + remark + remark-frontmatter for Markdown AST

**Decision**: Use the unified ecosystem (unified + remark-parse + remark-stringify + remark-frontmatter) for markdown AST parsing and serialization.

**Rationale**: The SPEC subtree adapter requires recursive parsing of child notes with cross-cluster wikilink rewrites across frontmatter, headings, body text, and relations sections. A regex-based parser handles the simple cases (ADR H3 sections, ANALYSIS H2 findings) but becomes brittle when facing SPEC subtree edge cases: nested code blocks containing markdown-like content, YAML frontmatter boundaries, indented lists with embedded wikilinks, and HTML comments. The unified/mdast AST provides deterministic tree transformations that are auditable and testable, and remark-frontmatter handles YAML boundary extraction reliably. All 5 adapters use the same parser, ensuring the round-trip property test exercises a single code path.

**Alternatives Considered**:

- **Custom regex parser**: Rejected because it becomes brittle for SPEC subtree notes with recursive child structures, nested code blocks, and varied heading depths. Maintaining regex for all 5 source types would require progressively complex patterns that are harder to audit for correctness.
- **Hybrid** (regex for simple types, AST for complex types): Rejected because maintaining two parsing strategies doubles the testing surface and creates inconsistency in the adapter contract. The round-trip guarantee is harder to reason about when source and destination may use different parsers.

**Cross-cluster implications**: D-2 provides the parsing foundation that all 5 adapters (per KICKOFF-BRIEF.md build order) depend on. The unified AST is the mechanism by which the script extracts content by line/node ranges from the plan (F-7 plan artifacts) and applies the two permitted mutations (identifier renumber, wikilink rewrite). D-2 interacts with F-8 (hash validation) because the hash is computed on the serialized AST output, meaning remark-stringify's deterministic serialization is part of the char-identity chain.

**Reversibility**: [WARNING] -- Replacing unified/remark requires rewriting all 5 adapter parse/serialize methods (~400-600 lines) and validating that the replacement produces identical serialization output (critical for the hash validation chain). Effort is 2-3 days. The adapter interface contract (D-4) abstracts the parser, limiting blast radius to adapter internals.

### D-3: YAML at docs/_restructure/*.yaml for Plan Files

**Decision**: Plan files are YAML at docs/_restructure/{decompose,recompose}-{id}-plan.yaml.

**Rationale**: YAML is human-readable and supports the three-phase workflow where the LLM authors a plan, the user reviews it via AskUserQuestion, and the script consumes it. Comments are allowed in YAML (unlike JSON), enabling inline rationale documentation within plan files. LLMs produce valid YAML more reliably than valid JSON for structured plans (fewer trailing-comma and bracket-matching errors). YAML's type coercion quirks (bare "yes"/"no" as booleans, unquoted numbers) are mitigated by strict Zod validation on load (D-1), which rejects malformed values before the script touches any content.

**Alternatives Considered**:

- **JSON**: Rejected because it is less readable for human review, does not support comments, and has awkward multiline string handling. LLMs also produce more JSON syntax errors (trailing commas, missing brackets) than YAML errors for structured plan data.
- **Sidecar markdown table in PLAN body**: Rejected because it mixes plan data with prose content in the PLAN note, violating separation of concerns. Schema-validating a markdown table requires parsing the markdown first, then validating the extracted table content, adding an unnecessary layer of indirection. Table format also constrains expressiveness for complex plan structures.

**Cross-cluster implications**: D-3 interacts with F-7 (plan artifact location) by specifying the file format at the already-locked location. D-3 depends on D-1 (Zod) for strict validation on load to mitigate YAML type coercion. D-3's human-readability supports F-8's auditability goal: before the script executes (and the hash check validates), the user can read the YAML plan and verify the intended decomposition/recomposition.

**Reversibility**: [PASS] -- Switching from YAML to JSON requires updating the plan parser (js-yaml to JSON.parse) and the Zod schema's preprocessing step. Plan files are ephemeral artifacts consumed once; no migration of existing plans is needed. Effort under 1 day.

### D-4: Unified Discriminated Union on source_type for Plan Schema

**Decision**: Use a unified Zod schema with z.discriminatedUnion("source_type", [...]) for plan validation, with shared base fields and per-adapter extensions.

**Rationale**: A unified discriminated union provides clean type narrowing per adapter via TypeScript's type system. When the script reads a plan YAML and parses it through the Zod schema, TypeScript automatically narrows the type based on source_type, giving each adapter access to its type-specific fields without casting. Shared fields (source file path, source hash, output manifest, hash validation config) are defined once in the base, eliminating duplication. Adding a new adapter means adding a variant to the union and implementing the adapter interface, both in a single extension point.

**Alternatives Considered**:

- **Per-adapter schemas**: Rejected because shared fields (source metadata, hash validation, output manifest) would be duplicated across 5 schemas. Adding a new adapter means creating an entirely new schema from scratch and manually ensuring it shares the correct base fields. Consistency across adapters becomes conventional rather than structural.

**Cross-cluster implications**: D-4 depends on D-1 (Zod) for z.discriminatedUnion() as the implementation mechanism. D-4 directly shapes the adapter contract: each adapter implements the parse/extract/renumber/wikilink-rewrite/serialize interface, and the plan schema's discriminated union determines which adapter is invoked. D-4 interacts with D-2 (unified/remark) because the per-adapter extensions in the union schema reference AST node types that the parser produces.

**Reversibility**: [PASS] -- Splitting the unified schema into per-adapter schemas is a refactoring exercise (~2-4 hours for current scope). The adapter interface contract is independent of whether the schema is unified or per-adapter.

### D-5: /brain:---adr-review BLOCKING Gate on Architecture ADRs

**Decision**: /brain:---adr-review PASS verdict is required before architecture ADRs (ADR-001, ADR-002, and subsequent) can transition from PROPOSED to ACCEPTED. No spec, plan, or implementation work proceeds downstream until the gate passes.

**Rationale**: The adr-review skill orchestrates a multi-agent debate (architect, critic, independent-thinker, security, analyst, high-level-advisor) in structured rounds until consensus. This catches architectural issues before they propagate into specs and code, where the cost of correction is 5-10x higher. The BLOCKING gate adheres to the adr-review-blocking-gate memory rule already established in the orchestrator protocol. For a project whose explicit mission is to prevent architectural drift, skipping the review gate would be self-contradictory.

**Alternatives Considered**:

- **ADVISORY** (findings non-blocking): Rejected because non-blocking findings get ignored under schedule pressure, defeating the purpose of multi-agent review. The bootstrapping incident that motivated this project demonstrates the cost of proceeding without adequate review.
- **SKIP** (no adr-review): Rejected because it bypasses the quality gate entirely. No multi-agent stress-testing before locking architectural choices contradicts the established protocol.

**Cross-cluster implications**: D-5 gates the entire pipeline downstream of ADR authoring. Until adr-review passes, PLAN-001 decisions.1 cannot flip PROPOSED to ACCEPTED, decisions.2 cannot start, spec-decomposition cannot start, and no code can be written. D-5 interacts with F-8 (hash validation) by ensuring the architectural integrity of the hash validation design is stress-tested before implementation.

**Reversibility**: [PASS] -- Switching from BLOCKING to ADVISORY requires changing the gate policy in the PLAN workflow. No code changes; effort under 30 minutes. However, this removes the early-detection benefit.

## Technology Stack

### Runtime Dependencies

- **Bun**: Runtime, test runner, package manager (per F-6)
- **Zod**: Plan validation with TS type inference (per D-1)
- **unified + remark-parse + remark-stringify**: Markdown AST parsing and serialization (per D-2)
- **remark-frontmatter**: YAML frontmatter extraction plugin for remark (per D-2)
- **js-yaml** (or equivalent): YAML parsing for plan files (per D-3, implied by YAML format choice)

### Dev Dependencies

- **biome**: Lint and format (per F-6)
- **bun test**: Built-in test runner (per F-6)

### Removed

- None (greenfield project)

## Consequences

### Positive

- Zero-drift guarantee: round-trip property test (SHA-256(original) === SHA-256(decompose then recompose(original))) makes content drift mathematically impossible for every adapter
- Per-type adapter contract provides clean extension: adding a new source type means implementing the adapter interface and adding a variant to the discriminated union schema
- Auditable plan artifact at docs/_restructure/ enables human review before any script execution
- LLM removed from content-modifying loop eliminates the root cause of the bootstrapping incident
- Single source of truth for TS types and validation via Zod removes sync drift between schemas and type definitions

### Negative

- Dependency footprint: unified ecosystem (~4 packages) plus Zod plus js-yaml adds ~6 runtime dependencies to a greenfield project
- YAML type coercion quirks require defensive Zod validation on load (mitigated by D-1)
- Learning curve for the unified/mdast API for contributors unfamiliar with AST-based markdown processing
- Bun-native APIs (F-6) create medium lock-in: migrating to Node.js requires replacing ~15-20 call sites

### Neutral

- TypeScript-only constraint from D-1 (Zod) and F-6 (Bun + TS): the project is already TypeScript-only by design, so this is not a new restriction

## Vendor Lock-in Assessment

**Zod** (D-1)
**Lock-in Level**: Low
MIT license. Ubiquitous TypeScript ecosystem adoption. Drop-in alternatives exist (valibot, arktype, typebox). Migration effort: rewrite ~200-300 lines of schema definitions. No proprietary APIs or data formats.

**unified + remark + remark-frontmatter** (D-2)
**Lock-in Level**: Low
MIT license. Established ecosystem (unified has been maintained since 2014). The mdast AST format is an open specification. Migration to another markdown AST library (e.g., markdown-it with AST plugin) requires rewriting adapter parse/serialize methods (~400-600 lines). The adapter interface contract (D-4) abstracts the parser, limiting blast radius.

**js-yaml** (D-3, implied)
**Lock-in Level**: Low
MIT license. Ubiquitous YAML parser. Drop-in alternatives (yaml, js-yaml-plus). Migration effort: swap import and adjust API calls (under 1 hour).

**Bun** (F-6)
**Lock-in Level**: Medium
Bun-native APIs (Bun.file, Bun.write, Bun.hash, Bun.$, Bun.glob) are project-specific and do not have 1:1 Node.js equivalents. Migration to Node.js requires replacing ~15-20 call sites with fs/crypto/child_process equivalents. The core architecture (adapters, plan schema, hash validation logic) is runtime-agnostic; only the I/O layer is Bun-specific. Effort: 1-2 days.

**SHA-256** (F-8)
**Lock-in Level**: None
SHA-256 is a NIST standard cryptographic primitive available in every runtime. Bun.hash("sha256", ...) and Node.js crypto.createHash("sha256") produce identical output.

## Confirmation

- [ ] Round-trip property test passes for ADR adapter: SHA-256(original) === SHA-256(recomposed after decompose then recompose)
- [ ] Hash mismatch triggers ROLLBACK with no partial write state (write-to-temp-then-rename atomicity per F-8 rollback protocol)
- [ ] Plan YAML validator enforces injectivity of renumber and wikilink-substitution maps (BLOCKING gate per F-8 hash protocol)
- [ ] Zod validation rejects malformed plan YAMLs at script entry point (missing required fields, wrong source_type, invalid line ranges)
- [ ] **Security: YAML hardening** — `yaml.load(input, { schema: yaml.FAILSAFE_SCHEMA })` (or equivalent strict parser config) with max file-size guard (1 MB) before parse, mitigating billion-laughs / YAML-bomb DoS via untrusted plan files (CWE-502, CWE-400)
- [ ] **Security: path containment** — Zod schema validates all destination file paths via `path.resolve()` containment check; paths must resolve within `docs/` (CWE-22 path traversal mitigation for LLM-authored plan injection)
- [ ] unified AST parses all 5 source-type sample fixtures without content loss (parse then stringify round-trip preserves char-identity; remark-stringify whitespace-normalization risks tracked per Phase 3 review)
- [ ] /brain:---adr-review PASS verdict on this ADR before any code lands (process gate per D-5; separate from technical verification above)
- [ ] **LOC scope note**: the ~1,200 LOC estimate covers the 5 adapter implementations only. Total project including tests, CLI entry points, plan schema definitions, and Zod validation layer is estimated 2x-3x larger (~2,500-3,600 LOC). Track actuals after ADR adapter PROOF ships; recalibrate before SPEC subtree if overshoot exceeds 50%.

## Clarifications

- **2026-05-19**: brain:---adr-review Phase 4 convergence completed (round 1). Verdict tally 5 ACCEPT + 1 CONCERNS (independent-thinker) + 0 BLOCK. P1 themes 1-4 RESOLVED in this ADR refinement (hash protocol formal spec + rollback mechanism added to F-8; security hardening + LOC scope clarification added to Confirmation). P1 themes 5-6 (SHA-256 vs xxHash; unified+remark vs hybrid parser) DEFERRED with rationale documented in CRIT-001-ADR-001 — both challenge already-LOCKED decisions (F-8 and D-2) where re-adjudication would require user re-opening locked decisions. Revisit triggers: (Theme 5) revisit SHA-256 vs xxHash if profiling reveals hash compute dominates round-trip latency on real-world note sizes; (Theme 6) revisit unified vs hybrid parser if ADR adapter implementation exceeds 350 LOC (40% overshoot of ~250 estimate). P2 items documented in CRIT-001 for tracking. Independent-thinker CONCERNS verdict accepted as Disagree-and-Commit position with documented dissent.
- **2026-05-20**: F-4 evolution — remote added at <git@github.com>:loriensleafs/skills.git (private GitHub repo, loriensleafs namespace). The "(no remote initially)" qualifier of F-4 was the bootstrap-state escape hatch documented in the original locking on 2026-05-19; this clarification records the transition from local-only to remote-tracked. Migration path: Option C (keep feat/plan-001-skills-ecosystem as working branch; create main from current HEAD as the long-lived integration branch; push both; main becomes GitHub default branch). Branch convention going forward: feat/plan-NNN-work-unit branches off main; PRs merge to main via gh pr create. /end pipeline's PR-creation step (Step 4f) becomes APPLICABLE going forward and runs AUTOMATICALLY without per-session opt-out (locked 2026-05-20 user direction). brain:---adr-review NOT re-run for this Clarifications entry — Clarifications updates are documentation evolutions of already-ACCEPTED decisions per CONVENTIONS Section 3.1, not new architectural decisions; the F-4 reversibility assessment ("Adding a remote is a single git remote add command. No architectural impact.") explicitly anticipated this transition. Pairs with SESSION-2026-05-20_01 (event 12) and PLAN-001 Decision Log entry of same date.
- **2026-05-20**: F-4 evolution continued — remote relocated from loriensleafs/skills to acmelabs-15/skills (org-owned). User executed gh api -X POST /repos/loriensleafs/skills/transfer -f new_owner=acmelabs-15 in a separate terminal (gh repo transfer subcommand does not exist in gh CLI; gh api direct call is the working path). Transfer auto-accepted because user owns both loriensleafs (personal) and acmelabs-15 (org) — no notification dance required. Old URL <https://github.com/loriensleafs/skills> returns HTTP 301 redirect to new location indefinitely. Local remote updated via git remote set-url origin <git@github.com>:acmelabs-15/skills.git; verified git remote -v shows acmelabs-15/skills.git for fetch + push; verified git fetch origin + git log --oneline -3 origin/main shows full history preserved through PR #1 merge commit 4535414. Standalone repo under the org (not nested into a larger monorepo); the broader monorepo restructure (per ANALYSIS-002 Appendix G — packages/composition + decompose-recompose + defrag + ingest) stays deferred to ADR-004 when 2nd package starts. brain:---adr-review NOT re-run on this evolution — same Clarifications-only rationale as the prior 2026-05-20 entry (URL/owner change is not an architectural decision; F-4's reversibility assessment anticipated remote transitions). Pairs with SESSION-2026-05-20_02 (Event 02) and PLAN-001 Decision Log entry of same date.

## Observations

- [decision] Composite ADR covers 8 foundational locked decisions (F-1 through F-8 from KICKOFF-BRIEF.md) plus 5 architectural decisions (D-1 through D-5) adjudicated via AskUserQuestion on 2026-05-19 #architecture #skills-ecosystem
- [decision] Zod selected over JSON Schema for plan validation to eliminate sync drift between TS types and schemas (D-1) #validation #zod
- [decision] unified + remark selected over regex parser for markdown AST to ensure SPEC subtree accuracy with recursive cross-cluster wikilink rewrites (D-2) #parsing #unified
- [decision] YAML selected over JSON and markdown table for plan files to support human-readable LLM-authored user-adjudicated workflow (D-3) #plan-format #yaml
- [decision] Unified discriminated union on source_type selected over per-adapter schemas for clean type narrowing and single extension point (D-4) #schema #discriminated-union
- [decision] /brain:---adr-review BLOCKING gate required before PROPOSED to ACCEPTED transition on architecture ADRs (D-5) #quality-gate #adr-review
- [constraint] SHA-256 char-identity hash check is BLOCKING invariant; failed validation triggers ROLLBACK never partial write (F-8) #zero-drift #hash-validation
- [constraint] LLM authors plans only never modifies content bytes; deterministic script executes with two permitted mutations: identifier renumber and wikilink substitution (core architecture) #llm-script-separation
- [risk] SPEC subtree adapter is hardest (~500 LOC recursive rewrite); deferred behind ADR adapter PROOF (~250 LOC) to validate architecture before extension #adapter-complexity #build-order
- [risk] Dependency footprint of ~6 runtime packages for a greenfield project; mitigated by MIT licensing and ubiquitous alternatives for each dependency #dependencies

## Relations

- implemented_by [[SPEC-008: Protocol Hardening Wave 2]]
- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- leads_to [[ADR-002: Adapter Contract and Plan Schema]]
- implemented_by [[SPEC-001: Composition Core and ADR Adapter]]
- implemented_by [[SPEC-002: Simple Adapters]]
- implemented_by [[SPEC-003: PLAN Adapter]]
- implemented_by [[SPEC-004: SPEC Subtree Adapter]]
- implemented_by [[SPEC-005: Decompose and Recompose Skills]]
- implemented_by [[SPEC-006: Defrag and Ingest Skills]]
- implemented_by [[SPEC-007: Plan/Session Render Implementation]]
