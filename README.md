# skills

Zero-content-drift restructuring + ingest skills for Brain knowledge graphs.

This project provides four Claude Code skills:

| Skill | Role | Primitive / Composer |
|:--|:--|:--|
| `/decompose` | 1 → N split with SHA-256 hash-validated content preservation | primitive |
| `/recompose` | N → 1 merge with SHA-256 hash-validated content preservation | primitive |
| `/defrag` | Periodic curator; audits the graph and delegates to /decompose, /recompose, delete | composer |
| `/ingest` | Bring external content into the graph as a CONVENTIONS-compliant note | composer |

The decompose and recompose skills are documented in their own SKILL.md
files; this README focuses on the two new composer skills, `/defrag` and
`/ingest`, plus the shared install procedure.

## Install

```bash
./install.sh
```

The script creates symlinks at `~/.claude/skills/` for the four skills owned by
this project (`/decompose`, `/recompose`, `/defrag`, `/ingest`). It is
idempotent for its own symlinks (`ln -sf`) and never touches symlinks under
`~/Dev/basic-memory-skills/`.

## /defrag — periodic curator

`/defrag` audits the active project's notes under `docs/**` against quality
thresholds and scope heuristics, classifies each note into split / merge /
stale / structural-fix candidates, then delegates the restructuring work to
`/decompose`, `/recompose`, or native Brain MCP delete.

### CLI flags

| Flag | Effect |
|:--|:--|
| (none) | Interactive mode: print report, confirm each candidate |
| `--report-only` | Cron mode: write the report to `defrag/reports/defrag-YYYY-MM-DD.md` and exit |
| `--project-root <dir>` | Set the project root (default: `cwd`) |
| `--staleness <days>` | Staleness threshold in days (default: 180) |
| `--basic-memory` | Treat the project as basic-memory; skip CONVENTIONS-specific checks |

### Audit cycle

1. **Discovery** — enumerate every markdown note under `docs/**`.
2. **Evaluation** — apply quality thresholds:
   - `> 15` observations without H3 sub-grouping → split candidate
   - `> 500` lines with multi-entity content → split candidate
   - `< 3` observations OR `< 2` relations → merge candidate
   - `> 12` relations without H3 type-grouping → structural-fix
   - last-modified more than the staleness threshold AND status not `DONE` /
     `DEPRECATED` → stale candidate
3. **Reporting and delegation** — emit a grouped markdown report; in
   interactive mode walk each candidate one at a time and delegate confirmed
   actions. In report-only mode write the report and exit (code 0 if clean,
   code 2 if candidates were found).

### Examples

```bash
# Interactive
bun defrag/scripts/defrag.ts

# Cron / report-only
bun defrag/scripts/defrag.ts --report-only --staleness 90

# Specific project
bun defrag/scripts/defrag.ts --project-root ~/Dev/brain --report-only
```

## /ingest — bring external content into the graph

`/ingest` parses an external markdown file (or directory of files), detects
the appropriate canonical entity type, and writes a well-formed Brain note via
the Pattern 2 three-phase write. The source body is preserved character-for-
character between the frontmatter block and the generated Observations
section.

### CLI flags

| Flag | Effect |
|:--|:--|
| `<path>` | Source file (or directory with `--batch`) |
| `--type <type>` | Force entity type; one of the 16 canonical types |
| `--parent-spec <id>` | Required for spec-nested types (`requirement`, `design`, `task`) |
| `--basic-memory` | Simplified write; skip CONVENTIONS-specific requirements |
| `--batch` | Treat `<path>` as a directory; ingest each `.md` file |
| `--dry-run` | Show the plan; do not write |
| `--project-root <dir>` | Project root (default: `cwd`) |
| `--descriptor <text>` | Override the descriptor used in the title |

### Pipeline (six steps)

1. **Parse** — extract YAML frontmatter (if present), detect H1, detect any
   pre-existing `## Observations` / `## Relations` sections.
2. **Detect entity type** — frontmatter `type` → `--type` flag → fallback
   (`analysis`).
3. **Resolve target path** — map type → folder via the Section 5.1
   entity-type-to-folder table; compute next counter from existing notes.
4. **Assemble content** — build CONVENTIONS-compliant frontmatter, preserve
   source body verbatim, generate `## Observations` (≥ 3 with category prefix
   - tags) and `## Relations` (≥ 2 with valid types) when absent.
5. **Three-phase write** (Brain context) — Phase 1 `write_note` with a
   space-separated title (no colon); Phase 2 `edit_note find_replace` to add
   the colon in frontmatter title and H1; Phase 3 `move_note` to rename to
   the kebab filename.
6. **Verify** — run the six-item post-write check (kebab filename,
   frontmatter title matches, H1 matches, valid relation types, counts above
   minimums, final-two-sections invariant).

### Brain vs basic-memory routing

| Detection | Path |
|:--|:--|
| `docs/` exists AND at least one note has a canonical entity type | Brain |
| Otherwise | basic-memory |
| `--basic-memory` flag | basic-memory (override) |

In basic-memory mode the pipeline emits a simplified note (basic frontmatter,
source body, no required Observations / Relations / Pattern 2).

### Examples

```bash
# Single file, auto-detect type
bun ingest/scripts/ingest.ts notes/onboarding.md

# Force entity type
bun ingest/scripts/ingest.ts notes/foo.md --type analysis

# Spec-nested
bun ingest/scripts/ingest.ts task-source.md --type task --parent-spec SPEC-006-defrag-and-ingest

# Directory batch
bun ingest/scripts/ingest.ts notes/ --batch

# Basic-memory project
bun ingest/scripts/ingest.ts notes/foo.md --basic-memory
```

## Coexistence with basic-memory-skills

`/defrag` and `/ingest` coexist with the existing `~/Dev/basic-memory-skills`
skills (`memory-defrag` and `memory-ingest`). The names are deliberately
distinct: Claude Code resolves skills by exact name, so both sets can be
installed simultaneously without ambiguity.

| Skill | Owned by | Target context |
|:--|:--|:--|
| `/defrag` | this project | Brain knowledge graph (full CONVENTIONS audit + delegation) |
| `memory-defrag` | basic-memory-skills | Basic Memory projects |
| `/ingest` | this project | Brain knowledge graph (Pattern 2 + CONVENTIONS compliance) |
| `memory-ingest` | basic-memory-skills | Basic Memory projects |

`install.sh` only manages symlinks for the four skills owned by this project;
it never modifies or removes symlinks owned by `basic-memory-skills`.

## Development

```bash
bun install           # install workspace deps (composition lib + js-yaml)
bun test              # run defrag + ingest + detect-context tests
bunx tsc --noEmit     # typecheck
bunx biome check .    # lint
```

Composition library (the SHA-256 zero-drift engine) lives at
`_shared/composition/` and is consumed by `/decompose` and `/recompose`; the
two composer skills (`/defrag`, `/ingest`) invoke the primitives via Claude
Code's skill dispatch rather than importing the library directly.
