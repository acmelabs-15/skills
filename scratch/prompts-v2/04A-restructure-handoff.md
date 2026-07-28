# Prompt 4A — Finish the skills-repo restructure, then resume prompt 4 at W-3

_Continuation of prompt 4, which paused mid-interview when the restructure it depends on turned out to be prerequisite work. Read `scratch/prompts-v2/RUN-CONTRACT.md` first — it governs this prompt too: granular, guided, opinions labeled, no assumptions, one decision per `AskUserQuestion`._

**Launch line:** _Read `scratch/prompts-v2/RUN-CONTRACT.md` and `scratch/prompts-v2/04A-restructure-handoff.md` in full — paginate, never act on a partial read — then run the prompt under the contract._

---

## Where you are

Prompt 4 (`04-pd-refactor-and-classifier-seam.md`) is a progressive-disclosure refactor of `decompose`, `recompose` and `defrag`. Its Step 0 map gate **passed**. Its interview is **paused after W-2**; W-3 through W-6 remain.

It paused because W-3's third item — "move the shared delegation contract into a shared module" — opened the question of where shared code belongs, which turned out to require a repo restructure and two new authoring standards. Those are now mostly done. This prompt finishes them and hands back.

**Everything is on branches. Nothing is pushed. Two repos are involved.**

| Repo | Branch | State |
|---|---|---|
`~/Dev/ACMElabs/skills` | `refactor/pd-decompose-recompose-defrag` | 7 commits — rulings, citation sweep, dead-code deletion |
`~/Dev/ACMElabs/skills` | `refactor/packages-and-plugin-root` | 5 commits — the restructure, in a worktree at `/tmp/skills-restructure` |
`~/Dev/ACMElabs/skill-creator` | `feat/plugin-shared-code-and-typescript-standards` | 5 commits — the two standards + a validator size check |

The worktree at `/tmp/skills-restructure` may be gone. Its commits are **not** — they live in the main repo's `.git`. Recreate with:

```bash
cd ~/Dev/ACMElabs/skills
git worktree add /tmp/skills-restructure refactor/packages-and-plugin-root
cd /tmp/skills-restructure && bun install
```

Work in the worktree, not the source tree. `settings.json` sets `autoUpdate: true` on a marketplace sourced from a local file, so the plugin cache re-syncs from the live repo — editing in place would push a half-restructured tree into all eleven skills mid-session.

## Rulings that bind this work

Recorded in `scratch/prompts-v2/RULINGS-LOG.md` as R-32 through R-37. The ones you will reach for:

- **R-34** — shared code is a workspace package; the plugin depends on it; a build step inlines it into `dist/` because installation copies only the plugin directory and Anthropic documents that paths leaving the plugin root do not resolve. Three path anchors resolved in one module with dev fallbacks; `pluginRoot` uses `import.meta.dir`, never `new URL().pathname` (percent-encodes spaces) and never `process.cwd()`.
- **R-36** — plugin-structure references live in `create-plugin`; code-level references live in `skill-creator`.
- **R-37** — tests in `__tests__/` beside the file under test, fixtures in `fixtures/` (not `__fixtures__/` — 220-to-1 in the evidence).

Two traps, both measured, both costly if rediscovered:

- **`markdownlint --fix` corrupts these prompt files.** It renumbers ordered lists and strips underscores out of `feedback_*` identifiers in nested bullets. Never run it over `scratch/prompts-v2/`.
- **`brain projects create` breaks basic-memory.** It writes a bare string where a five-field object is required, and basic-memory then refuses to load the config at all — every project goes dark. Use `basic-memory project add <name> <path>`.

## Restructure: what is done

**Step 1 — packages** (`a1c8f9c`). The composition library is now `packages/models` (11 note types with their schemas, parsers, renderers, validators, mutations), `packages/core` (engine, adapters, engine-only schemas), `packages/cli` (7 entry points), `packages/fixtures` (shared). Splitting exposed six defects the flat layout hid: a schema module outside `src/`; schema files in two unlisted directories; the models barrel re-exporting six engine-owned schemas so the package could not stand alone; an import resolving to the wrong one of two same-named files; a test helper beside tests that did not use it; fixtures reachable from one package while three needed them.

**Step 2 — plugin root** (`809c1ec`). `skills/`, `hooks/`, `.claude-plugin/` moved into `plugin/`. `plugin/src/env.ts` holds the three anchors. `install.sh` retired (`21d7a62`) — it symlinked into the personal-skill directory, which the marketplace has superseded, and running it would have produced duplicate skill definitions.

**Step 3 — invocations** (`16b6872`). All 26 `bun run shared/composition/src/*.ts` sites across the three skills now read `bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/*.js"`.

**Build placement** (`470d004`, `bab358c`). The build moved from `plugin/build.ts` to `scripts/build.ts` — a build that bundles from `packages/` as well as `plugin/` should not sit inside one of the things it builds. Output stays in `plugin/dist/`, since installation copies only the plugin. `dist/` also stopped shipping library modules: an entry point is a file something **invokes**, and `plugin/src/*` and `hooks/lib/*` are imported, not invoked, so their code is already inlined into consumers.

**Verified at each gate:** 1,708 tests pass (baseline 1,707), typecheck clean, `claude plugin validate plugin --strict` passes, all 11 skills present with names matching their directories, lint at exact parity with the source tree (18 files, 2 pre-existing errors).

## Restructure: what is left

### A. Reshape `dist/` — packages as libraries  [DECIDED, not yet built]

The current build bundles every entry point self-contained: **31 files, 34 MB**, with `models` and `core` inlined into each one. The owner ruled that wasteful and chose the alternative, which was tested and works:

> **Build each package as a library into `plugin/dist/`. Plugin files import it by relative path.**

Measured: ~1-2 MB instead of 34 MB, each library present once.

- `dist/models/`, `dist/core/`, `dist/cli/` — each package built once, code-splitting on.
- The **seven CLIs stay self-contained**, because a `SKILL.md` invokes them by path and nothing else does.
- **Skill scripts stay in `plugin/skills/` as source.** They already sit inside the plugin, so they need no bundling — they import `../../../dist/models/...`. Verified: that path resolves inside `plugin/`, so it survives installation.
- Owner's framing, worth preserving: `dist/` should read like an installed dependency. A `node_modules` variant was tested and rejected — Bun creates workspace deps as symlinks pointing **out** of the plugin, and Anthropic documents that a symlink whose target sits outside the marketplace is skipped for security, so the plugin would arrive with an empty `node_modules`.

**Do the research below BEFORE building this.** The owner chose option 1 as "more correct" while saying it "still feels a little bit off," and asked how the wider ecosystem handles this — Anthropic has no opinion on shared-code architecture, so there is no upstream answer to comply with. Building first and researching after risks a third reshape of the same directory. This is the piece that closes out the restructure.

### A0. Research: how self-contained-artifact ecosystems share code  [DO FIRST]

The earlier research (recorded under R-34/R-35) covered ecosystems **with** an install step and established the dividing line: install step means a declared dependency, no install step means bundling. What it did not settle is the shape *within* the bundling half when there are 20-40 entry points rather than one or two. That is the open question.

Dispatch a read-only researcher with this brief:

1. **Self-contained-artifact ecosystems.** How do VS Code extensions, browser extensions, Figma plugins, Obsidian plugins and Raycast extensions share code across multiple entry points in one shipped artifact? Bundle per entry point, emit shared chunks, or something else? Name real repositories.
2. **Code splitting versus per-entry bundling.** When a bundler emits shared chunks instead of duplicating a library into each entry point, what breaks and what improves — load behaviour, staleness, debuggability, and whether the chunk boundary becomes a compatibility surface.
3. **Relative imports into a build directory.** Is `import from "../../../dist/models/x.js"` accepted practice, an anti-pattern, or context-dependent? What do projects doing it say, and what do the alternatives cost — path aliases, a package boundary, generated re-export barrels?
4. **Monorepo to single artifact.** For a repo with several internal packages shipping one deployable that cannot resolve dependencies, what layouts are conventional? Serverless bundles, Electron apps, Chrome extension monorepos, Tauri.
5. **The duplication question, quantified.** Any real numbers on per-entry bundling versus shared chunks at 20-40 entry points? What size or load penalty is treated as acceptable?

Return: one section per task, a URL or repository behind every substantive claim, then "Convergent practice" and "Genuinely contested". Distinguish "widely done" from "officially recommended" — different claims. Where evidence is absent, say so rather than filling the gap with plausible convention.

Then bring the findings to the owner **before** touching the build, and confirm option 1 still holds or adjust it. Record whatever lands as a ruling.

**Whatever shape is implemented here must then be written back into `skill-creator`.** That plugin defines the standard this restructure is applying, so the two cannot diverge — a standard contradicted by the only repository that follows it is worse than no standard. The files to update, all on branch `feat/plugin-shared-code-and-typescript-standards` in `~/Dev/ACMElabs/skill-creator`:

- `skills/create-plugin/references/shared-code-architecture.md` — currently prescribes bundling every entry point, which the 34 MB measurement already contradicts. It also carries the entry-point definition and the `root`-decides-output-path rule, both of which came out of this same session and should be checked against whatever the research concludes.
- `skills/create-plugin/references/path-anchors.md` — if the import style changes, the guidance on relative paths versus the anchor may need adjusting with it.
- `skills/create-plugin/SKILL.md` — Phase 2's shared-library row and Phase 4's scaffold paragraph name the layout explicitly.

Re-run `bun skills/skill-creator/scripts/quick-validate.ts skills/create-plugin --extended` and the `skill-creator:skill-reviewer` agent after editing; both gated this content the first time and the reviewer caught a real bug in shipped example code. That review is worth repeating rather than trusting a second pass.

While rebuilding: all seven CLIs hardcode their own `.ts` filename in their usage strings, so the shipped `.js` tells a user to run a file that is not there. Derive the name from the running file instead.

### B. Migrate 125 test files to `__tests__/` per R-37

Own commit — pure movement, no behaviour change, and bundling it with structural work makes the diff unreviewable. 23 files are currently co-located; 102 sit in what was `shared/composition/tests/` and is now `packages/*/tests/`. Overriding that directory is explicitly part of the ruling. Fixtures to `fixtures/`.

Watch: a test moving one level deeper changes its relative import depth. Several helpers compute fixture paths from parts, and one file defined `COMPOSITION_ROOT` **twice** — once in the test, once in its helper — which is why a coverage pair failed after only the helper was fixed.

### C. Merge back and update the marketplace

Merge `refactor/packages-and-plugin-root` into `refactor/pd-decompose-recompose-defrag`, then edit `/Users/peter.kloss/Dev/ACMElabs/.claude-plugin/marketplace.json`: `source` becomes `"./skills/plugin"` from `"./skills"`.

**That file is in an unversioned directory — no git safety net. Back it up first.** It is last because until it changes the live plugin keeps loading the old layout, and once it changes the new layout must already be verified. Then confirm the installed plugin loads: 11 skills present, a CLI runs from `dist/`, cache refreshed (it was two days stale when last checked).

## Then: resume prompt 4 at W-3

Read `04-pd-refactor-and-classifier-seam.md` in full. Its Step 0 gate has passed — do not re-run it. Two interview answers are locked:

- **W-1 — keep all six at-risk passages**, each quoted with its new `file:line` in the report. Two corrections ride along: the false *"exactly these three options"* becomes *"three authored options plus the automatic 'Other'"*, and `defrag`'s delegation contract gains an honest line that it has never executed.
- **W-2 — done already.** All five coexistence passages are removed and the scoped grep returns 0; the SPEC-006 historical record in `docs/` is deliberately untouched at 16 notes. Executed early because two of the five sites were `install.sh` references.

**Open: W-3, W-4, W-5, W-6.** W-3's item (c) — the shared delegation module — now has an answer the original prompt lacked: it belongs in a package, and the package layout exists.

## Two things handed forward, deliberately not buried

**`REQ-005-SPEC-005` is contradicted.** It is a live `ACCEPTED` requirement mandating symlink activation via install script. The script is deleted and no ADR records the shift to marketplace delivery. Superseding an accepted requirement is a state transition needing its own evidence and gate, so it belongs to the decisions phase rather than a structural commit. 16 Brain notes reference `install.sh`; those are historical records and were left alone.

**~200 files were never linted.** `biome.json` included only `skills/**` plus two files and explicitly ignored `shared/composition`. Broadening scope surfaces 57 pre-existing errors. Scope was restored to exact parity so the restructure diff stayed about the move. Now that the library is three packages with real boundaries, widening it per package is tractable.

## Done means

- [ ] The A0 research ran, its findings were brought to the owner **before** any build change, and the resulting shape is recorded as a ruling.
- [ ] `dist/` holds whatever that ruling specifies — the working assumption is packages as libraries plus self-contained CLIs, skill scripts importing from it, ~1-2 MB not 34 MB.
- [ ] `skill-creator` updated to match the implemented shape: `shared-code-architecture.md`, `path-anchors.md` if the import style moved, and `create-plugin/SKILL.md`'s Phase 2 and Phase 4. Validator passes and `skill-creator:skill-reviewer` re-run.
- [ ] CLI usage strings name the file actually running.
- [ ] 125 tests migrated per R-37, in their own commit, with fixtures in `fixtures/`.
- [ ] Worktree merged; `marketplace.json` updated after a backup; installed plugin verified loading all 11 skills.
- [ ] Prompt 4 resumed at W-3 with W-1 and W-2 treated as answered and never re-asked.
- [ ] Every gate re-verified: tests at or above 1,708, typecheck clean, `claude plugin validate --strict` passing, lint at parity.
