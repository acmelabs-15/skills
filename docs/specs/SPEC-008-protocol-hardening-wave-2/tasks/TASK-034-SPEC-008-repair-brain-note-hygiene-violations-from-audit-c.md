---
title: 'TASK-034-SPEC-008: Repair Brain Note Hygiene Violations from Audit C'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-034-spec-008-repair-brain-note-hygiene-violations-from-audit-c
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- track-4
- audit-c
- hygiene
- atomic
---

# TASK-034-SPEC-008 Repair Brain Note Hygiene Violations from Audit C

## Objective

[[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit C found a 10% violation rate across 100 Brain notes (MINOR_DRIFT verdict — cleanup substantially held, no systemic breakdown). This TASK repairs the six categories of violation it identified, across the ten affected notes. All edits via Brain MCP `edit_note` per the binary tool rule (CONVENTIONS Section 1.7.1) — NEVER raw Edit/Write on `docs/**`.

The six violation categories (10 notes):

1. Duplicate frontmatter blocks (2 notes): QA-027-SPEC-004, QA-030-SPEC-002 — merge to a single canonical block (basic-memory treats only the first block authoritatively).
2. Forbidden `validates` relation (4 notes): QA-027, QA-042, QA-043, QA-015 — replace with `depends_on` (the canonical verb for a QA-aggregate referencing the spec/artifact it validates; `relates_to` only if no typed verb fits).
3. Title-without-colon (3 notes): ANALYSIS-002, SESSION-2026-05-20_01, SESSION-2026-05-20_02 — insert the `:` separator into frontmatter title + H1 so both match the canonical `{ENTITY-ID}: {Descriptor}` form.
4. Stale non-canonical `type:` (2 notes): QA-030 (`test_report`), QA-038 (`test-report`) — flip to canonical `qa` (the post-rename canonical type per CONVENTIONS Section 3).
5. PII local-path redaction (3 notes): QA-036, QA-038, SESSION-2026-05-20_03 Event 04 — replace absolute `/Users/<username>/...` paths with repo-relative or `<repo root>` placeholder.
6. Duplicate Event numbers (1 note): SESSION-2026-05-21_01 Events 36/37/38 (killed-agent re-entry) — renumber the duplicates to restore a monotonic event sequence.

## Definition of Done


- [x] QA-027-SPEC-004 and QA-030-SPEC-002 each have exactly ONE frontmatter block (duplicate merged; colon-titles YAML-quoted; stub-permalink preserved)
- [x] QA-027, QA-042, QA-043, QA-015 each have zero `validates` relations; replaced with `depends_on` (or `relates_to` where no typed verb fits) — verified by `grep -rn "^- validates \[\[" docs/qa/` returning zero **(Scope expanded Event 58: ALL 31 additional `validates` relations across 30 other QA notes also fixed — full broader-grep verification now satisfied)**
- [x] ANALYSIS-002, SESSION-2026-05-20_01, SESSION-2026-05-20_02 each have a colon-bearing frontmatter title AND a matching H1 (both forms `{ENTITY-ID}: {Descriptor}`)
- [x] QA-030 frontmatter `type: qa` (was `test_report`); QA-038 frontmatter `type: qa` (was `test-report`)
- [x] QA-036, QA-038, SESSION-2026-05-20_03 contain zero absolute `/Users/<username>/` paths — verified by `grep -rn "/Users/" docs/qa/QA-036* docs/qa/QA-038* docs/sessions/SESSION-2026-05-20_03*` returning zero
- [x] SESSION-2026-05-21_01 has a monotonic Event sequence with no duplicate Event numbers (36/37/38 dedup resolved via 36b/37b/38b renumbering)
- [x] All edits used Brain MCP `edit_note` (binary tool rule) — no raw Edit/Write on `docs/**`
- [x] Post-fix: each repaired note still parses against its note-type schema (re-read via Brain MCP confirms no new malformation introduced)


## ADR Compliance


- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-7 tactical-cleanup scope (Track 4 carries the Audit C hygiene cleanup; not an architectural decision, executed against the Audit C findings inventory **plus the user-authorized scope expansion to the broader `validates` cleanup surfaced via the DoD verification grep, Event 58**)


## Files Affected

- `docs/qa/QA-027-SPEC-004-*.md`
- `docs/qa/QA-030-SPEC-002-*.md`
- `docs/qa/QA-042-*.md`
- `docs/qa/QA-043-*.md`
- `docs/qa/QA-015-SPEC-003-*.md`
- `docs/qa/QA-036-*.md`
- `docs/qa/QA-038-SPEC-004-*.md`
- `docs/analysis/ANALYSIS-002-*.md`
- `docs/sessions/SESSION-2026-05-20_01-*.md`
- `docs/sessions/SESSION-2026-05-20_02-*.md`
- `docs/sessions/SESSION-2026-05-20_03-*.md`
- `docs/sessions/SESSION-2026-05-21_01-*.md`

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 4h | 10 notes × multiple edit categories + grep verification |
| AI-Dominant | 1d | Mechanical edit_note batches with per-category grep verification (CANONICAL) |
| AI-Assisted | 6h | Pair-driven with verification cycle |

## Observations

- [fact] Closes Audit C MINOR_DRIFT verdict — 10 notes, 6 violation categories, zero systemic breakdown #audit-c #hygiene
- [decision] `validates` replaced with `depends_on` for QA-aggregate references — the canonical typed verb; `relates_to` reserved for genuinely non-directional links #relation-verb #allowlist
- [constraint] All repairs via Brain MCP edit_note per binary tool rule; raw Edit/Write forbidden on docs/** #binary-tool-rule
- [insight] The `validates` drift root cause was the QA dispatch-brief template lacking the 11-verb allowlist — REQ-005 brief-generator scripts close the recurrence path; this TASK cleans the existing instances #root-cause #recurrence-prevention
- [risk] PII path redaction must preserve the semantic reference (which file) while removing the absolute prefix — use repo-relative form, not deletion #pii #provenance

## Relations

- implements [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[QA-051-SPEC-008: Repair Brain Note Hygiene Violations]]
