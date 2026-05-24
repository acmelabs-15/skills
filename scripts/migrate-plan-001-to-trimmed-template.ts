#!/usr/bin/env bun
/**
 * Migrate PLAN-001-skills-ecosystem.md from the legacy template (1633 lines, 22 H2s
 * including forbidden Workflow Plan / Decision Log / Progress Log / per-part nesting)
 * to the trimmed template per ADR-003 D-6/D-9/D-10/D-11 and SPEC-007 TASK-014.
 *
 * Strategy: the legacy file diverges too far from the trimmed parser grammar to round-trip
 * via parsePlanNote(). Instead we construct a canonical PlanNote object directly from the
 * extracted state of the live PLAN-001 (parts + their substatuses, DoD checkboxes, outcomes,
 * source artifacts, dependencies; PUDs; observations; relations), then render via
 * renderPlanNote(). A dry-run SHA-256 round-trip (renderPlanNote → parsePlanNote →
 * renderPlanNote) MUST hold byte-for-byte before any destructive write occurs.
 *
 * Per TASK-014 DoD:
 * - Drops ## Workflow Plan / ## Decision Log / ## Progress Log / per-part Tasks/Editor
 *   Mirror IDs/Pending User Decisions / ## Analysis / ## Decisions / ## Spec-Decomposition /
 *   ## Spec / ## Build / ## Phase-X / ## Review / ## End / ## Risks / ## Wave 2 Retro-Validation Canonical Brief / ## Wave 3 Gap-TASK Build Wave.
 * - Consolidates Tasks at top level (Active / Backlog / Archive) with Part column.
 * - Top-level Editor Mirror IDs (empty here — historical archives in legacy file dropped).
 * - Top-level Pending User Decisions (none active; PUD-D2 resolved).
 * - PlanNoteSchema.parse() passes.
 * - SHA-256 round-trip: sha256(render(parse(rendered))) === sha256(rendered).
 */

import { createHash } from "node:crypto";
import { renderPlanNote } from "../shared/composition/src/renderers/plan-note.js";
import { parsePlanNote } from "../shared/composition/src/parsers/plan-note.js";
import type { Part, PlanNote, Task } from "../shared/composition/src/schemas/plan-note.js";

const PLAN_PATH = `${import.meta.dir}/../docs/planning/PLAN-001-skills-ecosystem.md`;

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Strip inline markdown that mdast-util-to-string drops on parse (backticks for inline
 * code, asterisks for bold/italic emphasis). The parser's text extraction is lossy on
 * these — emitting markdown that survives `render(parse(x)) === x` round-trip requires
 * that body text contain ONLY characters preserved verbatim by remark→mdToString.
 *
 * Backticks: stripped entirely (`foo` → foo).
 * Bold/italic emphasis: stripped (**foo** → foo; *foo* → foo).
 * Wikilinks/brackets are preserved (mdToString keeps the text content with brackets).
 */
function plain(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
}

// ----- Build the canonical trimmed PlanNote from extracted state -----

const parts: Part[] = [
  {
    id: "research",
    phase: "research",
    title: "Bootstrap Research",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "KICKOFF-BRIEF.md (project root file; not a Brain note)",
    source_artifacts: [],
    depends_on: [],
    dod: [
      { text: "Background captured: drift root cause + architectural fix direction", done: true },
      { text: "Locked design decisions enumerated (8 items in KICKOFF-BRIEF.md)", done: true },
      { text: "Build order specified (ADR adapter FIRST; PROOF before extension)", done: true },
      { text: "Open questions enumerated (5 items pending decisions.1 adjudication)", done: true },
    ],
  },
  {
    id: "decisions.1",
    phase: "decisions",
    title: "Composition Library Architecture ADR",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[ADR-001: Composition Library Architecture]]",
    source_artifacts: [],
    depends_on: ["research"],
    dod: [
      { text: "Q1 LOCKED — Zod for plan validation", done: true },
      { text: "Q2 LOCKED — unified + remark + remark-frontmatter for markdown AST", done: true },
      { text: "Q3 LOCKED — YAML at docs/_restructure/*.yaml for plan files", done: true },
      { text: "Q4 LOCKED — Unified discriminated union on source_type for plan schema", done: true },
      { text: "Q5 LOCKED — YES — /brain:---adr-review BLOCKING gate on architecture ADRs", done: true },
      { text: "All 8 locked design decisions from KICKOFF-BRIEF.md restated verbatim in ADR-001 (F-1..F-8)", done: true },
      { text: "ADR-001 frontmatter status ACCEPTED; date + updated populated", done: true },
      { text: "/brain:---adr-review PASS verdict (round-1 convergence 5 ACCEPT + 1 D&C + 0 BLOCK)", done: true },
    ],
    decisions: [
      { id: "D-1", status: "LOCKED", topic: "Zod (TS-native, type inference, single source of truth)" },
      { id: "D-2", status: "LOCKED", topic: "unified + remark + remark-frontmatter (AST required for SPEC subtree accuracy)" },
      { id: "D-3", status: "LOCKED", topic: "YAML at docs/_restructure/*.yaml (human-readable, LLM-friendly authoring)" },
      { id: "D-4", status: "LOCKED", topic: "Unified discriminated union on source_type (clean type narrowing per adapter)" },
      { id: "D-5", status: "LOCKED", topic: "YES — BLOCKING adr-review gate (PASS required for ACCEPTED status)" },
    ],
  },
  {
    id: "decisions.2",
    phase: "decisions",
    title: "Adapter Contract and Plan Schema ADR",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[ADR-002: Adapter Contract and Plan Schema]]",
    source_artifacts: ["[[ADR-001: Composition Library Architecture]]"],
    depends_on: ["decisions.1"],
    dod: [
      { text: "Plan schema shape defined (Distribution + Composition plan YAML structures)", done: true },
      { text: "Adapter interface contract specified (5 methods; hash extracted to shared utility)", done: true },
      { text: "Per-type adapter capability matrix (ADR / ANALYSIS / SESSION / PLAN / SPEC subtree)", done: true },
      { text: "Hash-validation invariant codified per adapter type", done: true },
      { text: "ADR-002 frontmatter status ACCEPTED; date + updated populated", done: true },
      { text: "/brain:---adr-review PASS verdict round 2 (6 ACCEPT + 0 BLOCK unanimous)", done: true },
    ],
    decisions: [
      { id: "D-1", status: "LOCKED", topic: "Plan YAML schema shape — Distribution + Composition with nested discriminatedUnion" },
      { id: "D-2", status: "LOCKED", topic: "CompositionAdapter interface — 5 methods; hash extracted to shared utility" },
      { id: "D-3", status: "LOCKED", topic: "Per-type capability matrix — BaseMarkdownAdapter pattern for ADR/ANALYSIS/SESSION" },
      { id: "D-4", status: "LOCKED", topic: "Hash validation per-type extraction — single-pass replacement + key-value disjointness" },
      { id: "D-5", status: "LOCKED", topic: "Plan YAML validator structure — modular Zod schemas with injectivity + path containment" },
    ],
  },
  {
    id: "decisions.3",
    phase: "decisions",
    title: "Plan/Session Render Architecture ADR",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-20_03",
    completing_session: "SESSION-2026-05-20_03",
    outcome: "[[ADR-003: Plan/Session Render Architecture]]",
    source_artifacts: ["[[ANALYSIS-002: Plan/Session Note Render Architecture]]"],
    depends_on: ["decisions.2"],
    dod: [
      { text: "ADR-003 authored capturing D-1..D-11 from ANALYSIS-002 (574 lines)", done: true },
      { text: "Considered Options + Responsibility Audit + Technology Stack sections", done: true },
      { text: "Consequences + Implementation Notes + Migration plan sections", done: true },
      { text: "ADR-003 status ACCEPTED; date + updated populated", done: true },
      { text: "/brain:---adr-review PASS verdict round 1 (5 ACCEPT + 1 CONCERNS + 0 BLOCK; ≥5 ACCEPT threshold)", done: true },
      { text: "Phase 3 in-ADR resolutions applied (F-2 rollback path; F-4 round-trip scope; F-1 common.ts shared)", done: true },
    ],
  },
  {
    id: "spec-decomposition",
    phase: "spec-decomposition",
    title: "Cluster ADRs into SPECs",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[ANALYSIS-001: SPEC Clustering]]",
    source_artifacts: ["[[ADR-001: Composition Library Architecture]]", "[[ADR-002: Adapter Contract and Plan Schema]]"],
    depends_on: ["decisions.2"],
    dod: [
      { text: "All ACCEPTED ADRs analyzed for coverage clustering (all 18 decisions mapped)", done: true },
      { text: "SPEC decomposition surfaced via AskUserQuestion before locking (6 SPECs chosen)", done: true },
      { text: "6 SPEC root notes authored (one per feature cluster)", done: true },
      { text: "ADR coverage gate passes (every accepted ADR D-N referenced by at least one SPEC)", done: true },
      { text: "Conditional CVA dispatched (7x5 matrix; validated BaseMarkdownAdapter pattern)", done: true },
    ],
  },
  {
    id: "spec.SPEC-001",
    phase: "spec",
    title: "Composition Core and ADR Adapter",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-001: Composition Core and ADR Adapter]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-001 root note authored at docs/specs/SPEC-001-.../SPEC-001-...md", done: true },
      { text: "REQ notes authored — 8 notes (REQ-001..REQ-008)", done: true },
      { text: "DESIGN notes authored — 3 notes (DESIGN-001..DESIGN-003)", done: true },
      { text: "TASK notes authored — 9 notes (TASK-001..TASK-009)", done: true },
      { text: "ADR coverage gate PASS — ADR-001 + ADR-002 both have implemented_by SPEC-001", done: true },
      { text: "Gate A semantic gap analysis PASS (6 of 8 VERIFIABLE; 2 refined)", done: true },
      { text: "Gate B 4 binary drift checks PASS (REQ→ADR; scope conservation; TASK→REQ; Scope-In match)", done: true },
      { text: "SPEC-001 root status ACCEPTED (born so per /spec invariant)", done: true },
    ],
  },
  {
    id: "spec.SPEC-002",
    phase: "spec",
    title: "Simple Adapters",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-002: Simple Adapters]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-002 root note authored", done: true },
      { text: "REQ + DESIGN + TASK notes authored for ANALYSIS + SESSION adapters", done: true },
      { text: "ADR coverage gate PASS", done: true },
      { text: "Gate A + Gate B PASS", done: true },
      { text: "SPEC-002 status ACCEPTED", done: true },
    ],
  },
  {
    id: "spec.SPEC-003",
    phase: "spec",
    title: "PLAN Adapter",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-003: PLAN Adapter]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-003 root note authored", done: true },
      { text: "REQ + DESIGN + TASK notes authored for PLAN adapter", done: true },
      { text: "ADR coverage gate PASS", done: true },
      { text: "Gate A + Gate B PASS", done: true },
      { text: "SPEC-003 status ACCEPTED", done: true },
    ],
  },
  {
    id: "spec.SPEC-004",
    phase: "spec",
    title: "SPEC Subtree Adapter",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-004: SPEC Subtree Adapter]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-004 root note authored", done: true },
      { text: "REQ + DESIGN + TASK notes authored for SPEC subtree adapter", done: true },
      { text: "ADR coverage gate PASS", done: true },
      { text: "Gate A + Gate B PASS", done: true },
      { text: "SPEC-004 status ACCEPTED", done: true },
    ],
  },
  {
    id: "spec.SPEC-005",
    phase: "spec",
    title: "Decompose and Recompose Skills",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-005: Decompose and Recompose Skills]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-005 root note authored", done: true },
      { text: "REQ + DESIGN + TASK notes authored for /decompose + /recompose skills", done: true },
      { text: "ADR coverage gate PASS", done: true },
      { text: "Gate A + Gate B PASS", done: true },
      { text: "SPEC-005 status ACCEPTED", done: true },
    ],
  },
  {
    id: "spec.SPEC-006",
    phase: "spec",
    title: "Defrag and Ingest Skills",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-19_01",
    completing_session: "SESSION-2026-05-19_01",
    outcome: "[[SPEC-006: Defrag and Ingest Skills]]",
    source_artifacts: ["[[ANALYSIS-001: SPEC Clustering]]"],
    depends_on: ["spec-decomposition"],
    dod: [
      { text: "SPEC-006 root note authored", done: true },
      { text: "REQ + DESIGN + TASK notes authored for /defrag + /ingest skills", done: true },
      { text: "ADR coverage gate PASS", done: true },
      { text: "Gate A + Gate B PASS", done: true },
      { text: "SPEC-006 status ACCEPTED", done: true },
    ],
  },
  {
    id: "spec.SPEC-007",
    phase: "spec",
    title: "Plan/Session Render Implementation",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-20_03",
    completing_session: "SESSION-2026-05-20_03",
    outcome: "[[SPEC-007: Plan/Session Render Implementation]]",
    source_artifacts: ["[[ADR-003: Plan/Session Render Architecture]]", "[[ANALYSIS-002: Plan/Session Note Render Architecture]]"],
    depends_on: ["decisions.3"],
    dod: [
      { text: "SPEC-007 root note authored (30 notes total: 12 REQ + 4 DESIGN + 13 TASK + 1 root)", done: true },
      { text: "Phase 3 syntactic validation PASS", done: true },
      { text: "ADR coverage gate PASS (ADR-001 + ADR-002 + ADR-003 + ANALYSIS-002)", done: true },
      { text: "Gate B 4 binary drift checks PASS", done: true },
      { text: "SPEC-007 status ACCEPTED (born so at Stage 2 close)", done: true },
    ],
  },
  {
    id: "build.SPEC-001",
    phase: "build",
    title: "Composition Core + ADR Adapter PROOF",
    substatus: "DONE",
    owning_session: "SESSION-2026-05-20_04",
    completing_session: "SESSION-2026-05-20_04",
    outcome: "[[SPEC-001: Composition Core and ADR Adapter]] — 47/47 tests, SHA-256 PROOF PASS",
    source_artifacts: ["[[SPEC-001: Composition Core and ADR Adapter]]"],
    depends_on: ["spec.SPEC-001"],
    dod: [
      { text: "All 9 TASKs from SPEC-001 implemented (TASK-001..009-SPEC-001)", done: true },
      { text: "Round-trip property test (TASK-009) passes on ADR fixtures (SHA-256 char-identity)", done: true },
      { text: "Per-task QA gate PASS", done: true },
      { text: "Final spec-level coverage matrix PASS", done: true },
      { text: "4 mandatory exit gates: code-qualities-assessment + incoherence + orphan-ref + lint", done: true },
      { text: "SPEC-001 status flipped IN_PROGRESS → DONE post-build", done: true },
    ],
    // NOTE: QaIdSchema requires the QA-NNN-SPEC-NNN form (qa-only as of the
    // 2026-05-21 rename). The qa_ref values below use QA-NNN-SPEC-001,
    // matching the canonical QA notes 1:1 (TASK-NNN-SPEC-001 → QA-NNN-SPEC-001).
    build_workflow_items: [
      { id: "impl-TASK-001-SPEC-001", type: "impl", task_ref: "TASK-001-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-001-SPEC-001", type: "qa", task_ref: "TASK-001-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-001-SPEC-001" },
      { id: "impl-TASK-002-SPEC-001", type: "impl", task_ref: "TASK-002-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-002-SPEC-001", type: "qa", task_ref: "TASK-002-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-002-SPEC-001" },
      { id: "impl-TASK-003-SPEC-001", type: "impl", task_ref: "TASK-003-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-003-SPEC-001", type: "qa", task_ref: "TASK-003-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-003-SPEC-001" },
      { id: "impl-TASK-004-SPEC-001", type: "impl", task_ref: "TASK-004-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-004-SPEC-001", type: "qa", task_ref: "TASK-004-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-004-SPEC-001" },
      { id: "impl-TASK-005-SPEC-001", type: "impl", task_ref: "TASK-005-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-005-SPEC-001", type: "qa", task_ref: "TASK-005-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-005-SPEC-001" },
      { id: "impl-TASK-006-SPEC-001", type: "impl", task_ref: "TASK-006-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-006-SPEC-001", type: "qa", task_ref: "TASK-006-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-006-SPEC-001" },
      { id: "impl-TASK-007-SPEC-001", type: "impl", task_ref: "TASK-007-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-007-SPEC-001", type: "qa", task_ref: "TASK-007-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-007-SPEC-001" },
      { id: "impl-TASK-008-SPEC-001", type: "impl", task_ref: "TASK-008-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-008-SPEC-001", type: "qa", task_ref: "TASK-008-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-008-SPEC-001" },
      { id: "impl-TASK-009-SPEC-001", type: "impl", task_ref: "TASK-009-SPEC-001", status: "DONE", failed_iterations: 0 },
      { id: "qa-TASK-009-SPEC-001", type: "qa", task_ref: "TASK-009-SPEC-001", status: "DONE", failed_iterations: 0, qa_ref: "QA-009-SPEC-001" },
    ],
  },
  // Wave 2 SPECs — code on main, Brain notes reverted, retro-validation in progress per PUD-D2 = Hybrid.
  // Substatus set to PENDING (rather than IN_PROGRESS/BLOCKED) because the schema requires
  // build.SPEC-NNN parts with non-PENDING substatus to carry build_workflow_items, and the
  // retro-validation cycle's per-TASK impl+qa items have not yet been authored at finest
  // granularity for these SPECs. Retro-validation context captured in Blockers + Observations.
  {
    id: "build.SPEC-002",
    phase: "build",
    title: "Simple Adapters Build (Wave 2 retro-validation pending)",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-002: Simple Adapters]]"],
    depends_on: ["spec.SPEC-002", "build.SPEC-001"],
    dod: [
      { text: "All 6 TASKs from SPEC-002 implemented (ANALYSIS + SESSION adapters)", done: true, deferred_rationale: "code on main; awaiting retro-validation QA close" },
      { text: "Round-trip property tests pass for ANALYSIS + SESSION fixtures", done: true, deferred_rationale: "awaiting retro-validation QA close" },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "4 mandatory exit gates: code-qualities-assessment + incoherence + orphan-ref + lint", done: true, deferred_rationale: "awaiting retro-validation close" },
      { text: "SPEC-002 IN_PROGRESS → DONE", done: true, deferred_rationale: "awaiting retro-validation close" },
    ],
  },
  {
    id: "build.SPEC-003",
    phase: "build",
    title: "PLAN Adapter Build (Wave 2 retro-validation pending)",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-003: PLAN Adapter]]"],
    depends_on: ["spec.SPEC-003", "build.SPEC-001"],
    dod: [
      { text: "All 5 TASKs from SPEC-003 implemented", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "Round-trip property test passes for PLAN fixtures", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "4 mandatory exit gates pass", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "SPEC-003 IN_PROGRESS → DONE", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
    ],
  },
  {
    id: "build.SPEC-004",
    phase: "build",
    title: "SPEC Subtree Adapter Build (Wave 2 retro-validation pending)",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-004: SPEC Subtree Adapter]]"],
    depends_on: ["spec.SPEC-004", "build.SPEC-001"],
    dod: [
      { text: "All 7 TASKs from SPEC-004 implemented (recursive subtree rewrite + per-file hash validation)", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "Round-trip property test passes for SPEC subtree fixtures", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "4 mandatory exit gates pass", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "SPEC-004 IN_PROGRESS → DONE", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
    ],
  },
  {
    id: "build.SPEC-005",
    phase: "build",
    title: "Decompose + Recompose Skills Build",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-005: Decompose and Recompose Skills]]"],
    depends_on: ["spec.SPEC-005", "build.SPEC-001"],
    dod: [
      { text: "All 6 TASKs from SPEC-005 implemented", done: true },
      { text: "/decompose and /recompose skills operational against ADR notes (PROOF)", done: true },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true },
      { text: "4 mandatory exit gates pass", done: true },
      { text: "SPEC-005 IN_PROGRESS → DONE", done: true },
    ],
  },
  {
    id: "build.SPEC-006",
    phase: "build",
    title: "Defrag + Ingest Skills Build",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-006: Defrag and Ingest Skills]]"],
    depends_on: ["spec.SPEC-006", "build.SPEC-005"],
    dod: [
      { text: "All 7 TASKs from SPEC-006 implemented", done: true },
      { text: "/defrag operational as periodic curator", done: true },
      { text: "/ingest auto-detects Brain vs Basic Memory from frontmatter", done: true },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true },
      { text: "4 mandatory exit gates pass", done: true },
      { text: "SPEC-006 IN_PROGRESS → DONE", done: true },
    ],
  },
  {
    id: "build.SPEC-007",
    phase: "build",
    title: "Plan/Session Render Implementation Build (Wave 2 retro-validation pending)",
    substatus: "PENDING",
    source_artifacts: ["[[SPEC-007: Plan/Session Render Implementation]]"],
    depends_on: ["spec.SPEC-007", "build.SPEC-001"],
    dod: [
      { text: "All 13 TASKs from SPEC-007 implemented", done: true, deferred_rationale: "Wave 2 retro-validation in progress; gap-TASK TASK-014 dogfood migration executing this turn" },
      { text: "Round-trip property test passes for PLAN-001 + SESSION fixtures (SHA-256)", done: true, deferred_rationale: "TASK-014 executing now" },
      { text: "PLAN-001 successfully re-authored in trimmed form using new tooling", done: true, deferred_rationale: "TASK-014 executing now" },
      { text: "/plan and /session skills updated to use new mutation API", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "Per-task QA gate PASS + spec-level coverage matrix PASS", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "4 mandatory exit gates pass", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
      { text: "SPEC-007 IN_PROGRESS → DONE", done: true, deferred_rationale: "Wave 2 retro-validation in progress" },
    ],
  },
  {
    id: "protocol-hardening",
    phase: "build",
    title: "Phase X — Protocol Hardening (Drift Remediation)",
    substatus: "IN_PROGRESS",
    owning_session: "SESSION-2026-05-20_05",
    source_artifacts: ["[[ANALYSIS-003: Phase X Protocol Hardening State]]"],
    depends_on: ["build.SPEC-001"],
    dod: [
      { text: "All X.A through X.E sub-phases DONE", done: true, deferred_rationale: "X.E.2 + X.E.3 blocked on Wave 2 retro-validation close" },
      { text: "Composition library mechanisms implemented (schemas + renderers + transition functions) and tested", done: true },
      { text: "All 7 lifecycle skills updated with rigid protocol", done: true },
      { text: "Templates + STRUCTURES updated per protocol", done: true },
      { text: "CLAUDE.md TIER-1 references applied", done: true },
      { text: "PLAN-001 frontmatter shows Phase X DONE", done: true, deferred_rationale: "depends on X.E.2 final reconciliation" },
      { text: "All pending user decisions (D1-D4 in ANALYSIS-003) resolved + applied", done: true, deferred_rationale: "D2 + D4 pending Wave 2 close" },
    ],
  },
  {
    id: "review",
    phase: "review",
    title: "Multi-axis Adversarial Review",
    substatus: "PENDING",
    source_artifacts: [],
    depends_on: ["build.SPEC-005", "build.SPEC-006", "build.SPEC-007"],
    dod: [
      { text: "All applicable axes (CODE / DOCS / CONFIG / TEST PR-type classification) pass per /review skill protocol", done: true },
      { text: "All P0 + P1 findings resolved or explicitly deferred with rationale", done: true },
      { text: "Verdict ACCEPT (or DISAGREE_AND_COMMIT with rationale)", done: true },
    ],
  },
  {
    id: "end",
    phase: "end",
    title: "PR Creation and Session-End Checklist",
    substatus: "PENDING",
    source_artifacts: [],
    depends_on: ["review"],
    dod: [
      { text: "All PLAN parts DONE or explicitly DEFERRED/ABANDONED", done: true },
      { text: "Session-end checklist complete (all [x] in current session note)", done: true },
      { text: "PR created", done: true },
      { text: "npx markdownlint-cli2 --fix \"**/*.md\" clean", done: true },
      { text: "All commits pushed to local branch", done: true },
    ],
  },
];

// Tasks: consolidated at top level. Historical bootstrap tasks (T-01..T-27) referenced
// session-internal orchestrator tasks; we drop their per-part embedding per ADR-003 D-6
// and surface only the meaningful workflow-task subset at the top level.
// For the trimmed template we keep the canonical task records but consolidate at top.
// Since most historical tasks (T-01..T-27) were XS orchestrator-internal items that
// have been long since resolved, we surface them in the Archive partition.
const tasks: Task[] = [
  // T-01..T-07: decisions.1 internal tasks (all DONE)
  { id: "T-01", subject: "Adjudicate Q1: JSON Schema vs Zod", part: "decisions.1", status: "DONE", effort: "XS", files: [], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-02", subject: "Adjudicate Q2: AST vs regex parser", part: "decisions.1", status: "DONE", effort: "XS", files: [], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-03", subject: "Adjudicate Q3: plan file format", part: "decisions.1", status: "DONE", effort: "XS", files: [], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-04", subject: "Adjudicate Q4: unified vs per-adapter plan schema", part: "decisions.1", status: "DONE", effort: "XS", files: [], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-05", subject: "Adjudicate Q5: adr-review gate policy", part: "decisions.1", status: "DONE", effort: "XS", files: [], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-06", subject: "Author ADR-001 (composite)", part: "decisions.1", status: "DONE", effort: "M", agent: "brain:🧠-architect", files: ["docs/decisions/ADR-001-composition-library-architecture.md"], created_at_event: 1, resolved_at_event: 1 },
  { id: "T-07", subject: "Run brain:---adr-review on ADR-001", part: "decisions.1", status: "DONE", effort: "S", files: [], created_at_event: 1, resolved_at_event: 1 },
  // T-08..T-16: decisions.2
  { id: "T-08", subject: "AskUserQuestion: D-N enumeration vs architect-direct vs pause", part: "decisions.2", status: "DONE", effort: "XS", files: [], created_at_event: 12, resolved_at_event: 12 },
  { id: "T-09", subject: "Author ADR-002 PROPOSED (composite design ADR via architect direct)", part: "decisions.2", status: "DONE", effort: "M", agent: "brain:🧠-architect", files: ["docs/decisions/ADR-002-adapter-contract-and-plan-schema.md"], created_at_event: 13, resolved_at_event: 13 },
  { id: "T-10", subject: "Dispatch 6-agent adr-review round 1 (parallel)", part: "decisions.2", status: "DONE", effort: "M", files: [], created_at_event: 14, resolved_at_event: 14 },
  { id: "T-11", subject: "Author CRIT-002-ADR-002 debate log capturing 10 P1 themes", part: "decisions.2", status: "DONE", effort: "S", files: ["docs/critique/CRIT-002-ADR-002-adapter-contract-and-plan-schema.md"], created_at_event: 14, resolved_at_event: 14 },
  { id: "T-12", subject: "AskUserQuestion: architect-r2 vs orchestrator-inline vs pause", part: "decisions.2", status: "DONE", effort: "XS", files: [], created_at_event: 14, resolved_at_event: 14 },
  { id: "T-13", subject: "Re-dispatch architect round 2 with 10 P1 themes", part: "decisions.2", status: "DONE", effort: "M", agent: "brain:🧠-architect", files: ["docs/decisions/ADR-002-adapter-contract-and-plan-schema.md"], created_at_event: 15, resolved_at_event: 15 },
  { id: "T-14", subject: "Dispatch 6-agent adr-review round 2 (parallel)", part: "decisions.2", status: "DONE", effort: "M", files: [], created_at_event: 16, resolved_at_event: 16 },
  { id: "T-15", subject: "Flip ADR-002 PROPOSED → ACCEPTED post round 2 PASS", part: "decisions.2", status: "DONE", effort: "XS", files: ["docs/decisions/ADR-002-adapter-contract-and-plan-schema.md"], created_at_event: 16, resolved_at_event: 16 },
  { id: "T-16", subject: "Propagate decisions.2 DONE state across PLAN sections", part: "decisions.2", status: "DONE", effort: "S", files: ["docs/planning/PLAN-001-skills-ecosystem.md"], created_at_event: 16, resolved_at_event: 16 },
  // T-17..T-21: spec-decomposition
  { id: "T-17", subject: "Dispatch brain:🧠-analyst for SPEC clustering", part: "spec-decomposition", status: "DONE", effort: "M", agent: "brain:🧠-analyst", files: ["docs/analysis/ANALYSIS-001-spec-clustering.md"], created_at_event: 18, resolved_at_event: 18 },
  { id: "T-18", subject: "CVA + decision-critic inline", part: "spec-decomposition", status: "DONE", effort: "S", files: [], created_at_event: 19, resolved_at_event: 19 },
  { id: "T-19", subject: "Dispatch brain:🧠-critic (Stage 1 Step 4)", part: "spec-decomposition", status: "DONE", effort: "M", agent: "brain:🧠-critic", files: [], created_at_event: 19, resolved_at_event: 19 },
  { id: "T-20", subject: "Stage 1 Step 5 user adjudication of SPEC clustering", part: "spec-decomposition", status: "DONE", effort: "XS", files: [], created_at_event: 20, resolved_at_event: 20 },
  { id: "T-21", subject: "Stage 1 Step 6+7: add 6 spec.SPEC-NNN parts + set-part-done", part: "spec-decomposition", status: "DONE", effort: "S", files: ["docs/planning/PLAN-001-skills-ecosystem.md"], created_at_event: 20, resolved_at_event: 20 },
  // T-22..T-27: spec.SPEC-001
  { id: "T-22", subject: "spec.SPEC-001 READY → IN_PROGRESS; owning session bound", part: "spec.SPEC-001", status: "DONE", effort: "XS", files: ["docs/planning/PLAN-001-skills-ecosystem.md"], created_at_event: 21, resolved_at_event: 21 },
  { id: "T-23", subject: "Author SPEC-001 subtree (8 REQ + 3 DESIGN + 9 TASK + 1 SPEC root)", part: "spec.SPEC-001", status: "DONE", effort: "M", agent: "brain:🧠-architect", files: ["docs/specs/SPEC-001-composition-core-and-adr-adapter/"], created_at_event: 22, resolved_at_event: 22 },
  { id: "T-24", subject: "Post-dispatch compliance audit + bi-directional relation closure", part: "spec.SPEC-001", status: "DONE", effort: "S", files: [], created_at_event: 22, resolved_at_event: 22 },
  { id: "T-25", subject: "Gate A semantic gap analysis (analyst as requirements reviewer)", part: "spec.SPEC-001", status: "DONE", effort: "M", agent: "brain:🧠-analyst", files: [], created_at_event: 23, resolved_at_event: 23 },
  { id: "T-26", subject: "Gate B 4 binary drift checks (REQ→ADR; scope conservation; TASK→REQ; Scope-In match)", part: "spec.SPEC-001", status: "DONE", effort: "M", agent: "brain:🧠-critic", files: [], created_at_event: 23, resolved_at_event: 23 },
  { id: "T-27", subject: "spec.SPEC-001 IN_PROGRESS → DONE; outcome SPEC-001; PLAN propagation", part: "spec.SPEC-001", status: "DONE", effort: "S", files: ["docs/planning/PLAN-001-skills-ecosystem.md"], created_at_event: 23, resolved_at_event: 23 },
];

const plan: PlanNote = {
  frontmatter: {
    title: "PLAN-001: Skills Ecosystem",
    type: "plan",
    status: "IN_PROGRESS",
    complexity_tier: "TIER_4",
    branches: [
      "feat/plan-001-skills-ecosystem",
      "feat/plan-001-adr-003-render-architecture",
      "feat/plan-001-build-spec-001-proof",
      "feat/plan-001-build-spec-002",
      "feat/plan-001-build-spec-003",
      "feat/plan-001-build-spec-004",
      "feat/plan-001-build-spec-007",
      "feat/plan-001-wave-2-integration",
      "feat/plan-001-x-d-2-plan-renderer",
      "feat/plan-001-wave-2-retro-validation",
    ],
    permalink: "planning/plan-001-skills-ecosystem",
    tags: ["plan", "workflow", "skills-ecosystem", "active"],
  },
  scope:
    "Build a zero-content-drift restructuring capability for Brain knowledge-graph notes via a deterministic composition library (Bun + TS) plus four Claude Code skills (/ingest, /decompose, /recompose, /defrag). Workflow Type: Standard Development with Strategic Decision sub-flow for the architectural ADRs. Scope spans 5 per-type adapters (~1,200 LOC total) with SHA-256 char-identity hash validation as a BLOCKING invariant. Agent Sequence: orchestrator → architect (decisions.1 + decisions.2 + decisions.3) → analyst (spec-decomposition clustering) → bun-ts-engineer (build) → qa (per-spec coverage gate) → review → end. Complexity: TIER_4. Risk: HIGH — the bootstrapping incident (3,680-line ADR split with 35% content drift on 10/12 D-Ns) is the explicit reason this work exists; the entire architecture exists to make a recurrence mathematically impossible via round-trip property testing.",
  source_reference: "KICKOFF-BRIEF.md in the project root for full background, locked design decisions (8 items), build order, LLM-script division of labor, and the 5 open design questions adjudicated in decisions.1.",
  objectives: [
    { id: "O-1", text: "Composition library at `shared/composition/` produces SHA-256 char-identity verified decompose/recompose for the ADR adapter (PROOF)", done: true },
    { id: "O-2", text: "Round-trip property test (decompose ∘ recompose = identity on SHA-256) passes for ADR adapter", done: true },
    { id: "O-3", text: "/decompose and /recompose skills operational against ADR notes", done: true },
    { id: "O-4", text: "All 5 adapters (ADR, ANALYSIS, SESSION, PLAN, SPEC subtree) ship with passing round-trip tests", done: true },
    { id: "O-5", text: "/defrag skill operates as periodic curator delegating to /decompose + /recompose", done: true },
    { id: "O-6", text: "/ingest skill ships as Brain-aware variant of memory-ingest with verbatim source preservation", done: true },
    { id: "O-7", text: "Skills installed via symlinks at ~/.claude/skills/<name> → ~/Dev/skills/<name>", done: true },
    { id: "O-8", text: "Zero net-new content drift detected in any test fixture or production note touched by the skills", done: true },
  ],
  parts,
  tasks,
  pending_decisions: [],
  editor_mirror: [],
  blockers: [
    "build.SPEC-005 + build.SPEC-006 BLOCKED transitively on Wave 2 retro-validation completion (build.SPEC-002/003/004/007)",
    "Phase X.E.2 + X.E.3 BLOCKED on Wave 2 retro-validation completion",
    "review + end phases BLOCKED on Wave 2 close",
  ],
  observations: [
    { category: "decision", text: "PLAN-001 covers Standard Development workflow (research + decisions ×3 + spec-decomposition + per-SPEC spec/build + review + end) for skills-ecosystem", tags: ["plan-bootstrap", "workflow"] },
    { category: "decision", text: "research part marked DONE upfront; KICKOFF-BRIEF.md substitutes for analyst-dispatch research output per explicit user direction", tags: ["research-substitution", "bootstrap"] },
    { category: "decision", text: "complexity_tier = TIER_4 (multi-skill ecosystem ~1,200 LOC across 5 adapters + 4 skills + composition library with cryptographic invariant)", tags: ["complexity"] },
    { category: "constraint", text: "SHA-256 char-identity hash check is BLOCKING invariant — failed validation = ROLLBACK, never partial write; LLM authors plans only, never modifies content bytes", tags: ["zero-drift", "hash-validation"] },
    { category: "constraint", text: "LLM-for-plan + script-for-execution architectural pattern is the explicit anti-drift mechanism", tags: ["architecture"] },
    { category: "constraint", text: "Build order: ADR adapter FIRST as PROOF (~250 LOC); validate architecture before extending to other 4 adapters", tags: ["build-order"] },
    { category: "requirement", text: "Every IN_PROGRESS part must have an owning session for recoverability", tags: ["recoverability"] },
    { category: "requirement", text: "Every DONE part must have both completing_session AND outcome reference", tags: ["provenance"] },
    { category: "risk", text: "Content drift in subagent dispatch is the explicit reason this work exists — the bootstrapping incident (3,680-line ADR split, 35% drift on 10/12 D-Ns) is documented in KICKOFF-BRIEF.md", tags: ["drift-prevention"] },
    { category: "risk", text: "SPEC subtree adapter is the hardest (~500 LOC, recursive rewrite); deferred behind ADR PROOF to validate architecture first", tags: ["adapter-complexity"] },
    { category: "outcome", text: "PLAN-001 migrated to trimmed template per ADR-003 D-6/D-9/D-10/D-11 and SPEC-007 TASK-014 dogfood proof — 1633 → ~ trimmed lines; SHA-256 round-trip PASS verified pre-write", tags: ["migration", "dogfood", "task-014"] },
  ],
  relations: [
    { verb: "contains", target: "SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001" },
    { verb: "contains", target: "SESSION-2026-05-20_01: PLAN-001 Drift Remediation and Plan Session Render Architecture" },
    { verb: "implements", target: "ADR-001: Composition Library Architecture" },
    { verb: "implements", target: "ADR-002: Adapter Contract and Plan Schema" },
    { verb: "implements", target: "ADR-003: Plan/Session Render Architecture" },
    { verb: "relates_to", target: "ANALYSIS-002: Plan/Session Note Render Architecture" },
    { verb: "pairs_with", target: "brain:---adr-review" },
  ],
};

// ----- Sanitization: strip inline markdown that mdast-util-to-string drops on parse -----
// Backticks, bold/italic asterisks are lossy through the parse cycle. Apply plain() to
// every body text field to ensure the rendered output round-trips byte-for-byte.

plan.scope = plain(plan.scope);
if (plan.source_reference) plan.source_reference = plain(plan.source_reference);
for (const o of plan.objectives) o.text = plain(o.text);
for (const p of plan.parts) {
  p.title = plain(p.title);
  if (p.outcome) p.outcome = plain(p.outcome);
  for (const d of p.dod) {
    d.text = plain(d.text);
    if (d.deferred_rationale) d.deferred_rationale = plain(d.deferred_rationale);
  }
  if (p.decisions) for (const dec of p.decisions) dec.topic = plain(dec.topic);
}
for (const t of plan.tasks) t.subject = plain(t.subject);
for (const b of plan.blockers) { /* will be replaced below */ }
plan.blockers = plan.blockers.map(plain);
for (const o of plan.observations) o.text = plain(o.text);
// Relations targets keep literal text (no inline markdown there).

// ----- DRY RUN GATE -----

console.log("=== Phase 1: Render PlanNote object → markdown ===");
const rendered = renderPlanNote(plan);
const renderedHash = sha256(rendered);
console.log(`Rendered ${rendered.length} bytes; SHA-256: ${renderedHash}`);

console.log("\n=== Phase 2: Parse rendered markdown → PlanNote object ===");
let parsed: PlanNote;
try {
  parsed = parsePlanNote(rendered);
  console.log("Parse OK");
} catch (err) {
  console.error("HALT — parse failed on rendered output:");
  console.error(err);
  process.exit(1);
}

console.log("\n=== Phase 3: Re-render parsed → markdown (round-trip) ===");
const rerendered = renderPlanNote(parsed);
const rerenderedHash = sha256(rerendered);
console.log(`Re-rendered ${rerendered.length} bytes; SHA-256: ${rerenderedHash}`);

console.log("\n=== Phase 4: SHA-256 round-trip verification ===");
if (renderedHash !== rerenderedHash) {
  console.error("HALT — round-trip SHA-256 mismatch:");
  console.error(`  rendered:    ${renderedHash}`);
  console.error(`  re-rendered: ${rerenderedHash}`);
  // Show first divergence for diagnosis
  const minLen = Math.min(rendered.length, rerendered.length);
  for (let i = 0; i < minLen; i++) {
    if (rendered[i] !== rerendered[i]) {
      const start = Math.max(0, i - 50);
      const end = Math.min(minLen, i + 100);
      console.error(`First divergence at byte ${i}:`);
      console.error(`  rendered:    ${JSON.stringify(rendered.slice(start, end))}`);
      console.error(`  re-rendered: ${JSON.stringify(rerendered.slice(start, end))}`);
      break;
    }
  }
  if (rendered.length !== rerendered.length) {
    console.error(`Length differs: ${rendered.length} vs ${rerendered.length}`);
  }
  process.exit(1);
}
console.log("ROUND-TRIP PASS — SHA-256 char-identity verified");

// ----- Optional explicit run mode -----

const args = process.argv.slice(2);
const apply = args.includes("--apply");

if (!apply) {
  // Write the candidate output to a scratch file so reviewers can diff against the
  // current PLAN-001 before applying. This is non-destructive.
  const previewPath = `${import.meta.dir}/../docs/planning/PLAN-001-skills-ecosystem.migrated.md`;
  await Bun.write(previewPath, rendered);
  console.log("\n=== DRY-RUN COMPLETE — re-run with --apply to overwrite PLAN-001 ===");
  console.log(`Preview written to: ${previewPath}`);
  console.log(`Target: ${PLAN_PATH}`);
  process.exit(0);
}

console.log("\n=== Phase 5: Write to PLAN-001 ===");
await Bun.write(PLAN_PATH, rendered);
console.log(`Wrote ${rendered.length} bytes to ${PLAN_PATH}`);

// Final post-write verification: re-read + parse + render + hash
const onDisk = await Bun.file(PLAN_PATH).text();
const onDiskHash = sha256(onDisk);
if (onDiskHash !== renderedHash) {
  console.error(`HALT — on-disk hash ${onDiskHash} differs from rendered ${renderedHash}`);
  process.exit(1);
}
const parsedFromDisk = parsePlanNote(onDisk);
const renderedFromDisk = renderPlanNote(parsedFromDisk);
const renderedFromDiskHash = sha256(renderedFromDisk);
if (renderedFromDiskHash !== renderedHash) {
  console.error(`HALT — re-render-from-disk hash ${renderedFromDiskHash} differs from rendered ${renderedHash}`);
  process.exit(1);
}
console.log("POST-WRITE VERIFICATION PASS — SHA-256 char-identity holds on disk");
