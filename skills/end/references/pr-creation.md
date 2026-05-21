# PR Creation — Step 4f + Step 5 Next-Session Recommendation

Detailed procedure for Step 4f (push branch + `gh pr create` with template-driven body assembly) and Step 5 (next-session recommendation logic with retrospective trigger threshold heuristics).

## Step 4f — Push branch + create PR

### Push branch

```bash
# Push current branch with upstream tracking
git push -u origin "$(git branch --show-current)"
```

If `-u origin` flag was already set in a prior push: simple `git push` is sufficient.

If push fails (no remote, auth issue, force-required for rewritten history): halt via `end-step4f-pr-creation-halt`; surface the git push error; user diagnoses (typically: configure remote, refresh `gh auth login`, or force-push if rewrite was intentional).

### PR body assembly

The PR body is constructed from:

1. **`.github/PULL_REQUEST_TEMPLATE.md`** (if exists) — base template structure
2. **Session Scope description** — fills in problem/context sections
3. **Per-part outcomes** — fills in changes/deliverables sections
4. **/review verdict + per-axis summary** — fills in review/quality sections
5. **Pre-flight check results** — fills in CI/checks sections

Template-driven assembly:

```text
For each section in PR template:
  Match section header to a known fill-in:
    "## Summary" or "## Description" → Session Scope description
    "## Changes" or "## What's changed" → Per-part outcomes list
    "## Testing" or "## Test plan" → Pre-flight Check 2 results + spec-level TEST-REPORT links
    "## Review" or "## Quality checks" → /review verdict + per-axis
    "## Checklist" or "## Pre-flight" → Pre-flight checks 1-5 results
    "## Related issues" or "## Closes" → Linked Jira/GitHub issues from session
    "## Screenshots" → leave blank (user fills in if applicable)
    "## Breaking changes" → derived from /spec scope-conservation Gate B if applicable
  Otherwise: leave template section header + a "(to be filled in)" placeholder for user
```

### Title assembly

Title format (max 70 chars per git-and-workflow-hygiene principle):

```text
"<type>: <one-line summary>"

Examples:
  "feat: lifecycle skills rework (7 skills + 6 absorbed)"
  "fix: PLAN counter race condition in /plan create"
  "refactor: extract scope-evaluation into shared reference"
  "docs: update CONVENTIONS Section 4.4 with bi-directional rule"
```

Derive `<type>` from session's primary work classification (feat / fix / refactor / docs / chore / test / perf / build / ci / style). Derive `<one-line summary>` from session Scope or PLAN title.

### gh pr create invocation

```bash
gh pr create \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body content per assembly above>
EOF
)" \
  --base main \
  --draft  # optional; user adjudicates draft vs ready
```

Use HEREDOC for body to preserve formatting + markdown.

Optional flags:

- `--draft` if session is partial (e.g., FAIL branch defer-with-rationale chose to close session but defer findings)
- `--label "<label>"` if project has label conventions (e.g., `--label "type: feat"`)
- `--reviewer "<user>"` if session targeted a specific reviewer
- `--assignee "@me"` to auto-assign

### Capture PR URL

```bash
PR_URL=$(gh pr create ... 2>&1 | grep -oE 'https://github.com/[^[:space:]]+')
```

Or use `gh pr view --json url --jq .url` after create. Store the URL for Step 5 report.

### PR creation failure modes

| Failure | Halt | Resolution |
|---|---|---|
| No git remote configured | `end-step4f-pr-creation-halt` | `git remote add origin <url>`; retry |
| Authentication failure | `end-step4f-pr-creation-halt` | `gh auth login`; retry |
| Branch already has PR open | `end-step4f-pr-creation-halt` | Surface existing PR URL; user decides (amend body? leave as-is?) |
| Network error | `end-step4f-pr-creation-halt` | Retry; if persistent, pause session and retry next session |
| Template-section fill-in incomplete | (caught at Step 3.5 Check 4; never reaches here) | n/a |

On halt: keep session status IN_PROGRESS; user can retry /end after fixing the underlying issue (G2 resume picks up at Step 4f, skipping prior PASS sub-steps).

## Step 5 — Next-session recommendation

After Step 4g (session DONE flip), Step 5 emits the structured report. The "Next-session recommendation" section uses /plan's auto-progression result (captured in Step 4e) PLUS the retrospective-trigger heuristic.

### Recommendation logic

```text
IF /plan auto-progression returned "next-ready part: <part-id>":
   recommendation = "/plan PLAN-NNN  (continues with <part-id>)"

ELSE IF /plan auto-progression returned "all parts complete":
   IF retrospective-trigger heuristic fires (see below):
      recommendation = "/retrospective  (significant session; capture learnings)"
   ELSE:
      recommendation = "(workflow complete; no further action needed)"

ELSE IF /plan auto-progression returned "blocked":
   recommendation = "Address blocker on <blocked-part-id> before continuing"
```

### Retrospective-trigger heuristic

Fire the recommendation if ANY of these conditions met:

| Condition | Threshold |
|---|---|
| Session duration | > 2 days (start `created_at` to end `completed_at` in SESSION frontmatter) |
| User-correction count | > 3 corrections logged via `[reflect-capture]` Event entries OR explicit user-flag Events |
| Architectural revision halt | Any halt that required /spec or /decisions revision mid-session (`spec-decomposition-step0-halt`, `decisions-step3.5-*-halt`, etc.) |
| Workflow completion | This is the last build/review/end part of the PLAN |
| Heavy /review findings | /review verdict was WARN with >5 findings OR FAIL/CRITICAL_FAIL |
| Multi-PR merge | Session touched 3+ PRs (rare but indicates complex coordination) |

If multiple conditions fire: surface all reasons in the recommendation:

```text
Next-session recommendation: /retrospective
  - Session duration: 3 days (>2 day threshold)
  - User corrections: 5 (>3 threshold)
  - Workflow complete: this was the last part of PLAN-001
```

User can ignore the recommendation; it's surfaced but not enforced.

### Report format example

```markdown
## Session ended — SESSION-2026-05-19_01-lifecycle-skills-rework

### Pre-flight results

| Check | Result | Notes |
| --- | --- | --- |
| 1. Secret-scan | PASS | brain:---security-scan; 0 matches |
| 2. Tests passing | PASS | `bun test`; 234 tests, 0 failures, 2 skipped (justified) |
| 3. Lint clean | PASS | markdownlint + biome both exit 0 |
| 4. PR description validation | PASS | All 5 template sections present |
| 5. CI workflow health | PASS | 4 workflows well-formed |

### Review verdict

**Final: PASS**

Per-axis:
- brain:🧠-architect: PASS
- brain:🧠-qa: PASS (high coverage)
- brain:🧠-security: PASS
- code-qualities-assessment: PASS
- incoherence: PASS
- orphan-ref-validator: UNKNOWN (tool absent — coverage-note INFO)
- markdown-lint: PASS
- biome-lint: PASS

### PR

https://github.com/peterkloss/brain/pull/42

### Warnings

- orphan-ref-validator coverage gap (tool absent; INFO; consider porting from upstream)
- Estimate divergence: PLAN estimated 5d AI-Dominant; actual 7d (40% over). Documented in PLAN Decision Log per estimate-reconciliation principle.

### Next-session recommendation

**/retrospective** — multiple triggers fired:
- Session duration: 3.5 days (>2 day threshold)
- User corrections: 8 (>3 threshold)
- Workflow complete: this was the last build/review/end part of PLAN-001
- Heavy /review findings: WARN with 7 findings
```

## Stateless invariant (per Q11 RESOLVED)

The structured report is emitted to chat output (and SESSION Event entries). It is NOT:

- Saved as a separate Brain note (e.g., no `QUALITY-DASHBOARD.md`)
- Aggregated across PLANs (no cross-PLAN trend tracking)
- Read by /plan continue mode (no quality-trend influence on next-ready part selection)

If Peter wants quality trends LATER, a separate dashboard skill can read from session notes (no /end aggregation required).

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping PR body assembly from template | PRs ship without required context | Always assemble per template if present (Step 3.5 Check 4 enforces) |
| `gh pr create` without `--base main` if main is not default | PR opens against wrong base | Explicitly specify `--base main` (or project default) |
| Force-push before PR creation | Loses upstream tracking | Push to fresh branch (history rewrite already done if needed) |
| Skipping `--draft` flag for partial sessions | PR appears ready when it isn't | Use `--draft` when session has unresolved warnings or defer-with-rationale closures |
| Auto-invoking /retrospective | User loses agency over retro decision | Surface as recommendation; user invokes |
| Aggregating report across sessions | Violates Q11 RESOLVED (stateless) | Report is per-session only; lives in chat output + SESSION Event |
| Capturing PR URL after Step 5 (too late) | Step 5 report needs the URL inline | Capture at Step 4f; pass to Step 5 |
| Skipping `--label` even when project has label conventions | PR lacks discoverability | Detect project label conventions; apply via `--label` |
| Including `🤖 Generated with Claude Code` or similar AI attribution | Violates the no-AI-attribution principle | Never include AI attribution in commit messages or PR bodies |
