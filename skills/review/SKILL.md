---
name: review
description: 'This skill should be used when the user asks to "review the diff", "review PR-NNN", "review my changes", "do a code review", "review this code", "code review", "check the diff", "review the changes", "review the build output", "adversarial review", or invokes /review in any form. Also auto-invoked by /end Step 2 as the gate before PR creation (self-review mode), and invoked directly by users on external PRs (review-others mode). Runs an adaptive multi-axis review: PR-type classification (CODE plus DOCS plus CONFIG plus TEST) selects the relevant axes from 5 skill axes (code-qualities-assessment, incoherence substituting for doc-accuracy, orphan-ref coverage-note, markdown-lint, biome-lint) plus 3 critical agent axes (architect for architectural fit, qa for test coverage, security for OWASP plus CWE). Agent dispatches embed reviewer-asymmetry mandate. Per-axis verdicts merge per rule (any CRITICAL_FAIL wins, then FAIL, then WARN, all PASS, UNKNOWN surfaces but never overrides). Emits findings table with file plus line evidence per finding.'
user-invocable: true
---

# /review

Adaptive multi-axis code review skill for the Brain lifecycle. Two modes (self-review when auto-invoked from `/end`; review-others when invoked directly on an external PR). Runs 5 skill axes + 3 critical agent axes (Q5 Option 2), with adaptive PR-type subset selection. Merges per-axis verdicts; emits findings with `file:line` evidence.

## What /review does

```text
Step 1:    brain:🧠-analyst complexity tier classification
           (TIER_1-5 from diff size + file count + risk surface;
            OR read PLAN frontmatter complexity_tier if PLAN-bound)
Step 1.5:  Mode detection
            self-review mode  (plan=PLAN-NNN arg present)
            review-others mode (pr=NNN arg present; full
                                adversarial framing)
Step 2:    PR-type classification (CODE / DOCS / CONFIG / TEST)
           Drives adaptive axis selection
Step 3 (agent axes, parallel):
  - brain:🧠-architect    architectural fit, layer violations
  - brain:🧠-qa           test coverage, edge cases, regression
  - brain:🧠-security     OWASP, CWE, input validation
Step 4 (skill axes, local-only):
  - brain:---code-qualities-assessment   5 foundational qualities
  - brain:---incoherence (substitutes for absent doc-accuracy)
                                          verify docs against code
  - orphan-ref-validator (ABSENT)         coverage-note INFO; CONTINUE
  - markdown-lint   (npx markdownlint-cli2)   Brain note hygiene
  - biome-lint      (biome check)             TS/JS if biome.json
Step 5:    Extract per-axis verdict (PASS | WARN | CRITICAL_FAIL |
           UNKNOWN; full enum 10 values)
Step 6:    Merge verdicts (any CRITICAL_FAIL wins, then FAIL,
           then WARN, all PASS; UNKNOWN never overrides)
Step 7:    Emit findings table with file:line evidence per finding
```

## Inputs and outputs

| Input | Source |
|---|---|
| `target=<diff|file|spec>` | What to review. Default `diff` (`git diff main` or PR diff via `gh pr diff`) |
| `plan=PLAN-NNN` (optional) | Self-review mode marker. /end Step 2 passes this when invoking /review on current branch's diff |
| `pr=NNN` (optional) | Review-others mode marker. User passes when reviewing an external PR |
| `pr_type=<code|docs|config|test>` (optional) | Override PR-type classification; auto-classified by Step 2 if omitted |
| PLAN frontmatter `complexity_tier` (when plan= present) | Used at Step 1 instead of re-classifying |

| Output | Format |
|---|---|
| Per-axis verdicts | Internal; merged in Step 6 |
| Merged final verdict | One of: `PASS | WARN | CRITICAL_FAIL | REJECTED | FAIL | NEEDS_REVIEW | NON_COMPLIANT | COMPLIANT | PARTIAL | UNKNOWN` |
| Findings table | Markdown table: severity, axis, finding, file:line evidence, suggested action |
| Structured report block | For /end Step 5 consumption: verdict + axes + counts of findings by severity |

## Cross-cutting behaviors

### Two modes — self-review vs review-others

Detected from invocation args:

| Mode | Trigger | Calibration |
|---|---|---|
| Self-review | `plan=PLAN-NNN` arg present (auto-invoked by /end Step 2 on the current branch's own diff) | Lower adversarial threshold at Tier 1-2 (reviewer trusts upstream gates from /build); standard adversarial framing at Tier 3+ |
| Review-others | `pr=NNN` arg present (invoked directly on an external PR) | Full adversarial framing per D-14 regardless of tier; reviewer has not seen the author's reasoning; "looks good" is a failure mode at all tiers |

The mode wires into Step 3 agent dispatch briefs: self-review-mode briefs phrase the reviewer-asymmetry mandate at the per-tier threshold; review-others-mode briefs apply full adversarial framing.

### G2 resume semantics

Per-axis verdict caching: if an axis already returned a verdict for the current diff hash (computed by `git diff main | sha256sum`), skip re-running. Cache invalidates when the diff changes (new commits land, files modified).

| Axis | Skip condition |
|---|---|
| Step 1 tier classification | Skip if PLAN.complexity_tier present OR if tier already classified for this diff hash |
| Step 2 PR-type | Skip if `pr_type=` arg present OR if classified for this diff hash |
| Step 3 agent axes | Skip per-axis if verdict cached for current diff hash + matches selected axes per PR type |
| Step 4 skill axes | Skip per-axis if verdict cached for current diff hash |
| Step 6 merge | Always re-runs (cheap; based on per-axis verdicts which are cached) |

## Step 1 — Tier classification

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief: classify the diff's complexity Tier 1-5 from:

- Diff size (lines changed: small <100, medium 100-500, large 500-2000, very large >2000)
- File count (single file vs single package vs multi-package vs cross-system)
- Risk surface (auth/data/migration touches + irreversibility + blast radius)

Analyst returns tier + confidence + rationale.

If `plan=PLAN-NNN` present: read PLAN frontmatter `complexity_tier` first; use it. If diff-derived tier diverges (e.g., PLAN is Tier 3 but a diff change is single-file Tier 1): surface via AskUserQuestion. Default Recommended: PLAN-level tier (more authoritative for self-review).

If no PLAN binding (review-others mode) AND tier is undefinable (e.g., diff empty or unparseable): HALT via `review-step1-tier-undefinable-halt`; user manually annotates tier.

## Step 1.5 — Mode detection

```text
IF plan= arg present:
   mode = self-review
   IF tier ≤ 2: lower adversarial threshold (reviewer-asymmetry framing trusts upstream)
   ELSE: standard adversarial framing
ELSE IF pr= arg present:
   mode = review-others
   adversarial framing = full (per D-14; tier doesn't soften)
ELSE:
   surface AskUserQuestion: "Self-review or review-others mode?"
```

Mode + tier propagate to Step 3 agent dispatch briefs.

## Step 2 — PR-type classification

Classify diff into one of CODE / DOCS / CONFIG / TEST. Heuristic:

- DOCS: >80% of changed files are `*.md` OR docs/comment-only changes
- CONFIG: >80% of changed files are config (`*.json`, `*.yaml`, `*.toml`, `package.json`, `biome.json`, `.github/**`)
- TEST: >80% of changed files are test files (`__tests__/`, `*.test.*`, `*.spec.*`)
- CODE: default; mixed or majority source code

PR-type drives adaptive axis selection:

| PR-type | Axes run |
|---|---|
| CODE | All 8 axes (5 skill + 3 agent) |
| DOCS | markdown-lint + brain:---incoherence only (drop code-qualities + biome + 3 agents — none apply to docs-only changes) |
| CONFIG | brain:---code-qualities-assessment (lite — covers config quality) + biome-lint (if config is TS/JS) + brain:🧠-security (config can introduce security issues — secrets, auth, network) |
| TEST | brain:🧠-qa + relevant lints (markdown + biome) + brain:---code-qualities-assessment (test code quality matters) |

If `pr_type=` arg present: skip auto-classification; use the passed value.

## Step 3 — Agent axes (parallel)

Dispatch in parallel (one batch). Each agent runs with reviewer-asymmetry framing per D-14.

### Architect

```text
Task(subagent_type="brain:🧠-architect")
```

Brief: "Review this diff as a stranger to the work. Surface: architectural fit issues (does the change align with the codebase's existing patterns?), layer violations (UI talking directly to data layer? cross-domain leakage?), boundary leaks (private APIs exposed publicly? cross-module coupling that breaks containment?). Cite file:line evidence for every finding. 'Looks good' is a failure mode."

### QA

```text
Task(subagent_type="brain:🧠-qa")
```

Brief: "Review this diff as a stranger. Surface: test coverage gaps (are new code paths tested? are edge cases covered?), regression risks (does the change break adjacent modules?), happy-path bias (only happy-path tests added; failure modes uncovered). Cite file:line per finding. **CRITICAL for /build output** — review trusts implementer's QA notes if self-review mode + tier 1-2; full adversarial review otherwise."

### Security

```text
Task(subagent_type="brain:🧠-security")
```

Brief: "Review this diff as a stranger. Surface: OWASP Top 10 + CWE-class vulnerabilities; auth/authz gaps; input validation gaps; secret exposure; injection vectors; insecure defaults. Cite file:line per finding. **CRITICAL for security-touching diffs** (auth, data handling, network, crypto)."

## Step 4 — Skill axes (local-only)

Dispatch in sequence (each is fast; sequential keeps output ordered):

| Axis | Dispatch | Verdict source |
|---|---|---|
| code-qualities-assessment | `Skill(skill="brain:---code-qualities-assessment", args="--changed-only")` | Skill output |
| incoherence (substitutes for doc-accuracy) | `Skill(skill="brain:---incoherence", args="--diff-base main")` | Skill output |
| orphan-ref-validator | ABSENT at Brain locations | Emit `review-step4-gate3-coverage-note` severity INFO; CONTINUE |
| markdown-lint | `npx markdownlint-cli2 "**/*.md"` (no `--fix`; verify-only in review mode) | Exit code + output |
| biome-lint | `biome check` (no `--apply`; verify-only) if `biome.json` present | Exit code + output |

`brain:---incoherence` substitutes for `doc-accuracy` per Contract 9 (same intent: verify docs against code). Substitution is canonical in /review; not a "fine-enough" placeholder.

## Step 5 — Per-axis verdict extraction

Each axis returns a verdict from this enum:

```text
PASS | WARN | CRITICAL_FAIL | REJECTED | FAIL | NEEDS_REVIEW | NON_COMPLIANT | COMPLIANT | PARTIAL | UNKNOWN
```

Regex extraction patterns per axis tool output. UNKNOWN surfaces when:

- The axis tool was unavailable (e.g., orphan-ref-validator absent → UNKNOWN with reason "tool absent")
- The axis tool errored mid-run
- The axis tool returned ambiguous output (no clear verdict marker)

## Step 6 — Verdict merging

Merge per-axis verdicts into a final verdict:

```text
IF any axis = CRITICAL_FAIL  → final = CRITICAL_FAIL
ELSE IF any axis = FAIL OR REJECTED OR NON_COMPLIANT  → final = FAIL
ELSE IF any axis = WARN OR NEEDS_REVIEW OR PARTIAL  → final = WARN
ELSE IF all axes = PASS OR COMPLIANT  → final = PASS
ELSE IF any axis = UNKNOWN AND no other axis flagged  → final = UNKNOWN
```

### UNKNOWN handling (critical)

- `UNKNOWN` does NOT override `WARN` or any FAIL-class verdict
- `UNKNOWN` matters only when it would otherwise be `PASS` — a missing evaluation is NOT a passing evaluation; surface as `UNKNOWN` in the final merged verdict if no other axis flagged
- Always surface `UNKNOWN` axes EXPLICITLY in the findings table with the reason the evaluation could not run (skill unavailable, tool offline, scope out-of-band)

## Step 7 — Findings table

Emit a markdown table to the chat output:

```markdown
## /review Findings (final verdict: {VERDICT})

### Per-axis summary

| Axis | Verdict | Finding count |
| --- | --- | --- |
| brain:🧠-architect | PASS | 0 |
| brain:🧠-qa | WARN | 2 |
| brain:🧠-security | PASS | 0 |
| code-qualities-assessment | PASS | 0 |
| incoherence | WARN | 1 |
| orphan-ref-validator | UNKNOWN | n/a (tool absent; INFO coverage-note) |
| markdown-lint | PASS | 0 |
| biome-lint | n/a (no biome.json) | n/a |

### Findings

| Sev | Axis | Finding | Evidence | Suggested action |
| --- | --- | --- | --- | --- |
| WARN | qa | Missing test for {behavior X} | `src/foo.ts:42` | Add test case in `__tests__/foo.test.ts` covering X |
| WARN | qa | Edge case {Y} not covered | `src/bar.ts:88` | Add test case for Y |
| WARN | incoherence | README mentions function Z but Z renamed in code | `README.md:120` vs `src/z.ts:5` | Update README or revert rename |
```

Structured report block for downstream consumers (e.g., /end Step 5):

```text
review_verdict: WARN
review_per_axis: {architect: PASS, qa: WARN(2), security: PASS, code-qualities: PASS, incoherence: WARN(1), orphan-ref: UNKNOWN, markdown-lint: PASS, biome-lint: n/a}
review_findings_count: {CRITICAL_FAIL: 0, FAIL: 0, WARN: 3, INFO: 1}
review_mode: self-review
review_tier: TIER_3
review_pr_type: CODE
```

## Halt blocks

All halts use Contract 3 with `review-<step>-halt` info-string:

````text
```review-<step>-halt
trigger: <step identifier>
question: <what the halt is checking>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed>
deferral: <how to resume after addressing>
```
````

Inventory:

| Halt | Trigger | Resolution |
|---|---|---|
| `review-step1-tier-undefinable-halt` | Step 1 cannot classify tier (e.g., diff empty, unparseable) AND no PLAN binding | User manually annotates tier; re-invoke /review with `tier=` override |
| `review-step6-critical-fail-halt` | Merged verdict is `CRITICAL_FAIL` | Surface findings; block downstream gating (esp. /end Step 4 PR creation); address findings; re-run /review |
| `review-step4-skill-error-halt` | Skill-axis tool errored mid-run (not just absent — actually crashed) | Surface error; user adjudicates retry / skip / halt |

Coverage notes (INFO; non-BLOCKING):

| Coverage note | Trigger |
|---|---|
| `review-step4-gate3-coverage-note` | `orphan-ref-validator` absent at both Brain locations | Document gap; CONTINUE; same path as /build Gate 3 (port from upstream if Peter wants to make BLOCKING) |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping reviewer-asymmetry framing in agent briefs | "Looks good" returns are useless | Agent brief MUST include "review as a stranger; cite evidence; looks-good is a failure mode" |
| Running all 8 axes regardless of PR type | Wastes effort on irrelevant axes (e.g., security agent on DOCS PR) | Adaptive PR-type selection per Step 2 table |
| Treating UNKNOWN as PASS | Missing evaluation is NOT passing evaluation | Surface UNKNOWN explicitly with reason |
| Self-review mode with full adversarial framing at Tier 1-2 | Wastes effort on trivial changes | Self-review Tier 1-2 trusts upstream gates |
| Review-others mode with reduced framing at Tier 1-2 | Reviewer has no context; adversarial framing essential | Review-others mode ALWAYS uses full adversarial framing |
| Verdict merging that lets UNKNOWN override WARN | Loses real WARN signal | UNKNOWN never overrides WARN or FAIL |
| Auto-fixing in /review (e.g., markdown-lint `--fix`) | /review is read-only; fixes are /build's job | Markdown-lint runs without `--fix` in review mode |
| Skipping per-axis caching on resume | Re-running the same axis on the same diff wastes effort | Cache verdicts per diff hash; skip on resume |
| Emitting findings without file:line evidence | Vague findings get rejected; users can't act | Every finding cites `file:line` (or wikilink for Brain entity findings) |
| Pushing /review verdict to /end without halt-block format | /end Step 3 expects machine-parseable halt on FAIL | Always emit halt block per Contract 3 schema |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched, check `~/.claude/skills/<name>/SKILL.md` first; if absent, check Brain plugin path. Never fall back to ai-agents.

**Skills (Skill dispatch):**

- `brain:---code-qualities-assessment` → Brain plugin (Step 4 skill axis)
- `brain:---incoherence` → Brain plugin (Step 4 skill axis — substitutes for absent `doc-accuracy`)

**Agents (Task dispatch):**

- `brain:🧠-analyst` → Brain plugin (Step 1 tier classification)
- `brain:🧠-architect` → Brain plugin (Step 3 agent axis)
- `brain:🧠-qa` → Brain plugin (Step 3 agent axis)
- `brain:🧠-security` → Brain plugin (Step 3 agent axis)

**ABSENT (coverage gap; INFO; non-BLOCKING):**

- `orphan-ref-validator` → not present. Step 4 emits coverage-note; CONTINUE. Same gap as /build Gate 3.

**EXCLUDED**: `golden-principles`, `taste-lints` (Brain not aligned).

### Role of /review in the rigid cycle

> /review provides multi-axis validation against the diff under inspection. Adds a checkbox-vs-diff cross-check axis: for every TASK / REQ / DESIGN checkbox claimed `[x]` in the diff, verify evidence in the diff supports the claim (test file added, function defined, behavior asserted). A claim of `[x]` without supporting diff evidence is a P1 finding. Verdicts: PASS / WARN / FAIL with per-axis findings (architect, qa, security, code-qualities, incoherence, orphan-ref, markdown-lint, biome). /review does not run the build cycle; it is defined in `../build/references/per-task-build-qa-cycle.md`.

## Reference files

- `references/review-axes.md` — per-axis detail for all 8 axes; dispatch shape; brief structure (reviewer-asymmetry per agent); verdict-extraction patterns
- `references/verdict-merging.md` — Step 6 merge rules + full verdict enum (10 values) + UNKNOWN handling + finding-aggregation pattern
- `references/adaptive-axis-selection.md` — Step 2 PR-type classification heuristics + per-type axis subset table + Step 1.5 mode detection (self-review vs review-others) calibration
