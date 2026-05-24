# Adaptive Axis Selection — PR-Type Classification + Mode + Tier Calibration

Step 2 classifies the PR-type (CODE / DOCS / CONFIG / TEST) and selects the relevant axes. Step 1.5 detects the mode (self-review vs review-others). Together with the tier from Step 1, these three dimensions calibrate axis selection + per-axis adversarial framing.

## PR-type classification (Step 2)

Classify the diff into one of 4 types using file-extension heuristics:

```text
total_files = count of changed files in diff
docs_files = files matching *.md OR files in docs/ directories
config_files = files matching *.json, *.yaml, *.yml, *.toml, *.ini, .env.* OR package.json, biome.json, tsconfig.json, *.config.* OR files in .github/, .vscode/
test_files = files matching *.test.*, *.spec.* OR files in __tests__/, test/, tests/, spec/ directories
code_files = total_files - docs_files - config_files - test_files

IF docs_files / total_files >= 0.8:
   pr_type = DOCS
ELSE IF config_files / total_files >= 0.8:
   pr_type = CONFIG
ELSE IF test_files / total_files >= 0.8:
   pr_type = TEST
ELSE:
   pr_type = CODE   # default; covers mixed diffs OR majority source code
```

The 0.8 threshold catches majority-X diffs while allowing some mixed content. Edge cases:

- Diff with 50% docs + 50% code → CODE (mixed; run all axes)
- Diff with 90% tests + 10% code → TEST (the small code change implies test-driven; run TEST axes)
- Diff with 100% config files → CONFIG
- Diff with 1 file changed (a SKILL.md) → DOCS (single-file heuristic)

If `pr_type=` arg present on invocation: skip classification; use the passed value (allows manual override for ambiguous cases).

## Per-type axis subset

| PR-type | Axes run | Rationale |
|---|---|---|
| **CODE** | All 8 axes | Default — code touches everything; full review |
| **DOCS** | markdown-lint + brain:---incoherence ONLY | Docs-only changes can't have code-quality / test / security issues; the relevant axes are lint + doc-code coherence (which is what incoherence checks) |
| **CONFIG** | brain:---code-qualities-assessment (lite) + biome-lint (if config is TS/JS like biome.json) + brain:🧠-security | Config can introduce: code-quality issues (e.g., overly permissive tsconfig), lint failures, AND security issues (secrets in env, auth misconfig, network exposure). Security agent IS in scope for CONFIG PRs because config is the #1 source of accidental security exposure |
| **TEST** | brain:🧠-qa + relevant lints (markdown + biome) + brain:---code-qualities-assessment | Test code quality matters (tests are first-class code). QA agent for test-strategy review. Skip architect/security (test code rarely has architectural concerns; security only matters if tests touch credentials, which is rare) |

The axis subset is non-negotiable per PR-type — running the wrong axes wastes effort (e.g., security agent on a DOCS PR has no surface to review).

## Mode detection (Step 1.5)

```text
IF invocation has plan=PLAN-NNN arg:
   mode = self-review
   # /end Step 2 invoked /review on the current branch's own diff
   # Auto-self-review before PR creation
ELSE IF invocation has pr=NNN arg:
   mode = review-others
   # User invoked /review directly on an external PR (gh pr diff <NNN>)
ELSE:
   # No mode marker; ask user
   AskUserQuestion: "Self-review (your own changes) or review-others (external PR)?"
```

## Mode + Tier calibration matrix

The mode + tier combination calibrates the adversarial framing intensity in agent briefs (Step 3 architect/qa/security dispatches):

| Mode | Tier | Adversarial framing |
|---|---|---|
| self-review | 1 | LOW — reviewer trusts upstream gates from /build; "if you find no concerns, briefly confirm pattern alignment and pass" |
| self-review | 2 | LOW — same as Tier 1 |
| self-review | 3 | STANDARD — full reviewer-asymmetry; "find at least one concrete concern OR explicitly justify clean pass with cited evidence" |
| self-review | 4 | HIGH — heightened scrutiny; "every claim verified; every change pattern challenged" |
| self-review | 5 | HIGH — same as Tier 4 |
| review-others | ANY | FULL — full adversarial framing regardless of tier; reviewer has not seen author's reasoning; "looks good is a failure mode at all tiers" |

### Why the calibration matters

**Self-review at Tier 1-2 with LOW framing**: a trivial change (1-line fix, typo correction) doesn't need an architect picking apart layer violations that don't exist. LOW framing lets the review pass quickly when there's genuinely nothing to find.

**Self-review at Tier 3+ with STANDARD/HIGH framing**: complex changes deserve adversarial review even when self-authored. Tier 4-5 changes likely affect multiple modules; HIGH framing forces explicit reasoning about cross-cutting concerns.

**Review-others at ANY tier with FULL framing**: external PRs always get full adversarial review. The reviewer has no context on author's intent; "looks good" without scrutiny is the canonical failure mode for external reviews.

## Per-axis brief modulation

The mode + tier feed into Step 3 agent dispatch briefs as a parameter:

```text
brief = generate_brief(axis, pr_type)
brief = append_framing(brief, mode, tier)

# append_framing logic:
IF mode == self-review AND tier in [1, 2]:
   brief += "If you find no concerns, briefly confirm pattern alignment and pass."
ELIF mode == self-review AND tier in [3]:
   brief += "Find at least one concrete concern OR explicitly justify clean pass with cited evidence."
ELIF mode == self-review AND tier in [4, 5]:
   brief += "Heightened scrutiny: every claim verified; every change pattern challenged."
ELSE:  # review-others
   brief += "Full adversarial framing: looks good is a failure mode; surface at least one concrete concern even on strong work."
```

## Tier classification special cases

### Empty diff

If Step 1 cannot classify tier because the diff is empty (e.g., user invoked /review but `git diff main` returns nothing):

```text
```review-step1-tier-undefinable-halt
trigger: Step 1 tier classification
question: Is the diff non-empty?
answer: "no — git diff main returned empty"
test_failed: diff has at least one changed file
deferral: Verify changes are committed. Re-invoke /review after committing changes OR pass tier= override OR specify target=<file|spec> instead of default target=diff.
```
```

### Unparseable diff

If diff is non-empty but tier classifier returns "unable to classify" (e.g., binary-file changes with no text diff): tier defaults to TIER_3 (mid) with a warning surfaced; user can override via `tier=` arg.

### PLAN-bound tier override

If `plan=PLAN-NNN` present AND diff-derived tier diverges from PLAN.complexity_tier:

```text
AskUserQuestion:
  question: "PLAN-NNN has complexity_tier {TIER_X}. Diff-derived tier is {TIER_Y}. Which to use for /review calibration?"
  options:
    1. PLAN tier (Recommended) — more authoritative for self-review
    2. Diff tier — more specific to this exact diff
    3. Other (manual override via tier= arg)
```

Default Recommended: PLAN tier (it was already classified by /research with full context).

## All axes return UNKNOWN edge case

Rare but possible: every axis fails to return a verdict (tool errors, agent timeouts, etc.). Step 6 returns final = UNKNOWN.

The findings table shows every axis as UNKNOWN with per-axis reasons. /end Step 3 sees UNKNOWN merged verdict; treats as non-PASS (doesn't proceed to PR creation); surfaces to user for adjudication.

This case is operationally distinct from CRITICAL_FAIL: nothing is broken; nothing was verified. User adjudicates: retry, skip /review, or fix infrastructure (tool availability, network, etc.).

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping PR-type classification (always run all axes) | Wastes effort on irrelevant axes per type | Adaptive subset per Step 2 table |
| Treating self-review as identical to review-others | Wastes scrutiny on trivial self-changes | Mode + tier calibration matrix |
| Skipping mode detection ask when neither plan= nor pr= present | Default to wrong mode; surprise framing | AskUserQuestion when ambiguous |
| Auto-overriding PLAN tier with diff tier | Loses upstream tier context | PLAN tier wins by default; user adjudicates if mismatch |
| Treating empty diff as PASS | Hides the "user invoked /review with nothing committed" case | Halt via `review-step1-tier-undefinable-halt` |
| Per-axis brief without framing parameter | Same brief regardless of mode/tier | Always apply mode+tier framing |
| 0.5 threshold for PR-type classification | Too permissive; mixed diffs misclassified | 0.8 threshold catches clear majorities; mixed → CODE default |
