# The failure-mode catalogue

Fifty-odd ways an AskUserQuestion call fails, grouped into six causes. Each one is stated
crisply enough to recognise mid-composition, and paired with what a good call does
instead.

Almost every mode below is the same underlying error: **assuming an escape hatch that is
not there.** The dialog is a closed room — no channel back to you, no view of your
reasoning, no way to open the file you are talking about. A mode is a specific way of
writing as though the user could step outside and check.

Use this list two ways. While composing, scan the group that matches your unease. While
judging an existing call, walk all six groups and name what it fails.

---

## 1. The question should not exist

The cheapest question to fix is the one you do not ask. Attention is depletable, and
dialog research has the argument exactly right: cry wolf often enough and people stop
reading. Every avoidable question makes the next necessary one less likely to be read
carefully.

**Answerable by reading.** Asks which test runner the project uses, which formatter,
where a module lives. Read the file. A question you could have answered yourself spends
the user's attention *and* tells them you did not look, which is a worse signal than the
delay.

**Conventional default.** Asks whether to add types in a typed codebase, whether to
follow the surrounding style, whether tests should pass. Pick the convention, say you
picked it, continue.

**Permission-seeking.** "Shall I proceed?", "Is this OK?", "Ready for me to start?" —
one real branch, so take it. If something genuinely blocks you, the blocker is the news,
not the question.

**Confirmation-shaped.** Fix / Defer / Skip, or Approve / Reject on work you already
believe in. A confirmation is not a decision. If the work is worth doing, the decision
is *how*; if it is not, do not raise it. A community linter prohibits this shape
outright as "a simple confirmation, not a real decision", and the platform's own
rejection message for a one-option question makes the same argument.

**Progress-report-as-question.** Asks something in order to tell the user where things
stand. Say it in prose. The dialog is for decisions.

**Pre-emptive.** Asks about a fork three steps ahead that the work may never reach. Ask
on arrival; the situation frequently resolves itself, and an answer given in the
abstract is given without the information that would have mattered.

**Enumeration disguised as a decision.** Four options that are really a page of a longer
list — files, branches, config entries. This is the most common reason people ask for a
higher option cap. Option lists never scroll and the cap is structural: four plus the
appended "Other" is exactly the visible budget. Narrow the set yourself, or present the
list in prose and ask a question about *criteria* rather than items.

**Asking to avoid a judgement you are being paid for.** The user delegated the work.
Sorting a genuine fork from a decision you simply do not want to own is the discipline;
a good check is whether you could defend your recommendation if asked to give one.

---

## 2. The frame is missing

This is the crux, and the group the complaints come from. Each of these produces a
technically valid call that a human cannot act on.

**Contextless drop.** The question arrives with no statement of what prompted it. There
is no way to tell what part of the work it affects or why it is being asked now. A
sentence or two of prose before the call fixes it: what happened, where, what is
affected.

**Unnamed subject.** "Found an inconsistency", "there is a conflict", "the config is
wrong" — never says where. Name the file, the symbol, the line.

**Unquantified plural.** "2 issues", "several files", "some tests" — never says *which*.
Nobody can consent to a repair they cannot see. This is the single most-cited defect in
dialog design research, where the canonical example is a delete confirmation saying
"these 2 items" and never naming them; it transfers to "found 2 issues" without
modification.

**Wall of text.** Everything crammed into the question field because the three layers
were collapsed into one. Users report this as "deeply impenetrable" and have resorted to
copying the dialog elsewhere to reformat it. Background goes in prose before the call,
the decision in the question, the trade-offs in the descriptions.

**Invented vocabulary.** A label or question names a term that first appeared in your
own reasoning — a phase name you coined, an abbreviation from a file you just read, a
concept you built to organise your own thinking. This is the most common single cause of
"I don't know what you're asking." Gloss it in a few words or use the word the user
used.

**Jargon where a plain word exists.** The label names the mechanism rather than the
outcome. The user is choosing what happens, not how it is implemented.

**Assumed attention.** Written as though the user watched you work. They were doing
something else. Write for a reader arriving cold: describe it as you would to a new hire
who is competent but lacks the context you have accumulated.

**Cross-reference.** "As discussed above", "the file I mentioned", "the second option
from earlier". The dialog does not scroll to your earlier message, and while it is open
the user cannot go looking.

**Withheld reasoning.** You have a view, and the evidence for it — the test output, the
error, the line you read — is not in the call. You are the only one who has seen it. Put
it in.

**Plan-mode self-reference.** Asks about "the plan" while in plan mode, which the user
cannot see until you exit. Unanswerable by construction, and the tool prompt forbids it
explicitly.

**Unlocated question in a series.** The fourth dialog in a row with nothing saying it is
the fourth, or how many remain. The user cannot tell whether to invest thought here or
save it, and cannot remember what they have already approved. A clause fixes it: "finding
3 of 11, two fixed so far".

**Load-bearing fact in the prose only.** The one thing that makes the decision obvious
sits above the call rather than inside it. On several hosts assistant text sent in the
same turn as a tool call is intermittently dropped and never rendered, so that fact may
simply not arrive. Keep the question and descriptions independently sufficient; prose
carries the rest.

---

## 3. The options are unusable

The label is the only text guaranteed to be read. Everything in this group is a way of
wasting it.

**Bare label.** "Option A", "Approach 1", "Refactor". Names its own position in the
list. The label carries the outcome.

**Meta label.** Yes, No, OK, Cancel, Confirm, Approve, Proceed, Skip, Defer, Continue,
Abort, Retry. These name the dialog's mechanics, which the user already understands,
instead of the consequence, which they do not. `Delete the file` and `Keep the file`,
not Yes and No.

Unrelated sources converge here, which is why it leads this group: dialog research in
2018 telling designers to replace Yes/No with "response options that summarize what will
happen" (`Delete file` / `Keep file` is its worked example), the same tradition in 2008
noting that an explicit label "serves as just-in-time help", and a 2026 agent-tooling
linter shipping a blocklist of eighteen meta labels containing exactly these words — with
`proceed` flagged as "a meta/approval verb" and the instruction to "use actionable
domain-specific verb phrase". A usability tradition and a linter, eighteen years apart,
one conclusion.

**Restated label.** The description says the label again with more words. The
description's job is cost and consequence.

**Costless option.** Nothing says what any choice costs — time, risk, what stops
working, what becomes harder later. The user is choosing blind between things that sound
equally fine.

**Unbounded label.** So long it wraps and stops being scannable. A handful of words;
length belongs in the description.

**Overlapping options.** Two options that could both be true. They are radio buttons, so
the user has to pick one and lose the other, and neither choice expresses what they
want.

**Duplicate options.** Two options differing only in wording. That is one option, and
the apparent choice is noise.

**Missing the option you dislike.** The user's real space includes "do nothing", "do it
the other way", "stop and rethink". Leaving out the one you hope they will not pick
decides for them while appearing to ask.

Survey methodology puts a number on how much the offered set determines the answer, and
it is larger than intuition suggests. In one well-known comparison an item was chosen by
58% of respondents when it appeared on the list and volunteered by only 35% when it did
not — and, more pointedly for this tool, when an option was absent **43% named it
unprompted, yet only 8% used the escape hatch when one was provided.** Read that as the
empirical form of the rule below: an option you leave out is mostly not recovered by
"Other". The set you write is very close to the set of answers you can receive.

**"Other" covering for a missing option.** Leaning on the appended free-text escape to
carry a possibility you could have written out. Not to be confused with the legitimate
case, where the space genuinely is not enumerable — SKILL.md draws that line. One
consequence worth knowing here: a question whose likely answer is "yes, but change one
thing" must not use previews, because that layout has no free-text field at all.

**Authoring your own "Other".** It is appended automatically. A second one renders two
escape hatches and makes the set look careless.

---

## 4. The recommendation is absent or fake

**No position.** Four options, nothing marked, so the user is asked to redo analysis you
have already done from less information than you had. Recommend, in first position, with
`(Recommended)` at the end of the label.

**False neutrality.** The options genuinely are equivalent, and nothing says so. Silence
and having-no-view are indistinguishable from the user's side, so the equivalence has to
be stated — SKILL.md has the sentence that does it.

**Coin-flip recommendation.** `(Recommended)` applied to an arbitrary pick to satisfy
the rule. This is worse than omitting it, because it launders a guess as advice and
teaches the user your recommendations carry no information. Once they learn that, the
marker stops working for the calls where you did have a view. SKILL.md gives the test for
whether you have a real recommendation.

**Recommendation not first.** Marked but sitting at position three, so the focused
default and the advice disagree.

**Unjustified recommendation.** Marked, but nothing anywhere says why. The reason
belongs in the recommended option's description.

**Destructive option in first position.** First position is focused, and a single
single-select question auto-submits on the keystroke that picks — no review screen.
Dialog research makes the exception explicit: make the common choice the default
*except* where its action is particularly dangerous, in which case you want deliberate
selection rather than an accidental Enter.

---

## 5. Structural and layout faults

**Dependent questions in one call.** The second question only makes sense given a
particular answer to the first. The tabs are all live at once and answerable in any
order, so the dialog cannot express "given the above" — and an answer given against a
different assumption than you intended is an answer to a question you did not ask. Ask,
read, then compose the next.

**Too many questions because they were cheap to add.** Four questions in one call is
legal and usually a sign you have not decided which decision matters. Hosts also handle
multi-question calls least well; some have shipped bugs surfacing only the first and
silently dropping the rest.

**Previews on a multiSelect question.** Silently ignored — nothing validates the
combination, and the work you put into them is thrown away.

**Previews for a preference.** The preview layout costs the free-text escape and image
paste entirely. Spending that on a question where labels and descriptions would do turns
a small clarification into a dead end. Previews are for comparing artifacts the user
needs to see.

**Preview that documents instead of comparing.** Long enough to be truncated behind a
"lines hidden" rule on a normal terminal. Previews should differ from each other visibly
and briefly.

**Over-long header.** Renders as a chip in the tab bar and crowds its siblings. Nothing
validates the twelve-character limit, so nothing will stop you.

**Duplicate question text.** Rejected outright — the question text is the answer-map
key.

**Asking from a subagent.** Denied; the tool is unavailable there even when the system
prompt lists it. Surface the question to your caller.

**Asking with nobody at the keyboard.** Headless, scheduled, chat-channel, or a host
that never registered the tool. The call hangs or resolves empty. Decide and state your
assumption, or fail loudly.

**Requiring the tool to exist.** A workflow that hard-blocks when the tool is missing
becomes unusable rather than degraded on hosts that lack it. Gate on availability and
have a path that works without it.

---

## 6. Mishandling the answer

Composing well and then reading carelessly wastes the whole exchange.

**Paraphrased confirmation.** Restating the choice in your own words before acting.
Paraphrase is where a narrow approval quietly becomes a broad one, and the user cannot
catch the drift until the work is done. Quote the option.

**Scope creep on approval.** The approval covers what the option said. Adjacent work
that "obviously follows" was not approved.

**Ignored notes.** `annotations[<question>].notes` unread. A user who took the trouble
to type something meant it, it frequently qualifies the choice, and it sometimes
contradicts the label they picked. The platform treats notes as a reason to doubt the
selection — their presence changes the tool-result wording you receive to *"they may
request clarification, changes, or that you not proceed."* Reading past that is ignoring
an explicit warning.

**Absence as assent.** An unanswered question is simply missing from `answers`; partial
submission is allowed and normal. Missing means unanswered, never agreement.

**Idle resolution as agreement.** `afkTimeoutMs` set means the dialog resolved on a
timeout and nobody was there — SKILL.md draws the reversible/one-way line for what you
may do next.

**Non-answer treated as an answer.** A reply that asks you something back, in `response`
or in the notes, read as though it selected an option. It selected nothing — see
SKILL.md on the remedial branch for what it is and what to do, and `tool-contract.md`
for why a `response` discards the per-question answers along with it.

**Verbatim re-ask.** Re-asking the identical question after a non-answer. Reads as not
having listened, and it was already established the question did not work.

**Retreating to an easier question.** Re-asking something smaller and safer after a
non-answer, abandoning the decision that actually needed making. Answer what they asked
in prose, then re-ask **the same decision** with the gap filled.

**Proceeding on a non-answer.** The one thing that is never right. The user told you
they could not answer; acting anyway converts their confusion into your assumption.

---

## The self-check

Before sending, three questions. If any answer is no, the call is not ready.

1. Could a reader who has been doing something else for ten minutes **decide** from
   this dialog alone — without opening a file, scrolling back, or asking you something
   first?
2. If they picked the wrong option, would they be able to **recognise** it was wrong
   from what is on screen?
3. Have you said **which one you would pick**, and can you justify it in that
   option's own description?

And afterwards, one more. If the user escaped to free text or pressed "Chat about this",
treat it as a defect report on the question you just wrote, not as a fact about the
user. Those paths going unused is what a working question looks like.
