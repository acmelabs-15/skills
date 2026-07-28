/**
 * Unit tests for hash-excluded cluster scaffolding (src/core/cluster-scaffold.ts).
 *
 * Scaffolding is the destination-side mirror of the design's derived-content
 * rule: ADR-002 D-2 excludes `regenerated_sections` from BOTH extraction and
 * hash-comparison because that content is Information Model Category 2 (derived,
 * not source-of-truth). A cluster prologue/epilogue is the same class of content
 * arriving from the other direction — authored into the destination rather than
 * stripped out of the source — so it is likewise outside the char-identity chain.
 *
 * Two invariants make the exclusion safe, and both are tested here:
 *   1. Scaffolding is a pure function of the plan, so it can be re-derived and
 *      VERIFIED against the written file rather than trusted by byte offset.
 *   2. Stripping recovers the body byte-for-byte, so the F-8 comparison over the
 *      content slice is exactly as strong as it is without scaffolding.
 */
import { describe, expect, test } from "bun:test";
import {
  type ClusterScaffold,
  assembleScaffolded,
  renderEpilogue,
  renderPrologue,
  stripScaffold,
} from "../src/core/cluster-scaffold.js";

const scaffold: ClusterScaffold = {
  frontmatter: {
    title: "ADR-098a: Cluster A",
    type: "decision",
    status: "ACCEPTED",
    permalink: "decisions/adr-098a-cluster-a",
    tags: ["fixture", "cluster-a"],
  },
  observations: [
    { category: "decision", text: "Cluster A owns the preamble", tags: ["split"] },
    { category: "fact", text: "Body is a verbatim source slice", tags: ["zero-drift", "f-8"] },
  ],
  relations: [
    { verb: "part_of", target: "ADR-098: Multi-Cluster Round-Trip Fixture" },
    { verb: "relates_to", target: "ADR-098b: Cluster B" },
  ],
};

describe("renderPrologue", () => {
  test("emits frontmatter then an H1 that matches the title verbatim", () => {
    const prologue = renderPrologue(scaffold.frontmatter);

    expect(prologue.split("\n")[0]).toBe("---");
    expect(prologue).toContain('title: "ADR-098a: Cluster A"');
    expect(prologue).toContain("type: decision");
    expect(prologue).toContain("status: ACCEPTED");
    expect(prologue).toContain("permalink: decisions/adr-098a-cluster-a");
    // H1 is derived from the title, so it cannot drift from it.
    expect(prologue).toContain("# ADR-098a: Cluster A");
    expect(prologue.endsWith("\n\n")).toBe(true);
  });

  test("H1 tracks the title even when the title contains extra colons", () => {
    const prologue = renderPrologue({ ...scaffold.frontmatter, title: "REQ-001-SPEC-005: A: B" });
    expect(prologue).toContain("# REQ-001-SPEC-005: A: B");
  });
});

describe("renderEpilogue", () => {
  test("emits Observations then Relations as the final two sections", () => {
    const epilogue = renderEpilogue(scaffold.observations, scaffold.relations);

    expect(epilogue).toContain("- [decision] Cluster A owns the preamble #split");
    expect(epilogue).toContain("- [fact] Body is a verbatim source slice #zero-drift #f-8");
    expect(epilogue).toContain("- part_of [[ADR-098: Multi-Cluster Round-Trip Fixture]]");
    // Final-two-sections invariant: Observations, then Relations, then nothing.
    expect(epilogue.indexOf("## Observations")).toBeLessThan(epilogue.indexOf("## Relations"));
    expect(epilogue.trimEnd().split("\n").at(-1)).toBe("- relates_to [[ADR-098b: Cluster B]]");
  });
});

describe("assembleScaffolded / stripScaffold", () => {
  const body = "### D-700: Cluster A\n\nSome preserved body text.\n\n";

  test("assemble places the body between prologue and epilogue", () => {
    const out = assembleScaffolded(scaffold, body);
    expect(out.startsWith(renderPrologue(scaffold.frontmatter))).toBe(true);
    expect(out.endsWith(renderEpilogue(scaffold.observations, scaffold.relations))).toBe(true);
    expect(out).toContain(body);
  });

  test("strip recovers the body byte-for-byte (round trip)", () => {
    const result = stripScaffold(scaffold, assembleScaffolded(scaffold, body));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toBe(body);
  });

  test("strip round-trips a body containing markdown that resembles scaffolding", () => {
    // A body that itself contains an Observations heading must not confuse the
    // strip: removal is by verified prefix/suffix, never by searching for headings.
    const trickyBody = "## Observations\n\n- [fact] nested lookalike #x\n\n";
    const result = stripScaffold(scaffold, assembleScaffolded(scaffold, trickyBody));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toBe(trickyBody);
  });

  test("strip rejects content whose prologue does not match the plan", () => {
    const epilogue = renderEpilogue(scaffold.observations, scaffold.relations);
    const tampered = `---\ntitle: "Wrong"\n---\n\n# Wrong\n\n${body}${epilogue}`;
    const result = stripScaffold(scaffold, tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("prologue");
  });

  test("strip rejects content whose epilogue does not match the plan", () => {
    const tampered = `${renderPrologue(scaffold.frontmatter)}${body}## Observations\n\n- tampered\n`;
    const result = stripScaffold(scaffold, tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("epilogue");
  });

  test("strip rejects content shorter than its own scaffolding", () => {
    expect(stripScaffold(scaffold, "---\n").ok).toBe(false);
  });

  test("an empty body round-trips", () => {
    const result = stripScaffold(scaffold, assembleScaffolded(scaffold, ""));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toBe("");
  });
});
