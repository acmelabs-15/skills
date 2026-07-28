# Review Axes — Per-Axis Detail

Eight axes per Q5 Option 2: 5 skill axes (local-only; deterministic; cheap) + 3 critical agent axes (architect / qa / security; parallel; depth where it matters). Each axis section covers: dispatch shape, brief structure (with reviewer-asymmetry framing for agent axes per D-14), verdict-extraction pattern, and per-axis halt semantics.

## Skill axes (Step 4)

### Axis 1 — code-qualities-assessment

```text
Skill(skill="brain:---code-qualities-assessment", args="--changed-only")
```

Assesses 5 foundational code qualities (cohesion / coupling / encapsulation / testability / non-redundancy) against changed files. Returns per-quality scores + findings.

**Verdict extraction**: parse the skill's output for a final verdict marker (typically a summary line at the end). Map to:

- All qualities scored ≥7/10 → PASS
- Any quality scored 4-6/10 → WARN
- Any quality scored ≤3/10 → CRITICAL_FAIL
- Tool error → UNKNOWN

**When fires**: CODE PRs always; TEST PRs (test code quality matters); CONFIG PRs (config-quality applies).

### Axis 2 — incoherence (substitutes for absent doc-accuracy)

```text
Skill(skill="brain:---incoherence", args="--diff-base main")
```

Detects contradictions between documentation and code, ambiguous specs, and policy violations across a codebase. Same intent as upstream `doc-accuracy`: verify docs against code as source of truth.

**Why substitution**: per Contract 9 (REFINED — no ai-agents fallback), `doc-accuracy` is absent from both Brain locations. `brain:---incoherence` is the closest Brain analog with the same intent. Substitution is canonical, not a placeholder.

**Verdict extraction**:

- Coherent (no contradictions found) → PASS
- Minor incoherence (typos, stale terminology) → WARN
- Critical incoherence (code mismatch with docs that would mislead a reader) → CRITICAL_FAIL
- Tool error → UNKNOWN

**When fires**: all PR-types (DOCS PRs especially; CODE PRs catch doc-code drift; CONFIG/TEST PRs catch stale config docs / test naming drift).

### Axis 3 — orphan-ref-validator (ABSENT — coverage-note INFO)

`orphan-ref-validator` is ABSENT at both Brain locations. Per Contract 3 degradation protocol + Contract 9 BLOCKING-flag rule (orphan-ref is NOT BLOCKING for /review):

**Behavior**: emit `review-step4-gate3-coverage-note` severity INFO; CONTINUE. Don't HALT.

**Verdict**: UNKNOWN with reason `tool_absent: orphan-ref-validator`. Surface in findings table with manual-mitigation note ("manual orphan-ref check via grep available; see /build exit-gates.md").

**When fires**: every /review (cheap to attempt; emits coverage-note quickly).

**Porting path**: same as /build Gate 3 — port from upstream to `~/.claude/skills/orphan-ref-validator/` and rewire memory ops to Brain MCP per Contract 9 override clause. After porting, this axis transitions from UNKNOWN/INFO to normal PASS/WARN/CRITICAL_FAIL behavior.

### Axis 4 — markdown-lint

```bash
npx markdownlint-cli2 "**/*.md"
```

**Without `--fix`** — /review is read-only; fixes belong in /build. Just verify; emit findings if any.

**Verdict extraction**:

- Exit code 0 → PASS
- Exit code non-zero with auto-fixable issues → WARN
- Exit code non-zero with non-auto-fixable issues → CRITICAL_FAIL (typically rare for markdownlint)

**When fires**: any PR-type with `*.md` changes. DOCS PRs always; CODE PRs sometimes (when README / inline docs touched).

### Axis 5 — biome-lint (TS/JS)

```bash
biome check .
```

**Without `--apply`** — verify-only, no fixes. Only fires if `biome.json` exists in project root.

**Verdict extraction**:

- Exit code 0 → PASS
- Warnings only → WARN
- Errors → CRITICAL_FAIL

**When fires**: CODE / CONFIG / TEST PRs with TS/JS changes AND `biome.json` present.

## Agent axes (Step 3 — parallel)

All 3 agent axes embed reviewer-asymmetry framing per D-14. Adversarial framing is calibrated per mode (self-review vs review-others) and per tier — see `adaptive-axis-selection.md` Section "Mode + Tier calibration".

### Axis 6 — architect

```text
Task(subagent_type="brain:🧠-architect")
```

#### Standard brief (review-others mode OR self-review mode at Tier 3+)

```text
You are reviewing this diff as a stranger to the work that produced it. You have
NOT seen the implementer's reasoning. Your task is adversarial architectural review.

Surface findings in these categories:

1. **Architectural fit** — Does the change align with the codebase's existing
   patterns? Does it introduce a new pattern when an existing one would have
   worked? Does it follow the established conventions (naming, layering,
   dependency direction)?

2. **Layer violations** — Does the UI talk directly to the data layer (skipping
   the service layer)? Does a domain module import from a UI module (reverse
   dependency)? Does a low-level utility import from a high-level orchestrator?

3. **Boundary leaks** — Are private APIs exposed publicly? Are internal types
   leaked across module boundaries? Is there coupling that breaks containment
   (e.g., reaching into another module's private state)?

4. **Cross-cutting concerns drift** — Does the change introduce inconsistencies
   in cross-cutting patterns (logging, error handling, observability,
   authorization)?

For every finding:
  - Cite file:line evidence
  - Describe the specific concern (not generic "this is bad")
  - Suggest a concrete fix or alternative

"Looks good" is a failure mode. If you genuinely cannot find any concerns,
document why explicitly with file:line evidence — at minimum cite the specific
patterns the change DOES follow that you verified.
```

#### Reduced brief (self-review mode at Tier 1-2)

Trim the adversarial pressure: "If you find no concerns, briefly confirm the change aligns with established patterns and pass."

#### Verdict extraction

- "No concerns" or "all patterns followed" → PASS
- Findings with severity LOW or no severity → WARN
- Findings with severity HIGH or "violates ADR-N" or layer/boundary violation → CRITICAL_FAIL

### Axis 7 — qa

```text
Task(subagent_type="brain:🧠-qa")
```

#### Standard brief

```text
You are reviewing this diff as a stranger to the work. You have not seen the
implementer's test plan. Your task is adversarial QA review.

Surface findings in these categories:

1. **Test coverage gaps** — Are new code paths tested? Are edge cases covered?
   Are failure modes (errors, timeouts, partial failures, retries) tested?

2. **Regression risks** — Does the change break adjacent modules? Does it
   modify shared utilities in ways that affect other callers?

3. **Happy-path bias** — Only happy-path tests added; failure modes
   uncovered (the "tests prove nothing because they only cover the easy case"
   pattern).

4. **Test quality** — Are the tests testing behavior or implementation? Are
   assertions specific enough? Are tests independent (no order dependencies)?

5. **Coverage matrix** — For each acceptance criterion in the related REQ
   notes (if SPEC-bound), is there a corresponding test?

For every finding:
  - Cite file:line evidence
  - Name the specific test gap or quality issue
  - Suggest a concrete test case to add OR a refactor

**CRITICAL for /build output**: when self-review mode + plan binding, the diff
likely came from /build implementer dispatches. Trust the implementer's
QA notes at Tier 1-2 (light adversarial); apply full adversarial framing
at Tier 3+ regardless of self-review mode.

"Looks good" is a failure mode.
```

#### Verdict extraction

- "Coverage complete + no gaps" → PASS
- Minor gaps (one or two missing edge cases) → WARN
- Major gaps (untested code paths, no failure-mode coverage, REQ acceptance criterion without test) → CRITICAL_FAIL

### Axis 8 — security

```text
Task(subagent_type="brain:🧠-security")
```

#### Standard brief

```text
You are reviewing this diff as a stranger. Adversarial security review.

Surface findings in these categories:

1. **OWASP Top 10** — injection (SQL, command, LDAP, etc.), broken auth,
   sensitive data exposure, XXE, broken access control, security
   misconfiguration, XSS, insecure deserialization, components with known
   vulnerabilities, insufficient logging/monitoring.

2. **CWE-class vulnerabilities** — path traversal (CWE-22), command injection
   (CWE-78), use-after-free, integer overflow, race conditions, TOCTOU,
   crypto misuse.

3. **Auth/authz gaps** — missing authentication on a privileged endpoint;
   authorization check happens after the side effect; role assumption that
   doesn't hold; cross-tenant data leakage.

4. **Input validation gaps** — user input flows into a sink (DB, shell,
   filesystem, network) without validation/sanitization.

5. **Secret exposure** — secrets in code, logs, error messages, commit
   history.

6. **Insecure defaults** — features that opt-in to security (e.g., HTTPS) when
   they should opt-out (HTTPS by default; HTTP requires explicit override).

For every finding:
  - Cite file:line evidence + CWE / OWASP category
  - Severity rating (low / med / high / critical)
  - Suggest a concrete fix

**CRITICAL for security-touching diffs** (auth, data handling, network, crypto).
"Looks good" is a failure mode — surface at least one concrete concern OR
explicitly state "no security-sensitive surface in this diff" with file:line
verification.
```

#### Verdict extraction

- "No security issues" + acknowledged review of security-sensitive paths → PASS
- LOW or MED severity findings → WARN
- HIGH or CRITICAL severity findings → CRITICAL_FAIL

## Axis execution order

Step 3 (agent axes) and Step 4 (skill axes) can run in parallel OR sequentially. Recommended: dispatch Step 3 agent axes in parallel (one batch), then run Step 4 skill axes sequentially (each is fast). The total wall-clock is bounded by the slowest agent dispatch (typically 30-90s) + skill axes (5-15s total).

If wall-clock matters more than output ordering: run ALL axes in parallel (agents + skills). Otherwise: agents in parallel, skills in sequence after agents return.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping reviewer-asymmetry framing in agent briefs | "Looks good" returns are useless | Brief MUST include adversarial framing |
| Auto-fixing in skill axes (markdown-lint --fix, biome --apply) | /review is read-only | Verify-only; fixes are /build's job |
| Treating skill-tool absence as PASS | Missing evaluation is NOT passing | UNKNOWN with reason |
| Per-axis dispatch without diff hash for caching | Re-running wastes effort on resume | Cache per diff hash |
| Findings without file:line evidence | Vague findings get rejected | Every finding cites file:line |
| Verdict extraction by string match without enum | Subtle output drift breaks extraction | Use regex against the full enum (10 values) |
| Running all 8 axes regardless of PR-type | Wastes effort on irrelevant axes | Adaptive PR-type subset per Step 2 |
