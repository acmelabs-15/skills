---
title: 'TASK-035-SPEC-008: Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-035-spec-008-propagate-spec-002-and-spec-003-checkbox-rollups-and-req-status-flips-1
status: TODO
tags:
- spec-008
- track-4
- rollup-propagation
- audit-d
- atomic
---

# TASK-035-SPEC-008: Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips

## Objective

ANALYSIS-004 Audit D identified SPEC-002 and SPEC-003 marked DONE with all `## Artifact Status` checkboxes still `[ ]` (Category 2 derived-view drift per CONVENTIONS Information Model), and four REQ notes in SPEC-002 (REQ-001, REQ-002, REQ-004, REQ-005) carrying `status: DRAFT` despite being implemented. Propagate the rollup correctly: flip completed-artifact rows to `[x]`, flip verified-DEFERRED rows to `[~]` (per REQ-008-SPEC-008 notation; depends on TASK-031 for SPEC-007 pattern reference), and flip the 4 REQ statuses to ACCEPTED.

All edits via Brain MCP `edit_note` per binary tool rule.

Steps:

1. Read SPEC-002 root via Brain MCP; cross-reference each artifact row against its underlying note's `status` frontmatter
2. For each artifact whose note carries `status: ACCEPTED` (REQ/DESIGN) or `status: DONE` (TASK): flip the row from `[ ]` to `[x]`
3. For each artifact whose note carries `status: DEFERRED`: flip the row from `[ ]` to `[~]` (legend already established in SPEC-007 per TASK-031; if SPEC-002 needs its own legend, prepend one)
4. Repeat steps 1-3 for SPEC-003 root
5. For each of REQ-001-SPEC-002, REQ-002-SPEC-002, REQ-004-SPEC-002, REQ-005-SPEC-002: read note, verify implementation evidence, then flip frontmatter `status: DRAFT` → `status: ACCEPTED` via Brain MCP `edit_note`
6. Verification: run `validateSpecDoneClaim` against SPEC-002 and SPEC-003 (post-TASK-032 extension); both should now return `valid: true`

## Definition of Done

- [x] SPEC-002 root `## Artifact Status` section has zero `[ ]` rows for artifacts whose notes carry terminal status
- [x] SPEC-003 root `## Artifact Status` section has zero `[ ]` rows for artifacts whose notes carry terminal status
- [x] Each deferred artifact in SPEC-002/003 uses `[~]` (not `[ ]` and not `[x]`)
- [x] REQ-001-SPEC-002 frontmatter `status: ACCEPTED`
- [x] REQ-002-SPEC-002 frontmatter `status: ACCEPTED`
- [x] REQ-004-SPEC-002 frontmatter `status: ACCEPTED`
- [x] REQ-005-SPEC-002 frontmatter `status: ACCEPTED`
- [x] Each of the 4 REQ note flips includes a body or Observations entry citing the implementation evidence (file path + commit SHA) for archaeological provenance
- [ ] `validateSpecDoneClaim(SPEC-002)` returns `valid: true` (using extended validator from TASK-032)
- [ ] `validateSpecDoneClaim(SPEC-003)` returns `valid: true`
- [x] All edits used Brain MCP `edit_note` (NEVER raw Edit/Write on `docs/**`)
- [ ] Audit D grep verification: `grep -A0 "status: DONE" docs/specs/SPEC-002*/SPEC-002*.md && grep "\\- \\[ \\]" docs/specs/SPEC-002*/SPEC-002*.md` returns zero `[ ]` rows under DONE spec root

## ADR Compliance

- ADR-005 D-7 tactical-cleanup notation: Track 4 carries the rollup-propagation cleanup; this TASK executes against Audit D Section "SPEC-002 PARTIAL" + "SPEC-003 PARTIAL"

## Files Affected

- `docs/specs/SPEC-002-*/SPEC-002-*.md`
- `docs/specs/SPEC-003-*/SPEC-003-*.md`
- `docs/specs/SPEC-002-*/requirements/REQ-001-SPEC-002-*.md`
- `docs/specs/SPEC-002-*/requirements/REQ-002-SPEC-002-*.md`
- `docs/specs/SPEC-002-*/requirements/REQ-004-SPEC-002-*.md`
- `docs/specs/SPEC-002-*/requirements/REQ-005-SPEC-002-*.md`

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 3h | Cross-reference 18+ artifact rows × 2 specs + 4 REQ status flips + verification |
| AI-Dominant | 1.5h | Mechanical edit_note batches with cross-reference reads (CANONICAL) |
| AI-Assisted | 2h | Pair-driven with verification cycle |

## Observations

- [decision] All rollup propagation uses Brain MCP `edit_note` per binary tool rule (CONVENTIONS Section 1.7.1) #binary-tool-rule #brain-mcp
- [decision] DEFERRED artifacts get `[~]` not `[x]` per REQ-008-SPEC-008 notation — depends on TASK-032 validator extension being live #notation-consistency
- [constraint] Each REQ status flip includes evidence citation (file path + commit) so future audits can verify the ACCEPTED claim #provenance #audit-trail
- [insight] `validateSpecDoneClaim` post-extension is the mechanical verification gate; this TASK is the first dogfood use of the extended validator beyond SPEC-007 #dogfood
- [outcome] Closes Audit D PARTIAL verdict for SPEC-002 and SPEC-003 — same drift surface that motivated REQ-008/TASK-032 in the first place #drift-cleanup #audit-d

## Relations

- implements [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- depends_on [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
