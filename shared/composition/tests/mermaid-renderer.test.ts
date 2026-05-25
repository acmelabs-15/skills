import { describe, expect, test } from "bun:test";
import { renderMermaid } from "../src/renderers/mermaid.js";
import type { Part } from "../src/schemas/plan-note.js";

const parts: Part[] = [
  {
    id: "research",
    phase: "research",
    title: "Research",
    substatus: "DONE",
    outcome: "[[ANALYSIS-001]]",
    source_artifacts: [],
    depends_on: [],
    dod: [],
  },
  {
    id: "build.SPEC-001",
    phase: "build",
    title: "Build SPEC-001",
    substatus: "IN_PROGRESS",
    source_artifacts: [],
    depends_on: ["research"],
    dod: [],
  },
  {
    id: "build.SPEC-007",
    phase: "build",
    title: "Build SPEC-007",
    substatus: "PENDING",
    source_artifacts: [],
    depends_on: ["build.SPEC-001"],
    dod: [],
  },
];

describe("renderMermaid", () => {
  test("produces a valid graph TD block with init + classDefs + nodes + edges", () => {
    const out = renderMermaid(parts);
    expect(out).toContain("%%{init:");
    expect(out).toContain("graph TD");
    expect(out).toContain("classDef done");
    expect(out).toContain("classDef inprogress");
    expect(out).toContain("classDef pending");
    expect(out).toContain("research_-->_build_SPEC_001".replace(/_-->_/, " --> "));
    expect(out).toContain("research --> build_SPEC_001");
    expect(out).toContain("build_SPEC_001 --> build_SPEC_007");
  });

  test("classes nodes by substatus", () => {
    const out = renderMermaid(parts);
    expect(out).toMatch(/class research done/);
    expect(out).toMatch(/class build_SPEC_001 inprogress/);
    expect(out).toMatch(/class build_SPEC_007 pending/);
  });

  test("includes status emoji and title in node label", () => {
    const out = renderMermaid(parts);
    expect(out).toContain("✅ <b>research</b>");
    expect(out).toContain("⚡ <b>build.SPEC-001</b>");
    expect(out).toContain("Research");
    expect(out).toContain("Build SPEC-001");
  });

  test("groupBy='phase' produces subgraphs", () => {
    const out = renderMermaid(parts, { groupBy: "phase" });
    expect(out).toContain("subgraph research");
    expect(out).toContain("subgraph build");
    expect(out).toContain("direction TB");
    expect(out).toContain("end");
  });

  test("handles empty parts array", () => {
    const out = renderMermaid([]);
    expect(out).toContain("graph TD");
    expect(out).toContain("classDef done");
  });

  test("suffixes Mermaid reserved-word part ids (end -> end_part) so the graph parses", () => {
    const reservedParts: Part[] = [
      {
        id: "review",
        phase: "review",
        title: "Review",
        substatus: "DONE",
        source_artifacts: [],
        depends_on: [],
        dod: [],
      },
      {
        id: "end",
        phase: "end",
        title: "Session End",
        substatus: "PENDING",
        source_artifacts: [],
        depends_on: ["review"],
        dod: [],
      },
    ];
    const out = renderMermaid(reservedParts);
    // `end` is a Mermaid reserved word (it terminates subgraph/scope); the node
    // id must be suffixed or the entire graph fails to parse.
    expect(out).toContain('end_part("');
    expect(out).toContain("review --> end_part");
    // the bare reserved word must not appear as a node definition or edge target
    expect(out).not.toMatch(/^\s*end\(/m);
    expect(out).not.toMatch(/--> end$/m);
    // class line references the suffixed id, never the bare reserved word
    expect(out).not.toMatch(/(^|,)end(,| )/m);
  });
});
