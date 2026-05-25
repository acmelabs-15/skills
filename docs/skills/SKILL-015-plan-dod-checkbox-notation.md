---
permalink: skills/skill-015-plan-dod-checkbox-notation-1
---

---
title: SKILL-015: plan-dod-checkbox-notation
type: skill
permalink: skills/skill-015-plan-dod-checkbox-notation
status: ACCEPTED
tags:
- plan
- checkbox-notation
- renderer
- round-trip-identity
---

# SKILL-015: plan-dod-checkbox-notation

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] /end Step 1.

## Constraints (HIGH confidence)

- In a PLAN part's `## DoD`, deferred / dispositioned checkbox items use `[x]` (with the deferral rationale in the item's trailing text), NOT `[~]`. The `[~]` deferred-marker is SPEC-root `## Artifact Status`-scoped (per ADR-005 D-6 and CONVENTIONS Section 4.6). `renderPlanNote` does not emit `[~]` DoD lines, so using `[~]` in a PLAN DoD makes the on-disk PLAN fail SHA-256 round-trip identity: `renderPlanNote(parsePlanNote(md))` silently drops the `[~]` lines, so `sha256(render) !== sha256(md)`. Caught by `shared/composition/tests/plan-001-migration.test.ts` AC#3 (round-trip identity) on 2026-05-25. Source: user ruling "[~] should be [x]" during the /end Step 1 reflection.

## Preferences (MED confidence)

- Distinct status semantics per layer: PLAN parts carry enum statuses on their items; the `[~]` deferred marker is reserved for SPEC-root `## Artifact Status` rows only. Do not borrow markers across layers even when the intent (deferral) feels equivalent.

## Edge Cases (MED confidence)

- A `[x]` DoD item whose target action is deferred should carry the deferral in its trailing rationale text (e.g., "— DEFERRED: stays ACCEPTED pending …") so the record stays honest. `[x]` denotes the DoD line was dispositioned this session; the actual entity status is governed by the rationale text, not by the checkbox glyph.

## Notes for Review (LOW confidence)

- This validated the prior retrospective finding that "the renderer owns the PLAN — do not hand-maintain sections/markers outside its model" in real time. Any hand-edit to a renderer-owned PLAN should be followed by re-running the round-trip identity test before commit.

## Observations

- [constraint] PLAN DoD deferred items use `[x]` plus trailing rationale, never `[~]` — `renderPlanNote` emits no `[~]` DoD lines #plan #checkbox-notation
- [fact] `[~]` deferred marker is SPEC-root Artifact-Status-scoped per ADR-005 D-6 and CONVENTIONS Section 4.6 #scope #marker
- [problem] A `[~]` DoD line breaks SHA-256 round-trip identity because `renderPlanNote(parsePlanNote(md))` drops it silently #round-trip #drift
- [solution] Caught by `plan-001-migration.test.ts` AC#3 round-trip identity check on 2026-05-25 #test #regression
- [insight] Re-run the round-trip identity test after any hand-edit to a renderer-owned PLAN before commit #renderer-ownership #verification
- [decision] User ruled "[~] should be [x]" during the /end Step 1 reflection #ruling #disposition

## Relations

- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]
- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]