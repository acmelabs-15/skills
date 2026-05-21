import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseSpecRootNote } from "../src/parsers/spec-root-note.js";
import { renderSpecRootNote } from "../src/renderers/spec-root-note.js";
import type { SpecRootNote } from "../src/schemas/spec-root-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "spec-root-note-sample.md")).text();
}

function makeMinimal(): SpecRootNote {
  return {
    frontmatter: {
      title: "SPEC-001: Sample",
      type: "spec",
      permalink: "specs/spec-001-sample/spec-001-sample",
      status: "DRAFT",
      tags: ["spec", "sample"],
    },
    context: "Context paragraph.",
    scope_in: ["Item A", "Item B"],
    scope_out: ["Out X"],
    sections: {},
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "constraint", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Test" },
      { verb: "implements", target: "ADR-001: Test" },
    ],
  };
}

describe("renderSpecRootNote — semantic round-trip", () => {
  // Byte-identity to the original fixture markdown is NOT required: the
  // fixture uses prose paragraphs in Phases and Out-of-Scope items that the
  // parser normalizes (e.g., Phases entries with explanatory prose are
  // distilled to wikilink refs only). The renderer targets semantic equality
  // — parse(render(parsed)) === parsed — which is the structural contract.
  test("fixture parse → render → re-parse yields semantically equal model", async () => {
    const md = await loadFixture();
    const parsed = parseSpecRootNote(md);
    const rendered = renderSpecRootNote(parsed);
    const reparsed = parseSpecRootNote(rendered);
    expect(reparsed).toEqual(parsed);
  });

  test("render is deterministic — same input → byte-identical output", async () => {
    const md = await loadFixture();
    const parsed = parseSpecRootNote(md);
    const a = renderSpecRootNote(parsed);
    const b = renderSpecRootNote(parsed);
    expect(a).toBe(b);
  });
});

describe("renderSpecRootNote — optional sections", () => {
  test("no phases → no '## Phases' heading emitted", () => {
    const note = makeMinimal();
    const out = renderSpecRootNote(note);
    expect(out).not.toContain("## Phases");
  });

  test("no success_criteria AND no artifact_status → neither section emitted", () => {
    const note = makeMinimal();
    const out = renderSpecRootNote(note);
    expect(out).not.toContain("## Success Criteria");
    expect(out).not.toContain("## Artifact Status");
  });

  test("both success_criteria AND artifact_status → both emitted in correct order", () => {
    const note = makeMinimal();
    note.success_criteria = [
      { text: "SC item 1", done: true },
      { text: "SC item 2", done: false, deferred_rationale: "follow-up" },
    ];
    note.artifact_status = [
      { text: "AS item 1", done: false },
      { text: "AS item 2", done: true },
    ];
    const out = renderSpecRootNote(note);
    const scIdx = out.indexOf("## Success Criteria");
    const asIdx = out.indexOf("## Artifact Status");
    expect(scIdx).toBeGreaterThan(-1);
    expect(asIdx).toBeGreaterThan(-1);
    expect(scIdx).toBeLessThan(asIdx);
    expect(out).toContain("- [x] SC item 1");
    expect(out).toContain("- [ ] SC item 2 (deferred: follow-up)");
    expect(out).toContain("- [ ] AS item 1");
    expect(out).toContain("- [x] AS item 2");
  });

  test("phases present → '### <name>' H3 sub-sections and REQ wikilinks emitted", () => {
    const note = makeMinimal();
    note.phases = [
      {
        name: "Phase 1: Foundation",
        req_refs: ["REQ-001-SPEC-001: Alpha", "REQ-002-SPEC-001: Beta"],
      },
      { name: "Phase 2: Validation", req_refs: [] },
    ];
    const out = renderSpecRootNote(note);
    expect(out).toContain("## Phases");
    expect(out).toContain("### Phase 1: Foundation");
    expect(out).toContain("- [[REQ-001-SPEC-001: Alpha]]");
    expect(out).toContain("- [[REQ-002-SPEC-001: Beta]]");
    expect(out).toContain("### Phase 2: Validation");
    expect(out).toContain("- (no refs)");
  });
});

describe("renderSpecRootNote — order stability", () => {
  test("observation order preserved in render", () => {
    const note = makeMinimal();
    note.observations = [
      { category: "decision", text: "first", tags: ["t1"] },
      { category: "insight", text: "second", tags: ["t2"] },
      { category: "constraint", text: "third", tags: ["t3"] },
    ];
    const out = renderSpecRootNote(note);
    const firstIdx = out.indexOf("[decision] first");
    const secondIdx = out.indexOf("[insight] second");
    const thirdIdx = out.indexOf("[constraint] third");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  test("relation order preserved in render", () => {
    const note = makeMinimal();
    note.relations = [
      { verb: "part_of", target: "PLAN-001: A" },
      { verb: "implements", target: "ADR-001: B" },
      { verb: "contains", target: "REQ-001: C" },
    ];
    const out = renderSpecRootNote(note);
    const partOfIdx = out.indexOf("- part_of [[PLAN-001: A]]");
    const implIdx = out.indexOf("- implements [[ADR-001: B]]");
    const contIdx = out.indexOf("- contains [[REQ-001: C]]");
    expect(partOfIdx).toBeGreaterThan(-1);
    expect(partOfIdx).toBeLessThan(implIdx);
    expect(implIdx).toBeLessThan(contIdx);
  });

  test("frontmatter key order is stable (title, type, permalink, status, tags)", () => {
    const note = makeMinimal();
    const out = renderSpecRootNote(note);
    const titleIdx = out.indexOf("title:");
    const typeIdx = out.indexOf("type:");
    const permaIdx = out.indexOf("permalink:");
    const statusIdx = out.indexOf("status:");
    const tagsIdx = out.indexOf("tags:");
    expect(titleIdx).toBeGreaterThan(-1);
    expect(titleIdx).toBeLessThan(typeIdx);
    expect(typeIdx).toBeLessThan(permaIdx);
    expect(permaIdx).toBeLessThan(statusIdx);
    expect(statusIdx).toBeLessThan(tagsIdx);
  });

  test("opaque sections rendered in insertion order between gate sections and Observations", () => {
    const note = makeMinimal();
    note.sections = {
      "Decomposition Methodology": "Standard analyst clustering.",
      Risks: "None known.",
      Dependencies: "ADR-001",
    };
    const out = renderSpecRootNote(note);
    const decompIdx = out.indexOf("## Decomposition Methodology");
    const risksIdx = out.indexOf("## Risks");
    const depsIdx = out.indexOf("## Dependencies");
    const obsIdx = out.indexOf("## Observations");
    expect(decompIdx).toBeGreaterThan(-1);
    expect(decompIdx).toBeLessThan(risksIdx);
    expect(risksIdx).toBeLessThan(depsIdx);
    expect(depsIdx).toBeLessThan(obsIdx);
  });
});
