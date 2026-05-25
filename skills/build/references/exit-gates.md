# Exit Gates — Step 7 Mandatory Gates + Gate 5 Conditional

Four MANDATORY exit gates + one CONDITIONAL gate (Gate 5 per Q10 resolution) run after Stage C completes. ALL pass to declare /build DONE. Findings on any BLOCKING gate halt the build cycle; address findings in this same /build invocation. "I'll fix in review" is NOT acceptable rationale.

## Gate 1 — Code qualities assessment

```text
Skill(skill="brain:---code-qualities-assessment", args="--changed-only")
```

Assesses the 5 foundational code qualities (cohesion, coupling, encapsulation, testability, non-redundancy) against changed files only.

| Outcome | Action |
|---|---|
| PASS | Continue to Gate 2 |
| WARN | Surface findings; CONTINUE (warnings don't halt) |
| CRITICAL_FAIL | HALT via `build-step7-gate1-halt`; address findings; re-run Gate 1 |

Gate 1 is BLOCKING on `CRITICAL_FAIL`; WARN findings are surfaced but allow continue.

## Gate 2 — Doc-code incoherence detection (substitutes for doc-accuracy)

```text
Skill(skill="brain:---incoherence", args="--diff-base main")
```

**Why incoherence substitutes for doc-accuracy**: per Contract 9 (REFINED no ai-agents fallback), the `doc-accuracy` skill is ABSENT from both Brain locations (~/.claude/skills/ and Brain plugin path). The closest Brain analog is `brain:---incoherence` — detects contradictions between documentation and code, ambiguous specs, and policy violations across a codebase. The intent is identical: verify docs against code as source of truth.

| Outcome | Action |
|---|---|
| Coherent (PASS) | Continue to Gate 3 |
| Minor incoherence (WARN) | Surface findings; CONTINUE |
| Critical incoherence (FAIL) | HALT via `build-step7-gate2-halt`; address findings; re-run Gate 2 |

If `brain:---incoherence` also becomes absent later: emit `build-gate2-coverage-note` severity FAIL per Contract 3 (BLOCKING — Gate 2 is mandatory; the substitute must be available).

## Gate 3 — Orphan reference validation (COVERAGE GAP)

`orphan-ref-validator` is ABSENT from both Brain locations. Per Contract 9 BLOCKING-flag rule + Contract 3 degradation protocol, since orphan-ref-validation is NOT marked BLOCKING for /build, emit a coverage-note (severity INFO) and CONTINUE.

### Coverage-note emitted

````text
```build-gate3-coverage-note
trigger: Step 7 Gate 3 orphan-ref-validator
tool_unavailable: orphan-ref-validator
reason: skill not at ~/.claude/skills/ or Brain plugin path
severity: INFO
deferral: Gate 3 SKIPPED. Orphan references (e.g., references to non-existent skills, scripts, file paths, line numbers, counts in artifacts) NOT detected for this build. To make Gate 3 BLOCKING, port orphan-ref-validator from upstream to ~/.claude/skills/orphan-ref-validator/ OR substitute with a Brain-side alternative.
```
````

### Manual mitigation while Gate 3 is INFO

While the gate emits coverage-note, manual orphan-reference checks can run on demand:

- `grep -rn "Skill(skill=\"" {changed files}` — list dispatched skills; manually verify each exists
- `grep -rn "Task(subagent_type=\"" {changed files}` — same for agents
- `grep -rn "\.md\(:line\)?" {changed files}` — list referenced file paths; verify each exists
- Brain MCP search for `[[wikilink]]` references in any new Brain notes → verify targets exist

These manual checks are NOT a substitute for an automated gate; they catch orphans on a best-effort basis until orphan-ref-validator is ported.

### Path to making Gate 3 BLOCKING

If Peter wants Gate 3 to become BLOCKING in the future:

1. Port `orphan-ref-validator` from upstream (likely the ai-agents version) to `~/.claude/skills/orphan-ref-validator/`
2. Adapt: rewire any Serena/Forgetful memory operations to Brain MCP per Contract 9 override clause
3. Update /build SKILL.md + this reference: change "ABSENT at Brain locations" to "→ Brain user-level path"; update Gate 3 table row from "Emit coverage-note ... CONTINUE" to standard PASS/WARN/CRITICAL_FAIL behavior with `build-step7-gate3-halt` BLOCKING on CRITICAL_FAIL

## Gate 4 — Lint pass

For markdown files in changed set:

```bash
npx markdownlint-cli2 --fix "**/*.md"
```

`--fix` auto-fixes most issues in place. After fixes land, re-stage + amend the commit (or create a new lint-fix commit).

For TS/JS files if `biome.json` exists in project root:

```bash
biome check --apply .
```

Auto-fixes apply. Any remaining errors (not auto-fixable) → HALT via `build-step7-gate4-halt`; fix manually; re-run Gate 4.

For other project linters detected from config:

- `eslint --fix` if `.eslintrc*` present + biome not preferred
- `ruff check --fix` if `pyproject.toml` has ruff config
- `cargo clippy --fix` if `Cargo.toml` present
- Custom project linters per `package.json` scripts

Skip Gate 4 if no markdown changes AND no code linter configured (rare).

## Gate 5 — Prompt-engineer review (CONDITIONAL per Q10)

Per Q10 RESOLVED: Gate 5 fires when ANY changed file contains prompt-like content.

### Q10 trigger-detection heuristics

Detect prompt-like content via filename match OR content patterns:

#### Filename match (deterministic)

Always fires Gate 5 when changed files include:

- `**/SKILL.md` (Skill definition)
- `**/skills/**/SKILL.md` or `**/skills/**/*.md` (skill content)
- `**/agents/**/*.md` (agent definition)
- `**/commands/**/*.md` (slash command definition)
- `**/hooks/**/*.{md,sh,ts,js,py}` (hook scripts/configs that emit prompts)
- `**/.claude/agents/**/*.md`, `**/.claude/skills/**`, etc. (Claude-config layout)
- `${CLAUDE_PLUGIN_ROOT}/**` per plugin convention

#### Content-pattern match (heuristic)

For code files NOT matching the above paths, scan for prompt-like content:

```text
Trigger Gate 5 if changed file contains ANY of:

  1. Multi-line string >10 lines containing structured instructions
     (numbered steps, bulleted directives, role markers like "you are X")

  2. Skill() or Task() invocations with multi-line args:
     - Skill(skill="...", args="<multi-line>")
     - Task(subagent_type="...", prompt="<multi-line>")

  3. Anthropic SDK / Claude API patterns:
     - messages.create({system: "<long>", ...})
     - role: "system" in messages array
     - Anthropic({systemPrompt: ...})

  4. Inline LLM-instruction strings:
     - const systemPrompt = `<multi-line with imperative verbs>`
     - const instructions = "<multi-line>"
     - template literals embedded in agent dispatch wrappers
```

Implementation note: a Bash grep heuristic for the content patterns can be cheap:

```bash
# Pseudo-detection (refine per project)
if git diff --name-only main | xargs grep -lE \
  'Skill\(skill=|Task\(subagent_type=|role: ["\x27]system|systemPrompt|messages\.create' \
  2>/dev/null | head -1; then
  GATE5_TRIGGER=true
fi
```

If Gate 5 triggers:

```text
Skill(skill="brain:---prompt-engineer")  # in review mode
```

Brief passes the prompt-like content + adversarial framing ("review as a stranger; surface prompt-engineering issues including ambiguous directives, missing role context, unclear acceptance criteria, conflicting instructions, drift from Brain's prompt patterns").

| Outcome | Action |
|---|---|
| PASS | Continue to Step 8 |
| WARN | Surface findings; CONTINUE |
| CRITICAL_FAIL | HALT via `build-step7-gate5-halt`; address findings; re-run Gate 5 |

### Why Gate 5 matters specifically for Brain

Brain lifecycle skills ARE system prompts. A Brain dispatch like `Skill(skill="plan", args="set-part-done plan=PLAN-NNN ...")` carries prompt-shaped args that determine downstream agent behavior. Code that builds prompts (via templates, SDK calls, or skill/agent definitions) is prompt-shaped. Gate 5 catches prompt drift in the dispatch layer too, not just in agent/skill file authoring.

Without Gate 5, prompt drift compounds silently — a vague brief in one Skill() call leads to drifted agent output, which gets compressed by another agent, which gets executed by an implementer that misses the original intent.

## Gate execution order + parallelism

Gates run sequentially in the order 1 → 2 → 3 → 4 → 5 (conditional). Each gate's completion gates the next. Rationale:

- Gate 1 (code quality) often surfaces issues that affect docs (Gate 2) — fixing code first means docs catch up
- Gate 2 (incoherence) verifies docs match code — must run after Gate 1 fixes land
- Gate 3 (orphan-ref coverage-note) is informational; runs anytime
- Gate 4 (lint) is the deterministic cleanup pass — runs near the end
- Gate 5 (conditional prompt review) runs last because it requires the diff to be stable

No parallelism between gates — each waits for the prior to complete + any fixes to land.

## Re-running gates after fixes

When a gate halts and you address the finding:

1. Fix the issue (code change, doc update, etc.)
2. Commit the fix (per the two-step edit pattern if Brain notes touched)
3. Re-run the failed gate from scratch (not just the changed files; the gate's tool decides what scope to assess)
4. If PASS: proceed to next gate. If FAIL again: halt + escalate to user if 3+ fix iterations.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Running gates per-TASK | Gates are spec-level; per-task QA is Step 4c | Gates run ONCE per /build after Stage C |
| Deferring gate findings to "next review" | Defeats the iteration-paradox prevention | Address findings IN this /build cycle |
| Treating coverage-note (INFO) as a blocker | orphan-ref Gate 3 is INFO; non-BLOCKING per Contract 9 | Document gap; CONTINUE; flag for porting |
| Skipping Gate 5 because "diff is just code" | Brain skills + dispatch briefs ARE prompts; code that builds prompts is prompt-shaped | Run Q10 heuristic detection; trigger Gate 5 when content-pattern fires |
| Auto-fixing without re-running the gate | Fixes might introduce new issues | Always re-run the gate after fix; verify PASS before next gate |
| Skipping Gate 2 because "the substitute is fine" | brain:---incoherence is a genuine substitute, not a "fine enough" placeholder | Run Gate 2 normally; treat substitution as canonical (it's the Brain-aligned doc-code verification) |
| Suppressing markdownlint output to "fix in next PR" | Lint debt compounds | Auto-fix in place; commit the fix |
| Skipping the Q10 trigger heuristic on code files | Misses prompt-engineering issues in dispatch layer | Run heuristic on every code-file change; trigger Gate 5 when fired |
