# Worked examples

Five bad calls and their repairs, with the reasoning in between. The pairs carry more
than the rules they illustrate, because the gap between them is where the work actually
happens.

Read one before composing your first question in an unfamiliar situation. The repairs
are longer than the originals in every case — that is the point, not an accident of the
examples.

---

## 1. The contextless drop

The most common failure, and the one the whole skill exists for.

**Before**

```json
{"questions": [{
  "question": "How should I handle the auth inconsistency?",
  "header": "Auth",
  "options": [
    {"label": "Option A", "description": "Refactor"},
    {"label": "Option B", "description": "Leave it"}
  ]
}]}
```

Every group of failure modes is represented. There is no statement of what prompted
this, no indication of where the inconsistency is or what it breaks, labels that name
their own position in the list, descriptions that restate the labels, no cost on either
side, and no recommendation. A user reading this has one reasonable move: escape the
dialog and ask what you are talking about.

**After** — prose first, then the call.

> The session-refresh path in `src/auth/session.ts:88` reads the token expiry as
> seconds, but `src/auth/token.ts:41` writes it as milliseconds. Sessions therefore
> expire 1000× early, which matches the "logged out immediately" reports in the issue
> you pointed me at. Both call sites are internal, and 4 tests cover them.

```json
{"questions": [{
  "question": "Both files agree that expiry is a number and disagree about its unit. Which side should change?",
  "header": "Expiry unit",
  "options": [
    {"label": "Store milliseconds everywhere (Recommended)",
     "description": "Fix the reader in session.ts:88 to expect ms. One line, matches the Date.now() arithmetic already used in that file, and no stored data changes. Existing sessions keep working."},
    {"label": "Store seconds everywhere",
     "description": "Change token.ts:41 to write seconds and update 3 comparison sites. Matches the JWT `exp` convention, but every currently-stored token is misread until it expires — roughly 2000 users get logged out once."}
  ]
}]}
```

What changed. The prose gives the reader the situation, with file and line references
they could check afterwards even though they cannot during. The question names the
actual fork rather than gesturing at a topic. Each label names an outcome. Each
description carries a real cost — one line versus three sites, and crucially the "2000
users get logged out" consequence that makes the recommendation obvious once stated. The
recommendation is first and its description justifies itself.

Note that the answer is now *almost* not worth asking about, which is a good sign. It
stays a question because logging out live users is not reversible by apology.

---

## 2. The confirmation that pretends to be a decision

**Before**

```json
{"questions": [{
  "question": "I found 2 issues in the diff. How should we handle them?",
  "header": "Issues",
  "options": [
    {"label": "Fix now", "description": "Fix in this PR"},
    {"label": "Defer", "description": "File a follow-up"},
    {"label": "Skip", "description": "Not a real problem"}
  ]
}]}
```

"Found 2 issues" never says which, so the user cannot evaluate any of the three
branches. And the shape itself is wrong: if the issues are real, fixing them is not a
decision the user needs to make, and Fix/Defer/Skip is a confirmation dressed as a
choice. The real question — if there is one — is *how* to fix.

**After** — split by severity, ask only about the part that has a genuine fork.

> Two findings in the diff. The first is unambiguous and I have fixed it:
> `parseConfig` in `src/config.ts:52` swallowed a JSON parse error and returned `{}`,
> so a typo'd config silently became an empty one. It now throws, and I added a test.
> The second is a real trade-off rather than a defect, so it is yours.

```json
{"questions": [{
  "question": "parseConfig is called on every request and re-reads the file each time. Caching would help, but staleness has a cost — how should it behave?",
  "header": "Config cache",
  "options": [
    {"label": "Cache until the file changes (Recommended)",
     "description": "Watch the file and invalidate on write. ~20 lines plus a watcher. Removes ~4ms per request and edits still take effect immediately. The watcher is one more thing that can fail on network filesystems."},
    {"label": "Cache for 30 seconds",
     "description": "5 lines, no watcher, nothing to break. Same latency win, but an edit can take up to 30s to apply — which is confusing during local development."},
    {"label": "Leave it uncached",
     "description": "No change and no new failure mode. Keeps the ~4ms, which matters only if this endpoint gets hot."}
  ]
}]}
```

What changed. The self-evident fix was made, not asked about, and reported in one
sentence. The remaining question is about mechanism, which is where the real
disagreement lives. The third option is the one the agent does not favour, offered
anyway because "do nothing" is a legitimate answer that the user should not have to
fight for.

---

## 3. Dependent questions in one call

**Before** — one call, two tabs.

```json
{"questions": [
  {"question": "Should we add a caching layer?",
   "header": "Cache",
   "options": [{"label": "Yes", "description": "Add caching"},
               {"label": "No", "description": "No caching"}]},
  {"question": "Which cache backend should we use?",
   "header": "Backend",
   "options": [{"label": "Redis", "description": "External"},
               {"label": "In-memory", "description": "Local"}]}
]}
```

The second question is meaningless if the answer to the first is No, and the tabs are
live simultaneously and answerable in either order. A user who answers Backend first has
told you something conditional on a premise they have not agreed to. Also both option
sets are meta labels, and the first question is a confirmation.

**After** — the first call establishes whether there is a problem worth solving, and the
answer determines whether a second call happens at all.

> The `/search` endpoint takes 340ms at p50, and 300ms of that is a query that returns
> identical results for identical inputs — about 80% of traffic hits the same 50
> queries. Caching is the obvious lever; the question is whether the staleness it
> introduces is acceptable here, because search results include per-user permissions.

```json
{"questions": [{
  "question": "Cached search results would go stale when permissions change. How should that be handled?",
  "header": "Staleness",
  "options": [
    {"label": "Cache per user, 60s TTL (Recommended)",
     "description": "Key the cache on user id plus query. A permission change takes up to 60s to apply to search. Lower hit rate than a shared cache — I estimate ~55% — but no user ever sees results they should not."},
    {"label": "Share the cache, filter after",
     "description": "Cache raw results, apply permissions per request. Highest hit rate (~80%) and permission changes apply immediately, but the filter runs on every request and the raw cache holds rows some users may not read — a mistake in the filter becomes a disclosure."},
    {"label": "Do not cache; optimise the query instead",
     "description": "Add the composite index the query planner is missing. Removes maybe 180ms of the 300ms, no staleness and no new failure mode, but leaves p50 around 160ms rather than 40ms."}
  ]
}]}
```

What changed. The "should we?" question disappeared — the prose establishes the problem
and the agent's position that caching is worth doing, which is analysis rather than a
decision. The remaining question is the one with a genuine trade-off, and it happens to
also settle the backend, because "cache per user with a TTL" and "shared cache with
post-filtering" imply different implementations. **One well-posed question frequently
absorbs a second badly-posed one.**

---

## 4. A preview question that should not have been one

**Before**

```json
{"questions": [{
  "question": "Which error message wording do you prefer?",
  "header": "Wording",
  "multiSelect": false,
  "options": [
    {"label": "Terse", "description": "Short", "preview": "Error: invalid config"},
    {"label": "Verbose", "description": "Detailed",
     "preview": "Configuration error: the key 'timeout' expects a number in milliseconds,\nbut received the string \"30s\". Edit config.json line 12."}
  ]
}]}
```

The previews look reasonable but cost more than they earn. Choosing a preview layout
removes the free-text escape and image paste entirely, so a user who wants a third
wording — or wants to ask one question first — has nowhere to put it. And these are two
strings; the labels and descriptions could carry them.

**After** — same information, default layout, escape hatch intact.

> The config validator currently fails with `Error: invalid config`, which does not
> say which key or why. I am rewriting the message and the house style is not obvious
> from the existing code — some errors are terse, the newer ones in `src/cli/` are
> explanatory.

```json
{"questions": [{
  "question": "How much should a config validation error explain?",
  "header": "Error style",
  "options": [
    {"label": "Name the key, value and fix (Recommended)",
     "description": "\"Configuration error: 'timeout' expects a number in milliseconds, but received \\\"30s\\\". Edit config.json line 12.\" Matches the newer src/cli/ messages, and means most users fix it without reading docs. Three lines of formatting code per error."},
    {"label": "Name the key only",
     "description": "\"Error: invalid value for 'timeout'.\" Matches the older messages, one line, and stays short in logs — but the user has to open the docs to learn what a valid value is."}
  ]
}]}
```

What changed. The strings moved into the descriptions, where they are read in place. The
layout reverted to the default list, which restores "Other" — and "Other" is likely
here, since wording is exactly the kind of thing a user has a third opinion about.
**Reach for previews when the artifacts must be seen side by side, not when they merely
could be shown.**

Where a preview *would* be right: two candidate table layouts, two diagram structures,
two directory trees. Things whose shape is the content.

---

## 5. Repairing a question after a non-answer

The remedial branch, which no published guidance covers.

**The call that failed**

```json
{"questions": [{
  "question": "Should the migration run in the transaction or outside it?",
  "header": "Migration",
  "options": [
    {"label": "Inside the transaction (Recommended)", "description": "Atomic, rolls back cleanly"},
    {"label": "Outside the transaction", "description": "Runs concurrently"}
  ]
}]}
```

**What came back** — in `response`, meaning the per-question answers were discarded:

> "which migration? and what happens to the data if it fails"

Two things are true at once. The user could not answer, and they told you precisely what
was missing. Not a rejection, and emphatically not permission to pick the recommended
option.

The wrong repairs, in order of how tempting they are. Proceeding with "Inside the
transaction" because it was recommended and they did not object. Re-asking the same
call, which is what "you did not listen" looks like from the other side. Or retreating
to "shall I proceed?", which abandons the decision. And a diagnostic note: the question
named no artifact and no failure consequence, so this was foreseeable — treat the escape
as a defect report on your own composition.

**The repair** — answer what they asked, in prose, then re-ask the same decision with
the gap closed.

> The migration is `20260802_add_org_id.sql` — it adds a non-null `org_id` to `events`
> (14M rows) and backfills it from `sessions`. On this Postgres version the `ALTER
> TABLE` takes an ACCESS EXCLUSIVE lock, so anything in the same transaction blocks
> writes to `events` for the duration, which I measure at about 40 seconds on a copy
> of production.
>
> On failure the two options differ, and that is the actual decision:

```json
{"questions": [{
  "question": "If the backfill fails halfway, one option leaves no trace and the other leaves a partly-populated column. Which failure state do you want?",
  "header": "Rollback",
  "options": [
    {"label": "One transaction, all-or-nothing (Recommended)",
     "description": "A failure rolls back the column and the backfill together — the database is exactly as it started, and re-running is safe. Cost: writes to `events` block for ~40s, so this needs a maintenance window."},
    {"label": "Add the column, then backfill in batches",
     "description": "No long lock; writes keep working throughout. A failure leaves `org_id` present and partly populated, so the re-run must skip filled rows — I would add a `WHERE org_id IS NULL` guard and make the batch job resumable. More moving parts, no window needed."}
  ]
}]}
```

What changed. Their two questions are answered before the dialog opens — which
migration, and what happens on failure. The question is re-pointed at the consequence
they were actually asking about rather than at the mechanism, so it is the same decision
differently framed rather than a new one. The recommendation survived because the
reasoning survived, and now it is visible.

---

## The shape of a good call

Across all five repairs the same structure recurs, and it is worth naming.

**Prose before the call** establishes the situation: what you found, where, with names
and numbers, and what you have already done about the parts that were not decisions.

**The question** names the fork in one sentence, and points at the *consequence* that
differs rather than the mechanism that differs. Consequences are what users have
opinions about.

**Each label** names an outcome in a handful of words. **Each description** carries the
cost in concrete terms — lines, seconds, users, what breaks, what becomes harder later.
The recommended one carries its own justification.

**The set** covers the real space, including doing nothing, and the options are
genuinely exclusive.

The repairs run two to three times longer than the originals. That is the correct
direction: the call is the only thing the user can see, so brevity in the dialog is not
economy — it just moves the cost onto them, in a room where they cannot ask you
anything.
