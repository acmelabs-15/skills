---
title: "ANALYSIS-009: Shared-Code Shape for a Copied Plugin Artifact"
type: analysis
permalink: analysis/analysis-009-shared-code-shape-for-a-copied-plugin-artifact
tags:
- plugin-architecture
- bundling
- shared-code
- measurement
- research
---

# ANALYSIS-009: Shared-Code Shape for a Copied Plugin Artifact

> **Omnibus note** — this note aggregates five parallel research briefs and nine local measurement probes into the single open question of how `plugin/dist/` should be shaped.

**Status**: evidence assembled, owner decision pending. Written because the decision reversed once mid-session and the owner asked to read the material rather than receive a summary.

## The question

The skills plugin ships as a directory that installation **copies** into a cache. Anthropic documents that paths traversing outside the plugin root do not resolve after installation, because external files are not copied. There is no install step, no dependency resolution, and no network at the destination. Bun executes `.js` from local disk, cold process per invocation.

The plugin has 31 entry points — 7 composition CLIs plus 24 skill scripts — all importing two shared internal packages. Bundling each entry point self-contained inlines those libraries 31 times.

A prior ruling recorded as `[DECIDED]` chose: *build each package as a library into `plugin/dist/`, plugin files import it by relative path.* The owner accepted it as "more correct" while saying it "still feels a little bit off," and asked how the wider ecosystem handles this. This note is the answer to that question plus the measurements the answer needs.

## What was measured locally

All probes built into `/tmp`, never into `plugin/dist/`. The worktree stayed clean throughout.

### Size

| Shape | Size | Ratio |
|---|---|---|
Current: 31 self-contained bundles + sourcemaps | 34 MB | baseline |
Current, `.js` only | 10 MB | 3.4x smaller |
Packages as libraries + self-contained CLIs, deps inlined | 2.8 MB | 12x smaller |
Packages as libraries, npm deps externalized | 816 KB | 42x smaller |
Single generated root barrel, one package | 724 KB | — |

The headline 34 MB is **71% sourcemaps**: 10 MB of `.js` against 24 MB of `.map`. The artifact is 62 files, not 31 — 31 of each. This reframes the original finding: most of the waste is debug data, not duplicated library code.

Our own code is 816 KB. The remaining ~2 MB of the 2.8 MB figure is the npm stack — `zod` plus `unified`/`remark` — which must ship because nothing resolves dependencies at the destination.

### Cold start

Five runs each, same machine:

| Load shape | Time |
|---|---|
Self-contained 584 KB single file | 30-50 ms |
Split library across 34 chunk files | 30 ms |
Whole-library import via generated barrel | 40-50 ms |
Single deep-module import | 30 ms |

No measurable penalty for chunk resolution on a local filesystem. This matters because most code-splitting guidance assumes a browser and network waterfalls; that reasoning does not transfer to a local process. The ~10-15 ms barrel delta is the cost of pulling a whole library when one schema is wanted.

### Correctness under splitting

Research surfaced a recurring Bun defect class where `splitting: true` emits duplicate export statements and throws `SyntaxError`, spanning versions 1.1.30 through 1.3.5, plus a currently-open self-referential dynamic-import bug that esbuild shares.

Tested against this codebase: **all 97 built library modules import cleanly, zero failures**, including the three barrel re-export files matching the pattern that triggers the known issue. The only dynamic `import()` in the packages is `node:fs/promises`, a builtin, not the self-referential form. The bug class is real upstream and does not reproduce here.

### Dependency graph

A clean two-layer split with zero overlap:

- 24 skill scripts and the hooks import **`models` only** — 48 sites
- 7 CLIs import **`core` only** — 37 sites
- Nothing under `plugin/` imports `core` or `cli`

Consequence: a `dist/core/` directory would exist solely to serve the CLIs, which are self-contained regardless.

### Import mechanism

Decisive for whether an `exports` map is enforced or decorative, because `exports` is consulted only for bare and scoped specifiers, never for relative paths:

| Consumer | Specifier-based | Relative |
|---|---|---|
Skill scripts | 29 | 5 |
Hooks | 19 | 55 |
**Total** | **48** | **60** |

The 48 specifier-based sites cover every cross-package import; the relative ones are intra-directory. So a package boundary is a real gate here.

### Encapsulation is enforced on this runtime

A throwaway package built in `/tmp`, tested on Bun 1.3.14:

| Export map | Unsanctioned deep import |
|---|---|
`{".": index, "./schemas/plan": plan.ts}` | **BLOCKED** — `Cannot find module` |
`{"./*": "./src/*.ts"}` | **REACHABLE** — returns the internal value |

Same package, same consumer, same file. The wildcard is the single line disabling an encapsulation mechanism that already works.

### Package-boundary survival across a copy

A physically-copied (not symlinked) package inside the plugin's own `node_modules/`, with an explicit export map:

- resolves by `@scope/name` specifier from the plugin directory — **passes**
- resolves when invoked by absolute path from an unrelated working directory — **passes**
- survives `cp -R` of only the plugin directory, simulating installation — **passes**
- still blocks unsanctioned internal paths after the copy — **passes**

The mechanism works. Whether it is *wise* is a separate question the research answers differently.

### The symlink premise, verified

R-34 rests on Bun creating workspace dependencies as symlinks pointing outside the plugin. Confirmed: `plugin/node_modules/@acmelabs/{cli,core,models}` are symlinks to `../../../packages/*`, targets outside the plugin root. The premise holds.

## What the research found

Five parallel read-only briefs. Three returned; two never delivered despite repeated requests, and their absence is recorded here rather than papered over.

### Every surveyed ecosystem keeps host-loaded entry points self-contained

| Ecosystem | Behaviour |
|---|---|
Raycast — N commands, closest structural analogue | one esbuild call, N entries, `splitting` never set. Full duplication accepted |
VS Code — `vscode-eslint`, `vscode-python` | N independent bundles; shared `.ts` duplicated into each |
Browser extensions MV3 | dynamic `import()` unsupported in service workers — splitting impossible by platform rule |
Figma | two separate bundlers for two incompatible JS environments |
Obsidian | single entry point by design; the problem cannot arise |
GitLens — the sole exception | shares chunks only for lazily-imported webview code; the eagerly-loaded extension entry is deliberately excluded from splitting |

MetaMask's own source comment is the clearest first-party statement located: manifest-referenced scripts must be self-contained and cannot share code, because the browser-extension platform is responsible for loading them and splitting would require updating the manifest to include the other chunks. That describes this situation exactly — Claude Code invokes skill scripts by path and knows nothing about chunks.

No official tooling in any of the five ecosystems — `vsce`, `ray build`, `web-ext`, Figma's samples, Obsidian's template — defaults to shared-chunk emission. Where sharing exists it is bespoke author configuration, always scoped to entries whose loading the author controls.

One honest caveat from the researcher: no maintainer in any of the five ecosystems states outright "duplicate shared code across self-contained entries, this is fine." The convergence is inferred from what large codebases do, not from documented recommendation.

### Monorepo-to-single-artifact practice

Six real repositories inspected across Electron, browser-extension and VS Code monorepos, including a Bun-workspace repo shipping a VS Code extension that depends on seven internal `workspace:*` packages. Every one **bundles**; `workspace:*` is dev-time only, resolved away by the production bundler.

On vendoring physical copies into the artifact's `node_modules/`: no tool defaults to it. `pnpm deploy` with injected dependencies and `turbo prune` do produce physical copies, but both still assume an install step runs at the destination, and pnpm's is framed as a peer-dependency-conflict workaround. Rush treats symlinks as the default and physical copies as a workaround for transports that cannot preserve links — the opposite framing from treating symlinks as the broken thing.

The ecosystem's answer to "the destination cannot resolve dependencies" is *bundle the code in*, not *ship copies and let resolution work*.

Deduplication itself is a named, solved problem: AWS Lambda layers exist to ship a shared dependency once and attach it to many functions, and electron-vite exposes `manualChunks` precisely so code common to multiple entries is split out rather than duplicated. So the instinct that 31 copies is wasteful has ecosystem backing; the contested part is only how the deduplicated code gets referenced.

Lambda layers work by a fixed filesystem convention baked into the runtime's search path, not package-manager resolution. That is structurally what `${CLAUDE_PLUGIN_ROOT}/dist/` is, and it is the strongest available argument that referencing shared code by a known in-artifact path is infrastructure convention rather than an anti-pattern.

### Public surface, and why a barrel was rejected

Measured evidence against a root barrel:

- Vercel measured 200-800 ms import cost for large barrels, and 40% faster cold boots plus 28% faster builds after optimizing them — explicitly worst "in a serverless environment, every time the app is started," which is this repo's cold-process-per-invocation model
- A Vitest defect where a barrel plus a circular import silently breaks `vi.mock` **recurs on current versions**, closed 2026 — a correctness risk, not merely performance
- TanStack's maintainer scopes barrels to libraries and to **curated** entry points, not an auto-generated `export *` sweep of 40 modules
- Vite's maintainers narrowed the scope of the barrel problem to application source and dev-server request waterfalls, and merged a docs change saying so — so the harshest numbers do not transfer to a single pre-built artifact

A barrel was nonetheless generated and measured rather than dismissed: 724 KB as one file, 92 runtime exports, and only **1** symbol collision across 184 exported symbols. That collision is `DoDClaimResult`, the same `ClaimResult` alias declared twice. A barrel was viable and was rejected on cost, not feasibility.

The recommended pattern for this exact case — an internal workspace package with a build step — is Turborepo's Compiled Packages shape: an `exports` map with `types` pointing at source and `default` at built output. `date-fns` ships 741 explicitly enumerated subpath entries with zero wildcards, demonstrating enumeration at far greater scale than the ~90 subpaths here. Node's own docs treat enumeration and patterns as both legitimate, differentiated by subpath count, and provide `null` targets to carve out privates when a pattern is kept.

Across six real repositories, none used a wildcard standing in for an absent barrel. Every internal package either exposed a conventional single entry or declared explicit named subpaths.

## Defects found while probing

**No package has a barrel at its declared entry point.** All three of `packages/{models,core,cli}` declare `"exports": {".": "./src/index.ts"}` and no such file exists in any of them. Invisible because every consumer imports a deep subpath through the wildcard, so the broken target is never exercised. This crashed the first library-build probe outright and is why "build each package once as a library" had no entry point to build from.

**The restructure dropped six exports from `schemas/index.ts`**, 9 down to 3. No capability was lost — the six schema modules moved to `packages/core/src/schemas/` correctly and their exports live in core's barrel. What remains is wreckage: seven orphaned doc comments with no export statement following them, and a header claiming its symbols were checked across "all sixteen schema modules" while it exports three.

**Nine CLI usage strings name a file that will not exist** at the shipped path. The handoff located these in `packages/cli`; they are actually in `plugin/skills/*/scripts/`, and three `validate-*-schema` scripts already omit the extension and need no change.

## Contested, and honestly unresolved

**Build-script placement.** Commit `470d004` moved the build from `plugin/build.ts` to `scripts/build.ts`, reasoning that a build bundling from `packages/` as well as `plugin/` should not sit inside one of the things it builds. Research found 3 of 4 real monorepos put the build script inside what it builds, with root-level `scripts/` reserved for cross-cutting concerns. The exception is `microsoft/vscode`, which drives many first-party units from a root gulpfile and is arguably the closest analogue. Not wrong, but recorded as settled when the evidence is split.

**Two research briefs never delivered** — the direction-of-dependency inversion, and the quantified duplication question. The inversion brief was the one bearing most directly on the owner's stated unease, and its absence is why that question rests on the Lambda-layers analogy rather than on direct evidence about source importing build output.

**Whether sourcemaps belong in a shipped artifact** was not in any original brief and is now the largest single lever — 24 of 34 MB. No ecosystem evidence was gathered on whether VS Code, browser, Raycast or Obsidian artifacts ship `.map` files to users.

## Observations

- [fact] The 34 MB artifact is 71% sourcemaps — 10 MB of `.js` against 24 MB of `.map` across 62 files, not 31 #measurement #bundling
- [fact] Packages built as libraries measure 2.8 MB with dependencies inlined and 816 KB with npm externalized, a 12x and 42x reduction #measurement #bundling
- [fact] Cold start is 30-50 ms whether loading a self-contained 584 KB bundle or a split library across 34 chunks, so load time does not discriminate between the options on a local filesystem #measurement #performance
- [fact] All 97 built library modules load without error under `splitting: true`, including three barrel re-export files matching a known Bun duplicate-export defect pattern, so that defect class does not reproduce on this code #measurement #bun
- [fact] Cross-package imports are 48 specifier-based against 60 relative, and every relative one is intra-directory, so a package `exports` boundary is an enforced gate here rather than documentation #measurement #imports
- [fact] Bun 1.3.14 blocks unsanctioned deep imports under an explicit export map and permits them under a `"./*"` wildcard, verified on a throwaway package #measurement #encapsulation
- [fact] A physically-copied package inside the plugin's `node_modules/` resolves by specifier from any working directory, survives a directory copy, and retains export-map enforcement #measurement #packaging
- [insight] Every surveyed self-contained-artifact ecosystem keeps host-loaded entry points fully self-contained, and no official tooling defaults to shared chunks; the one project that shares chunks deliberately excludes its eagerly-loaded entry #research #convergence
- [insight] Deduplication is a solved problem in adjacent ecosystems via Lambda layers and bundler `manualChunks`, so the objection to 31 copies has backing; only the referencing mechanism is contested #research #convergence
- [insight] Lambda layers work through a fixed filesystem convention rather than package-manager resolution, which is structurally what a known path inside the plugin is, and is the strongest available argument that an in-artifact path is infrastructure rather than an anti-pattern #research #architecture
- [problem] No package has a file at its declared `"."` entry point, which is why a library build had nothing to build from and why the first probe crashed #defect #packaging
- [problem] The restructure left `schemas/index.ts` with seven orphaned doc comments and a header claiming sixteen modules while exporting three; the exports themselves moved to core correctly, so this is misleading wreckage rather than lost capability #defect #cleanup
- [risk] A barrel plus a circular import silently breaks test mocking in a defect that recurs on current tool versions, so an auto-generated barrel over 40+ modules carries correctness risk and not merely a cold-start cost #research #testing
- [constraint] Two of five research briefs never delivered, including the one on source-importing-build-output; conclusions touching that question rest on analogy rather than direct evidence #gap #research
- [decision] The wildcard export pattern is deleted in favour of an explicit enumerated map, ruled by the owner during this session #ruling #encapsulation

## Relations
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[ANALYSIS-005: Skills Ecosystem Enforcement Wiring Deep Analysis]]
- relates_to [[ANALYSIS-007: Baseline Evaluation of the Composition Integration Commit]]
- relates_to [[ADR-001: Composition Library Architecture]]
