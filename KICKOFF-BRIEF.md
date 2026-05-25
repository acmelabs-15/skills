# Skills Ecosystem — Kickoff Brief

## Mission

Build a zero-content-drift restructuring capability for Brain notes (and Basic
Memory notes as a subset). Two primitive skills (/decompose and /recompose) and
two higher-level skills (/defrag and /ingest) that compose on top.

## Why this exists (background — captured from a prior session)

A `/plan PLAN-001 --split` attempt on a 3,680-line Brain ADR (ADR-001 in the
brain project) tried to retroactively split the ADR into 5 sub-ADRs via a
brain:🧠-architect dispatch with a "verbatim extraction" brief. The architect
returned with 35% content compression on 10 of 12 D-Ns (bullet sub-items
converted to paragraph prose under perceived line-count pressure), used the
filesystem Write tool instead of Brain MCP write_note as an undocumented
tactical exception, and unilaterally shifted the wikilinks-in-bullets
convention. The split was reverted.

Root cause: LLMs drift on structural/content-preservation tasks under perceived
pressure. The fix is architectural — take the LLM out of the content-modifying
loop entirely. LLM authors a structured plan (cohesion analysis, cluster
boundaries, renumber maps, cross-reference rewrites); a deterministic script
executes the plan with cryptographic hash validation against char-identity.

## Architecture (locked from prior session via AskUserQuestion)

Layout:
~/Dev/skills/
├── README.md
├── package.json            # Bun + TS for the shared library
├── tsconfig.json
├── biome.json
├── docs/                   # Brain knowledge graph (this project's notes)
│   ├── planning/
│   ├── decisions/
│   ├── specs/
│   ├── sessions/
│   ├── analysis/
│   └── critique/
├── ingest/SKILL.md         # Brain-aware ingest (verbatim source preservation)
├── skills/decompose/SKILL.md      # 1→N split with hash-validated zero drift
├── skills/recompose/SKILL.md      # N→1 merge with hash-validated zero drift
├── defrag/SKILL.md         # Periodic curator; delegates to /decompose + /recompose
├── shared/composition/     # The deterministic library
│   ├── src/
│   │   ├── core/           # parse, hash, validate, write, relation-rewire
│   │   ├── adapters/       # adr.ts, analysis.ts, plan.ts, spec.ts, session.ts
│   │   ├── decompose.ts
│   │   └── recompose.ts
│   ├── schemas/            # JSON Schemas for plan YAMLs
│   └── tests/              # Round-trip property tests
└── install.sh              # Symlink ~/.claude/skills/<name> → ~/Dev/skills/<name>

Locked design decisions:

1. Skills live in ~/.claude/skills/ via symlinks; canonical source at ~/Dev/skills/
2. Brain-first scope; Basic Memory works as subset (auto-detect from frontmatter type)
3. Coexist with existing ~/Dev/basic-memory-skills/memory-ingest and memory-defrag
   (do NOT delete or rename those; the new /ingest and /defrag are Brain-aware variants)
4. Standalone local-only git repo (no remote initially)
5. Naming: "composition" for the shared library (covers both decompose and recompose
   directions); "decompose" and "recompose" for the verbs
6. Runtime: Bun + TypeScript; Bun-native APIs (Bun.file, Bun.write, Bun.hash,
   Bun.$, Bun.glob); biome for lint/format
7. Plan artifacts: YAML files at docs/_restructure/{decompose,recompose}-<id>-plan.yaml
   (LLM-authored, user-adjudicated, script-consumed)
8. Validation invariant: SHA-256 char-identity hash check on source extraction
   vs destination extraction (modulo deterministic renumber/wikilink mutations).
   Script REFUSES to write if hash mismatch.

## LLM-script division of labor

LLM (cognitive work):

- Read source note; classify type
- Cohesion analysis: identify cluster seams; map sections to destinations
- Author Distribution Plan YAML (decompose) or Composition Plan YAML (recompose)
- Surface plan to user via AskUserQuestion for adjudication
- After script execution: per-output gate (adr-review if ADR, spec-review if SPEC)

Script (mechanical work):

- Parse source by line ranges from plan
- Apply ONLY two mutations: (a) identifier renumber per plan, (b) cross-cluster
  wikilink substitution per plan map
- Compute hash of source extraction (pre-mutation) and destination extraction
  (post-reverse-mutation)
- Refuse to write if hashes differ
- Emit audit log per output

## Per-type adapter specifics (build order, simplest first)

1. ADR — H3 sub-sections under `## Decision`; D-N renumber within ADR; cross-
   cluster D-N wikilink map. (~250 LOC; first to build; validates architecture)
2. ANALYSIS — H2 finding/item sections; item-N or none; ~50 LOC delta
3. SESSION — `## Event NN` ranges; Event-NN restart per new session; cross-source
   updates to PLAN parts (owning_session, completing_session); ~100 LOC delta
4. PLAN — `### {phase}.{part-id}` sections; phase+part-id restart per new PLAN;
   Progress Dashboard + Mermaid regeneration; branches[] frontmatter; ~250 LOC delta
5. SPEC subtree (hardest) — root + recursive subtree of requirements/, design/,
   tasks/; per-child renumber + filename rewrite + frontmatter updates; intra-spec
   relations preserved; cross-spec relations rewritten; ~500 LOC delta

Total: ~1,200 LOC for full coverage of both /decompose and /recompose across
all 5 types.

## /defrag and /ingest

/defrag — periodic curator (cron-runnable). Audits memory state per heuristics
from CONVENTIONS Section 6 + ~/.claude/skills/plan/references/scope-evaluation-
and-split.md thresholds. Identifies split candidates → delegates to /decompose.
Identifies merge candidates → delegates to /recompose. Identifies stale entries
→ native delete after confirmation. Reports + commits.

/ingest — outside → graph. Verbatim source preservation contract. Adapted from
~/Dev/basic-memory-skills/memory-ingest/SKILL.md but Brain-aware (CONVENTIONS,
Pattern 2 three-phase write, 16 canonical entity types, observation [category]
prefix + #tags, final-two-sections invariant). Coexists with memory-ingest
(which stays for Basic Memory-only contexts).

## Round-trip property test (key architectural validation)

For each adapter:
  const original = readNote(path);
  const plan = generateDistributionPlan(original);     // LLM in real use; fixture in tests
  const decomposed = decompose(original, plan);
  const recomposed = recompose(decomposed, inversePlan(plan));
  assert(sha256(original) === sha256(recomposed));

If this passes for every adapter, drift is mathematically impossible. Test runs
in CI; gates protocol changes.

## Key file references the new session should read

- ~/CLAUDE.md (orchestrator instructions; auto-imports KNOWLEDGE-GRAPH-CONVENTIONS.md)
- ~/KNOWLEDGE-GRAPH-CONVENTIONS.md (16-entity-type model + Pattern 2 + invariants)
- ~/.claude/skills/plan/SKILL.md (includes the recent branches[] policy fix:
  branch-per-work, no auto-checkout on conflict)
- ~/.claude/skills/plan/references/scope-evaluation-and-split.md (origin of the
  decompose/recompose conceptual pair; threshold table; split protocol Steps 1-6)
- ~/Dev/basic-memory-skills/memory-ingest/SKILL.md (reference for /ingest)
- ~/Dev/basic-memory-skills/memory-defrag/SKILL.md (reference for /defrag delegation pattern)

## Open design questions for early adjudication

1. JSON Schema vs Zod for plan validation? (JSON Schema is portable + LLM-friendly;
   Zod is TS-native but TS-only)
2. Markdown AST library: unified/remark/remark-frontmatter, or custom regex parser?
   (AST = robust; regex = simpler for ADR's structured H2/H3, harder for SPEC subtree)
3. Plan file format: pure YAML, JSON, or sidecar markdown table inside the PLAN
   part body? (YAML recommended; PLAN part body shows a human-readable summary)
4. Per-adapter or unified plan schema? (Unified with discriminated union on
   `source_type` is cleaner; per-adapter is more verbose but easier to evolve)
5. Run /brain:---adr-review on architecture ADRs (-001, -002) — Phase 4
   convergence required as BLOCKING gate before any code is written?

## Constraints (non-negotiable)

- Bun-native APIs throughout
- All Brain notes in this project follow CONVENTIONS
- No content drift in composition library — char-identity hash check is BLOCKING
  invariant; failed validation = ROLLBACK, never partial write
- LLM authors plans only, never modifies content bytes
- User adjudicates plans via AskUserQuestion before any script execution
- Brain MCP for all Brain note operations (docs/**); Read/Edit/Write for source
  code (src/**) and config; binary rule per CONVENTIONS Section 1.7.1

## Out of scope for the bootstrap session

- Building all 5 adapters (only ADR for the proof; others incremental in later sessions)
- Touching the brain project's ADR-001 retro split (deferred until composition
  library + /decompose are battle-tested on synthetic fixtures)
- /defrag implementation (after primitives stable)
- Publishing as a plugin (local-only repo first; plugin packaging later if desired)
