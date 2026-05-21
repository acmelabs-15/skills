# Authoring Workflow — Phase 3 Validation + ADR Coverage Gate + Gate A/B Procedures

Stage 2 quality gates that run AFTER all 6 authoring steps complete and BEFORE SPEC status flips DRAFT → ACCEPTED. Three distinct gates with different scopes:

- **Phase 3 Validation** — per-note syntactic checks (CONVENTIONS Section 8 pre-flight + post-write)
- **ADR coverage gate** — every ACCEPTED ADR has at least one `implemented_by [[SPEC-N]]` relation
- **Gate A** — semantic gap analysis (analyst as requirements reviewer; can each REQ be verified pass/fail?)
- **Gate B** — 4 binary drift checks (critic verifies REQ→ADR, scope conservation, TASK→REQ, scope-in match)

All gates BLOCKING. HALT on FAIL with specific halt block; fix the violation; re-run the gate that failed.

## Phase 3 Validation

Run against every newly-authored note in the SPEC subtree (REQ + DESIGN + TASK + SPEC root). Per CONVENTIONS Section 8.

### 11-item pre-flight checklist

1. **Title format** — `{ENTITY-ID-SEGMENTS}: {Descriptor in Title Case}`; colon + Title Case; CAPS entity/parent prefix; no kebab in title
2. **Filename format** — kebab-case body + CAPS entity/parent prefixes. Spec-nested: `{ENTITY}-{NNN}-SPEC-{NNN}-{descriptor-kebab}.md`
3. **Permalink format** — `{folder}/{filename-stem-fully-lowercased}` — all lowercase kebab
4. **H1 matches frontmatter title VERBATIM** — same text, capitalization, colon
5. **Type field** is one of the 16 canonical — `requirement` / `design` / `task` / `spec` for the SPEC subtree
6. **Status field present** — Task notes use `TODO | IN_PROGRESS | DONE | BLOCKED`; REQ/DESIGN/SPEC use `DRAFT | ACCEPTED | ...`
7. **Tags** — 2-5 lowercase hyphenated
8. **Observations** — min 3 with `[category]` prefix + 1-3 `#tags`. Categories: `[fact]` · `[decision]` · `[requirement]` · `[technique]` · `[insight]` · `[problem]` · `[solution]` · `[constraint]` · `[risk]` · `[outcome]`
9. **Relations** — min 2 using ONLY valid types: `implements` · `depends_on` · `relates_to` · `extends` · `part_of` · `inspired_by` · `contains` · `pairs_with` · `supersedes` · `leads_to` · `caused_by`
10. **Folder matches type** — `spec` → `specs/SPEC-NNN/`; `task` → `specs/SPEC-NNN/tasks/`; `design` → `specs/SPEC-NNN/design/`; `requirement` → `specs/SPEC-NNN/requirements/`
11. **Final two sections invariant** — every note ends with `## Observations` then `## Relations` — no section after Relations

### 6-item post-write verification

1. `list_directory` confirms filename is kebab (no spaces, CAPS prefix preserved) — Pattern 2 Phase 3 `move_note` completed
2. `read_note` confirms frontmatter title matches kebab filename stem's un-kebabed form with colon
3. H1 in body matches frontmatter title character-for-character
4. Relations section uses only valid types (the 11-type allowlist)
5. Observations count ≥3 (if >15, verify H3 sub-grouping); Relations count ≥2 (if >12, verify H3 type-grouping)
6. Final two sections are `## Observations` then `## Relations`

### Phase 3 failure handling

Any pre-flight OR post-write check failure: HALT via `spec-preflight-halt` with the specific check name + the offending note. Fix the violation directly via `edit_note`; re-run the checks.

Common failures:

- Filename has spaces (Pattern 2 Phase 3 `move_note` skipped) — run `move_note` to correct
- Frontmatter title missing colon — add via `find_replace`
- H1 doesn't match frontmatter title — fix via `find_replace`
- Observations <3 — add more observations with proper `[category]` + `#tags`
- Relations <2 — add more relations using only valid types
- Note ends with section after `## Relations` — relocate trailing sections to BEFORE Observations

## ADR coverage gate

After Phase 3 passes for the last SPEC in the part, run this audit.

### Procedure

1. `mcp__plugin_brain_brain__list_directory({ dir_name: "decisions" })` → list every ADR
2. For each ADR:
   - `mcp__plugin_brain_brain__read_note({ identifier: "decisions/adr-nnn-..." })`
   - Check frontmatter `status`: only ACCEPTED ADRs need coverage
   - For ACCEPTED ADRs: check `## Relations` for `implemented_by [[SPEC-` entries
3. Any ACCEPTED ADR without `implemented_by [[SPEC-N]]` → uncovered

### Halt block (Contract 3)

```text
```spec-adr-coverage-uncovered-halt
trigger: ADR coverage gate after Stage 2 Phase 3
question: Does every ACCEPTED ADR have at least one implemented_by [[SPEC-N]] relation?
answer: "no — {N} ADRs uncovered: [[ADR-X]], [[ADR-Y]], ..."
test_failed: ADR coverage audit
deferral: Surface uncovered ADRs to user; options: (a) amend Stage 1 clustering to include uncovered ADRs (loop back), (b) document explicit deferral with rationale in PLAN Decision Log, (c) author additional SPEC(s) covering the uncovered ADR(s).
```
```

### Resolution paths

| Path | When to use | Action |
|---|---|---|
| Amend Stage 1 clustering | Most uncovered ADRs (genuine miss) | Restart /spec Stage 1 with revised brief; new SPEC(s) get added to PLAN |
| Document explicit deferral | ADR is genuinely out of scope for this PLAN | Add Decision Log entry + a note in the ADR's body explaining deferral + (optionally) create a backlog item for future coverage |
| Author additional SPEC immediately | Small uncovered ADR set; quick to add SPEC | Run Stage 2 for the new SPEC; re-run ADR coverage gate after |

## Gate A — Semantic gap analysis

After Phase 3 + ADR coverage gate pass.

### Dispatch

```text
Task(subagent_type="brain:🧠-analyst")
```

### Brief

```text
You are reviewing SPEC-NNN as a requirements analyst with adversarial framing. You have NOT seen the author's reasoning; you only have the SPEC body + REQ notes + DESIGN notes.

For EACH REQ in this SPEC, ask:

  Can this requirement be verified pass/fail given:
    - the EARS clause (WHEN/SHALL/SO THAT)
    - the GIVEN/WHEN/THEN acceptance criteria
    - the DESIGN context the REQ depends on

Flag anything that:
  - Is vague (e.g., "the system shall be fast" — fast how?)
  - Requires runtime judgment (e.g., "the UI should look polished")
  - Would lead two reasonable implementers to build different things
  - Has acceptance criteria that aren't testable as pass/fail (e.g., narrative descriptions instead of GIVEN/WHEN/THEN bullets)

For every flag, cite:
  - REQ identifier + section name
  - the specific vague phrase or untestable criterion
  - what concrete refinement would resolve the flag

"Spec looks fine" is a failure mode. If you genuinely cannot find any concerns, document why explicitly per REQ.
```

### Gate A halt block

```text
```spec-gate-a-halt
trigger: Stage 2 Gate A semantic gap analysis
question: Are all REQs verifiable as pass/fail with current EARS + acceptance criteria + DESIGN context?
answer: "no — {N} REQs flagged: REQ-X, REQ-Y, ..."
test_failed: semantic gap analysis
deferral: For each flagged REQ, refine: tighten the EARS clause OR sharpen the acceptance criteria OR add DESIGN context the REQ depends on. Re-run Gate A.
```
```

## Gate B — 4 binary drift checks

After Gate A passes.

### Dispatch

```text
Task(subagent_type="brain:🧠-critic")
```

### Brief

```text
You are reviewing SPEC-NNN as a stranger with adversarial framing. Verify all 4 binary drift checks; surface findings per check with file:line / wikilink evidence. Halt the SPEC authoring on any FAIL.

### (a) REQ → ADR traceability
For every REQ in SPEC-NNN, verify Relations contains `implements [[ADR-N]]` OR the parent SPEC's `implements` set covers the REQ's scope. Orphan REQs are scope creep.

### (b) Scope conservation
For every REQ, verify its scope is within the ADR set covered by the SPEC. Any REQ adding scope beyond the ADRs requires explicit documented rationale (ADR amendment OR SPEC body note).

### (c) TASK → REQ traceability
For every TASK in SPEC-NNN, verify Relations contains at least one `implements [[REQ-N-SPEC-N: ...]]`. Orphan TASKs are implementation drift.

### (d) Scope-In match
Compare SPEC root's `## Scope > In Scope` REQ list against the Stage 1 cluster's REQ list (in ANALYSIS-NNN: SPEC Clustering). Divergence requires documented justification or revision.

For every FAIL, cite the specific note + section + what's missing or mismatched. "All checks pass" is acceptable if every check legitimately passes — document the evidence per check.
```

### Per-check halt blocks

```text
```spec-gate-b-a-halt
trigger: Gate B check (a) REQ → ADR traceability
question: Does every REQ trace to at least one ADR?
answer: "no — REQ-X has no implements [[ADR-N]] relation AND parent SPEC's implements set doesn't cover REQ-X's scope"
test_failed: REQ-ADR traceability
deferral: Add implements [[ADR-N]] to REQ-X OR document REQ-X as a scope extension with rationale.
```

```spec-gate-b-b-halt
trigger: Gate B check (b) Scope conservation
question: Does every REQ stay within the ADR set's scope?
answer: "no — REQ-X introduces capability {description} not present in any covered ADR"
test_failed: scope conservation
deferral: Add scope-extension rationale in SPEC body OR amend the source ADR to include the capability OR remove the REQ.
```

```spec-gate-b-c-halt
trigger: Gate B check (c) TASK → REQ traceability
question: Does every TASK have at least one implements [[REQ-N-SPEC-N]] relation?
answer: "no — TASK-X has no implements [[REQ-]] relation"
test_failed: TASK-REQ traceability
deferral: Add implements relation; OR if the TASK doesn't map to a REQ, author the REQ first OR remove the TASK.
```

```spec-gate-b-d-halt
trigger: Gate B check (d) Scope-In match
question: Does SPEC In Scope REQ list match Stage 1 cluster REQ list?
answer: "no — SPEC In Scope diverges from cluster on REQs: {list}"
test_failed: scope-in match
deferral: Align SPEC scope to Stage 1 cluster OR document scope-change rationale (may require revisiting Stage 1 if substantive).
```
```

## Verification checklist (post-Gate B PASS)

Before declaring Stage 2 complete + flipping SPEC DRAFT → ACCEPTED:

- [ ] All Phase 3 pre-flight + post-write checks PASS
- [ ] ADR coverage gate PASS (every ACCEPTED ADR has `implemented_by [[SPEC-N]]`)
- [ ] Gate A PASS (every REQ verifiable as pass/fail; no flagged REQs)
- [ ] Gate B (a) PASS (every REQ traces to ADR)
- [ ] Gate B (b) PASS (scope conserved)
- [ ] Gate B (c) PASS (every TASK traces to REQ)
- [ ] Gate B (d) PASS (Scope-In matches Stage 1 cluster)
- [ ] All bi-directional relations closed (per Step 6)
- [ ] Two-step edit pattern applied per state change + per repo commit
- [ ] SPEC root status flipped DRAFT → ACCEPTED
- [ ] `set-part-done` invoked with `outcome=[[SPEC-NNN: ...]]`

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping Phase 3 pre-flight on any note | Malformed notes ship; downstream consumers fail silently | Run all 11 pre-flight checks per note |
| Skipping post-write verification | Pattern 2 Phase 3 `move_note` failures leave malformed filenames | Always verify via `list_directory` after creation |
| Running Gate A without adversarial framing | Analyst returns "spec looks fine" — useless | Brief MUST include reviewer-asymmetry + "find at least one concern per REQ" |
| Running Gate B with non-binary checks | Subjective findings; hard to act on | Each check returns binary PASS or FAIL with cited evidence |
| Skipping ADR coverage gate | Spec layer claims complete while ADRs unimplemented | Gate is BLOCKING; never skip |
| Treating Gate A or B findings as warnings | Quality issues land in /build as compounded debt | All gates BLOCKING; HALT on any FAIL |
| Re-running gates without addressing findings | Same findings re-surface; no progress | Address each finding before re-running the gate |
| Auto-flipping SPEC ACCEPTED without all gates passing | Premature accept; downstream phases trust the status | DRAFT → ACCEPTED only after ALL gates PASS |
