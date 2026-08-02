# The AskUserQuestion contract

Verified by extracting strings from the compiled Claude Code binary at **version 2.1.220**
(the installed build, Mach-O 64-bit arm64), cross-read against the published SDK reference
and the `user-input` guide, both retrieved 2026-08-02.

**Record the version, because this contract moves between releases.** An undated claim
about it rots invisibly. Where the two official doc pages disagree with the binary, the
binary is what runs, and the disagreements are listed at the end.

---

## The input schema — what you send

Root is a **strict object**: an unknown top-level key is rejected outright rather than
ignored.

| Field | Type | Constraint | Enforced? |
|---|---|---|---|
| `questions` | array | 1-4 | **yes**, schema |
| `questions[].question` | string | unique across the call | **yes**, refinement — it is the answer-map key |
| `questions[].header` | string | "max 12 chars" per its own description | **no validator** |
| `questions[].options` | array | 2-4 | **yes**, schema |
| `questions[].options[].label` | string | unique within the question | **yes**, refinement |
| `questions[].options[].description` | string | required, not optional | **yes**, schema |
| `questions[].options[].preview` | string | HTML-shape checks only when format is `html` | conditional |
| `questions[].multiSelect` | boolean | defaults to false | **yes**, schema |
| `answers` | record<string,string> | array values are coerced, not rejected | **yes**, with preprocessing |
| `annotations` | record<question, {preview?, notes?}> | written back by the dialog | **yes** |
| `metadata.source` | string | analytics tag, never displayed | **yes** |

The refinement covering both uniqueness rules reports: *"Question texts must be unique,
option labels must be unique within each question."*

Array-valued answers are **coerced, not rejected** — a preprocessing step joins a string
array with `", "` before validating. A host may send either form. This was a real bug
once, fixed in 2.1.136 ("Fixed `AskUserQuestion` discarding multi-select answers when
supplied as an array"), so older accounts describing arrays as a schema violation
describe the pre-fix state.

**The 12-character `header` limit has no validator.** The number is a real constant
interpolated into the field's own description, and over-long headers are truncated
downstream rather than rejected. Honour it anyway: the header renders as a chip in the
tab bar, and a long one crowds its siblings.

### Two fields with no enforcement behind their rules

`multiSelect` combined with `preview` is **not rejected**. Input validation does nothing
at all unless the resolved preview format is `html`, in which case it checks only the
HTML shape of each preview. So the "previews require single-select" rule lives entirely
in the prompt, and violating it costs you the previews silently.

Under `html`, a preview must contain at least one tag, must not contain `<html>`,
`<body>` or `<!DOCTYPE>`, and must not contain `<script>` or `<style>` — use inline
`style` attributes. The "must contain a tag" rule is the surprising one and is
undocumented: **a plain-text preview is a hard error** under `html`, not a passthrough.

---

## The output schema — what comes back

Root is a **plain object**, not a strict one. That asymmetry with the input schema is
the source of most confusion about this tool: `response` and `afkTimeoutMs` exist **only
on the output side**, so searching input-side keys for them finds nothing and concludes
wrongly that they do not exist. Conversely `metadata` is input-only.

| Field | Type | Meaning |
|---|---|---|
| `questions` | array | the questions as asked, echoed back |
| `answers` | record<string,string> | question text → answer; multi-select answers are comma-separated |
| `response` | string? | *"Freeform text the user typed instead of selecting a structured option"* |
| `annotations` | record<question, {preview?, notes?}> | `notes` is *"Free-text notes the user added to their selection"*; `preview` is the selected option's preview content |
| `afkTimeoutMs` | number? | *"Set when the dialog auto-resolved after this many milliseconds of idle (user away from keyboard). Absent on every human-resolved path."* |

`annotations` and `afkTimeoutMs` are both absent from the `user-input` guide's
response-format table entirely. `annotations[<question>].notes` is how the user's own
words reach you, so that omission is the most consequential gap in the published docs.

### How the tool result is assembled

Worth knowing precisely, because it determines what you actually read. Per question, a
segment is built as `"<question>"="<answer>"` — or `"<question>"=(no option selected)` —
with `selected preview:` and `notes:` appended when present. **A question with neither
an answer nor notes is omitted from the string entirely.**

Then one of four wrappers is chosen, in strict precedence:

1. **`afkTimeoutMs` set** → *"No response after Ns — the user may be away from
   keyboard. Proceed using your best judgment based on the context so far; you can
   re-ask this question later if it's still relevant."* Followed, when anything had been
   selected, by *"Before going idle the user had selected: …"*.
2. **`response` non-empty** → *"The user responded: …"* — **and nothing else.** The
   per-question answers are discarded. A user who typed something *and* picked options
   loses the picks in what you receive.
3. **Otherwise**, every answer is checked against its question's known labels. If all
   match and no question carries notes → *"Your questions have been answered: … You can
   now continue with these answers in mind."* If any answer is off-menu **or any
   question carries notes** → *"The user answered: … Read the answers carefully — they
   may request clarification, changes, or that you not proceed — and follow what they
   actually say."*
4. **Nothing at all** → *"The user did not answer the questions."*

Branch 3's split is the platform implementing the 2.1.216 changelog fix ("free-text
answers now get neutral wording"). It means **the presence of notes is itself a signal
to stop and read** — the platform already treats a typed note as a reason to doubt the
selection.

---

## What the tool prompt says, and how it is assembled

The prompt is **not a fixed string, and not two versioned variants.** It is concatenated
at call time from up to three parts, two of which are gated on conditions you do not
control. Do not assume the guidance you were given is the guidance another session was
given.

The always-present base:

```text
Use this tool only when you are blocked on a decision that is genuinely the user's to make: one
you cannot resolve from the request, the code, or sensible defaults.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question
- If you recommend a specific option, make that the first option in the list and add
  "(Recommended)" at the end of the label

Plan mode note: To switch into plan mode, use EnterPlanMode (not this tool). Once in plan mode,
use this tool to clarify requirements or choose between approaches BEFORE finalizing your plan.
Do NOT use this tool to ask "Is my plan ready?", "Should I proceed?", or otherwise reference
"the plan" in questions — the user cannot see the plan until you call ExitPlanMode for approval.
```

A conditional paragraph, appended only for some models and only while a remote gate is
unset:

```text
Reserve this for decisions where the user's answer changes what you do next — not for choices
with a conventional default or facts you can verify in the codebase yourself. In those cases
pick the obvious option, mention it in your response, and proceed.
```

And a preview block, appended only when a preview format resolves — see below.

Two further gated strings behave the same way. When a remote flag is on, the `questions`
field description gains *"The 1-4 questions and 2-4 options bounds are hard schema
constraints; do not exceed them even if the user requests more — split into multiple
calls instead"*, and the `options` description gains *"this cap applies to multiSelect
too — group or split if you have more"*. **Both caps are real whether or not you were
told about them.**

Separately, the one-line tool description shown in a tool list is permissive where the
prompt is strict: *"Asks the user multiple choice questions to gather information,
clarify ambiguity, understand preferences, make decisions or offer them choices."*
Reimplementations of Claude Code circulate an older, four-use-case description; the
shipped prompt is far stricter, and the tightening is itself evidence of the direction
the platform is moving.

### The rejection message for a single-option question

Undocumented anywhere, and the strongest first-party statement on question quality that
exists:

```text
This call included a question with fewer than 2 options, so it was rejected and the person never
saw it. A question with a single option has no decision in it. Do not retry this call and do not
invent a filler second option. Instead, state the one path you were going to offer as the
approach you are taking, then continue with the task. If this call also contained questions with
2 to 4 options (each with distinct labels), you may re-ask those questions alone in a new call.
Ask a question only when the person has at least two genuinely distinct choices.
```

---

## The three layouts

Selected **per question**, so one call can mix them.

| Condition | Layout |
|---|---|
| single-select **and** any option has a `preview` | side-by-side preview |
| `multiSelect` is true | checkbox list with an explicit submit button |
| otherwise | numbered compact-vertical list |

A review screen appears at the end of a multi-question call, and is skipped entirely for
a single single-select question — that one **auto-submits on the keystroke that picks an
option**, with no confirmation step. One keystroke, one round trip. It is the cheapest
question to answer and the easiest to answer by accident, which is why a destructive
option does not belong in the focused first position.

### What each layout takes away

This is where calls go wrong, because the losses are silent.

**The preview layout has no "Other" and no image paste.** The tool prompt promises the
model that users will *always* be able to choose Other; a preview question breaks that
promise without saying so. The user's only free-text route is a notes field on the
selected option. So a preview question turns "I need to tell you one thing first" into a
dead end.

**`multiSelect` with previews populated renders as a plain checkbox list**, and the
previews are discarded with no warning. Nothing validates the combination. Whatever you
spent composing them is thrown away.

**Option lists never scroll.** The visible budget is exactly four options plus the
appended "Other". The paging machinery underneath is unreachable through this tool,
which is another way of saying the four-option cap is structural rather than arbitrary.

Number keys differ by layout: in the standard list a digit selects, in multi-select it
toggles, and in the preview layout it only moves focus — because the point of a preview
is to look before committing.

---

## Configuration that changes what the user can do

Not a settings inventory — these are the knobs that change whether a question is
answerable.

**Preview format** decides whether previews exist at all. It resolves from the
`CLAUDE_CODE_QUESTION_PREVIEW_FORMAT` environment variable, or the SDK's
`toolConfig.askUserQuestion.previewFormat` option, as `markdown` or `html`. When it
resolves to neither, **the preview guidance is not in your prompt and the field should
be left alone** — a host that never opted in may not render it. The published docs
describe `preview` as TypeScript-only; the schema carries it unconditionally and the
real gate is this setting.

**A restricted toolset silently removes the ability to ask.** If a host passes an
explicit tools array without `AskUserQuestion` in it, you cannot ask, and nothing tells
you why. The tool is also removed outright in chat-channel sessions, where nobody is at
a keyboard.

**Permission mode changes the dialog.** In plan mode the footer gains a "skip interview"
row. In `dontAsk` mode the call is denied rather than shown.

**Terminal size drives the height budget**, and a short terminal truncates previews
behind a "N lines hidden" rule. A preview that needs forty lines to make its point may
not survive to the screen, which is an argument for previews that compare rather than
previews that document.

**A `PreToolUse` hook can answer on the user's behalf** by returning an allow decision
with modified input — the documented path for headless integrations. So an answer that
arrives is not proof a human produced it.

---

## Where the tool is unavailable

**Subagents.** The `user-input` guide states it flatly under Limitations:
*"`AskUserQuestion` is not currently available in subagents spawned via the Agent
tool."*

Worth being precise about how that is enforced, because the two layers do not say the
same thing. The binary contains **no subagent check and no string matching the docs'
wording** — its gate keys on interactivity instead (`isEnabled` disables the tool in a
non-interactive session that has no permission-prompt tool), and a related denial reads
*"Action requires interactive approval and permission prompts are not available in this
context"* with a reason typed `asyncAgent`. So the docs assert a fact about subagents
that the binary reaches by a different route.

That distinction does not change what you should do, and it explains a contradiction you
may meet: a subagent's system prompt sometimes lists AskUserQuestion among its available
tools, which has been reported publicly by third parties. **Believe the docs, not the
tool list. Surface the question to whoever dispatched you.**

Also unavailable, for the same underlying reason that nobody is present: headless runs,
scheduled runs, chat-channel sessions, and hosts that never registered the tool. In
these the call does not degrade gracefully — it hangs or resolves empty.

---

## Doc-versus-binary disagreements

The binary is what runs. Recorded so that a claim traced back to the docs can be
checked.

| The docs say | The binary does | Consequence |
|---|---|---|
| `header` "max 12 characters" | no validator; truncated downstream | honour it for layout, not for validity |
| `answers` example shows an array | coerced to a joined string | both forms work |
| html previews reject 3 patterns | rejects 5 **and requires** ≥1 tag | a plain-text preview hard-errors — undocumented |
| `preview` is TypeScript-only | schema-wide; gated on `previewFormat` | usable from any host that opts in |
| `annotations` absent from the response table | live, and feeds `notes:` into your result | the user's own words, undocumented |
| `afkTimeoutMs` not mentioned at all | in the schema and the result path | idle resolution is invisible in the docs |

One reconciliation worth recording rather than asserting. The 2.1.200 changelog says
dialogs *"no longer auto-continue **by default**; opt into an idle timeout via
`/config`"*, and `afkTimeoutMs` is present in the 2.1.220 schema described as *"Absent
on every human-resolved path."* Both are true: auto-continue became opt-in, and the
field reports it when someone opted in. That makes `afkTimeoutMs` rare but unambiguous.

Note also the mild tension in what the platform tells you on that path — *"Proceed using
your best judgment"* — against treating absence as non-consent. Reversible work, proceed
and say you did. One-way work, do not.

---

## What the official documentation does not contain

Checked deliberately, because it is this skill's reason for existing: **neither official
page contains any guidance on how to word a question, how much context to include, or
how to write an option description.** They are host-integration contracts — how to wire
the callback, what the field tables are, how previews are configured, what the
limitations are.

The closest first-party statements to composition advice are two clauses inside field
descriptions: *"Should be clear, specific, and end with a question mark"* on `question`,
and *"Each option should be a distinct, mutually exclusive choice"* on `options`.
Everything else in this skill is derived from the contract above, from published
dialog-design research, and from the failures users report.
