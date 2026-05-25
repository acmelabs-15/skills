---
title: 'REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-010-spec-008-brain-note-hygiene-and-code-vs-spec-drift-cleanup-1
status: DRAFT
tags:
- requirement
- spec-008
- track-4
- drift-cleanup
- brain-notes
- code-vs-spec
---

# REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup

## EARS

WHEN ANALYSIS-004 Audit C identified 10 Brain notes with hygiene violations (duplicate frontmatter blocks, forbidden `validates` relation, title-without-colon, stale `type: test_report`/`test-report`, PII filesystem paths, duplicate Event numbers), the orchestrator SHALL repair each violation via Brain MCP `edit_note` (preserving knowledge-graph processing), AND post-repair the offending audit grep commands SHALL return zero matches against the cleaned notes, SO THAT the MINOR_DRIFT verdict from Audit C is converted to PASS and the convention-violation surface from Wave 1 is closed.

WHEN ANALYSIS-004 Audit D identified code-vs-spec drift in SPEC-002 and SPEC-003 (SPEC root checkbox rollups left `[ ]` despite DONE status, plus 4 REQ-002 notes still DRAFT), the orchestrator SHALL propagate the rollup by flipping the SPEC root artifact checkboxes to `[x]` for completed artifacts AND flipping the 4 REQ statuses from DRAFT to ACCEPTED via Brain MCP `edit_note`, SO THAT SPEC-002 and SPEC-003 derived views (Category 2 per CONVENTIONS Information Model) are synchronized with their underlying source-of-truth artifacts and `validateSpecDoneClaim` would now accept their DONE status.

WHEN REQ-009-SPEC-007 body text states "9 mutation types" (a stale fact captured before PR #14 added `transition-impl-item` + `transition-qa-item`), the orchestrator SHALL amend the body to read "11 mutation types" via Brain MCP `edit_note`, SO THAT the requirement text matches the as-built code per Audit D finding and the spec layer no longer carries a known factual drift.

## Acceptance Criteria

- [x] GIVEN QA-027-SPEC-004 and QA-030-SPEC-002 with duplicate YAML frontmatter blocks WHEN TASK-034 runs THEN each note has exactly one frontmatter block (the first; basic-memory authoritative)
- [x] GIVEN QA-027, QA-042, QA-043, QA-015 with forbidden `validates` relation entries WHEN TASK-034 runs THEN each of the four notes' `## Relations` section replaces `validates [[X]]` with `depends_on [[X]]` — all four MUST use `depends_on` (each is a QA-aggregate note that depends on the spec/artifact it validates; `depends_on` is the canonical directional verb for this relationship) **— scope expanded Event 58 to ALL 31 `validates` relations across 30 QA notes; broader-grep verification PASS**
- [x] GIVEN ANALYSIS-002, SESSION-2026-05-20_01, SESSION-2026-05-20_02 with title-without-colon WHEN TASK-034 runs THEN each note's frontmatter title and H1 carry the canonical `{ENTITY-ID}: {Descriptor}` colon form
- [x] GIVEN QA-030 with `type: test_report` and QA-038 with `type: qa` WHEN TASK-034 runs THEN both notes carry the canonical `type: qa` value (per CONVENTIONS Section 3 16-type enum; rename completed 2026-05-21)
- [x] GIVEN QA-036, QA-038, SESSION-2026-05-20_03 with embedded `/Users/peter.kloss/...` PII paths WHEN TASK-034 runs THEN each path is replaced with a repo-relative or `<repo root>` form per the rule that Brain notes must not embed absolute local filesystem paths (PII + portability) (described inline; no auto-memory citation in the cleaned notes)
- [x] GIVEN SESSION-2026-05-21_01 with duplicate Event 36/37/38 entries (killed-agent re-entry) WHEN TASK-034 runs THEN duplicates are de-duplicated by either renumbering subsequent events or collapsing to single canonical entries per content-equivalence audit (renumbered to 36b/37b/38b)
- [ ] GIVEN SPEC-002 and SPEC-003 root notes with `## Artifact Status` checkboxes still `[ ]` despite DONE status WHEN TASK-035 runs THEN each completed artifact's row flips from `[ ]` to `[x]` and each verified-DEFERRED artifact row flips to `[~]` (per REQ-008-SPEC-008 notation)
- [ ] GIVEN REQ-001-SPEC-002, REQ-002-SPEC-002, REQ-004-SPEC-002, REQ-005-SPEC-002 with `status: DRAFT` despite being implemented WHEN TASK-035 runs THEN each note's frontmatter status flips from DRAFT to ACCEPTED via Brain MCP `edit_note`
- [ ] GIVEN REQ-009-SPEC-007 body text "9 mutation types" WHEN TASK-036 runs THEN body text reads "11 mutation types" with provenance note citing PR #14 expansion (transition-impl-item + transition-qa-item additions)
- [ ] GIVEN repaired notes WHEN orchestrator re-runs Audit C grep commands (the auto-memory-filename pattern `[f]eedback_[a-z_]\+` over `docs/`; `grep -n "validates \\[\\[" docs/`; `grep -nE "^title: [A-Z]+-[0-9]+ [A-Z]" docs/`) THEN each returns zero matches (or only matches in historical session notes preserved for temporal-log invariant)

## Observations

- [decision] All Brain note repairs use Brain MCP `edit_note` (per the rule that complex memory operations route through the memory agent, HARD-LOCK; never raw file Edit on `docs/**`) #brain-mcp #memory-agent-only
- [decision] Repair 4 `validates` violations (QA-027, QA-042, QA-043, QA-015) by replacing with `depends_on` — all four bind to `depends_on` (QA-aggregate-depends-on-validated-artifact) per Audit C semantic-misuse finding #relation-types #11-type-allowlist
- [constraint] Historical session notes (SESSION-2026-05-21_01 Events 36/37/38) carry temporal-log invariant — de-duplication preserves ledger fidelity, not rewrites history #temporal-log #immutable
- [constraint] SPEC-002/003 rollup propagation must use `[~]` for verified-DEFERRED artifacts per REQ-008-SPEC-008 notation, not blanket `[x]` #cross-req-dependency #d-6
- [insight] REQ-009-SPEC-007 amendment is one find_replace; smallest-blast-radius drift fix in the Audit D batch #small-fix
- [insight] Re-running Audit C grep commands post-repair provides mechanical verification that the cleanup landed correctly #self-test #verification-pattern
- [outcome] Closes 10 of 11 Track 4 cleanup items from SESSION-2026-05-23_02 Event 11 inventory (item 11 = `_shared`→`shared` rename, covered by REQ-009-SPEC-008) #track-4-closure
- [risk] PII redaction in SESSION-2026-05-20_03 must scan for ALL instances of `/Users/*/Dev/` patterns, not just the Event 04 occurrence flagged in Audit C #completeness

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[SPEC-007: Plan/Session Render Implementation]]
