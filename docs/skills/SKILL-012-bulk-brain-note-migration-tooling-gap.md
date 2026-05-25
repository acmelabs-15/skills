---
title: 'SKILL-012: bulk-brain-note-migration-tooling-gap'
type: skill
permalink: skills/skill-012-bulk-brain-note-migration-tooling-gap
tags:
- skill
- bulk-migration
- tooling-gap
- binary-rule
---

# SKILL-012: bulk-brain-note-migration-tooling-gap

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 156.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "There is no sanctioned tool for bulk CONTENT migration across Brain notes. The binary rule (Brain notes → Brain MCP only, never raw sed/Write) forbids a fast file-level find-replace, yet no Brain-MCP batch-rewrite primitive exists (decompose/recompose/ingest/defrag/sync-graph don't cover string find-replace across N notes). So a ~200-note string migration today means 200 individual edit_note calls, a not-yet-built MCP batch tool, or raw sed + reindex (convention-violating). Plan a bulk migration as a TOOLING task, not an ad-hoc grind." — Source: SPEC-008 docs-sweep scoping — _shared→shared (188 files), test-report→qa (31), feedback_ (16) (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Most of a bulk note migration is rule-based + automatable (path/note-type-scoped replace + a preserve-list for historical/temporal notes); only a small subset (semantic inline-rewrites like feedback_ citation removal, and rename-narrative contexts) needs per-note human judgment. Separate the mechanical bulk from the semantic few." — Source: sweep analysis (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "Rewriting historical/temporal notes (sessions, QA gate records) to current reality is questionable — per the Information Model, session notes are a temporal log to preserve as-was. REQ-009 AC-8 exempts sessions/ADR-005/ANALYSIS-004/RETRO-003 from the _shared→shared rewrite; the 60 QA notes referencing _shared are arguably also historical. 'Rewrite to current path' vs 'preserve as history' is a per-note-type call, not mechanical." — Source: _shared sweep 60 QA-note hits (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "A robust bulk-Brain-note-rewrite tool (MCP-backed find-replace, path/type-scoped preserve-list, embedding reindex) is a candidate deliverable for the consistency-reconciliation effort — same theme as the schema-single-source-of-truth gap." — Source: this analysis (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] No sanctioned bulk-rewrite tool for Brain notes; the binary rule forbids raw sed; a 200-note migration is a tooling task, not an ad-hoc grind #bulk-migration #tooling-gap #binary-rule
- [insight] Bulk migration = mostly rule-based (scoped replace + preserve-list) + a small semantic remainder; separate them so only the remainder needs human eyes #automatable #semantic-remainder
- [risk] Rewriting temporal/historical notes (sessions, QA records) to the current path erodes the temporal-log invariant; preserve-vs-rewrite must be decided per note-type #temporal-log #preservation

## Relations

- relates_to [[SKILL-009: schema-single-source-of-truth]]
- relates_to [[SKILL-008: parse-at-creation]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]
