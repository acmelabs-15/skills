---
name: asking-users-questions
description: |
  Composes an AskUserQuestion call a human can answer on sight: what the
  question text has to carry, how an option label and description divide the
  work, why every call states a recommendation, which of the three layouts a
  decision's shape calls for, and how to read the answer that comes back. Use
  when the call itself is the deliverable — wording a question before asking
  it, repairing one that reads badly, weighing whether to ask at all instead
  of picking a default, or handling a reply that arrived as free text rather
  than a choice. Do not use when running a workflow that happens to ask
  something along the way: implementing a spec, adjudicating decisions,
  interviewing for requirements, reviewing a diff or closing out a session
  are those skills' work and they carry their own prompts. Do not use to
  build a host UI that renders the dialog, to debug why the tool hangs or
  errors, or to page through many items, which is enumerating rather than
  deciding.
---

# asking-users-questions

The AskUserQuestion dialog is a closed room. While it is open the user cannot ask you
anything, cannot see your reasoning, and cannot go read the file you are talking about.
Everything needed to decide has to already be inside the frame. Design for that and most
question defects disappear; ignore it and no amount of schema conformance saves the
call.

The single test that matters: **could a reader who has spent the last ten minutes doing
something else decide from this dialog alone?** Not is it accurate, not is it
well-formed — could they *decide*. If they would have to open a file, scroll back
through your reasoning, or ask you a question first, the call is not ready to send.

Confirmation-dialog research gives that test a falsifiable edge: is the dialog specific
enough that the user would **recognise a mistake** from it alone? Someone who can pick
the wrong option and not know it was wrong is looking at a frame with something missing
from it.

## Trigger phrases

`ask the user`, `AskUserQuestion`, `compose a question`, `surface a decision`, `present
options`, `this question reads badly`.

## First decide whether to ask

Asking is not free, and a question you could have answered yourself is worse than no
question at all — it spends the user's attention *and* tells them you did not look. The
shipped tool prompt is blunt about this and widely ignored: reserve the tool for
decisions where the answer changes what you do next, not for choices with a conventional
default or facts you can verify in the code.

Weigh the cost of asking against the cost of a wrong assumption, and let reversibility
break the tie. **A useful proxy for reversibility is how much work undoing would be** —
a change you could revert in a few lines is yours to make, and one that would take a day
to unpick is worth a question even when you are fairly confident. A one-way door earns a
question even when you are sure.

When you decide rather than ask, say what you decided and why in a sentence, then
continue. That is not the same as proceeding silently, and it gives the user a place to
object.

Four shapes that look like questions and are not. **A confirmation is not a decision** —
"shall I proceed?" has one real branch, so take it. **Fix / Defer / Skip is not a
decision** either; if the work is worth doing the question is *how*, and if it is not,
do not raise it. **A progress report is not a decision** — say it in prose. And **a list
is not a decision**: if you want more than four options you are usually building a
picker over files or branches, which is prose plus a follow-up, not a dialog.

The platform agrees, in code. A call carrying a question with fewer than two options is
rejected before the user sees it, and the message the model gets back reads: *"A
question with a single option has no decision in it. Do not retry this call and do not
invent a filler second option. Instead, state the one path you were going to offer as
the approach you are taking, then continue with the task."* Manufacturing a second
option to satisfy the schema is the failure that guidance exists to prevent.

## Put the whole decision in the frame

Three layers carry the context, and they are not interchangeable. **Prose before the
call** carries the background: what happened, where, and what is affected. **The
question** carries the decision, as a complete sentence ending in a question mark. **The
labels and descriptions** carry the options. Flattening all three into the question text
produces the wall of unformatted text users complain about; leaving the first one out
produces a question that arrives from nowhere.

Name things specifically. Files, symbols, line numbers, the actual error. "Found 2
inconsistencies" never says *which*, and a user cannot consent to a repair they cannot
see — that specificity failure is the most-cited defect in dialog research and it
transfers exactly.

**Assume the user has not been following along.** They were doing something else while
you worked; they have not read the file you just read, and they did not see the test
output. The best available framing for how much to include comes from Anthropic's own
tool-writing guidance: describe it as you would **to a new hire** — someone competent
who simply lacks the context you have been accumulating — and make the implicit
explicit.

**Vocabulary is the most common single cause of "I don't know what you're asking."** If
a term first appeared in your own reasoning rather than in the user's request or the
codebase, it is not shared yet. Gloss it in a few words or replace it with the word they
used.

**When a question is one of a series, say where in the series it is.** "Finding 3 of 11,
two fixed so far" costs a clause and tells the user whether to expect nine more of these,
which changes how much thought this one deserves. Without it a long run of dialogs feels
unbounded, and users lose track of what they have already agreed to — the rule exists
because someone reported losing the thread by question fourteen.

Three things the frame cannot rely on. Cross-references do not resolve: "as discussed
above" and "the file I mentioned" point at a message the dialog does not scroll to. In
plan mode the plan itself is invisible until you exit it, so a question about "the plan"
is unanswerable by construction — the tool prompt forbids it explicitly.

And the prose layer is the least reliable of the three: on several hosts, assistant text
emitted in the same turn as the tool call **is intermittently dropped and never shown**.
Multiple open reports describe it. That is a reason to keep the question and its
descriptions independently sufficient rather than a reason to skip the prose — if the
background disappears, the dialog should still be answerable, just with less colour. Put
the load-bearing fact inside the question or the recommended option's description, and
use prose for the rest.

## Write the options so the label is enough

The label carries the outcome. The description carries what it does and what it costs. A
user should be able to choose from the label alone and read the description only to
confirm — if the label needs its description to make sense, the label is doing the wrong
job.

**Name the outcome, not the button's role.** `Yes`, `No`, `OK`, `Cancel`, `Proceed`,
`Approve`, `Skip`, `Defer` all describe the dialog rather than the consequence, and the
user already knows they are choosing. `Delete the file` and `Keep the file` tell them
what happens.

Four unrelated sources reach that from different directions. Dialog research in 2018 says
to replace Yes/No with "response options that summarize what will happen", giving
`Delete file` and `Keep file` as the worked example; the same tradition in 2008 observed
that an explicit label "serves as just-in-time help"; a 2026 agent-tooling linter ships a
blocklist of eighteen meta labels containing exactly the words above; and the tool's own
schema asks for a label that "clearly describe[s] the choice". Convergence across a
usability tradition, a linter and a schema is worth more than any one of them, and it is
why this rule leads the section rather than sitting in a list.

Keep labels short enough to scan, a handful of words, and put the length in the
description. Every description states a cost — time, risk, blast radius, what stops
working. An option whose description restates the label in more words has told the user
nothing.

The set matters as much as the members. **Options are radio buttons, so they have to be
mutually exclusive** — two that could both be true is a broken question, and two that
differ only in wording are one option. They also have to cover the real space,
**including the option you are hoping the user will not pick.** Withholding it is
deciding for them while appearing to ask.

"Other" is appended automatically, so never author one. **Leaning on it to cover a
possibility you could have enumerated is a defect** — the tell is whether you could have
written that option and did not. Where the space genuinely is not enumerable, though,
free text is the honest channel rather than a fallback: a user approving a generated
plan may want it with one detail changed, and no option set written in advance can
contain that. Note it does not exist at all in the preview layout, which is one more
reason that layout costs more than it looks.

## Always say which one you would pick

**Every call names a recommended option, first in the list, with `(Recommended)` at the
end of the label.** The shipped prompt makes this conditional on having a
recommendation. Treat it as unconditional — a deliberate strengthening, stated here so
that a reader who knows the tool's own wording can see the divergence is intentional
rather than a misreading.

The reasoning: you have read the code, run the tests, seen the error. The user has not.
A question with no recommendation asks them to redo analysis you have already done, from
strictly less information than you had. That is not neutrality — it hands back the work
they asked you to do.

One escape valve, and it is not silence. When the options really are equivalent on cost
and reversibility, or the choice turns entirely on preferences only the user holds,
**say that in the question text, in a sentence**: "these are equivalent on cost and
reversibility; the choice is which you would rather maintain." That sentence is the
deliverable in that case. Leaving it out and marking nothing is indistinguishable from
having no position.

The failure to avoid is technical compliance. **Putting `(Recommended)` on a coin-flip
is worse than omitting it**, because it teaches the user your recommendations carry no
information, and once they learn that they stop reading them. If you cannot justify the
recommendation in that option's own description, you do not have one yet.

One exception to recommending-first, from the same dialog research: **do not put a
destructive option in the focused first position.** A single single-select question
auto-submits on one keystroke with no review screen, so first position plus dangerous
action is a trap. Recommend the safe option, or make the destructive one an explicit
non-default choice.

## Match the layout to the decision's shape

Three layouts, selected per question, so one call can mix them. Choose by what the
decision needs rather than by what is available.

**Comparing concrete artifacts** — layouts, code shapes, config variants the user needs
to *see* — calls for `preview`. It costs the "Other" escape and image paste entirely, so
it is worth it only when seeing beats describing. **Genuinely independent selections**
call for `multiSelect`, which means selections that are not alternatives; a favourite is
not a multi-select. **One clear fork** calls for the default list, and a single
single-select question resolves in one keystroke, which is the cheapest thing you can
ask of someone.

Two combinations fail quietly. `multiSelect` with `preview` populated renders as a plain
checkbox list and **discards the previews with no warning**. And a `preview` question
drops the free-text escape the tool prompt promises the user will "always" have, which
turns a question that needed one small clarification into a dead end.

`references/tool-contract.md` has the complete field-by-field surface, which constraints
are actually validated and which are prose only, the layout selection rules, and the
configuration that changes what the user can do.

## Ask independent questions together, dependent ones apart

One to four questions per call is a hard schema cap, and the guidance is to split into
more calls rather than push against it.

Within that, the real constraint is not count but dependency. **Questions that depend on
each other cannot share a call.** The dialog presents tabs that are all live at once and
answerable in any order, so it has no way to express "given that you picked X above" —
and a user who answers the second question against a different assumption than you
intended has given you an answer to a question you did not ask. Ask the first, read the
answer, then compose the second knowing it.

There is a robustness argument too: multi-question calls are rare enough that host
handling of them is thin, and hosts have shipped bugs where only the first question
surfaces and the rest are silently dropped. Two calls of one question are more reliable
than one call of two.

## Read the answer as carefully as you wrote the question

**Quote the chosen option before acting on it.** Paraphrase is where a narrow approval
quietly becomes a broad one, and the user has no way to catch that drift until the work
is done. The approval covers what the option said and nothing more.

**Read `annotations[<question>].notes`.** A user who took the trouble to type something
meant it, it frequently qualifies the choice they made, and it occasionally contradicts
it. An agent that ignores it discards the most informative thing the user did. The
platform treats notes the same way: their presence changes the wording of the tool
result you receive, from *"you can now continue"* to *"Read the answers carefully — they
may request clarification, changes, or that you not proceed."*

**Absence is not assent.** An unanswered question is simply missing from `answers`;
submitting a partial set is allowed and normal. Treat what is missing as unanswered,
never as agreement.

**`afkTimeoutMs` means nobody was there.** It is set only when a dialog resolved on an
idle timeout, which is opt-in, so it is rare — but when present it is unambiguous, and
it is not consent. Proceeding is defensible for something reversible; treating it as
approval for a one-way change is not.

## When the question fails anyway

Free text comes back in `response`, or the notes say some version of "what do you mean"
/ "explain first" / "wait". **That is neither an answer nor a rejection — it is a report
that the question was underspecified**, and the report is about your composition, not
about the user. Two changelog fixes exist because this path gets used: one stopping
free-text answers from being read as "continue anyway", one repairing a bug where the
native "Chat about this" button erased the question. Both are admissions that users
routinely cannot answer these dialogs.

The repair, in order. Answer the question they actually asked, in prose. Then re-ask
**the same decision** with the missing context folded in — not the identical question,
which reads as not having listened, and not a different, easier question, which abandons
the decision. Do not proceed on a non-answer.

Note what the platform does with `response`: when it is set, the per-question answers
are discarded and you receive only *"The user responded: …"*. So a user who types
alongside their choices may have their selections dropped. Read the free text as the
whole of what you got.

**A call that sends the user to free text or to "Chat about this" is a defect signal.**
Those paths going unused is what success looks like.

## Where you cannot ask at all

**A subagent cannot use this tool** — surface the question to whoever dispatched you and
let them ask. The system prompt sometimes lists AskUserQuestion among a subagent's tools
anyway, which is a known contradiction; the documentation is right and the call is
denied with "permission prompts are not available in this context". Same for headless
runs, scheduled runs, chat-channel sessions where the tool is removed outright, and
hosts that never registered it.

In any of those, asking is not a safe default that merely wastes a turn — it hangs or
returns empty. Decide with what you have and say what you assumed, or fail loudly enough
that a human finds out. **A skill that treats the tool as mandatory becomes unusable on
hosts that lack it**, so gate on availability rather than requiring it.

## Anti-patterns

The ones that account for most bad calls. The full catalogue — six groups, fifty-odd
modes, a repair for each — is in `references/failure-modes.md`.

| Avoid | Why | Instead |
|---|---|---|
| Asking what the code answers | Spends attention and reveals you did not look | Read it, decide, mention the decision |
| Question with no preceding context | Arrives from nowhere; user cannot place it | A sentence or two on what happened and where |
| "Found 2 issues" without naming them | Nobody can consent to a repair they cannot see | Name the file, symbol, line |
| Meta labels (Yes / No / Proceed / Skip) | Names the dialog's mechanics, not the consequence | Name the outcome: `Delete the file` |
| Description restating the label | Spends the user's reading on nothing | Description carries cost and consequence |
| No recommendation | Hands back analysis you already did | Recommend, first position, `(Recommended)` |
| `(Recommended)` on a coin-flip | Teaches the user your advice is noise | Say they are equivalent, and what the choice turns on |
| Options that overlap | Radio buttons cannot express both | Make them mutually exclusive |
| Omitting the option you dislike | Decides for the user while appearing to ask | Offer it, and recommend against it |
| Dependent questions in one call | Tabs cannot express "given the above" | Sequential calls |
| Load-bearing fact in the prose only | Same-turn prose is sometimes dropped and never shown | Put it in the question or the recommended description |
| A question in a series with no position | User cannot tell if nine more are coming | "Finding 3 of 11, two fixed so far" |
| Paraphrasing the choice back | Narrow approval silently becomes broad | Quote the option verbatim |
| Proceeding on free text or AFK | Neither is an answer | Answer them, then re-ask with the gap filled |

## References

- `references/tool-contract.md` — both schemas field by field, which constraints
  have validators and which are prose only, what each layout takes away, how the
  tool result is assembled, and where the docs and the binary disagree. Verified
  against a named build. Read it for an unfamiliar field, or when something
  rendered unexpectedly.
- `references/failure-modes.md` — the full catalogue in six groups, each mode
  paired with its repair, closing with a three-question self-check. Read it when
  judging a call, or when one feels wrong and you cannot name why.
- `references/worked-examples.md` — five bad calls and their repairs side by
  side, with the reasoning between them. Read one before composing in an
  unfamiliar situation; the pairs teach faster than the rules they illustrate.
