/**
 * Fixture generator — runs renderers against hand-built models and writes the
 * canonical output to fixture files. Invoked once during development; outputs
 * are committed and used by both parser and round-trip tests.
 *
 * Run: bun run tests/_fixtures-gen.ts
 */

import { join } from "node:path";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import { renderSessionNote } from "@acmelabs/models/renderers/session-note";
import type { PlanNote } from "@acmelabs/models/schemas/plan-note";
import type { SessionNote } from "@acmelabs/models/schemas/session-note";

const planModel: PlanNote = {
  frontmatter: {
    title: "PLAN-001: Sample Render Fixture",
    type: "plan",
    status: "IN_PROGRESS",
    complexity_tier: "TIER_3",
    branches: ["feat/plan-001-sample"],
    permalink: "planning/plan-001-sample",
    tags: ["plan", "fixture", "render"],
  },
  scope:
    "Sample plan for round-trip fixture. Covers minimum viable structure to exercise every renderer code path.",
  source_reference: "[[ANALYSIS-002: Plan/Session Note Render Architecture]]",
  objectives: [
    { id: "O-1", text: "Round-trip parser and renderer", done: false },
    { id: "O-2", text: "Cross-field invariants enforced", done: true },
  ],
  parts: [
    {
      id: "research",
      phase: "research",
      title: "Research",
      substatus: "DONE",
      completing_session: "SESSION-2026-05-19_01",
      outcome: "[[ANALYSIS-001: Sample]]",
      source_artifacts: [],
      depends_on: [],
      dod: [{ text: "Findings captured", done: true }],
    },
    {
      id: "decisions.1",
      phase: "decisions",
      title: "Lock ADR-001",
      substatus: "DONE",
      completing_session: "SESSION-2026-05-19_02",
      outcome: "[[ADR-001: Sample]]",
      source_artifacts: ["[[ANALYSIS-001: Sample]]"],
      depends_on: ["research"],
      dod: [{ text: "ADR ACCEPTED", done: true }],
      decisions: [
        { id: "D-1", status: "LOCKED", topic: "Use Zod" },
        { id: "D-2", status: "LOCKED", topic: "Use unified+remark" },
      ],
    },
    {
      id: "build.SPEC-007",
      phase: "build",
      title: "Build SPEC-007",
      substatus: "IN_PROGRESS",
      owning_session: "SESSION-2026-05-20_04",
      source_artifacts: ["[[SPEC-007: Sample]]"],
      depends_on: ["decisions.1"],
      dod: [
        { text: "All tasks DONE", done: false },
        { text: "Round-trip PASS", done: false },
      ],
    },
  ],
  tasks: [
    {
      id: "T-01",
      subject: "Implement parser",
      part: "build.SPEC-007",
      files: ["src/parsers/plan-note.ts"],
      effort: "M",
      status: "IN_PROGRESS",
      created_at_event: 1,
    },
    {
      id: "T-02",
      subject: "Implement renderer",
      part: "build.SPEC-007",
      files: ["src/renderers/plan-note.ts"],
      effort: "M",
      status: "DONE",
      created_at_event: 1,
      resolved_at_event: 3,
    },
  ],
  pending_decisions: [
    {
      id: "PUD-001",
      part: "build.SPEC-007",
      question: "Group Mermaid by phase by default?",
      surfaced_at_event: 2,
      surfaced_session: "SESSION-2026-05-20_04",
      options: [
        { label: "Yes", description: "groupBy phase as default" },
        { label: "No", description: "Flat graph as default" },
      ],
    },
  ],
  blockers: [],
  observations: [
    { category: "decision", text: "Markdown is authoritative state", tags: ["adr-003", "render"] },
    { category: "fact", text: "Round-trip property test gates correctness", tags: ["proof"] },
    { category: "constraint", text: "SHA-256 char-identity required", tags: ["invariant"] },
  ],
  relations: [
    { verb: "implements", target: "ADR-003: Plan/Session Render Architecture" },
    { verb: "depends_on", target: "ANALYSIS-002: Plan/Session Note Render Architecture" },
    { verb: "part_of", target: "PLAN-001: Skills Ecosystem" },
  ],
};

const sessionModel: SessionNote = {
  frontmatter: {
    title: "SESSION-2026-05-20_05: Sample Session Fixture",
    type: "session",
    status: "IN_PROGRESS",
    binds_to: ["PLAN-001"],
    permalink: "sessions/session-2026-05-20-05-sample",
    tags: ["session", "fixture"],
  },
  scope: "Sample session for round-trip fixture. Includes one of each common event type.",
  bound_plans: [
    {
      ref: "[[PLAN-001: Sample Render Fixture]]",
      worked_parts: ["build.SPEC-007", "decisions.1"],
    },
  ],
  events: [
    {
      n: 1,
      type: "session-start",
      title: "Kickoff Wave 2",
      project: "skills",
      branch: "feat/plan-001-build-spec-007",
      starting_sha: "abc1234",
    },
    {
      n: 2,
      type: "part-transition",
      title: "build.SPEC-007 READY to IN_PROGRESS",
      part: "build.SPEC-007",
      from: "READY",
      to: "IN_PROGRESS",
    },
    {
      n: 3,
      type: "agent-dispatch",
      title: "Dispatch bun-ts-engineer for T-01",
      agent: "bun-ts-engineer",
      task: "T-01",
      part: "build.SPEC-007",
    },
    {
      n: 4,
      type: "task-transition",
      title: "T-02 DONE",
      task: "T-02",
      from: "IN_PROGRESS",
      to: "DONE",
    },
    {
      n: 5,
      type: "debate-result",
      title: "ADR-003 round 1 PASS",
      target: "ADR-003",
      verdict: "PASS",
      tally: { accept: 5, concerns: 1, block: 0 },
      artifact: "[[CRIT-003-ADR-003: Debate Log]]",
    },
  ],
  observations: [
    { category: "fact", text: "Wave 2 dispatched 4 agents in parallel", tags: ["wave-2"] },
    {
      category: "decision",
      text: "Worktree isolation prevented branch corruption",
      tags: ["worktree"],
    },
    {
      category: "insight",
      text: "Renderer as canonical source simplifies round-trip",
      tags: ["render"],
    },
  ],
  relations: [
    { verb: "part_of", target: "PLAN-001: Skills Ecosystem" },
    { verb: "implements", target: "SPEC-007: Plan/Session Render Implementation" },
  ],
};

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");
await Bun.write(join(fixtureDir, "plan-note-sample.md"), renderPlanNote(planModel));
await Bun.write(join(fixtureDir, "session-note-sample.md"), renderSessionNote(sessionModel));
process.stdout.write("Fixtures written.\n");
