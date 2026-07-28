---
title: 'QA-049-SPEC-008: Document Deferred Notation'
type: qa
permalink: qa/qa-049-spec-008-document-deferred-notation
tags:
- qa
- spec-008
- task-033
- deferred-notation
- verdict-pass
---

# QA-049-SPEC-008: Document Deferred Notation

## Summary

Per-TASK QA gate for [[TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7]]. Independent re-validation by brain:🧠-qa (`a176f6333bb81326c`) against committed state. Verdict: **PASS** — 6 DoD + REQ-008 AC-6 (documentation slice) all green; 4 grep gates clean.

## Verdict

**PASS** — every in-scope item validated independently. STRUCTURES Sections 4.6 + 4.7 amended with substantive `[~]` content + REQ-008/ADR-005 D-6 citations; CONVENTIONS pointer block updated.

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — STRUCTURES 4.7 documents `[~]` for SPEC root Artifact Status | PASS | Lines 388-394 add "Deferred notation" subsection covering when-to-use, validator acceptance, legend, inline rationale, scope boundary, source decisions |
| 2 — STRUCTURES 4.6 clarifies `[~]` is SPEC-scoped (PLAN uses distinct enums) | PASS | Lines 193-201 add subsection enumerating PLAN's 3 terminal vocabularies (Phase Status prose enums; BuildWorkflowItem schema enums; PLAN checkbox binary) — none use `[~]` |
| 3 — both Sections cite REQ-008-SPEC-008 + ADR-005 D-6 | PASS | 4 grep hits each: STRUCTURES lines 193, 201, 388, 394 |
| 4 — CONVENTIONS pointer block updated | PASS | CONVENTIONS line 416 carries the `[~]` pointer to STRUCTURES Sections 4.6/4.7 |
| 5 — `grep -n "\[~\]" STRUCTURES.md` returns new content | PASS | 8 matches at lines 193, 195, 199, 201, 388, 390, 391, 393 |
| 6 — no Brain MCP on user-home files (Edit/Write only) | PASS | Both `~/KNOWLEDGE-GRAPH-STRUCTURES.md` + `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` definitionally out of `docs/**` Brain MCP scope; impl used Edit only |

## REQ-008 in-scope AC

| AC | Result |
|---|---|
| AC-6: future spec author reads either Section + gets unambiguous `[~]` spec + REQ-008 citation | PASS — both sections substantive; cross-referenced; scope boundary explicit |

(REQ-008 other ACs cover the validator extension TASK-032 + SPEC-007 amendment TASK-031 — out of TASK-033 scope.)

## Re-run gates

- `grep -n "\[~\]" ~/KNOWLEDGE-GRAPH-STRUCTURES.md | wc -l` → 8 (expected ≥8)
- `grep -n "REQ-008-SPEC-008" ~/KNOWLEDGE-GRAPH-STRUCTURES.md` → 4 hits
- `grep -n "ADR-005 D-6" ~/KNOWLEDGE-GRAPH-STRUCTURES.md` → 4 hits

## Minor non-blocking observation

CONVENTIONS Table-of-Contents entry at line ~91 was not updated to mention `[~]`; the body pointer block at line 416 was. DoD specifies "pointer block," which is the body entry — DoD satisfied. ToC discoverability is a minor gap, not a DoD violation.

## Observations

- [outcome] TASK-033 STRUCTURES amendment validated PASS; `[~]` deferred-notation canonical for SPEC root Artifact Status rows + PLAN scope boundary explicit #qa #conventions-amendment
- [fact] 8 `[~]` matches in STRUCTURES.md; 4 REQ-008 + 4 ADR-005 D-6 citations each across Sections 4.6 and 4.7 #greppable-evidence
- [insight] PLAN parts have 3 distinct terminal-state vocabularies that don't use `[~]`; documenting this explicitly prevents future validator-extension ambiguity #scope-boundary
- [decision] User-home root file edits via Read/Edit only (CONVENTIONS Section 1.7.1 binary tool rule) — Brain MCP would be wrong; the impl correctly used Edit #binary-tool-rule
- [risk] ToC entry not updated; minor discoverability gap if a future reader scans only the ToC #minor-observation

## Relations

- relates_to [[TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]