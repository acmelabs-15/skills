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
6. **Verify.** Check what can be checked from the assembled text, and know
   what is not covered. Enforced, each failing the run: the filename has no
   spaces, the frontmatter title matches the plan, the H1 matches the plan,
   observations number at least 3 and relations at least 2, and Observations is
   followed by Relations with no section after it. Two of CONVENTIONS Section
   8.2's six items are **not** enforced here — the full kebab-case check is a
   no-op, and relation verbs are not validated, because generated relations use
   valid verbs by construction and a preserved section is trusted. Under
   `--basic-memory` only the first three run.

   Verification happens **after** the write, and the three-phase write is not
   reversible — so a failure names what is wrong in a note that already exists,
   rather than preventing it. Treat the result as a repair list.

## Brain vs basic-memory routing

When a `docs/` directory exists and at least one note has a canonical entity
type, ingest uses the full Brain pipeline. Otherwise (or with `--basic-memory`),
it uses the simplified path: direct `write_note`, no Pattern 2, no Observations
or Relations requirement.

## Verbatim source preservation

ingest never edits source body content. Only structural elements (frontmatter
block, Observations section, Relations section) are added around the source
body. If the source already has an Observations or Relations section, ingest
preserves it **verbatim**; if it has none, ingest generates one. There is no
middle path — a preserved section is never extended, so a source arriving with
two observations keeps two and fails verification for being below the minimum
of three. Fix that in the source, not by expecting ingest to top it up.

