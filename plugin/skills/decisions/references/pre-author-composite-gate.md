# Pre-Author Composite Artifact Gate — Tier-Aware Thresholds

The Step 4 gate that BLOCKS composite-ADR authoring when D-N count or estimated ADR line count exceeds tier-aware hard thresholds, so the architect does not spend effort authoring a too-large ADR.

The gate HALTS for a scope decision. It used to force a plan-skill split mode that was never executable, so the only documented exit from a hard block led nowhere. Narrowing scope is the user's call, and a stuck session gets a question rather than an instruction to run something that does not work.

## Why the gate matters

Composite ADRs that exceed thresholds drift:

- The architect compresses to fit reasonable file sizes (detail-parity fails)
- brain:---adr-review struggles to maintain 6-agent consensus on 25+ decisions in a single ADR
- Downstream consumers (spec, build) can't extract clean per-D-N implementation guidance from a 1500+ line document
- Splitting after the fact (post-artifact) is 10x more expensive than splitting before

The gate's job: catch over-threshold parts AT the Step 4 boundary; halt; force split first.

## Threshold table

Hard thresholds BLOCK the architect dispatch. Soft thresholds emit a warning but allow proceed.

| Tier | D-N soft (warn) | D-N hard (block) | ADR line soft (warn) | ADR line hard (block) |
|---|---|---|---|---|
| TIER_1 | >6 | >10 | >400 | >800 |
| TIER_2 | >8 | >10 | >500 | >800 |
| TIER_3 | >12 | >15 | >800 | >1200 |
| TIER_4 | >18 | >25 (composite OK; >40 hard) | >1200 | >1500 (>2200 hard) |
| TIER_5 | >18 | >25 (composite OK; >40 hard) | >1200 | >1500 (>2200 hard) |

Tier 4-5 explicitly allow composite ADRs at higher D-N counts (the "composite OK" range 25-40) because complex architectural decisions naturally cluster. Above 40 D-Ns even at Tier 5, the split escalation triggers.

## How D-N count is measured

Count = number of entries in PLAN-part `d_n_substatus` array where status = LOCKED. PENDING or DEFERRED entries don't count (they won't be in the ADR).

If a part has mixed-status entries (some LOCKED, some PENDING): the gate evaluates the LOCKED count. PENDING entries should be locked first (Step 2 loop) before Step 4 runs.

## How estimated ADR line count is computed

Per-D-N estimate: 50-100 lines per section depending on Tier (Tier 1-2: 50 lines; Tier 3: 70 lines; Tier 4-5: 100 lines) × 11 sub-sections = 550-1100 lines per D-N.

Per-D-N estimate is dominated by:

- Full Rationale (often 30-50% of section length)
- Alternatives Considered (10-20%)
- Failure Modes (10-20%)
- Cross-Wave Implications (5-15%)

Estimated total = (per-D-N estimate × LOCKED D-N count) + overhead (Context + Cross-Cutting + Observations + Relations = ~150-300 lines).

Heuristic: for 10 D-Ns at Tier 3, expect ~800-1000 lines. For 25 D-Ns at Tier 4, expect ~2500-3500 lines (already over the >2200 hard threshold for that tier).

## Gate decision tree

```text
input: LOCKED D-N count + estimated ADR line count + complexity_tier

IF count > hard threshold for tier OR estimated lines > hard threshold for tier:
   → HALT decisions-step4-halt (severity FAIL)
   → emit halt-block with:
       trigger: Step 4 pre-author-composite-artifact gate
       question: Is the composite ADR within tier thresholds?
       answer: "no — {count} D-Ns / {estimated lines} lines exceeds hard threshold for TIER_N"
       test_failed: D-N count OR ADR line count over hard threshold
       deferral: HALT for a scope decision. Surface the D-N list grouped by affinity and ask which groups are separate decisions parts. Nothing is restructured without an answer.

ELSE IF count > soft threshold for tier OR estimated lines > soft threshold for tier:
   → emit warning (not halt): "Over soft threshold ({count}>{soft})."
   → ask user via AskUserQuestion: narrow the part now (safer), or proceed as one composite ADR?
   → if user chooses proceed: record the choice as an Event and continue to Step 5
   → if user chooses to narrow: HALT same as the hard threshold case

ELSE:
   → gate-passed marker added to PLAN-part; proceed to Step 5
```

## Soft-threshold warning AskUserQuestion

```text
Question: "decisions.{N} has {count} LOCKED D-Ns ({estimated_lines} line estimate) at TIER_N. Soft threshold ({soft_count}) exceeded; hard threshold ({hard_count}) not yet hit. Proceed with composite ADR or split first?"

Options:
  1. Narrow the part first (Recommended when count is closer to hard than soft)
     — Say which D-Ns group together; each group becomes its own decisions part
     — Re-run /decisions per part; each gets a smaller ADR
     — Trade-off: more parts; more parallel ADR-review gates
  2. Proceed with one composite ADR (acceptable when count is closer to soft than hard)
     — Continue to Step 5 architect dispatch
     — Record the choice as an Event on the session, naming the count it was made at
     — Trade-off: larger ADR; possible detail-parity strain
  3. Re-evaluate tier (when soft threshold is tripping persistently — maybe tier should be higher)
     — Update PLAN frontmatter complexity_tier
     — Re-run Step 4 with new tier's thresholds
     — Trade-off: tier escalation has downstream effects (calibration changes in /spec, /build, /review)
```

## Split escalation flow

When the gate hard-halts (or user chooses split on soft warning):

1. Emit the halt block and surface the D-N list, grouped by affinity as a proposal
2. The user says which groups are separate decisions parts — a scope decision, not a mechanical one
3. Author the additional parts against that answer; the original keeps the group that stays with it
4. Re-invoke `/plan PLAN-NNN` to continue; continue mode picks the next ready part
5. `/plan` auto-routes to `/decisions` for it

If a decisions part has grown so large that its NOTES need restructuring rather than its scope, that is `decompose`'s job and it is invoked directly on the note. The plan skill is for plan status and sequence; it does not do note surgery.
7. `/decisions` runs Step 1-9 for the sub-part (which now has fewer D-Ns within thresholds)

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping the gate because "the ADR will be fine" | 25 D-Ns at Tier 3 = >1200 line ADR = detail-parity fails + adr-review struggles | Always run the gate; trust the threshold table |
| Counting PENDING D-Ns toward the threshold | PENDING entries won't be in the ADR | Count only LOCKED entries |
| Estimating ADR lines based on existing ADRs of similar D-N count | Existing ADRs may have been compressed; bad reference | Use the per-D-N × tier heuristic (50-100 lines × 11 sub-sections × D-N count) |
| Proceeding past hard threshold "just this once" | Sets a precedent; future parts also "just this once" | Hard threshold is non-negotiable; narrow the part first |
| Narrowing at soft threshold without user agency | User may have legitimate reasons to proceed | Soft threshold = AskUserQuestion; user adjudicates |
| Tier escalation to bypass thresholds | Tier should reflect actual complexity, not gate-bypass convenience | Re-evaluate tier honestly; if D-N count legitimately reflects Tier 4 work, the tier was undersized in /research |
| Narrowing a too-large part WITHOUT running the gate first | Wasted scope conversation if the part was actually within thresholds | Run the gate first; narrow only when it halts (hard) or the user chooses to (soft) |
| Composite ADRs without the gate at Tier 4-5 | Composite is allowed at 4-5 BUT only up to 25-40 D-Ns | Even at Tier 5, >40 D-Ns hard-halts; gate still applies |

## Tier 4-5 composite allowance rationale

Tier 4-5 work (staff / principal complexity) often produces clusters of interdependent decisions that lose meaning when split. Splitting a 25-D-N Tier 5 ADR into 5 sub-ADRs of 5 D-Ns each creates:

- 5 separate adr-review gates (5x review cost)
- Cross-ADR coupling (decisions in sub-ADR-1 reference decisions in sub-ADR-3)
- Loss of single-document discoverability

So Tier 4-5 allows composite up to 25-40 D-Ns. The 40 hard threshold catches genuinely too-broad parts that should split regardless of tier.

The 2200 line hard threshold at Tier 4-5 catches the case where 25-40 D-Ns each go very deep (each D-N section is 100+ lines instead of the typical 60-80) — the ADR becomes operationally unmanageable even if the D-N count is within bounds.
