---
title: "ANALYSIS-006: Brain Search and Impact-Detection Tool Surface"
type: analysis
status: DRAFT
permalink: analysis/analysis-006-brain-search-and-impact-detection-tool-surface
tags:
- analysis
- brain-mcp
- search
- impact-detection
- tooling
---

# ANALYSIS-006: Brain Search and Impact-Detection Tool Surface

## Context

The follow-up register's FU-13 commits the composition skills to computing an inbound-reference impact manifest at plan time: enumerate every note that wikilinks, cites, or enumerates a note about to be split or merged, emit the repointing worklist as part of the distribution or composition plan, and verify closure at execution. That item is IN PROGRESS rather than deferred. See [[PLAN-002: Composition Tooling Follow-Up Register]].

Before wiring that manifest to a data source, the question is which tool actually answers "what references this note" reliably. The Brain MCP `search` tool advertises mode, depth, and threshold controls that look like the natural fit. This analysis establishes what that surface really provides, what the wrapped basic-memory layer provides underneath it, and which combination the manifest should be built on.

Scope, in: the tool surface as installed, measured against the live index. Scope, out: implementing the manifest, and any change to the Brain MCP server itself.

## Executive Summary

The Brain MCP `search` tool should not carry the impact manifest in its current state. Two of its four modes return nothing at all, a third silently returns other projects' notes, and its relation-expansion parameter traverses the wrong direction, caps at five links per note, and does not complete within the tool timeout at this project's scale.

Three findings reframe the problem rather than merely cataloguing defects.

First, most references the manifest needs to find are already formal graph edges. The wrapped layer indexes every inline prose wikilink as a `links_to` relation, so a bracketed prose mention is not a "descriptive reference" requiring text search — it is a row in the relation table. In the fond graph that accounts for 101 of 568 relations. The text-search leg's real job is the narrow residue of bare, unbracketed identifiers and restated figures.

Second, the relation table is directly and cheaply queryable, indexed on the inbound direction, with no result cap and no silent truncation. It is the only instrument surveyed that cannot under-report without saying so.

Third, the underlying basic-memory layer exposes a large filter surface the Brain wrapper forwards none of — including a filter that returns relation rows directly. Most of those are a schema property plus a forwarded argument away, which makes the wrapper expansion cheap rather than speculative.

The manifest should therefore be built on the relation table with filesystem verification, and the wrapper expansion pursued as a separate, low-cost improvement that makes the same capability portable.

## Approach

Every claim below was read from the installed source rather than from documentation, and behavioural claims were additionally executed against the live server and the live index. Where the source and the running behaviour disagreed, both are recorded.

Citations use two path roots. Paths beginning `apps/` or `packages/` are relative to the Brain MCP server repository. Paths beginning `basic_memory/` are relative to the installed basic-memory package, version 0.22.1. Measurements were taken against the shared SQLite index, using the fond project as the reference graph because it is the graph the FU-13 evidence came from.

Probes run: seven live `search` calls across all modes, scoped and unscoped; read-only SQL against the entity, relation, and full-text tables plus both embedding stacks; the basic-memory command-line client for a control comparison; and a working-tree diff of the server to separate committed behaviour from in-flight changes.

## Findings

### 1. The exposed parameter surface is seven closed fields

The MCP input schema is authoritative and closed — it sets `additionalProperties: false` (`packages/validation/schemas/tools/search.schema.json`). Anything absent is rejected at validation rather than ignored.

| Param | Default | Bounds | Applies to |
|---|---|---|---|
| `query` | required | `minLength: 1` | all modes |
| `limit` | 10 | 1-100 | all modes |
| `threshold` | 0.7 | 0-1 | semantic legs only |
| `mode` | `auto` | `auto`/`semantic`/`keyword`/`hybrid` | — |
| `depth` | 0 | 0-3 | post-processing |
| `project` | — | — | all; not honoured in semantic |
| `full_context` | false | — | post-processing |

Definition at `apps/mcp/src/tools/search/schema.ts:41-71`; handler at `apps/mcp/src/tools/search/index.ts:63-121`.

There is no folder, entity-type, note-type, date, tag, status, or metadata filter; no retrieval-strategy selector; no permalink wildcard; and no pagination beyond `limit`. `full_context` truncates at 5000 characters (`apps/mcp/src/services/search/index.ts:50`), which is roughly the first quarter of a typical analysis note in this ecosystem.

### 2. All four modes, and why the naming misleads

Mode dispatch is at `apps/mcp/src/services/search/index.ts:149-185`.

| | `keyword` | `semantic` | `hybrid` | `auto` |
|---|---|---|---|---|
| Mechanism | proxies to the wrapped `search_notes` | the wrapper's own vector index | runs both legs in parallel | semantic first, keyword on empty |
| Implementation | `:455-500` | `:398-453` | `:502-538` | `:540-568` |
| Filters honoured | `project` and page size only | `threshold` | union of legs | whichever leg ran |
| Reliability here | dead, returns empty for every query | leaks across projects | degraded to semantic-only, and mis-ranks | degrades to semantic-or-nothing |
| Fit for the manifest | would be the strongest leg for exact identifiers | descriptive references only | no independent value as implemented | unsafe, gives no signal which leg answered |

A naming trap sits underneath this. The `keyword` mode never requests keyword search. It calls the wrapped tool without a retrieval-strategy argument (`:463-470`), so the wrapped layer applies its own default, which is hybrid whenever semantic search is enabled and text otherwise (`basic_memory/mcp/tools/search.py:42-55`). On the configuration in use, semantic search is enabled and no explicit default is set, so `mode: "keyword"` is in fact requesting hybrid retrieval. Genuine keyword behaviour requires passing the strategy explicitly.

Filters behave uniformly across retrieval modes at the wrapped layer: the hybrid path forwards the identical filter set to both the full-text leg and the vector leg (`basic_memory/repository/search_repository_base.py:2175-2205`), and non-full-text modes dispatch through the same filtered path (`basic_memory/repository/sqlite_search_repository.py:1080-1091`). No capability would be stranded in a single mode if exposed.

### 3. Two defects that disable the tool today

**Keyword mode returns nothing for every query.** The wrapped layer defaults its response format to rendered markdown (`basic_memory/mcp/tools/search.py:650`). The wrapper does not request JSON and then parses the response as JSON (`apps/mcp/src/services/search/index.ts:481`). The parse throws, the handler logs at debug level, and it returns an empty array (`:489-495`). The failure is silent — an empty result set, not an error. This also kills the `auto` fallback leg, the `hybrid` keyword leg, and the wikilink resolution inside `depth` expansion, which resolves each link through a keyword search (`:672-685`) and therefore yields empty permalinks.

Measured: a query for `coverage` scoped to fond returned zero results through the tool, while the same term matched 115 rows in the full-text index directly and returned correct notes through the command-line client.

A secondary quirk compounds it. The full-text tokenizer treats hyphens as separators, so an unquoted hyphenated identifier fails to parse outright — a query for `analysis-034` errors rather than returning nothing. Quoting fixes it. Since every identifier in this ecosystem is hyphenated, entity-identifier queries must be double-quoted, and the wrapper does not do this for caller-supplied queries.

**Semantic mode ignores the project argument.** The wrapper's vector index is a single global table with no project column (`apps/mcp/src/db/vectors.ts:191-194`), so scoping must be applied by joining through the entity table. At the committed revision, the semantic search was invoked without a project argument at all four of its call sites, so the unscoped branch ran unconditionally and result titles were derived lossily from permalink slugs rather than read from the index.

Measured: a search explicitly scoped to fond returned five results, none of them from fond. The lossy title is the tell — the tool returned a space-separated Title Case string where the canonical identifier carries a capitalised prefix and a colon.

A correction for this was present in the working tree, uncommitted, at the time of the survey, and the server process serving the session predated it. The defect is therefore real at the committed revision and being addressed; any consumer should treat semantic results as project-unverified until the correction lands and the server restarts.

### 4. Relation expansion is the wrong instrument

The `depth` parameter reads each hit with a note read and regex-extracts wikilinks from the raw body (`apps/mcp/src/services/search/index.ts:615-659`). Four properties disqualify it for impact detection.

It is outbound only — it follows links *from* a note, whereas the manifest needs to know what points *at* it. It caps at five links per note per level with no truncation signal (`:639`). Its link resolution runs through the broken keyword path. And it fans out to one note read plus five searches per node per level. Measured: a call at depth 1 with a limit of 1 exceeded the thirty-second tool timeout and was aborted. It does not merely run slowly at this scale; it does not complete.

### 5. The relation table is the real backlink surface

The wrapped layer's markdown parser classifies every bracketed reference in a note body. A single-token verb prefix, or a quoted multi-word label, produces a typed relation; every other bracketed reference anywhere in the body produces a `links_to` relation (`basic_memory/markdown/plugins.py:187`, documented at `basic_memory/mcp/tools/write_note.py:106`).

This is the finding that reframes the manifest. Prose mentions written as wikilinks are already edges. Measured across the fond graph: 73 entities, 568 relations, none unresolved, of which 101 are `links_to` — that is, prose mentions rather than declared Relations-section entries.

The relation table carries source, target, target name, type, and project, with indexes on both directions. An inbound query is a single indexed statement with no cap. Ranked by inbound degree, the fond graph's most-referenced notes are its plan at 66 inbound edges, its primary architecture record at 37, and its product record at 29 — precisely the notes whose decomposition would carry the widest blast radius.

Two further properties matter. The target identifier is nullable while the target *name* is not, so an inbound wikilink whose target no longer resolves persists with a null identifier — exactly the breakage a rename produces. The fond baseline is zero such rows, which makes it usable as a post-operation assertion rather than merely a diagnostic. And relation rows are themselves indexed as searchable full-text rows titled as source-arrow-target, so they are reachable through search once the wrapper forwards an entity-type filter.

### 5a. Relation types are silently lost on notes with grouped Relations sections

This was discovered by authoring this note and reading its own edges back out of the index, and it materially bounds relation-type filtering.

The parser derives a relation's type from a single-token prefix appearing before the bracketed reference **on the same line**. A bullet carrying only a bracketed reference, with no verb ahead of it, has no prefix and falls through to the untyped `links_to` case (`basic_memory/markdown/plugins.py:79-107` for the prefix rule, `:187` for the fallback).

A related trap surfaced while writing this section, and it is worth recording because it will catch any note that documents wikilink syntax. The parser extracts bracketed references without regard for inline code spans, so a reference used as a typographic example inside backticks still becomes a real edge — in this case an unresolved one, pointing at a target that does not exist. Prose that needs to discuss the syntax must describe it rather than display it. The same hazard applies to any skill that generates note bodies containing sample wikilinks.

The authoring conventions require that a Relations section be grouped under type sub-headings once a note exceeds twelve relations, which moves the verb out of the line and into the heading above it. The parser never sees it.

Measured on two notes in this project, one of each shape. The adapter-contract record, whose Relations section is grouped under sub-headings, has **all fifteen of its relations indexed as `links_to`** and not one typed edge — every declared implementation, containment, and cross-reference verb is absent from the index. The follow-up register, whose Relations section is a flat list carrying inline verbs, indexes correctly: three typed edges from its Relations section plus two untyped ones from prose mentions.

Two consequences for the manifest.

Relation-type filtering is unreliable on exactly the notes that matter most — the heavily-referenced hubs are the ones that cross the twelve-relation threshold and get grouped. A traversal that selects on type will silently miss every grouped note's real edges while still seeing them as untyped links.

Edge *existence* remains sound in both shapes. The inbound direction is complete regardless of grouping, because the untyped fallback still records source, target, and project. So a manifest built on "what points at this note" is safe; one built on "what declares itself a child of this note" is not.

### 6. Adjacent tools, assessed against the search tool

The wrapper hides only the raw search tool (`apps/mcp/src/tools/index.ts:425`); everything else the wrapped layer exposes is proxied through.

| Tool | Assessment against `search` |
|---|---|
| Context builder | **Better** for backlink traversal. Its traversal is genuinely bidirectional and cycle-safe (`basic_memory/services/context_service.py:537`, `:650`, guard at `:558`), where `depth` is outbound-only. Two defaults must be overridden or it silently under-reports: a seven-day timeframe filter that drops older notes, and a ten-result cap on related items. |
| Recent activity | **Better** for verification. It filters by item type including relations, and by timeframe — a time dimension the search tool lacks entirely. |
| Directory listing | **Better** for enumeration. It globs and recurses; the search tool ranks and truncates and cannot enumerate a folder. |
| Note read | **Ground truth** for a single note. One caveat: a miss returns a success response whose body is a help page, so a naive caller can mistake boilerplate for content. |
| Bootstrap context | **Not usable** as an impact instrument; its timeframe argument has no effect on its search legs, per finding 8. |

### 7. Direct index queries as the alternative

The index is readable directly. The entity table carries indexed generated columns for frontmatter type, status, and tags; the relation table is indexed on both directions; the full-text table covers title, content, and permalink.

For backlink traversal a direct inbound query is better than every MCP option — indexed, uncapped, direction-explicit, and independent of both broken code paths. For discovery and verification it is roughly equal to a repaired search tool and worse on portability. The honest coupling cost is a binding to the migration-managed schema, to the index location, and to sync timing, since a note written seconds earlier may not yet be indexed.

The index's reputation for unreliability did not survive testing. Each documented defect was checked rather than assumed: the fond graph showed exact parity between files on disk and indexed entities with no orphans in either direction; apparent duplicate-permalink suffixes proved to be legitimate title text rather than collision markers; and no permalink was shared across any two of the fifteen indexed projects. The cross-project leak is real but lives in the search layer, not the index. One genuine wart: decompose plan files written into the notes tree are indexed as entities with null permalinks, so any note count taken from the entity table runs high unless permalinks are required.

### 8. Capabilities present underneath but not exposed — a selection-ready delta

The wrapper forwards exactly three arguments to the wrapped search: query, page size, and project (`apps/mcp/src/services/search/index.ts:463-470`). Everything below exists underneath and is unreachable.

Effort class **A** means a schema property, a destructure at `apps/mcp/src/tools/search/index.ts:67`, an options field at `apps/mcp/src/services/search/types.ts:26-77`, and a forwarded argument at `apps/mcp/src/services/search/index.ts:463-470` — no new logic and no result-shape change. Class **B** additionally touches result mapping. Class **C** is architectural.

| # | Capability | Source | Effort | Value for the manifest |
|---|---|---|---|---|
| 1 | Item-type filter, including relations | `basic_memory/mcp/tools/search.py:663-671` | A | Highest — makes backlink traversal portable over MCP, the leg `depth` fails at. Returns edge existence reliably; per finding 5a the *verb* on those edges is not trustworthy on grouped notes |
| 2 | JSON response format | `:650` | A | Unblocks everything — the single argument that revives keyword mode and the paths downstream of it |
| 3 | Retrieval-strategy selector | `:649`, dispatch `:1040-1067` | A | High — gives genuine text search, plus title and permalink exact lookup |
| 4 | Permalink wildcard patterns | `:1059-1062` | A | High — enumerates a note family with no text query; matches the full path, not the leaf |
| 5 | Frontmatter type filter | `:652-662` | A | Medium — scopes a sweep to decisions or analyses |
| 6 | Date filter | `:682-688` | A | Medium — staleness sweeps; also repairs the dead field in finding 8 below |
| 7 | Structured frontmatter filters with comparison operators | `:689-692` | A | Medium — backed by indexed generated columns, so cheap |
| 8 | Tag and status shorthands | `:699-703` | A | Low-medium |
| 9 | Observation-category filter | `:672-680` | A | Medium — targets decision and requirement bullets exactly |
| 10 | Page number | `:641-644` | A | Medium — the wrapper cannot currently reach a second page |
| 11 | Filter-only search with no query | `:625-628`, gate `:1094-1101` | A | Medium-high — enumerate structurally with no text term |
| 12 | Per-query similarity override | `:704-710` | A | Low — the existing threshold covers it |
| 13 | Cross-project search | `:631-637` | A | Low, and it contradicts the leak fix; recommend not exposing |
| 14 | Delegate semantic and hybrid to the wrapped stack | `basic_memory/repository/search_repository_base.py:2160-2263` | C | Strategic — see below |

Item 14 deserves its own framing. There are two independent embedding stacks in the same database. The wrapper maintains its own, generated through a local model, holding roughly 30,000 chunks in a global table with no project column. The wrapped layer maintains a separate one, roughly 113,000 chunks, with the project as a first-class indexed column and content-hash columns for staleness detection. Delegating would obtain project-safe scoping by construction, four times the coverage, and a principled score fusion, while deleting the code paths behind both defects in finding 3.

That fusion difference is worth stating precisely, because it affects ranking quality today. The wrapped layer normalises full-text scores to a nought-to-one range before combining them with vector scores, then fuses by taking the stronger signal plus a bonus for agreement between the two. The wrapper instead concatenates its two legs and sorts by raw score, where one leg produces cosine similarity bounded at one and the other passes through already-fused scores that exceed one in practice. Any keyword hit therefore outranks every semantic hit once its raw score passes one. The wrapper's hybrid is worse than the hybrid already implemented beneath it.

Two capabilities exist inside the wrapper itself but never reach the schema. A folder filter is fully implemented and used by internal callers (`apps/mcp/src/services/search/index.ts:215-222`), but applies after the result limit has already truncated, so it cannot enumerate a folder and would need that ordering fixed alongside exposure. A date field is declared, plumbed into the live options object, and then never read by any code path (`apps/mcp/src/services/search/types.ts:64-68` and `:139`) — four internal call sites pass it believing it filters, which means the bootstrap tool's timeframe argument has no effect on its search legs. That is a live correctness defect, not merely a gap.

## Recommendations

**Build the manifest's backlink leg on the relation table directly, not on the search tool.** It is indexed, uncapped, direction-explicit, and independent of both defects in finding 3. Gate the manifest on two cheap assertions so that a silently empty result can never be mistaken for an absence of impact: parity between the file count on disk and the count of indexed entities carrying permalinks, and a before-and-after count of relations whose target identifier is null. The second must be read as a delta rather than an absolute: the fond baseline is zero, but this project's is 97, so the assertion is that the count does not rise, not that it is empty.

**Traverse on edge existence, not edge type.** Per finding 5a, relation verbs are absent from the index on any note whose Relations section is type-grouped, which is precisely the set of heavily-referenced hub notes a decomposition is most likely to touch. A manifest that selects edges by type will silently under-report on exactly those notes. If typed traversal is genuinely required, read the note body rather than the index for that step — or fix the parser-visible shape of grouped Relations sections, which is the more durable repair and belongs on the register.

**Scope the text-search leg to what is genuinely unlinked.** Bracketed prose mentions are already edges and belong to the backlink leg. A manifest that text-searches for what the relation table already knows will double-count and appear far less precise than it is. The text leg's job is bare identifiers and restated figures — and it must double-quote hyphenated identifiers to parse at all.

**Pursue the wrapper expansion as a separate, low-cost change.** Items 2, 1, 3, and 4 from the delta are all effort class A and together serve all three legs — the JSON response format alone revives keyword mode and everything downstream of it, and should ship regardless of what else is selected. Two adjacent one-line repairs belong in the same change: the dead date field, whose repair also fixes the bootstrap tool, and the folder filter's apply-after-limit ordering. Item 14 is the strategically correct long-term move but is architectural and belongs to a separate decision.

**Treat the relation-count caps as a named hazard in the skills' own design.** The register's FU-13 already calls for removing residual relation-count caps that would truncate traversal. This analysis supplies the specific values to design against: five links per note per level in the wrapper's expansion, ten related items in the context builder, and a seven-day default timeframe on that same builder. None of the three signals truncation when it occurs.

## Observations

- [problem] Two of the four Brain search modes return nothing on this build, and a third returns other projects' notes despite an explicit project argument, so the tool cannot be trusted as the manifest's data source without verification #search-defects #impact-detection
- [insight] Bracketed prose mentions are already formal graph edges rather than descriptive references, because the wrapped parser indexes every inline wikilink as a relation — 101 of 568 relations in the reference graph #graph-edges #reframing
- [decision] The manifest's backlink leg should be built on the relation table directly, because it is the only surveyed instrument that is indexed, uncapped, and direction-explicit #manifest-design #backlinks
- [fact] The relation table stores a non-null target name alongside a nullable target identifier, so a rename leaves a null-identifier row — a mechanical post-operation breakage detector with a zero baseline #breakage-detection #assertion
- [constraint] The wrapper's relation expansion is outbound-only, caps at five links per note per level, and exceeded the thirty-second tool timeout at depth one on a 73-note graph #depth-expansion #timeout
- [fact] Filters apply uniformly across every retrieval mode at the wrapped layer, so no exposed filter would be stranded in a single mode #filter-uniformity #expansion
- [insight] Two independent embedding stacks share one database — the wrapper's has no project column and a quarter the coverage of the wrapped layer's, which explains the cross-project leak structurally rather than incidentally #embeddings #architecture
- [risk] Three silent-truncation defaults sit across the toolchain — five links per node, ten related items, and a seven-day timeframe — and none signals that truncation occurred #silent-truncation #caps
- [outcome] Eleven of fourteen unexposed capabilities are a schema property plus a forwarded argument, which makes the wrapper expansion cheap rather than speculative #delta #effort
- [problem] The convention requiring type-grouped Relations sub-headings above twelve relations strips the verb from the line the parser reads, so every relation on a grouped note indexes as untyped — measured as fifteen of fifteen on the adapter-contract record #relation-typing #convention-defect
- [constraint] Edge existence survives grouping even though edge type does not, so an inbound-reference manifest is safe on grouped notes while a type-selective traversal is not #traversal-safety #manifest-design
- [risk] The parser extracts bracketed references from inside inline code spans, so a wikilink shown as a typographic example becomes a real and usually unresolved edge — this note created one while documenting the rule and had to be corrected #code-span-trap #authoring
- [fact] The index's documented unreliability did not reproduce under test — exact disk-to-index parity, no genuine duplicate permalinks, and no permalink shared across any two of fifteen projects #index-health #measured

## Relations

- relates_to [[PLAN-002: Composition Tooling Follow-Up Register]]
- relates_to [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-007: Baseline Evaluation of the Composition Integration Commit]]
