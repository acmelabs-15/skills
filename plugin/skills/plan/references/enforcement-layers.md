# Where a phase protocol is actually enforced

A protocol stated in one place gets bypassed. That much was established the hard way: the per-TASK build-and-QA cycle existed in pieces across several documents, and the orchestrator still skipped it thirty times in a day.

The conclusion drawn at the time was "state it in more places." This file is the revised version, because that conclusion was wrong in a specific and testable way.

## Restating is not enforcing

Prose does not enforce anything. It informs a reader who is already looking at it, which is exactly the reader who was not going to violate the protocol. The thirty violations happened with the protocol written down in four places.

What enforces is a layer that can **refuse**. A schema that rejects a malformed note, a validator that fails a claim, a compiler that will not build, a test that goes red. Those act whether or not anyone reads them, and they act at the moment of the mistake rather than in a review afterwards.

Measured, from the work that produced this file:

- A schema requirement caught a status value no enum admitted, on a real note that had been unparseable for months.
- The compiler caught a dead code path that had been documented as a live feature — it was unreachable by type, so it could have been surfaced at any point.
- A plugin validator caught a frontmatter change that would have made a skill load with every field silently dropped, so it would never have triggered at all.
- A test caught a rule being written that contradicted a rule already written, in the same file, one hour apart.

None of those were caught by prose. Several of them were caught *despite* prose asserting the opposite.

## The layers, in order of how much they carry

| Layer | What it can do | Weight |
|---|---|---|
| **Schema** | Refuse a note that does not conform; refuse a claim that contradicts its own checkboxes | Load-bearing |
| **Renderer** | Generate the required structure so malformed output is not expressible | Load-bearing |
| **Tests** | Fail when behaviour drifts from what was decided, including when the drift is a plausible-looking improvement | Load-bearing |
| **Skill body** | Tell an operator the ordered sequence and its gates | Supporting |
| **Reference files** | Carry the detail the skill body would drown in | Supporting |

Supporting layers are worth having. They are how a person learns the protocol at all. They are not where the protocol is *kept* — if the schema and the skill body disagree, the schema is what happens.

## Enforce on write, not on read

This is the distinction that decides where a rule goes, and getting it wrong is expensive in a way that looks like rigour.

**On write** means the rule runs when something is created or changed: a mutation that will not accept a missing field, a status transition that will not proceed without its context. Nothing pre-existing can fail it, because the rule only sees new writes. This is where a rule belongs by default.

**On read** means the rule runs when something is parsed. It applies retroactively to every artifact ever written, and that is usually a mistake rather than thoroughness. Three attempts at read-time enforcement during this work each had to be reverted:

- Requiring a verbatim decision text on every locked decision failed 45 tests and would have failed every real plan note, because decisions locked before the field existed have none.
- Requiring canonical part ids rejected 17 of 52 real parts. One bad id fails its whole document, so five of seven plans could not be read at all — and a document that will not parse cannot have any of its real state validated either.
- Requiring session frontmatter keys would have failed ten real session notes to enforce a convention on notes already written.

In each case the rule was right and the placement was wrong. Moved to the write edge, they prevent the gap. Left at the read edge, they only punish history.

The exception is a state something transitions *into*. Requiring a blocked part to name what blocks it is safe at read time, because there is no corpus of already-blocked parts a new requirement could retroactively fail.

## Report rather than reject, when history is at stake

Where a rule cannot be enforced on write and cannot fail existing artifacts, it becomes a report: parse succeeds, and the non-conforming thing is surfaced as a finding.

That is strictly better than the alternative it replaced. A rejected document is opaque — nothing inside it gets validated, including the parts that were fine. A reported finding names the specific problem while everything else still works.

## What the PLAN is not

The PLAN is not the dispatch-brief carrier. An earlier version of this rule claimed the plan renderer generates workflow items with full instruction blocks pulled verbatim from linked TASK, REQ and DESIGN checkboxes, and concluded that agent files therefore need no updates.

That was false in a checkable way. The renderer reads no linked note; it renders what is in the plan model. A build workflow item has no free-text field at all — the only brief-shaped name on it holds an event number. So there was never a rendered instruction block, and the conclusion built on it does not hold.

What the plan's workflow items actually are, and what they are good for: a derived per-TASK progress rollup. That is a real and working function. An agent's brief comes from the TASK note and the notes it references, not from the plan.

## When you define or change a phase

1. Define the sequence: every transition, who acts, what state changes.
2. Express what can be mechanically checked as a schema, and decide for each rule whether it enforces on write or reports on read.
3. Make the renderer generate the required structure, so malformed output is not expressible.
4. Write the ordered sequence and its gates into the skill body, and the detail into a reference file.
5. Write the tests. Not last because they matter least — last because by now you know what the rule is, and a test written before that is a test of an intention.

A phase whose protocol lives only in prose will be bypassed under load. A phase whose protocol lives in a schema, a renderer and a test will not, and the prose then does its real job: telling a person why.
