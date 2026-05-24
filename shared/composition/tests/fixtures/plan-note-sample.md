---
title: "PLAN-001: Sample Render Fixture"
type: plan
status: IN_PROGRESS
complexity_tier: TIER_3
branches:
  - feat/plan-001-sample
permalink: planning/plan-001-sample
tags:
  - plan
  - fixture
  - render
---

# PLAN-001: Sample Render Fixture

## Scope

Sample plan for round-trip fixture. Covers minimum viable structure to exercise every renderer code path.

**Source**: [[ANALYSIS-002: Plan/Session Note Render Architecture]]

## Objectives

- [ ] Round-trip parser and renderer
- [x] Cross-field invariants enforced

## Progress Dashboard

| Phase | PENDING | IN_PROGRESS | BLOCKED | DONE | Total |
|:--|--:|--:|--:|--:|--:|
| research | 0 | 0 | 0 | 1 | 1 |
| decisions | 0 | 0 | 0 | 1 | 1 |
| build | 0 | 1 | 0 | 0 | 1 |
| **Total** | **0** | **1** | **0** | **2** | **3** |

## Cross-Part Dependency Graph

```mermaid
%%{init: {'theme':'base','flowchart':{'curve':'stepAfter','nodeSpacing':18,'rankSpacing':55,'padding':16,'diagramPadding':20,'htmlLabels':true},'themeVariables':{'fontFamily':'-apple-system, BlinkMacSystemFont, system-ui, sans-serif','fontSize':'13px','clusterBkg':'#f9fafb','clusterBorder':'#e5e7eb'}}}%%
graph TD

  classDef done fill:#ffffff,stroke:#e5e7eb,stroke-width:1px,color:#111827,rx:14,ry:14
  classDef inprogress fill:#fef9c3,stroke:#eab308,stroke-width:1.5px,color:#713f12,rx:14,ry:14
  classDef pending fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#6b7280,stroke-dasharray:3 3,rx:14,ry:14

  research("✅ <b>research</b><br/><span style='color:#6b7280;font-size:11px'>Research</span>")
  decisions_1("✅ <b>decisions.1</b><br/><span style='color:#6b7280;font-size:11px'>Lock ADR-001</span>")
  build_SPEC_007("⚡ <b>build.SPEC-007</b><br/><span style='color:#6b7280;font-size:11px'>Build SPEC-007</span>")

  research --> decisions_1
  decisions_1 --> build_SPEC_007

  class research,decisions_1 done
  class build_SPEC_007 inprogress
```

## Phase Progression

### research

- **Phase**: research
- **Title**: Research
- **Substatus**: DONE
- **Completing Session**: SESSION-2026-05-19_01
- **Outcome**: [[ANALYSIS-001: Sample]]
- **Source Artifacts**: (none)
- **Depends On**: (none)

**DoD**:

- [x] Findings captured

### decisions.1

- **Phase**: decisions
- **Title**: Lock ADR-001
- **Substatus**: DONE
- **Completing Session**: SESSION-2026-05-19_02
- **Outcome**: [[ADR-001: Sample]]
- **Source Artifacts**: [[ANALYSIS-001: Sample]]
- **Depends On**: research

**DoD**:

- [x] ADR ACCEPTED

**Decisions**:

| ID | Status | Topic |
|:--|:--|:--|
| D-1 | LOCKED | Use Zod |
| D-2 | LOCKED | Use unified+remark |

### build.SPEC-007

- **Phase**: build
- **Title**: Build SPEC-007
- **Substatus**: IN_PROGRESS
- **Owning Session**: SESSION-2026-05-20_04
- **Source Artifacts**: [[SPEC-007: Sample]]
- **Depends On**: decisions.1

**DoD**:

- [ ] All tasks DONE
- [ ] Round-trip PASS

**Build Workflow Items**:

#### impl-TASK-001-SPEC-007

- **Type**: impl
- **Task Ref**: TASK-001-SPEC-007
- **Status**: IN_PROGRESS
- **Owning Session**: —
- **Transitioned At Event**: —
- **Failed Iterations**: 0
- **QA Ref**: —
- **Fix Brief For Event**: —

#### qa-TASK-001-SPEC-007

- **Type**: qa
- **Task Ref**: TASK-001-SPEC-007
- **Status**: PENDING
- **Owning Session**: —
- **Transitioned At Event**: —
- **Failed Iterations**: 0
- **QA Ref**: —
- **Fix Brief For Event**: —

## Tasks

### Active

| ID | Subject | Part | Status | Effort | Agent | Files | Created | Resolved |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| T-01 | Implement parser | build.SPEC-007 | IN_PROGRESS | M | — | src/parsers/plan-note.ts | 1 | — |

### Backlog

(none)

### Archive

| ID | Subject | Part | Status | Effort | Agent | Files | Created | Resolved |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| T-02 | Implement renderer | build.SPEC-007 | DONE | M | — | src/renderers/plan-note.ts | 1 | 3 |

## Pending User Decisions

### PUD-001

- **Part**: build.SPEC-007
- **Surfaced At Event**: 2
- **Surfaced Session**: SESSION-2026-05-20_04
- **Question**: Group Mermaid by phase by default?

**Options**:

- **Yes**: groupBy phase as default
- **No**: Flat graph as default

## Editor Mirror IDs

| Task | CC ID | Cursor ID | Last Synced |
|:--|:--|:--|:--|
| T-01 | cc-123 | — | 2026-05-20T12:00:00Z |
| T-02 | — | cur-456 | — |

## Blockers

(none)

## Observations

- [decision] Markdown is authoritative state #adr-003 #render
- [fact] Round-trip property test gates correctness #proof
- [constraint] SHA-256 char-identity required #invariant

## Relations

- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[ANALYSIS-002: Plan/Session Note Render Architecture]]
- part_of [[PLAN-001: Skills Ecosystem]]
