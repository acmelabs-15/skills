---
title: 'QA-051-SPEC-008: Repair Brain Note Hygiene Violations'
type: qa
permalink: qa/qa-051-spec-008-repair-brain-note-hygiene-violations
tags:
- qa
- spec-008
- task-034
- brain-note-hygiene
- verdict-pass
---

# QA-051-SPEC-008: Repair Brain Note Hygiene Violations

## Summary

Per-TASK QA gate for [[TASK-034-SPEC-008: Repair Brain Note Hygiene Violations from Audit C]] across both phases — Phase 1 (Audit C named inventory; commit `8906e71`) + Phase 2 (user-authorized scope expansion via Event 58; commit `4373083`). Independent re-validation by brain:🧠-qa (`a954a7a35ebd61c5c`). Verdict: **PASS** — 8 DoD + REQ-010 ACs 1-6 + AC-10 (TASK-034 slice) all green.

## Verdict

**PASS** — every in-scope item validated independently. 42 unique notes repaired (12 Phase 1 + 30 Phase 2). Both grep gates return zero; 6 notes spot-checked via Brain MCP `read_note` with no structural damage.

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — QA-027 + QA-030 single frontmatter blocks | PASS | `grep -c "^---$"` returns 2 for each (1 block); colon-titles YAML-quoted; stub permalinks preserved |
| 2 — 4 Audit C named notes zero `validates` + broader `grep -rn "^- validates \[\[" docs/qa/` returns ZERO | PASS | broader grep empty after Phase 2 sweep (31 swaps across 30 notes); QA-001 / QA-020-SPEC-004 / QA-010-SPEC-007 sampled clean |
| 3 — ANALYSIS-002 + 2 SESSION notes colon-bearing titles + matching H1 | PASS | `grep -n "^title:"` colon form for all 3; `grep -n "^# "` H1 matches verbatim |
| 4 — QA-030 + QA-038 frontmatter `type: qa` | PASS | both verified via `read_note` |
| 5 — `/Users/` PII paths gone in QA-036 + QA-038 + SESSION-2026-05-20_03 | PASS | grep empty; semantic file references preserved (e.g. `shared/composition/...`, `<repo root>`) |
| 6 — SESSION-2026-05-21_01 monotonic Event sequence | PASS | duplicate 36/37/38 renumbered to 36b/37b/38b; `grep "^## Event " \| sort \| uniq -d` returns empty |
| 7 — all edits via Brain MCP (binary tool rule) | PASS | no raw Edit/Write evidence on `docs/**`; process attestation holds |
| 8 — post-fix notes parse against type schemas | PASS | 6 spot-checks return well-formed content; structural integrity (frontmatter + Observations + Relations) intact across both phases |

## REQ-010 ACs in-scope coverage (TASK-034 slice)

| AC | Result | Notes |
|---|---|---|
| AC-1 | PASS | TASK-034 fully covered |
| AC-2 | PASS | TASK-034 + scope expansion |
| AC-3 | PASS | TASK-034 |
| AC-4 | PASS | TASK-034 |
| AC-5 | PASS | TASK-034 |
| AC-6 | PASS | TASK-034 |
| AC-7 | OUT OF SCOPE | TASK-035 |
| AC-8 | OUT OF SCOPE | TASK-035 |
| AC-9 | OUT OF SCOPE | TASK-036 |
| AC-10 | PARTIAL | TASK-034 slice satisfied (validates grep + title grep zero); pre-existing `feedback_` matches in ANALYSIS-002/003 + TASK-031 are out of TASK-034 scope; flip when TASK-035/036 close their slices |

## Re-run gates

- `grep -rn "^- validates \[\[" docs/qa/` → 0 (PASS)
- `grep -rn "/Users/" docs/qa/QA-036* docs/qa/QA-038* docs/sessions/SESSION-2026-05-20_03*` → 0 (PASS)
- Spot-check Brain MCP read_note × 6 → all parse, no collateral damage

## Newly-discovered drift (NOT a TASK-034 failure; tracking flag)

QA-032-SPEC-003, QA-033, QA-034 carry a `validates:` key in YAML frontmatter (not a Relations bullet). Outside the TASK-034 DoD grep pattern (`^- validates \[\[`) and outside Audit C's original inventory. This is a fresh observation surfaced by QA spot-checking — a frontmatter-level `validates:` metadata key (semantically distinct from the 11-verb Relations allowlist that Phase 2 cleared). Not blocking TASK-034 closure; tracked as a marathon follow-up flag for either a new Track-4 TASK or a /defrag sweep.

## Observations

- [outcome] TASK-034 validated PASS across both phases (42 notes repaired total); Audit C + scope-expansion broader-grep both clean #qa #hygiene
- [fact] 30 spot-checked / sampled notes across the 42-note repair set show zero collateral content damage; the binary tool rule (Brain MCP only on docs/**) preserved structural integrity #binary-tool-rule
- [insight] User's scope-expansion decision (Event 58) caught a drift that Audit C missed; the DoD verification grep, written as a broad `grep -rn`, was the canary that surfaced it #dod-grep-as-canary
- [decision] Renumbering duplicate Event NN to NN/NNb (e.g., 36/36b) preserves temporal-log invariant: no content lost; sequence monotonic; killed-agent re-entry visually marked #renumber-pattern
- [risk] QA-032/033/034 carry `validates:` as a YAML frontmatter KEY (semantically distinct from Relations bullets) — outside TASK-034 scope; track as a follow-up cleanup #new-drift-finding

## Relations

- relates_to [[TASK-034-SPEC-008: Repair Brain Note Hygiene Violations from Audit C]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]