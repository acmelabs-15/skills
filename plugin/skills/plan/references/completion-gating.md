# Completion gating — verifying a flip before you make it

The rule: a session's wave or phase row cannot flip to `completed` until the PLAN's exit criteria for that wave are all `[x]`. The PLAN is the arbiter; the session follows.

This file is the operational half — how to verify before every flip, what the rule does not mean, and the ways it gets bypassed.

## Verify before every flip

Before changing a session row to `completed`:

1. Open the PLAN that governs the wave or phase.
2. Find that wave's exit criteria.
3. Read each checkbox literally. All of them checked? Continue. Any one unchecked? The session row stays `in_progress`, optionally annotated with which gates are still pending.
4. Only then flip the row, with an Event entry pointing at the QA note, the state propagation, and the regression evidence.

Reading literally is the whole procedure. The failure is never that someone could not find the checkboxes; it is that they inferred completion from something adjacent to them.

## What this rule does not mean

- **It does not gate git commits.** Commits reflect code reality; session-task status reflects plan-sanctioned closure. They are decoupled, and holding commits until a wave closes would be a different and worse rule.
- **It does not make QA pointless.** QA is one gate of several. It is not the complete set.
- **It does not apply below wave granularity.** Intermediate tasks inside a wave follow their own criteria. Only the wave-level rollup is gated on the PLAN.

## The regression gate is a sleeping landmine

Waves after the first re-run every prior wave's exit criteria. So a prior wave that has since drifted — a rollup silently reverted, a `[x]` later un-checked — fails the current wave's regression gate.

Two consequences follow, and the second is the uncomfortable one:

- A prior wave's session task can retroactively stop being complete.
- Session completion is therefore not monotonic. Be prepared to un-check a row.

Rare in practice. The possibility is why the rule exists rather than being a convention.

## How it gets bypassed

Each of these is a real inference someone made, and each skips at least one gate:

| The reasoning | What it skips |
|---|---|
| "The implementer said it was done" | State propagation, QA, and regression |
| "QA passed" | Propagation may not have happened; regression unrun |
| "Propagation ran and QA passed" | Regression, on any wave after the first |
| "This landed before the protocol existed, grandfather it" | Everything. Shipped code is reality; plan-sanctioned completion is a separate act, and a retroactive QA plus propagation plus regression is what closes it |

The pattern in all four is the same: treating a signal that correlates with completion as if it were completion.

## Where the rule came from

A wave's session rows were about to be flipped to `completed` with state propagation still mid-flight and the prior wave's QA never run — so the regression gate was not merely unmet, it was unverifiable. The correction was that a wave is complete when the PLAN says so, not when the work feels finished.
