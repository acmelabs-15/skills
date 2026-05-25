---
title: 'SKILL-009: schema-single-source-of-truth'
type: skill
permalink: skills/skill-009-schema-single-source-of-truth
tags:
- skill
- schema-first
- single-source-of-truth
- drift
---

# SKILL-009: schema-single-source-of-truth

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 153.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "When an approach is schema-driven, the schema MUST be the single source of truth and the parser, validator, template, and renderer MUST be derived/generated from it — never independently hand-encoded. Encoding a note type's structure in 3+ places (schema = data shape; parser = section→field heading map; template = heading layout) guarantees drift; they cannot stay consistent by discipline alone." — Source: user, "if the approach is schema driven then the schema should be defined first everything else (validator, parser, template, renderer) should be built from that, right?" (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Elevate the schema (or a co-located structure definition) to own the section/heading map + ordering, not just the data shape. Today Zod owns validation (the schema IS the validator) but the heading↔field mapping lives in the parser and the heading layout lives in the template, so structure is triplicated." — Source: REQ parser hard-codes `sections.get('Requirement Statement')` etc.; template hand-writes headings (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "Drift is multi-directional, not one-way: the parser read `## Pattern` while the template said `## EARS Pattern`; the DESIGN `## Compliance` section was in parser + notes but ABSENT from the template. Any of the hand-encodings can be the stale one." — Source: SPEC-008 three-layer comparison (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "Symptom vs root: 'the notes deviated from the template' is the downstream symptom; the root is 'no single schema-driven source, so structure is triplicated and drifts.' Fixing the notes without fixing the source just resets the clock." — Source: reframing during this analysis (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] Schema-driven ⇒ schema is the single source; parser/validator/template/renderer derive from it. Independent hand-encoding of structure = guaranteed drift #single-source-of-truth #schema-first #drift
- [insight] The Zod schema currently owns DATA shape + validation but NOT structure (heading↔field map lives in the parser; heading layout in the template) — structure is triplicated #structure-ownership #gap
- [decision] The fix locus for a consistency problem is the source-of-truth architecture, not the downstream notes #root-cause #fix-locus

## Relations

- relates_to [[SKILL-008: parse-at-creation]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]

- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]