---
name: ingest
description: |
  Bring external content into a Brain knowledge graph as a well-formed note.
  Parses source files, auto-detects entity type, generates CONVENTIONS-compliant
  frontmatter / observations / relations, executes the Pattern 2 three-phase
  write, and verifies the result. Source body is preserved character-for-character.
  Falls back to a simplified write_note path for basic-memory projects.
triggers:
  - ingest
  - import note
  - bring into graph
  - ingest file
  - ingest directory
---

# ingest

The ingest skill imports external content (markdown, plain text with frontmatter,
or an export from another tool) into a Brain knowledge graph. It does NOT
rewrite or summarize source content: the body between frontmatter and the
generated Observations section is preserved verbatim.

## Trigger phrases

`ingest`, `import note`, `bring into graph`, `ingest file`, `ingest directory`.

## CLI usage

```bash
bun skills/ingest/scripts/ingest.ts <path>                       # single file (auto-detect type)
bun skills/ingest/scripts/ingest.ts <path> --type analysis       # force entity type
bun skills/ingest/scripts/ingest.ts <dir>  --batch               # directory batch mode
bun skills/ingest/scripts/ingest.ts <path> --basic-memory        # simplified write (skip CONVENTIONS)
bun skills/ingest/scripts/ingest.ts <path> --project-root /p
bun skills/ingest/scripts/ingest.ts <path> --dry-run             # show plan, don't write
```

## Pipeline (six steps)

1. **Parse.** Read the source file. Extract YAML frontmatter (if present),
   detect the first H1 as a fallback title, detect existing `## Observations`
   and `## Relations` sections.
2. **Detect entity type.** Source frontmatter `type` → CLI `--type` → user
   prompt (in this priority).
3. **Resolve target path.** Map entity type to folder per Section 5.1; for
   spec-nested types (requirement / design / task) prompt for parent SPEC;
   compute next available counter.
4. **Assemble content.** Build CONVENTIONS-compliant frontmatter, preserve
   source body verbatim, ensure final-two-sections invariant by generating
   Observations (≥3, with category prefix + tags) and Relations (≥2, valid
   types) when absent.
5. **Three-phase write (Brain context).** Phase 1: `write_note` with a
   space-separated title (no colon). Phase 2: `edit_note find_replace` to add
   the colon in frontmatter and H1. Phase 3: `move_note` to kebab filename.
6. **Verify.** Check all six items from CONVENTIONS Section 8.2: kebab
   filename, frontmatter title matches, H1 matches, valid relation types,
   counts above minimums, final-two-sections.

## Brain vs basic-memory routing

When a `docs/` directory exists and at least one note has a canonical entity
type, ingest uses the full Brain pipeline. Otherwise (or with `--basic-memory`),
it uses the simplified path: direct `write_note`, no Pattern 2, no Observations
or Relations requirement.

## Verbatim source preservation

ingest never edits source body content. Only structural elements (frontmatter
block, Observations section, Relations section) are added around the source
body. If the source already has a well-formed Observations or Relations
section, ingest preserves it (and may augment it to meet minimum counts only
if the existing content is below threshold).

