# Verdict Merging — Step 6 Rules + Full Enum + UNKNOWN Handling

Each /review axis returns a verdict from the canonical enum. Step 6 merges per-axis verdicts into a single final verdict. UNKNOWN never overrides real signals. The merge logic + the UNKNOWN-handling rules are non-negotiable; downstream consumers (/end Step 3 gate semantics) depend on consistent merge behavior.

## Full verdict enum (10 values)

```text
PASS | WARN | CRITICAL_FAIL | REJECTED | FAIL | NEEDS_REVIEW | NON_COMPLIANT | COMPLIANT | PARTIAL | UNKNOWN
```

| Verdict | Meaning | Severity class |
|---|---|---|
| `PASS` | Axis completed successfully; no findings | green |
| `COMPLIANT` | Axis-specific success synonym (some skills use this) | green |
| `WARN` | Axis completed; minor findings worth noting; non-blocking | yellow |
| `NEEDS_REVIEW` | Axis flagged something for human attention; not auto-blocking | yellow |
| `PARTIAL` | Axis ran but couldn't complete (e.g., timeout); partial findings | yellow |
| `FAIL` | Axis failed; should not advance without addressing | red (non-critical) |
| `REJECTED` | Axis explicitly rejected the change | red |
| `NON_COMPLIANT` | Axis-specific failure synonym | red |
| `CRITICAL_FAIL` | Critical issue; absolutely must address before any progression | red (critical) |
| `UNKNOWN` | Axis didn't run successfully (tool absent, error, ambiguous output) | gray |

## Severity class mapping for merge logic

For merge purposes, classify each verdict into severity:

```text
green:          PASS, COMPLIANT
yellow:         WARN, NEEDS_REVIEW, PARTIAL
red:            FAIL, REJECTED, NON_COMPLIANT
red-critical:   CRITICAL_FAIL
gray:           UNKNOWN
```

## Merge algorithm (Step 6)

```text
verdicts = [per-axis verdict for each axis run]

IF any v in verdicts is CRITICAL_FAIL:
   final = CRITICAL_FAIL
ELSE IF any v in verdicts is red (FAIL/REJECTED/NON_COMPLIANT):
   final = FAIL
ELSE IF any v in verdicts is yellow (WARN/NEEDS_REVIEW/PARTIAL):
   final = WARN
ELSE IF every v in verdicts is green (PASS/COMPLIANT):
   final = PASS
ELSE IF every non-gray v is green AND at least one is gray (UNKNOWN):
   final = UNKNOWN
ELSE:
   # mixed UNKNOWN with green → only happens above; should not reach here
   final = UNKNOWN
```

### Examples

```text
[PASS, PASS, PASS]                        → PASS
[PASS, WARN, PASS]                        → WARN
[PASS, FAIL, PASS]                        → FAIL
[WARN, CRITICAL_FAIL, PASS]               → CRITICAL_FAIL
[PASS, UNKNOWN, PASS]                     → UNKNOWN (with surfacing)
[PASS, UNKNOWN, WARN]                     → WARN (UNKNOWN doesn't override)
[PASS, UNKNOWN, FAIL]                     → FAIL (UNKNOWN doesn't override)
[UNKNOWN, UNKNOWN, UNKNOWN]               → UNKNOWN (everything failed to run)
```

## UNKNOWN handling — critical rules

Per D-10 Step 6 UNKNOWN handling rules:

1. **`UNKNOWN` does NOT override `WARN` or any FAIL-class verdict.** A missing evaluation that happens alongside a real WARN/FAIL doesn't elevate the overall verdict; the real signal wins.

2. **`UNKNOWN` matters only when it would otherwise be `PASS`.** A missing evaluation IS NOT a passing evaluation. If 7 axes PASS and 1 returns UNKNOWN, the final verdict is `UNKNOWN`, not `PASS` — because we don't actually know if the 8th axis would have passed.

3. **Always surface `UNKNOWN` axes EXPLICITLY in the findings table** with the reason the evaluation could not run:
   - skill unavailable (e.g., orphan-ref-validator absent → "tool absent at Brain locations")
   - tool offline (e.g., network error reaching external service)
   - scope out-of-band (e.g., agent timed out on a very large diff)
   - ambiguous output (e.g., agent returned conversational text without a verdict marker)

The findings table for an UNKNOWN axis:

```markdown
| Sev | Axis | Finding | Evidence | Suggested action |
| --- | --- | --- | --- | --- |
| INFO | orphan-ref-validator | UNKNOWN: tool absent | (no file evidence; tool unavailable) | Port orphan-ref-validator from upstream to ~/.claude/skills/ to enable this axis |
```

## Why UNKNOWN handling matters

Without these rules:

- **If UNKNOWN counted as PASS**: 1 missing axis would silently let CRITICAL_FAIL-worthy diffs slip through whenever the other 7 axes PASSed. The lifecycle would have a false sense of confidence.
- **If UNKNOWN overrode WARN/FAIL**: 1 missing axis would hide real findings. Equally bad.

The chosen semantics — UNKNOWN surfaces but never overrides — gives the user a complete picture: real signals dominate; missing evaluations are flagged but don't silently suppress findings.

## Per-axis verdict extraction patterns

Each axis tool emits output in its own format. /review parses for verdict markers. Common patterns:

### Skill axes — exit code + output parsing

| Tool | Verdict source |
|---|---|
| brain:---code-qualities-assessment | Parse for "Overall Score: X/10" + per-quality findings |
| brain:---incoherence | Parse for "Coherent" / "Incoherent" verdict; count critical vs minor |
| markdown-lint | Exit code (0 = PASS; non-zero with `--fix`-eligible = WARN; non-`--fix`-eligible = CRITICAL_FAIL) |
| biome check | Exit code + parse for "errors" / "warnings" counts |

### Agent axes — return summary parsing

Agent dispatches return free-form text. Parse for:

1. Final verdict marker (typically a line near the end like "Verdict: PASS" or "Overall: NEEDS_REVIEW")
2. Per-finding severity markers ("CRITICAL", "HIGH", "MED", "LOW")
3. "No concerns" / "Looks fine" patterns (treat as PASS if explicit; treat as suspicious if vague)

Regex examples:

```text
VERDICT_REGEX = /(?:verdict|overall|conclusion):\s*(PASS|WARN|CRITICAL_FAIL|REJECTED|FAIL|NEEDS_REVIEW|NON_COMPLIANT|COMPLIANT|PARTIAL|UNKNOWN)/i

SEVERITY_FINDINGS_REGEX = /^\s*[*-]\s*\[?(CRITICAL|HIGH|MED|LOW)\]?\s+(.+)$/gm

NO_CONCERNS_PATTERNS = [
  /no concerns found/i,
  /looks good/i,
  /everything checks out/i,
  /pattern correctly applied/i,
]
```

If no verdict marker found AND findings list is empty: classify UNKNOWN with reason "agent returned no verdict marker; output may need manual interpretation".

## Finding aggregation

After per-axis verdicts merge, aggregate findings into the structured report:

```text
review_findings_count: {
  CRITICAL_FAIL: count of findings from any axis with CRITICAL_FAIL verdict,
  FAIL: count from FAIL/REJECTED/NON_COMPLIANT axes,
  WARN: count from WARN/NEEDS_REVIEW/PARTIAL axes,
  INFO: count from coverage-notes and UNKNOWN-with-reason entries,
}
```

Findings are sorted by severity (CRITICAL_FAIL first, then FAIL, then WARN, then INFO).

## Halt block on CRITICAL_FAIL

When merged verdict = CRITICAL_FAIL:

```text
```review-step6-critical-fail-halt
trigger: Step 6 verdict merge
question: Did all axes pass at non-critical level?
answer: "no — {count} CRITICAL_FAIL findings across {axis-names}"
test_failed: critical-fail-free verdict merge
deferral: Address each CRITICAL_FAIL finding; commit fixes; re-run /review. Downstream gating (/end Step 4 PR creation) BLOCKED until /review returns non-CRITICAL_FAIL.
```
```

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Treating UNKNOWN as PASS | Missing evaluation hidden as success | UNKNOWN surfaces; never overrides real signals |
| Treating UNKNOWN as FAIL | Real signals get drowned out by tool absence | UNKNOWN only matters when otherwise PASS |
| Custom verdicts outside the 10-value enum | Downstream consumers can't parse | Use only the canonical enum |
| Verdict extraction without regex | Substring matches break on output drift | Use anchored regex per the canonical patterns |
| Skipping the findings-aggregation step | /end can't render the structured report | Always emit findings_count even if all zero |
| Skipping CRITICAL_FAIL halt block | /end Step 3 expects machine-parseable halt | Always emit halt block on CRITICAL_FAIL |
| Custom severity classes | Disagrees with the canonical mapping | Use only the 5 severity classes (green/yellow/red/red-critical/gray) |
