# End Checklist — DoD Verification + 5 Pre-flight Checks + PASS Sub-Steps

Detailed procedures for /end Step 1 (DoD verification), Step 3.5 (5 pre-flight checks), and Step 4 (PASS sub-steps 4a-4g with atomic-commit ordering).

## Step 1 — DoD verification procedure

For each owning part of the session:

1. Read SESSION note via `mcp__plugin_brain_brain__read_note` → locate `## Scope > **Part(s)**:` rows
2. For each part-id listed: `read_note` on the parent PLAN-NNN
3. Locate the part's body section (`### <part-id>`)
4. Read the `**DoD**:` checklist
5. For each `- [ ]` item OR `- [x]` item OR `- [~]` item:
   - `[x]` → DONE
   - `[~]` → DEFERRED (must have deferral rationale in adjacent text OR in PLAN Decision Log)
   - `[ ]` → INCOMPLETE; halt
6. After all items verified: add `dod_verified: <YYYY-MM-DD>` marker to session frontmatter via `edit_note`

### Halt on incomplete DoD

```text
```end-step1-dod-incomplete-halt
trigger: Step 1 DoD verification
question: Are all DoD items [x] (or [~] with rationale)?
answer: "no — {N} items remain [ ] across {part-ids}: {item descriptions}"
test_failed: DoD-complete check
deferral: Complete the items OR mark [~] with deferral rationale via AskUserQuestion. Re-run /end after fixes.
```
```

User adjudicates per incomplete item: complete it now OR mark deferred OR halt session.

## Step 3.5 — 5 pre-flight checks (detailed)

### Check 1 — Secret-scan

Patterns to detect (regex; case-insensitive):

```text
sk-[a-zA-Z0-9]{20,}                     # Stripe, OpenAI API keys
ghp_[a-zA-Z0-9]{36}                     # GitHub personal access tokens
github_pat_[a-zA-Z0-9_]{82}             # GitHub fine-grained PATs
xoxb-[a-zA-Z0-9-]+                      # Slack bot tokens
xoxp-[a-zA-Z0-9-]+                      # Slack user tokens
password\s*=                             # generic password assignments
aws_secret_access_key\s*=                # AWS secret keys
AKIA[0-9A-Z]{16}                         # AWS access key IDs
api[_-]?key\s*[:=]                       # generic API key assignments
private[_-]?key\s*[:=]                   # generic private key assignments
-----BEGIN.*PRIVATE KEY-----             # PEM private key headers
```

Implementation:

```bash
git diff main | grep -nE \
  '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|xoxb-[a-zA-Z0-9-]+|xoxp-[a-zA-Z0-9-]+|password\s*=|aws_secret_access_key\s*=|AKIA[0-9A-Z]{16}|api[_-]?key\s*[:=]|private[_-]?key\s*[:=]|-----BEGIN.*PRIVATE KEY-----)' \
  2>&1 || true
```

If `Skill(skill="brain:---security-scan")` is available, prefer it (more comprehensive — also detects CWE-22 path traversal + CWE-78 command injection). Fall back to inline grep if absent; emit:

```text
```end-step3.5-check1-coverage-note
trigger: Step 3.5 Check 1 secret-scan
tool_unavailable: brain:---security-scan
reason: skill not at expected Brain plugin path
severity: INFO
deferral: Inline grep used instead; less comprehensive coverage but still catches common credential patterns.
```
```

**On match**: classify each match:

- Real secret committed → REMOVE from diff; if already in history, force-rewrite via `git rebase -i` or `git filter-repo`
- False positive (e.g., regex pattern in a test file expected to match a credential format) → mark with `# nosec` or `// nosec` comment inline + re-run

Re-run check until clean.

### Check 2 — Tests passing

Detect framework from project config files:

| Detection | Command |
|---|---|
| `bun.lock` exists | `bun test` |
| `package.json` has `"scripts": { "test": ... }` | `npm test` (use the project's test script) |
| `pyproject.toml` has `[tool.pytest]` OR `pytest.ini` exists | `pytest` |
| `Cargo.toml` exists | `cargo test` |
| `go.mod` exists | `go test ./...` |
| Project README documents custom test command | Use documented command |

Run the test suite. Capture exit code + summary (passed/failed/skipped counts).

| Outcome | Pre-flight result |
|---|---|
| Exit 0, no failures, no unjustified skips | PASS |
| Exit 0, but tests skipped without justification (e.g., `it.skip` without comment) | WARN — surface; allow continue |
| Exit non-zero (any failures) | FAIL |

For skipped tests: detect via test output parsing. If skip count > 0 AND no `// skip-reason:` or `# skip-reason:` comment adjacent in the test file → flag as unjustified.

If no test framework detected: skip Check 2 entirely (emit info note "no test framework; skipping").

### Check 3 — Lint clean

Run all detected linters:

```bash
npx markdownlint-cli2 "**/*.md"          # NO --fix; verify-only

# If biome.json exists:
biome check .

# If eslint config exists:
npx eslint .

# If ruff config exists in pyproject.toml:
ruff check .

# Per project README's documented lint command, if any.
```

All must exit 0 for PASS. Any non-zero → FAIL.

### Check 4 — PR description validation

Process:

1. Check if `.github/PULL_REQUEST_TEMPLATE.md` (OR `pull_request_template.md` OR `PULL_REQUEST_TEMPLATE/` directory) exists
2. If absent: skip Check 4 (emit info note "no PR template; skipping")
3. If present: read the template
4. Parse out required sections (H2 headers; sections marked with `<!-- required -->` comments if any)
5. Compose the planned PR body (constructed in Step 4f from session + PLAN data)
6. Verify every required section present in the planned PR body

PASS: all required sections present.
FAIL: missing sections → halt with the list of missing sections; surface to user; require PR body amendment.

### Check 5 — CI workflow health

Process:

1. Check if `.github/workflows/` exists
2. If absent: skip Check 5
3. If present: list `*.yml` and `*.yaml` files
4. For each workflow file:
   - YAML-parse (use `yq eval` for offline parse, or `gh workflow list` for online verification)
   - Verify required fields per GitHub Actions schema: `name`, `on`, `jobs`
   - Verify each `jobs.<job-id>` has `runs-on` + `steps`
5. Identify known-blocking workflows:
   - Session-protocol validation workflow (if Brain project) — checks SESSION note compliance; would FAIL if session note malformed
   - Test workflow — would FAIL if Check 2 already FAILed (mutually consistent)
   - Lint workflow — would FAIL if Check 3 already FAILed
6. Surface known-blocking workflows: WARN level if Check 2/3 already FAILed; FAIL level if a workflow has YAML errors

| Outcome | Pre-flight result |
|---|---|
| All workflows well-formed; no known-blocking | PASS |
| Workflows have warnings (deprecated actions, etc.) | WARN |
| YAML errors in any workflow | FAIL |

## Step 4 — PASS sub-steps (4a-4g) atomic-commit ordering

After Step 3.5 returns all PASS, execute 4a-4g in strict order.

### 4a — Commit final session note + PLAN updates

```bash
git add docs/sessions/SESSION-*.md docs/planning/PLAN-*.md
git commit -m "end: final session state for SESSION-YYYY-MM-DD_NN-{slug}"
```

This commit captures any final SESSION Event entries that landed during /end Steps 1-3 + any PLAN updates from Step 4d (which hasn't run yet — placeholder for next-commit).

If no changes (rare; session already up-to-date): skip the commit (`git diff --staged --quiet` returns 0).

### 4b — Markdown lint fix pass

```bash
npx markdownlint-cli2 --fix "**/*.md" "!**/docs/**"
```

Auto-fixes any remaining markdown issues. Common fixes: trailing whitespace, missing newline at EOF, heading-level skips, list-marker consistency.

`docs/**` is excluded and MUST stay excluded: `--fix` rewrites the colon-space inside underscore-titled wikilinks and breaks the targets the knowledge graph resolves on. Step 4a has already committed session and PLAN notes there, so an unscoped `--fix` damages them and 4c commits the damage.

### 4c — Final commit (lint fixes)

```bash
git add . && git commit -m "end: markdown lint fix pass" --allow-empty || true
```

`--allow-empty` because lint fix may not produce changes; we want a clean separator commit either way. `|| true` because if there's nothing to commit, exit code is non-zero but we proceed.

Actually preferred: check first, commit only if changes exist:

```bash
git add docs/*.md *.md
if ! git diff --staged --quiet; then
   git commit -m "end: markdown lint fix pass"
fi
```

### 4d — set-part-done (per owning part)

For each owning part of the session:

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=<part-id> outcome=<wikilink>")
```

Where `<wikilink>` is the canonical outcome artifact for the part (PRD wikilink for research parts; ADR for decisions; SPEC for spec; etc.). Read from the part's body in PLAN (the `**Outcome**:` row should be populated by the phase skill that ran — /end just confirms + invokes set-part-done).

### 4e — Auto-progression (capture next-ready)

After set-part-done lands, /plan returns the next-ready part identifier (or "all parts complete; recommend /retrospective"). /end captures this string for the Step 5 report's "next-session recommendation" line.

### 4f — Push branch + PR creation

See `pr-creation.md` for full PR body assembly. Summary:

```bash
git push -u origin <branch>
gh pr create --title "<title>" --body "<body per template>"
```

If `gh pr create` succeeds: capture the PR URL for Step 5 report.

If fails: halt per `end-step4f-pr-creation-halt`; surface error; user retries or pauses session.

### 4g — Flip session status DONE

Via Brain MCP `edit_note` on SESSION frontmatter: `status: IN_PROGRESS → DONE`. Add `completed_at: <YYYY-MM-DD>` marker.

Final project repo commit:

```bash
git add docs/sessions/SESSION-*.md
git commit -m "end: session SESSION-YYYY-MM-DD_NN-{slug} DONE"
git push
```

The push to remote propagates the final SESSION state to the PR (if PR commits include the SESSION file).

## G2 resume markers

To skip already-done sub-steps on resume, /end uses these markers on SESSION frontmatter:

```yaml
---
title: "SESSION-YYYY-MM-DD_NN: ..."
status: IN_PROGRESS
dod_verified: <YYYY-MM-DD>            # Step 1 marker
review_passed: <YYYY-MM-DD>           # Step 2 marker
preflight_check1_passed: <YYYY-MM-DD> # Step 3.5 markers
preflight_check2_passed: <YYYY-MM-DD>
preflight_check3_passed: <YYYY-MM-DD>
preflight_check4_passed: <YYYY-MM-DD>
preflight_check5_passed: <YYYY-MM-DD>
step4a_commit: <SHA>                  # Step 4 markers
step4d_done: <YYYY-MM-DD>
step4f_pr: <PR URL>
---
```

On resume, /end reads markers; skips sub-steps with markers set.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping DoD verification | Sessions close with incomplete work | Step 1 BLOCKING; halt on any `[ ]` |
| Running Check 1 inline grep when brain:---security-scan is available | Less coverage | Prefer the skill; fall back only if absent |
| Skipping Check 2 because "tests are slow" | Tests prove the work; bypass loses signal | Always run Check 2 unless no framework |
| Skipping Check 4 because "I'll write the PR body manually" | Manual bypass loses template enforcement | If template exists, check is BLOCKING; no manual override |
| Treating Check 5 known-blocking as WARN when it's a real workflow YAML error | Hides real CI break | YAML errors are FAIL; only stylistic warnings are WARN |
| Committing markdown lint fixes BEFORE set-part-done | Wrong ordering; lint commit should bracket the final state | 4a → 4b → 4c → 4d → 4e → 4f → 4g (strict order) |
| Force-rewriting history to remove secrets without coordinating with reviewers | Breaks downstream branches | Coordinate; if PR is local-only, force-rewrite OK; if shared, use BFG repo-cleaner with team coordination |
| Auto-invoking next-ready phase skill after Step 4d | Wastes user agency; current session is ending | Surface as recommendation in Step 5; user invokes manually in next session |
