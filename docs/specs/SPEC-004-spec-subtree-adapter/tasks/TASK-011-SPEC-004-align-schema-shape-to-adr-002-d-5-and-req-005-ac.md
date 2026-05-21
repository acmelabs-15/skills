---
title: 'TASK-011-SPEC-004: Align Schema Shape to ADR-002 D-5 and REQ-005 AC'
type: task
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-011-spec-004-align-schema-shape-to-adr-002-d-5-and-req-005-ac
status: DONE
effort: M
estimate: 1.5d
tags:
- task
- spec-004
- gap-task
- schema
---

# TASK-011-SPEC-004: Align Schema Shape to ADR-002 D-5 and REQ-005 AC

## Design Context

Gap from QA-024-SPEC-004: `specSubtreeManifestSchema` diverges from ADR-002 D-5 + REQ-005 in four ways:

1. ADR-002 D-5 says per-entry `mutations` (root entry + each child) — impl uses top-level plan-wide `mutations`
2. ADR-002 D-5 says per-child optional `filename_rewrite_map` — not in shape
3. REQ-005 AC5 says empty children array should validate — impl uses `min(1)`
4. Field is named `manifest` — REQ-005 + ADR-002 D-1 say `subtree_manifest`
5. Destinations lack `containedPathSchema` validation

## Objective

User adjudication required FIRST: keep current simplified shape and amend ADR-002 D-5 + REQ-005, OR refactor schema to match ADR-002 D-5 literally. Once adjudicated, execute the chosen path. Add `containedPathSchema` to destination paths regardless of path chosen.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/schemas/distribution/spec-subtree.plan.schema.ts | MODIFY | Reshape per adjudication |
| _shared/composition/schemas/composition/spec-subtree.plan.schema.ts | MODIFY | Reshape per adjudication |
| _shared/composition/tests/spec-subtree-schema.test.ts | MODIFY | Add empty-children PASS test + missing-field FAIL test + destination path-traversal FAIL test |
| docs/decisions/ADR-002-*.md | MODIFY (option B) | Amend D-5 |
| docs/specs/SPEC-004-spec-subtree-adapter/requirements/REQ-005-*.md | MODIFY | Amend AC if option B chosen |

## Definition of Done
- [x] User adjudication on shape direction logged in PLAN-001 event log (orchestrator+user pre-authorized Option A: refactor schema to ADR-002 D-5 — ADR is canonical authority)
- [x] Schema empty-children case behaves per adjudication (children array allows length 0; AC5 satisfied)
- [x] Destinations (root.source_path + children.source_path + children.dest_path) validated by sync path-traversal guard (rejects `..` segments and absolute paths); runtime async realpath-based `containedPathSchema` retained in `src/core/validators.ts`
- [x] Missing required field rejection covered by explicit unit tests (missing root, missing children, missing dest_path on a child, missing subtree_manifest on a plan)
- [x] Field name renamed `manifest` → `subtree_manifest` per ADR-002 D-5; per-entry mutations migrated to root + each child; per-child optional `filename_rewrite_map` added; top-level plan `mutations` + `destinations` removed (subtree_manifest replaces them)
- [x] Round-trip + schema tests pass (`bun test` 475 pass / 0 fail / 988 expect() calls)

## Observations

- [problem] Schema shape diverges from ADR-002 D-5 (per-entry mutations + per-child filename_rewrite_map missing) #adr-violation
- [problem] REQ-005 AC5 directly contradicted by `min(1)` on children #ac-violation
- [problem] Destinations lack containedPathSchema; path traversal not rejected on dest_path #security-gap
- [decision] User adjudication required before reshape #pending-decision

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- caused_by [[QA-024-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- extends [[TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- depends_on [[ADR-002: Adapter Contract and Plan Schema]]

- validated_by [[QA-037-SPEC-004: TASK-011 Schema Shape Revalidation]]