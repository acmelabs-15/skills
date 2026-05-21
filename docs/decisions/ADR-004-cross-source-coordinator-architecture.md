---
title: 'ADR-004: Cross-Source Coordinator Architecture'
type: decision
permalink: decisions/adr-004-cross-source-coordinator-architecture
status: ACCEPTED
date: 2026-05-21
updated: 2026-05-21
tags:
- decision
- cross-source
- coordinator
- session-adapter
- design-amendment
---

# ADR-004: Cross-Source Coordinator Architecture

## Status

ACCEPTED (2026-05-21; brain:---adr-review Phase 4 convergence 6/6 ACCEPT Round 1; see CRIT-004-ADR-004)

## Context and Problem Statement

SPEC-002 retro-validation (QA-016-SPEC-002) discovered that DESIGN-002-SPEC-002 specifies a `CrossSourceCoordinator` interface, `GracefulDegradationHandler` class, and a `CrossSourceUpdate` schema with shape `{target_note, part_id, field_name, old_value, new_value}`. None of these exist in code. The actual implementation uses a simpler `getCrossSourceUpdates` pass-through method on `SessionAdapter` with a `CrossSourceUpdate` schema shaped as `{target_source_type, target_path, frontmatter_map, wikilink_map}`.

The question: should the code be rebuilt to match DESIGN-002 verbatim, should DESIGN-002 be amended to match the working code, or should a hybrid approach be taken?

## Decision Drivers

- **Behavioral correctness**: SHA-256 round-trip PROOF gates pass for both ANALYSIS and SESSION adapters. The code works.
- **SPEC-003 downstream dependency**: SPEC-003 PLAN adapter integration assumes some cross-source coordination mechanism exists.
- **YAGNI / scope discipline**: SPEC-002 scope explicitly defers full SESSION + PLAN integration to SPEC-003. Building coordinator infrastructure now serves no SPEC-002 requirement.
- **Effort proportionality**: The coordinator + handler architecture adds approximately 150-250 LOC for functionality that has no consumer until SPEC-003.
- **Spec-is-authority principle**: DESIGN-002 is locked specification. Deviating from it without amending creates silent drift.
- **Schema shape divergence**: The two CrossSourceUpdate shapes represent fundamentally different abstractions. The DESIGN-002 shape models field-level mutations on PLAN parts. The code shape models structural mapping transforms (frontmatter_map, wikilink_map) used during distribution.

## Considered Options

### D-1: Implement-as-Spec

Build full `CrossSourceCoordinator` interface, `GracefulDegradationHandler` class, and DESIGN-002 schema shape verbatim.

- Good, because it honors spec-is-authority principle with zero specification amendments
- Good, because SPEC-003 consumers get a ready-made coordinator interface
- Bad, because the GracefulDegradationHandler is a no-op until SPEC-003 ships; 150-250 LOC with zero runtime utility in SPEC-002
- Bad, because the DESIGN-002 CrossSourceUpdate schema shape (`target_note`, `part_id`, `field_name`, `old_value`, `new_value`) models field-level PLAN mutations that do not align with the distribution pipeline's structural mapping paradigm (`frontmatter_map`, `wikilink_map`)
- Bad, because it requires removing the existing working `getCrossSourceUpdates` method and `crossSourceUpdateSchema` that 23 passing tests exercise, then rebuilding with the new shape
- Bad, because the coordinator abstraction layer adds indirection between SessionAdapter and the execution engine with no current consumer justifying that indirection

### D-2: Amend-Spec (Recommended)

Amend DESIGN-002 and REQ-003 to describe the simpler `getCrossSourceUpdates` pass-through with `{target_source_type, target_path, frontmatter_map, wikilink_map}` schema shape. Defer coordinator pattern to SPEC-003 if PLAN adapter integration demands it.

- Good, because it preserves 23 passing tests and working code with zero behavioral regression
- Good, because it closes the DESIGN-002 drift immediately with a documentation update (approximately 2 hours) instead of a 1.5-day rebuild
- Good, because SPEC-003 retains full authority to introduce coordinator patterns when it has an actual consumer (the PLAN adapter)
- Good, because the existing schema shape (`frontmatter_map`, `wikilink_map`) is structurally aligned with the distribution pipeline's map-based transform model used by all adapters
- Neutral, because it requires DESIGN-002 status to cycle through DRAFT again for re-review
- Bad, because it acknowledges the original spec was over-engineered, which may signal spec-quality concerns upstream

### D-3: Hybrid (Coordinator Interface Only)

Define the `CrossSourceCoordinator` interface and wire it into the execution engine, but skip `GracefulDegradationHandler` and keep the existing schema shape.

- Good, because it provides the extension point SPEC-003 needs without a full rebuild
- Bad, because the coordinator interface would wrap `getCrossSourceUpdates` with no behavioral change, adding a layer of indirection for zero current value
- Bad, because it combines two incompatible schema paradigms: the interface contract implies field-level mutations but the schema provides structural maps
- Bad, because SPEC-003 would likely need to redesign the coordinator interface anyway once PLAN adapter requirements are concrete

## Decision Outcome

Chosen option: "D-2: Amend-Spec", because:

1. **The code works**. SHA-256 PROOF gates pass. 23 tests exercise the cross-source emission path. There is no behavioral defect.
2. **The DESIGN-002 architecture has no consumer**. The coordinator pattern exists to mediate between SESSION and PLAN adapters during decomposition. The PLAN adapter is already registered in the dispatcher (SPEC-003 landed the PlanAdapter). But the coordinator's `applyUpdates`/`reverseUpdates` protocol assumes a specific interaction model that SPEC-003 has not yet defined.
3. **Schema shape alignment**. The existing `{target_source_type, target_path, frontmatter_map, wikilink_map}` shape is structurally consistent with the distribution pipeline's map-based transforms. The DESIGN-002 shape (`{target_note, part_id, field_name, old_value, new_value}`) models a different abstraction (field-level PLAN part mutations) that may or may not match SPEC-003's actual needs.
4. **Effort proportionality**. Amending DESIGN-002 + REQ-003 costs approximately 2 hours. Implementing D-1 costs 1.5 days. The 1.5 days builds infrastructure with no current consumer and uncertain future alignment.
5. **YAGNI**. The coordinator pattern is speculative architecture for SPEC-003. SPEC-003 should define its own coordination needs based on actual PLAN adapter integration requirements, not inherit a pre-built abstraction from SPEC-002.

### Consequences

- Good, because SPEC-002 can close its retro-validation gaps (QA-016) with documentation amendments instead of a rebuild cycle
- Good, because SPEC-003 retains design freedom to define coordinator patterns that fit its actual requirements
- Good, because all 23 existing tests remain valid with zero changes
- Bad, because DESIGN-002 loses its original coordinator architecture, which was a defensible design for the general case
- Bad, because if SPEC-003 does need the exact DESIGN-002 coordinator pattern, the work is deferred rather than eliminated

### Confirmation

- DESIGN-002 amended with current code's architecture; status cycled DRAFT then re-reviewed
- REQ-003 ACs rewritten to match `getCrossSourceUpdates` pass-through with existing schema shape
- TASK-003 DoD updated to match amended spec
- All existing tests continue to pass after amendments (zero code changes required)
- SPEC-003 spec-authoring phase explicitly addresses cross-source coordination needs from scratch

## Implementation Notes

### Amendments Required

1. **DESIGN-002-SPEC-002**: Replace Components 1-3 (CrossSourceUpdate schema, CrossSourceCoordinator interface, GracefulDegradationHandler) with description of actual `getCrossSourceUpdates` method and existing `crossSourceUpdateSchema`.
2. **REQ-003-SPEC-002**: Rewrite AC-1 through AC-4 to match:
   - AC-1: `getCrossSourceUpdates` returns `CrossSourceUpdate[]` from distribution plan
   - AC-2: Schema validates `{target_source_type, target_path, frontmatter_map, wikilink_map}`
   - AC-3: Method returns empty array when `cross_source_updates` absent from plan
   - AC-4: Round-trip test exercises cross_source_updates emission path
3. **TASK-003-SPEC-002 DoD**: Rewrite to match amended DESIGN-002 and REQ-003.
4. **TASK-009-SPEC-002**: Close as resolved-by-amendment (no code changes needed).

### Files Affected

- `docs/specs/SPEC-002-simple-adapters/design/DESIGN-002-SPEC-002-session-cross-source-coordination-protocol.md` (amend)
- `docs/specs/SPEC-002-simple-adapters/requirements/REQ-003-SPEC-002-session-cross-source-updates-handling.md` (amend)
- `docs/specs/SPEC-002-simple-adapters/tasks/TASK-003-SPEC-002-implement-session-cross-source-updates-handler.md` (amend DoD)
- `docs/specs/SPEC-002-simple-adapters/tasks/TASK-009-SPEC-002-implement-cross-source-coordinator-architecture-per-design-002.md` (close)

### Reversibility Assessment

- Rollback capability: amendments are documentation-only; git revert restores original DESIGN-002
- Vendor lock-in: none; pure internal architectural decision
- Exit strategy: if SPEC-003 needs the coordinator pattern, build it then with SPEC-003-specific requirements
- Legacy impact: none; no downstream code depends on DESIGN-002's coordinator interface (it was never built)
- Data migration: not applicable; no runtime data affected

## Observations

- [decision] D-2 amend-spec chosen over D-1 implement-as-spec because the code works, the coordinator has no consumer, and SPEC-003 should define its own coordination needs #strategic #amend-spec
- [fact] QA-016-SPEC-002 reports 17/77 criteria FAIL with failures clustering around TASK-003 (cross-source coordinator) and DESIGN-001 property drift #evidence #qa
- [fact] Existing CrossSourceUpdate schema uses `{target_source_type, target_path, frontmatter_map, wikilink_map}` shape aligned with distribution pipeline map transforms #schema #alignment
- [fact] DESIGN-002 specified `{target_note, part_id, field_name, old_value, new_value}` shape modeling field-level PLAN mutations; fundamentally different abstraction #schema #divergence
- [insight] The coordinator pattern was speculative architecture for SPEC-003; building it in SPEC-002 scope violates YAGNI and locks SPEC-003 into a pre-determined design #yagni #scope
- [constraint] SPEC-003 PLAN adapter integration retains full authority to introduce coordinator patterns based on actual requirements #downstream #freedom
- [risk] If SPEC-003 needs the exact DESIGN-002 coordinator, the effort is deferred not eliminated; but SPEC-003 has better information to make that call #deferred-effort

## Relations

- implements [[SPEC-002: Simple Adapters]]
- extends [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- caused_by [[QA-016-SPEC-002: Spec Aggregate Retro-Validation]]
- leads_to [[TASK-009-SPEC-002: Implement Cross-Source Coordinator Architecture per DESIGN-002]]

## Clarifications

(Applied 2026-05-21 from brain:---adr-review Phase 3 resolutions; see [[CRIT-004-ADR-004: Debate Log]] for full debate record.)

**C-1 (test count correction)**: The original ADR cited "23 passing tests" as evidence. Correction: 23 is the SPEC-002 AGGREGATE test count across 5 files. The cross-source-specific tests are 11 across 2 files (session-adapter + session-cross-source). Both numbers support the decision; precision matters for future readers.

**C-2 (DESIGN-002 amendment skeleton)**: The amended DESIGN-002 must describe (a) the `getCrossSourceUpdates(content, plan)` pass-through method on SessionAdapter; (b) the actual `crossSourceUpdateSchema` shape with `target_source_type`, `target_path`, `frontmatter_map`, `wikilink_map`; (c) the semantics that the adapter EMITS updates without applying them (the orchestrator dispatches application); (d) the absence of coordinator/handler infrastructure with rationale pointing to ADR-004 and SPEC-003 deferral.

**C-3 (ADR-002 alignment trace)**: ADR-002 D-1 locks the `cross_source_updates` field NAME and array position in the distribution schema. ADR-002 does NOT lock the internal `crossSourceUpdateSchema` element shape; that was left to per-adapter design. ADR-004 amends the element shape only, not the field name or array position. ADR-002 D-1 remains correct.

**C-4 (DESIGN-002 re-review sequencing)**: Strict order: (1) ADR-004 → ACCEPTED; (2) author DESIGN-002 amendment via memory agent (status DRAFT during amendment); (3) DESIGN-002 re-review per /spec Gate B; (4) DESIGN-002 → ACCEPTED.

**C-5 (effort refinement)**: 2h documentation + 2-4h DESIGN-002 re-review cycle = 4-6h total. The original 2h figure was documentation-only.

**C-6 (precedent boundary — when amend-spec is acceptable)**: Amend-spec is acceptable when (a) the implementation diverged because it discovered a better local design with positive evidence (passing tests + SHA-256 proofs + alignment with existing patterns), AND (b) the spec was speculative (no concrete consumer yet), AND (c) at least 2 reviewers concur on the design quality of the implementation vs the spec. Implement-as-spec is required when (a) the spec was deliberately designed against known consumers, OR (b) the implementation diverged for reasons of expedience without architectural justification, OR (c) the spec encodes external contracts (API, schema, protocol).

**C-7 (SPEC-003 tracked pre-constraints)**: SPEC-003 (PLAN adapter integration) spec-decomposition phase MUST explicitly address: (a) coordinator interface design (if needed by PLAN adapter consumer); (b) rollback semantics (originally REQ-003 AC-3 of SPEC-002, displaced by D-2); (c) reversal protocol during recomposition (originally REQ-003 AC-4 of SPEC-002, displaced); (d) schema shape evaluation (whether current `frontmatter_map`/`wikilink_map` shape is sufficient OR a field-level mutation shape is needed); (e) wire `containedPathSchema` to `crossSourceUpdateSchema.target_path` (SEC-001 from security review — CWE-22 latent path traversal).

**C-8 (duplicate TASK-003 reconcile)**: Two TASK-003-SPEC-002 notes exist (lowercase + uppercase folder variants). Reconcile before amendment: identify canonical, archive/delete the duplicate, ensure status alignment.

**C-9 (ADR-002 Clarification follow-up)**: Add a Clarification entry to ADR-002 noting that D-1's `crossSourceUpdateSchema` shape is superseded by ADR-004 D-2; the field name + array position remain locked.
