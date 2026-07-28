# SPEC Templates — REQ + DESIGN + TASK + SPEC Root

Canonical templates for the 4 note types in a SPEC subtree. Content depth matches the polar-ui pattern (rich Files Affected tables, ADR Cross-cutting Constraints, 3-tier Effort Summary, Artifact Status listings).

## REQ template

Filename: `REQ-{NNN}-SPEC-{NNN}-{descriptor}.md`
Title: `REQ-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
Folder: `specs/SPEC-NNN-{feature-kebab}/requirements/`

```markdown
---
title: "REQ-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}"
type: requirement
status: DRAFT                              # flipped to ACCEPTED by /spec final step
permalink: specs/spec-nnn-{feature-kebab}/requirements/req-nnn-spec-nnn-{descriptor}
tags: [requirement, spec-nnn, {feature-tag}]
---

# REQ-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}

## Requirement Statement

WHEN {trigger condition}
THE SYSTEM SHALL {observable behavior}
SO THAT {business outcome / user value}.

## Acceptance Criteria

- [ ] GIVEN {precondition state}
      WHEN {action / trigger}
      THEN {expected outcome}
- [ ] GIVEN {next precondition}
      WHEN {next action}
      THEN {next expected outcome}
- [ ] (3-7 acceptance criteria typical; one per behavior aspect)

## Implementation Notes

{Technical hints; library specifics. NOT a full design — that's DESIGN's job.
Examples: which existing module to extend; which pattern to follow; perf hints.}

## Consumer Implementation Pattern

(Optional; for API-shaped requirements only. Show usage from consumer perspective.)

\`\`\`typescript
// Example consumer pattern
const result = newApi.doThing({ x: 1, y: 2 });
\`\`\`

## Observations

- [requirement] {one-line restatement of the EARS clause} #req-{n} #spec-{nnn}
- [decision] {key design decision implicit in this requirement} #design-decision
- (3+ observations; [category] + 1-3 #tags each)

## Relations

- part_of [[SPEC-NNN: {Feature Title}]]
- implements [[ADR-N: {ADR Title}]]            # ADR this REQ realizes (REQ→ADR traceability per Gate B)
- (additional `relates_to` if applicable)
```

## DESIGN template

Filename: `DESIGN-{NNN}-SPEC-{NNN}-{descriptor}.md`
Title: `DESIGN-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
Folder: `specs/SPEC-NNN-{feature-kebab}/design/`

```markdown
---
title: "DESIGN-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}"
type: design
status: DRAFT
permalink: specs/spec-nnn-{feature-kebab}/design/design-nnn-spec-nnn-{descriptor}
tags: [design, spec-nnn, {feature-tag}]
---

# DESIGN-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}

## Context

{What this design realizes. Cite source REQs + ADRs via wikilinks.}

## Module Structure

\`\`\`text
src/
  feature-x/
    api.ts           # public API surface (interfaces)
    core.ts          # core logic
    types.ts         # shared types
    __tests__/
      api.test.ts
      core.test.ts
\`\`\`

## Interfaces

\`\`\`typescript
// Public API
export interface FeatureX {
  doThing(input: ThingInput): Promise<ThingResult>;
}

// Types
export type ThingInput = { x: number; y: number };
export type ThingResult = { sum: number; status: "ok" | "error" };
\`\`\`

## Algorithms

{Core algorithm pseudocode or prose. Cover happy path + failure modes.}

## Data Flow

\`\`\`text
caller → api.doThing
       → core.compute
       → emit "thing.done" event
       → return ThingResult
\`\`\`

(or Mermaid diagram per CONVENTIONS Section 4.12)

## Edge Cases

| Case | Behavior |
| --- | --- |
| Null input | Throw `InvalidInputError` |
| Concurrent calls on same resource | Serialize via mutex |
| Downstream service unavailable | Retry 3× with exponential backoff; then propagate error |

## Performance Considerations

{Latency targets, throughput, scaling assumptions, perf-sensitive paths.}

## Security Considerations

{Auth/authz boundaries, input validation, secrets handling, audit logging.}

## A11y Considerations

{If UI-shaped: keyboard nav, screen reader, contrast, focus management.}

## Observations

- [decision] {key design decision} #design #spec-{nnn}
- [constraint] {key constraint honored} #constraint
- (3+ observations)

## Relations

- part_of [[SPEC-NNN: {Feature Title}]]
- implements [[ADR-N: {ADR Title}]]            # if this design realizes ADR mandates
- depends_on [[DESIGN-M-SPEC-NNN: {Other Design}]]  # if cross-design dependency
- (additional)
```

## TASK template

Filename: `TASK-{NNN}-SPEC-{NNN}-{descriptor}.md`
Title: `TASK-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
Folder: `specs/SPEC-NNN-{feature-kebab}/tasks/`

```markdown
---
title: "TASK-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}"
type: task
status: TODO                              # flipped to IN_PROGRESS by /build Step 4a; DONE by Step 4e
effort: S | M | L                         # S = <1 day; M = 1-3 days; L = >3 days
estimate: Nd                              # AI-Dominant tier estimate
permalink: specs/spec-nnn-{feature-kebab}/tasks/task-nnn-spec-nnn-{descriptor}
tags: [task, spec-nnn, {feature-tag}]
---

# TASK-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}

## Design Context

This TASK realizes [[DESIGN-NNN-SPEC-NNN: {Title}]] section "{specific section}".

## Objective

{One sentence: what this TASK delivers.}

## Scope

**In Scope**:
- {Item 1}
- {Item 2}

**Out of Scope**:
- {Item explicitly excluded}
- {Cross-TASK delegation: handled by TASK-M-SPEC-NNN}

## Implementation Notes

{Specific guidance — which functions to add, which patterns to follow, which existing code to extend.}

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| src/feature-x/api.ts | NEW | Export FeatureX interface + factory |
| src/feature-x/core.ts | NEW | Core compute logic |
| src/feature-x/types.ts | NEW | Shared types |
| src/feature-x/__tests__/api.test.ts | NEW | API unit tests |
| src/registry.ts | MODIFY | Register feature-x in module registry |

## Testing Requirements

- Unit tests cover happy path + 3+ edge cases per public method
- Integration test: end-to-end doThing with realistic input
- Test coverage ≥80% on new files

## Definition of Done

(All `[ ]` at draft; /build flips to `[x]` per acceptance criterion as work completes.)

- [ ] {Acceptance criterion 1} (traces to REQ-NNN-SPEC-NNN: ...)
- [ ] {Acceptance criterion 2} (traces to REQ-NNN-SPEC-NNN: ...)
- [ ] Files affected per the table above
- [ ] Testing Requirements met
- [ ] No regressions in adjacent modules (verify via test suite)

## ADR Compliance

(When relevant — checklist verifying ADR Cross-cutting Constraints are honored. See SPEC root's ADR Cross-cutting Constraints section.)

- [ ] Honors ADR-N constraint: {specific constraint}
- [ ] Honors ADR-M constraint: {specific constraint}

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | Xd | If a human developer were to implement |
| AI-Dominant | Yd | AI-led with human review at checkpoints (CANONICAL for rollup) |
| AI-Assisted | Zd | Human-led with AI assistance (e.g., autocomplete, refactor suggestions) |

## Observations

- [requirement] {one-line restatement of objective} #task #spec-{nnn}
- [technique] {key implementation pattern} #pattern
- (3+ observations)

## Relations

- part_of [[SPEC-NNN: {Feature Title}]]
- implements [[REQ-NNN-SPEC-NNN: {REQ Title}]]      # TASK→REQ traceability per Gate B
- implements [[DESIGN-NNN-SPEC-NNN: {DESIGN Title}]] # TASK→DESIGN section
- depends_on [[TASK-M-SPEC-NNN: {Other Task}]]      # if cross-TASK dependency
- (additional)
```

## SPEC root template

Filename: `SPEC-NNN-{feature-kebab}.md`
Title: `SPEC-NNN: {Feature Title in Title Case}`
Folder: `specs/SPEC-NNN-{feature-kebab}/`

```markdown
---
title: "SPEC-NNN: {Feature Title in Title Case}"
type: spec
status: ACCEPTED                          # specs born ACCEPTED after /decisions locks ADRs
permalink: specs/spec-nnn-{feature-kebab}/spec-nnn-{feature-kebab}
tags: [spec, {feature-tag}, {epic-tag if part of EPIC}]
---

# SPEC-NNN: {Feature Title in Title Case}

## Context

{What this SPEC implements. Cite source ACCEPTED ADRs + PRD reference + cluster ANALYSIS.}

## Scope

### In Scope

- [[REQ-1-SPEC-NNN: {REQ Title}]]
- [[REQ-2-SPEC-NNN: {REQ Title}]]
- (all REQs from the Stage 1 cluster)

### Out of Scope

- {Explicit non-goal 1}
- {Cross-SPEC delegation: handled by SPEC-M instead}

## Phases

(Optional — only when the SPEC sequences work into distinct phases.)

- **P0 (foundation)**: REQ-1, REQ-2 — must complete before P1
- **P1 (extension)**: REQ-3, REQ-4 — depends on P0
- **P2 (polish)**: REQ-5 — depends on P1

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | Xd | Sum of TASK Human estimates + integration overhead |
| AI-Dominant | Yd | Sum of TASK AI-Dominant estimates (CANONICAL for rollup) |
| AI-Assisted | Zd | Sum of TASK AI-Assisted estimates |

## Success Criteria

(All `[ ]` at draft; flipped `[x]` by /end when the build phase completes.)

- [ ] All REQs in In Scope reach ACCEPTED via Gate A + Gate B
- [ ] All TASKs reach DONE via /build per-TASK cycle
- [ ] Spec-level QA sweep passes (per /build Stage B)
- [ ] All 4 mandatory exit gates pass (per /build Step 7)

## Artifact Status

### Requirements

- [ ] [[REQ-1-SPEC-NNN: {Title}]]
- [ ] [[REQ-2-SPEC-NNN: {Title}]]
- ...

### Designs

- [ ] [[DESIGN-1-SPEC-NNN: {Title}]]
- ...

### Tasks

- [ ] [[TASK-1-SPEC-NNN: {Title}]]
- [ ] [[TASK-2-SPEC-NNN: {Title}]]
- ...

## ADR Cross-cutting Constraints

(When applicable per Stage 1 clustering.)

| ADR | Constraint | How honored in this SPEC |
| --- | --- | --- |
| [[ADR-N: {Title}]] | {1-line constraint} | {how this SPEC realizes / honors it; cite REQ or DESIGN section} |
| [[ADR-M: {Title}]] | {1-line constraint} | {how} |

## Progress Log

(Empty at draft; populated by /build during implementation.)

| Date | Update | TASK | Session |
| --- | --- | --- | --- |

## Observations

- [decision] SPEC-NNN authored on YYYY-MM-DD covering {N} REQs + {M} DESIGNs + {K} TASKs #spec #status
- [decision] Cluster source: ANALYSIS-NNN: SPEC Clustering #provenance
- [constraint] {key cross-cutting constraint} #cross-cutting
- (3+ observations)

## Relations

- implements [[ADR-N: {Title}]]
- implements [[ADR-M: {Title}]]            # all ACCEPTED ADRs this SPEC realizes
- contains [[REQ-1-SPEC-NNN: ...]]         # all REQs in the SPEC
- contains [[REQ-2-SPEC-NNN: ...]]
- contains [[DESIGN-1-SPEC-NNN: ...]]      # all DESIGNs
- contains [[TASK-1-SPEC-NNN: ...]]        # all TASKs
- part_of [[EPIC-NNN: ...]]                # only if part of an EPIC
- relates_to [[ANALYSIS-NNN: SPEC Clustering]]
- relates_to [[PLAN-NNN: ...]]
```

## Common pitfalls

| Pitfall | Why it fails | Fix |
|---|---|---|
| REQ written in past or future tense | EARS requires WHEN/SHALL present-tense for testability | Use "WHEN X / THE SYSTEM SHALL Y / SO THAT Z" verbatim |
| Acceptance criteria as prose paragraphs | Not testable as pass/fail | Use GIVEN/WHEN/THEN bullets; each one is a discrete test |
| TASK without `implements [[REQ-N]]` relation | Orphan TASK (Gate B fail) | Always add the relation |
| TASK Files Affected missing or vague | /build implementer doesn't know what to touch | Concrete File / Action / Purpose table |
| TASK estimate as a single number, not 3-tier | Rollup uses canonical AI-Dominant tier | 3-tier table: Human / AI-Dominant / AI-Assisted |
| SPEC root with placeholder Artifact Status | Looks complete but children don't exist | Author children first; SPEC root LAST after counts known |
| Mixed `[x]` and `[ ]` in DRAFT spec | Misleads rollup; `[x]` means COMPLETED | All `[ ]` at draft; /build flips during implementation |
| Bare entity refs in any of the 4 templates | Breaks search-with-relations | Always `[[Entity Title]]` with colon matching frontmatter |
| Missing `## Observations` or `## Relations` | Violates universal final-two-sections invariant | Always include both as last two sections |
