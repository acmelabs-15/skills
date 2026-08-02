---
title: "ANALYSIS-010: Fiction Dispositions for the PLAN Data Model"
type: analysis
permalink: analysis/analysis-010-fiction-dispositions-for-the-plan-data-model
tags:
- analysis
- fictions
- plan-data-model
- audit
- composition
---

## Overview

A fiction is a spec, schema or documented behaviour that no code implements and no artifact honours. Nine were assigned to the PLAN data-model work. Each is `implement`, `delete` or `explicitly accept` — there is no fourth option, and "documented and moved on" is not one of them.

Recorded here because the fixes landed across nine commits, and a disposition that lives only in a commit message is hard to audit later.

Status: DONE. All nine dispositioned.

## Dispositions

| # | The claim | Reality | Disposition |
|---|---|---|---|
| FIC-2 | The PLAN schema reference self-declares "Authoritative schema", including six per-part H4 scaffolds and a `d_n_substatus.decision` field | The H4s were emitted and read by nothing; the verbatim-decision field did not exist | **implement + delete** — `decision` added to schema, mutation and renderer; the six scaffolds deleted |
| FIC-4 | `validateIntegrityFloor` is live, per a comment advertising "runtime validates <=50% of source lines" | Three invocations, all in one test file; no production caller | **implement** — wiring is the adapter-hardening step's |
| FIC-10 | The adapter safely splits a PLAN | It slices without losing bytes and cannot tell whether the result is still a PLAN — no note schema runs in the decompose path, so referential checks never fire and no cycle detection exists | **explicitly accept, scoped** — the limitation now stated in the adapter's own docstring rather than left as an absence that reads as a guarantee |
| FIC-11 | Tasks, Pending User Decisions and Editor Mirror IDs are part of the model | Present in 0 of 7 of the owner's PLANs; populated and test-asserted in this repo's own | **explicitly accept, narrowed + delete** — Tasks and Pending User Decisions kept with the rule narrowed to SPEC tasks; Editor Mirror IDs deleted across 29 sites |
| FIC-14 | Contract 1 (`set-part-done`) is the legal phase-completion signal | Every documented invocation exited 2 | **implement** — a call copied verbatim from any of the four doc sites now executes and exits 0 |
| FIC-15 | Mechanical enforcement protects PLAN operations | Never executed against the owner's seven PLANs; passes against this repo's own via the migration test | **explicitly accept, scoped** — five of seven now parse; the two that do not are correctly rejected rather than accommodated |
| FIC-16 | The renderer "regenerates the two derived sections" | It regenerates the entire document, and unmodelled sections used to vanish | **implement** — unknown sections preserved verbatim, both misleading docstrings corrected |
| FIC-32 | Adapter seam metadata is honoured | No method body in any adapter read any of the three fields — grep-confirmed at zero | **delete**, with one carve-out below |
| FIC-33 | `PlanAdapter.extractBySectionName` does heading-aware extraction | Unreachable by TYPE: the cluster range is a line range and the interface declares the parameter as one, so no caller could pass a section name | **delete** — branch and helper removed at the cluster layer, not just in wording |

## FIC-32's carve-out, because the split matters

Three camelCase fields were declared abstract on the base markdown adapter, forcing every subclass to supply them, and no method body anywhere read one. They described a seam where an adapter could customise section delimiting and identifier matching, and that seam was never built: extraction is range-driven and mutation is find-and-replace. Those are deleted.

The plan adapter's snake_case `section_delimiter` and `identifier_pattern` are KEPT. They look like the same thing and are not. REQ-001-SPEC-003 is ACCEPTED and its AC-1 names them explicitly, requiring `section_delimiter === "### "` and an identifier pattern matching the phase-and-part form. A field a requirement asks to be observable is a satisfied contract, even when no internal caller consults it.

No accepted requirement names the three camelCase fields; only a DESIGN note does, and that note records `identifierPrefix` being added specifically to fill the abstract slot — so the field existed to satisfy a hole that was itself the fiction.

The case-split spelling was the tell that the seam contract had been adopted in name only. Nothing forced the two spellings to agree, so they diverged.

## Two tests that were keeping fictions alive

Both passed, and their passing is what made the code look live.

The section-extraction test proved that branch worked. That was never in question — reachability was. Replaced with an assertion of the contract that actually holds: extraction is range-driven, and identifiers are cross-check material rather than locators, because a heading appearing twice cannot say which occurrence was meant.

The `identifierPrefix` test reached through a cast to read a protected field, which is itself the signal that nothing legitimate consumed it. Replaced with a behavioural test that event identifiers survive a renumber and its inverse.

## EH-10 — deleted, replaced by terminal-substatus transition

The escape hatch inside the phase-not-done-while-pending-items rule — "or explicitly close it with documented rationale" — does not migrate in any form. It was a rationale-and-proceed branch sitting inside the very rule whose thesis is that the PLAN is authoritative.

Replacement: a pending item is closed by resolving it, or by an explicit terminal transition on the item itself (DEFERRED or ABANDONED), visible in the PLAN's own state. Both are real states a reader can see, rather than a written justification for moving on.

## Observations

- [fact] Nine fictions dispositioned — four implemented, two deleted, two explicitly accepted with stated scope, one split into both #fictions #audit
- [decision] The plan adapter's two snake_case fields are kept because an ACCEPTED requirement names them; the three camelCase seam fields are deleted because no requirement does #seam #requirements
- [insight] Two passing tests were the reason two fictions read as live — a test can prove code works while saying nothing about whether anything reaches it #testing #reachability
- [problem] One fiction was unreachable by type rather than by convention, so the compiler could have surfaced it at any point #types #dead-code
- [constraint] A disposition recorded only in a commit message is hard to audit; this note is the single place all nine are answerable from #provenance
- [outcome] EH-10 deleted — a phase is never closed over pending items on a written rationale #fail-closed

## Relations

- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-005: Skills Ecosystem Enforcement Wiring Deep Analysis]]
