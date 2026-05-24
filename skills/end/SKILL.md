---
name: end
description: 'This skill should be used when the user asks to "end the session", "wrap up", "wrap up the session", "ship the changes", "create the PR", "close out", "finish the session", "call it done", "open the PR", "submit the work", or invokes /end in any form. Runs the session-end pipeline: verify all part DoD checkboxes are ticked, invoke /review as the BLOCKING gate, on review FAIL surface 3-option AskUserQuestion (fix-and-retry, defer-with-rationale, abandon-session), on review PASS run 5 pre-flight checks (secret-scan, tests passing, lint clean, PR description validation, CI workflow health), then commit final state, markdown lint fix, push branch, create PR via gh pr create, flip session status DONE, and emit a structured end-of-session report with pre-flight results plus review verdict plus PR link plus warnings plus next-session recommendation.'
user-invocable: true
---

# /end

Session-end skill for the Brain lifecycle. Verifies DoD, runs /review as the BLOCKING gate, runs 5 pre-flight checks on /review PASS, creates the PR, flips session DONE, and emits a structured report.

## What /end does

```text
Step 1:    Verify all part DoD checkboxes [x] for the session's
           owning part(s)
Step 2:    Skill(skill="review") as BLOCKING gate
Step 3:    On /review FAIL:
             3a: block session DONE
             3b: surface findings
             3c: AskUserQuestion (fix-and-retry / defer-with-rationale /
                                  abandon-session)
Step 3.5:  On /review PASS, run 4 pre-flight checks (Check 3 DISABLED):
             (1) Secret-scan
             (2) Tests passing
             (3) Lint clean (DISABLED — see Step 3.5 detail)
             (4) PR description validation
             (5) CI workflow health
Step 4:    On /review PASS + pre-flight PASS:
             4a: commit final session note + PLAN updates
             4b: markdown lint --fix pass
             4c: final commit
             4d: Skill plan set-part-done for owning part(s)
             4e: set-part-done surfaces next-ready part
             4f: push branch + gh pr create
             4g: flip session IN_PROGRESS → DONE
Step 5:    Structured end-of-session report
```

## Inputs and outputs

| Input | Source |
|---|---|
| Active SESSION note (auto-detected from session protocol) | `docs/sessions/SESSION-YYYY-MM-DD_NN-*.md` |
| PLAN binding (from SESSION frontmatter `binds_to`, or PLAN wikilink inline in `## Scope` paragraph) | `docs/planning/PLAN-NNN-*.md` |
| Current branch + diff | `git diff main` |

| Output | Location |
|---|---|
| /review verdict + findings | Inline in chat + SESSION Event NN entry |
| Pre-flight check results | Inline in chat + SESSION Event NN entry |
| PR | GitHub via `gh pr create` |
| `set-part-done` to /plan | Per Contract 1 |
| SESSION status → DONE | SESSION frontmatter |
| Structured end-of-session report | Step 5 — emitted to chat output for user consumption |

## Cross-cutting behaviors

### Brain MCP binary rule

SESSION note + PLAN note edits use Brain MCP. Source code + project config use Read/Edit/Write (e.g., reading `.github/PULL_REQUEST_TEMPLATE.md` for Step 3.5 check 4).

### Two-step edit pattern (per D-04 + Contract 5)

Every SESSION state change (Event NN appends, status flip):

1. SESSION edit first via Brain MCP `edit_note`
2. Project repo commit (durability — covers SESSION + PLAN + any source code)

Step 4's atomic commit covers BOTH SESSION final-state + PLAN updates in one commit (per Step 4a, 4c).

### G2 resume semantics

| Step | Skip condition |
|---|---|
| Step 1 DoD verify | Skip if marker `dod_verified: <YYYY-MM-DD>` present on session frontmatter |
| Step 2 /review | Skip if /review already PASSED for current diff hash AND marker present |
| Step 3 FAIL branch | Skip if /review PASSED previously (path not taken) |
| Step 3.5 pre-flight | Skip individual checks already passed (marker per check) |
| Step 4a/4c commits | Skip if commits already landed (`git log --oneline | head -2`) |
| Step 4d set-part-done | Skip if part status already DONE in PLAN |
| Step 4f PR creation | Skip if PR already exists for this branch (`gh pr view` returns) |
| Step 4g session DONE flip | Skip if session status already DONE |

## Step 1 — DoD verification

Read the SESSION note + locate the `binds_to` PLAN parts (one or more from Scope or frontmatter). For each part:

1. Read PLAN-NNN via Brain MCP
2. Locate the part's body (`### <part-id>` section)
3. Verify every DoD checklist item is `[x]`

If any DoD item is `[ ]`: HALT via `end-step1-dod-incomplete-halt`; surface the specific unchecked items to user; require completion OR explicit deferral via AskUserQuestion (mark item `[~]` with deferral rationale; document in Decision Log).

**G2 resume**: skip Step 1 if `dod_verified: <date>` marker present on session frontmatter.

## Step 2 — /review BLOCKING gate

```text
Skill(skill="review", args="plan=PLAN-NNN target=diff")
```

The `plan=` arg triggers self-review mode in /review (per its Step 1.5 mode detection). /review returns a final verdict per its Step 6 merge rules.

| /review verdict | Action |
|---|---|
| PASS | Proceed to Step 3.5 pre-flight |
| WARN | Proceed to Step 3.5 (warnings don't block) but surface warning summary inline |
| FAIL / REJECTED / NON_COMPLIANT | Halt at Step 3; trigger FAIL branch |
| CRITICAL_FAIL | Halt at Step 3 with elevated severity; trigger FAIL branch |
| UNKNOWN | Treat as non-PASS; AskUserQuestion to user whether to proceed (UNKNOWN means missing evaluation; user adjudicates) |

## Step 3 — On /review FAIL

### 3a — Block session DONE flip

Do NOT proceed to Step 4 (no commits, no PR, no status flip). Session stays `IN_PROGRESS`.

### 3b — Surface findings

Emit the /review findings table to chat. Include per-axis breakdown + file:line evidence per finding.

### 3c — AskUserQuestion (3 options)

```text
Question: "/review returned {VERDICT} with {N} findings. How to proceed?"

Options:
  1. Fix-and-retry (Recommended for actionable findings)
     — Loop back to /build OR /spec depending on finding type
     — Address findings; re-invoke /end after fixes land
  2. Defer-with-rationale
     — Document explicit deferral in PLAN Decision Log
     — Session can still close (DONE flip allowed despite findings)
     — Use when findings are non-critical AND tracked for follow-up
  3. Abandon-session
     — Mark session PAUSED (NOT DONE)
     — Revert part substatus to prior state (IN_PROGRESS → READY if no
       further work intended; or stay IN_PROGRESS for resume)
     — Use when fundamental rework needed; session's work doesn't ship
```

Apply Contract 4 decision-binding echo after answer.

For Option 1 (fix-and-retry): determine fix-target based on finding categories:
- Architectural / scope / design issues → /spec
- Implementation / coverage / quality issues → /build
- Surface to user if mixed or ambiguous

For Option 3 (abandon-session): session status `IN_PROGRESS → PAUSED`; revert each owning part's status as appropriate; emit halt block `end-step3c-abandon-halt`.

## Step 3.5 — Pre-flight checks (5)

See `references/end-checklist.md` for full details. All must PASS to proceed to Step 4.

### Check 1 — Secret-scan

Grep diff for common credential patterns:

```bash
git diff main | grep -nE '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9-]+|password=|aws_secret_access_key=|api[_-]?key=)' 2>&1
```

OR invoke `Skill(skill="brain:---security-scan")` if available (more comprehensive). If absent: fall back to inline grep + emit `end-step3.5-check1-coverage-note` severity INFO.

PASS: no matches.
FAIL: any match → HALT via `end-step3.5-check1-halt`; user reviews matches; if false positives, mark with `# nosec` comment + re-run; if real secrets, REMOVE from diff + rewrite history if already committed.

### Check 2 — Tests passing

Detect test framework from project config:

- `bun.lock` → `bun test`
- `package.json` with `"scripts": { "test": ... }` → `npm test`
- `pyproject.toml` with `pytest` → `pytest`
- `Cargo.toml` → `cargo test`
- `go.mod` → `go test ./...`

Run the test suite. PASS if exit 0 with no failures. FAIL if any test fails OR any test is skipped without justification.

Skip Check 2 entirely if no test framework detected.

### Check 3 — Lint clean (DISABLED 2026-05-19 for Brain knowledge-graph projects)

**Status**: DISABLED. Brain knowledge-graph repos accumulate prose-heavy markdown content (analyses, ADRs, sessions, plans) that conflicts with default markdownlint rules — particularly MD013 (line-length) and MD060 (table-column-style) for wikilink-table cells. Without a project-level `.markdownlint.json` config, defaults produce 30k+ errors that aren't actionable per-PR. Verify-only HALT made every brain PR fail Check 3 against the systemic baseline rather than against the PR's actual delta.

**Effect**: Check 3 is SKIPPED in the pre-flight sequence. Treat as `n/a` in the Step 5 report. Step 4b `markdownlint-cli2 --fix` still runs to land any safe auto-fixes — that's a one-way improvement, not a verification gate.

**Re-enable when**: project adopts a custom `.markdownlint.json` (or `.markdownlint-cli2.jsonc`) that calibrates rules for prose-heavy KG content, OR enforces lint via CI workflow on a delta-only basis (only flag new violations introduced by the PR, not the pre-existing baseline). Restore the original spec below by deleting this DISABLED block:

> Original spec (for reactivation):
>
> ```bash
> npx markdownlint-cli2 "**/*.md"   # NO --fix; verify-only
> ```
>
> PLUS `biome check` (no `--apply`) if `biome.json` exists. PLUS project linters detected from config (eslint, ruff, etc.).
>
> PASS: all linters exit 0. FAIL: any linter exits non-zero.

### Check 4 — PR description validation

If `.github/PULL_REQUEST_TEMPLATE.md` exists:

1. Read the template
2. Parse the planned PR body (constructed in Step 4f or from session content)
3. Verify every required section from the template is present in the PR body

PASS: all template sections present.
FAIL: missing sections → HALT via `end-step3.5-check4-halt`; require PR body amendment.

If no template file: skip Check 4.

### Check 5 — CI workflow health

If `.github/workflows/` exists:

1. List all `*.yml` / `*.yaml` files
2. YAML-parse each (`gh workflow list` OR `yq eval` for offline check)
3. Verify required fields per GitHub Actions schema (`name`, `on`, `jobs`)
4. Identify known-blocking workflows (workflows that ALWAYS fail given current diff — e.g., session-protocol validation workflow if SESSION note missing required sections)

PASS: all workflows well-formed; no known-blocking issues.
WARN: workflows have warnings (deprecated actions, etc.) but no errors.
FAIL: workflow YAML errors → HALT via `end-step3.5-check5-halt`.

## Step 4 — On /review PASS + pre-flight PASS

### 4a — Commit final session note + PLAN updates

```bash
git add docs/sessions/SESSION-*.md docs/planning/PLAN-*.md
git commit -m "end: final session state for SESSION-YYYY-MM-DD_NN-{slug}"
```

### 4b — Markdown lint fix pass

```bash
npx markdownlint-cli2 --fix "**/*.md"
```

Auto-fixes any markdown issues that landed since pre-flight Check 3.

### 4c — Final commit

```bash
git add . && git commit -m "end: markdown lint fix pass" --allow-empty
```

(`--allow-empty` because lint fix may not produce changes; we want a clean separator commit either way.)

Skip 4c if no lint changes were made (empty diff).

### 4d — set-part-done

For each owning part of the session:

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=<part-id> outcome=<outcome wikilink>")
```

Per Contract 1.

### 4e — Auto-progression

After set-part-done lands, /plan returns the next-ready part (if any). /end captures this for the Step 5 report ("next-session recommendation").

### 4f — Push branch + PR creation

See `references/pr-creation.md` for full PR creation patterns. Summary:

```bash
git push -u origin <branch>
gh pr create --title "<title>" --body "<body per template>"
```

PR body is constructed from:

- `.github/PULL_REQUEST_TEMPLATE.md` (if exists) — fill in each section
- Session Scope description
- Per-part outcomes
- /review verdict + per-axis summary
- Pre-flight check results

If `gh pr create` fails (no remote, network error, auth): HALT via `end-step4f-pr-creation-halt`; keep session open (status stays IN_PROGRESS); surface error + retry option.

### 4g — Flip session status DONE

```text
SESSION frontmatter status: IN_PROGRESS → DONE
```

Apply two-step edit: SESSION edit → final project repo commit.

## Step 5 — Structured end-of-session report

Emit to chat output (NOT a Brain note; stateless per Q11 RESOLVED):

```markdown
## Session ended — SESSION-YYYY-MM-DD_NN-{slug}

### Pre-flight results
- Secret-scan: PASS
- Tests passing: PASS (N tests, 0 failures)
- Lint clean: PASS
- PR description validation: PASS
- CI workflow health: PASS

### Review verdict (from /review Step 6)
**Final: PASS** (or WARN/FAIL with findings table inline)

Per-axis:
- brain:🧠-architect: PASS
- brain:🧠-qa: PASS
- brain:🧠-security: PASS
- code-qualities-assessment: PASS
- incoherence: PASS
- orphan-ref-validator: UNKNOWN (tool absent — coverage-note INFO)
- markdown-lint: PASS
- biome-lint: PASS

### PR
https://github.com/<org>/<repo>/pull/<number>

### Warnings
- (any deferrals from FAIL branch defer-with-rationale)
- (non-blocking findings from /review WARN)
- (estimate-reconciliation divergence per D-14 if applicable)

### Next-session recommendation
- /plan PLAN-NNN  (if more parts ready — surface next-ready part name)
- /retrospective  (if session crossed significance threshold per retro heuristic)
- (none) — workflow complete
```

The report is informational only (per Q11 stateless decision). Not aggregated across sessions. Not saved as a Brain note.

### Retrospective triggering threshold

Heuristic for surfacing /retrospective recommendation in Step 5:

- Session lasted >2 days OR
- Session had >3 user-corrections OR
- Session involved a halt that required architectural revision OR
- Session was the last in a PLAN (workflow complete)

User can ignore the recommendation — it's surfaced but not enforced.

## Halt blocks

Contract 3 schema with `end-<step>-halt` info-string:

| Halt | Trigger | Resolution |
|---|---|---|
| `end-step1-dod-incomplete-halt` | Any part DoD item is `[ ]` | Complete OR mark `[~]` with deferral rationale |
| `end-step3-review-fail-halt` | /review verdict FAIL/CRITICAL_FAIL | User picks via 3-option AskUserQuestion |
| `end-step3.5-check1-halt` | Secret-scan match | Review matches; remove real secrets (rewrite history if needed); mark false positives |
| `end-step3.5-check2-halt` | Test failure | Fix failing tests; re-run |
| `end-step3.5-check3-halt` | (DISABLED 2026-05-19; Check 3 skipped — see Step 3.5 Check 3 block) | n/a |
| `end-step3.5-check4-halt` | PR description missing template sections | Amend PR body to include sections |
| `end-step3.5-check5-halt` | CI workflow YAML error | Fix workflow file; re-run |
| `end-step3c-abandon-halt` | User picks abandon-session in FAIL branch | Session PAUSED; part substatus reverted |
| `end-step4f-pr-creation-halt` | `gh pr create` fails (no remote, network, auth) | Retry, fix git remote, or pause session |

## Rigid per-TASK build+QA cycle

When a SPEC enters build, the orchestrator advances ONE TASK at a time through a fixed sequence. NO step may be skipped or reordered, NO batching, NO shortcuts.

For each `TASK-NNN-SPEC-MMM` in the SPEC:

a. PLAN transition `impl-TASK-NNN PENDING → IN_PROGRESS` (FIRST action)
b. Session note Event appended capturing transition
c. Git commit
d. Orchestrator dispatches implementer; brief = rendered impl item content verbatim from PLAN
e. Implementer reads ENTIRE spec subtree, implements ONLY this TASK, marks DoD `[x]` per item satisfied
f. Implementer returns `## State Changes` (this TASK only)
g. Session note Event
h. PLAN transition `impl-TASK-NNN IN_PROGRESS → DONE`
i. Git commit (code + PLAN + session note atomically)
j. PLAN transition `qa-TASK-NNN PENDING → IN_PROGRESS`
k. Session note Event
l. Git commit
m. Orchestrator dispatches QA; brief = rendered qa item content verbatim from PLAN
n. QA reads ENTIRE spec, evaluates each linked DoD + REQ AC + DESIGN compliance checkbox individually with evidence
o. QA writes per-checkbox findings to `QA-NNN-SPEC-MMM-{task-slug}.md` via Pattern 2 three-phase write
p. QA returns verdict ONLY: `PASS` or `FAILED + see QA-NNN`
q. Session note Event
r. Orchestrator updates TASK note with `validated_by` relation to the QA note
s. On PASS: PLAN `qa-TASK-NNN → DONE`; TASK note status → DONE. On FAILED: PLAN `qa-TASK-NNN → FAILED`; PLAN `impl-TASK-NNN DONE → IN_PROGRESS`; orchestrator translates QA findings into a fix-brief that quotes each unchecked item verbatim with QA evidence
t. Git commit
u. Move to TASK N+1; repeat from (a)

## Checkbox-as-contract

Implementer and QA do NOT figure out what counts as done from prose. The contract is mechanical:

- `TASK ## Definition of Done` checkboxes — implementer's build contract
- `REQ ## Acceptance Criteria` (EARS Given/When/Then) — QA validates against these
- `DESIGN ## Compliance` or `## Architecture Compliance` checkboxes (when present) — QA validates against these

## Schema-validated agent-claim verification

The composition library at `shared/composition/` provides programmatic validators:

- `TaskNoteSchema` + `validateTaskDoneClaim()` — rejects implementer "DONE" claim if any DoD `[ ]` unsatisfied
- `RequirementNoteSchema` + `validateRequirementAcClaim()` — rejects REQ ACCEPTED if any AC `[ ]`
- `DesignNoteSchema` + `validateDesignComplianceClaim()` — same for DESIGN
- `SpecRootNoteSchema` + `validateSpecDoneClaim()` — same for SPEC root
- `QaNoteSchema` + `validateQaPassClaim()` — rejects QA "PASS" that doesn't match per-row results

Lying agents are mechanically caught.

## Defense in depth

This protocol embeds at every enforcement layer. Single-layer enforcement fails under load.

### Role of /end in the rigid cycle

> /end gates session closure on PLAN DoD verification. Step 1 HALTS if any PLAN Exit Criteria `[ ]` remains unchecked-and-non-deferred. Step 2 runs /review as a BLOCKING gate. /end extends DoD verification by invoking the composition-library claim validators against every TASK / REQ / DESIGN / SPEC root touched this session — schema rejection blocks closure. The PR-creation step is allowed to proceed only after schema-validated full-green state. Sessions transition IN_PROGRESS → DONE (closed) or IN_PROGRESS → PAUSED (carry forward) — never silently abandoned.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Closing session before /review PASS | Violates BLOCKING gate semantics | /review is mandatory; abandon-session is the only "close-without-PASS" path |
| Flipping session DONE without committing final state | Orphans the work | Commit Step 4a first, THEN flip status in Step 4g |
| Pushing PR before set-part-done | Jira drifts ahead of PLAN; PLAN doesn't reflect closure | Step 4d set-part-done FIRST, then Step 4f PR creation |
| Suppressing markdown lint output to "fix in next PR" | Lint debt compounds | Step 4b `--fix` runs in /end; never defer |
| Skipping pre-flight check 4 (PR description template) | PRs ship without required context | If template exists, check is BLOCKING |
| Aggregating quality signals into a cross-session dashboard | Violates Q11 RESOLVED (stateless) | Report is per-session only; lives in chat output |
| Auto-invoking /retrospective | Wastes effort; not every session warrants retro | Threshold heuristic; user decides |
| Skipping the structured report | User loses visibility into session outcome | Step 5 is mandatory; always emit |
| Reverting part substatus incorrectly on abandon-session | Drifts PLAN state | Per-phase revert logic; surface to user if uncertain |
| Treating UNKNOWN /review verdict as PASS | Hides missing-evaluation risk | AskUserQuestion to user whether to proceed on UNKNOWN |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched, check `~/.claude/skills/<name>/SKILL.md` first; if absent, check Brain plugin path. Never fall back to ai-agents.

**Skills (Skill dispatch):**

- `review` → `~/.claude/skills/review/` (Step 2 BLOCKING gate)
- `plan` → `~/.claude/skills/plan/` (Step 4d set-part-done)
- `brain:---security-scan` → Brain plugin (Step 3.5 Check 1; optional — falls back to inline grep with coverage-note if unavailable)

**External tools:**

- `npx markdownlint-cli2` (Step 3.5 Check 3 + Step 4b)
- `biome check` (Step 3.5 Check 3 if biome.json)
- `gh pr create` (Step 4f)
- Project test framework (`bun test` / `npm test` / `pytest` / `cargo test` / `go test ./...`) detected from project config

**EXCLUDED**: `golden-principles`, `taste-lints`, `pipeline-validator` (ai-agents pipeline-validator targets Azure DevOps; Brain projects use GitHub Actions — Step 3.5 Check 5 inspects workflow files directly).

## Reference files

- `references/end-checklist.md` — Step 1 DoD verification procedure + Step 3.5 5 pre-flight checks detail (full grep patterns, framework detection, lint commands) + Step 4 PASS sub-steps (4a-4g) atomic-commit ordering
- `references/pr-creation.md` — Step 4f PR creation (gh pr create patterns, PR body assembly, template usage) + Step 5 next-session recommendation logic (retrospective trigger threshold heuristics)
