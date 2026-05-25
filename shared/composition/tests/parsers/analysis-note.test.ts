import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";
import { parseAnalysisNote } from "../../src/parsers/analysis-note.js";

/**
 * Inline fixture: a minimal valid ACCEPTED ANALYSIS with NO Open Questions
 * section. Body content varies legitimately; the schema requires only >=1
 * opaque H2 section plus the universal Observations/Relations tail.
 */
const ACCEPTED_NO_OPEN_QUESTIONS = `---
title: 'ANALYSIS-901: Backend Tradeoffs'
type: analysis
status: ACCEPTED
permalink: analysis/analysis-901-backend-tradeoffs
tags:
  - analysis
  - backend
  - fixture
---

# ANALYSIS-901: Backend Tradeoffs

## Background

A locked analysis comparing storage backends. Every question raised during
research has been resolved, so no Open Questions section remains — the
ACCEPTED gate therefore passes.

## Findings

Postgres and SQLite both meet the functional bar; SQLite wins on operational
overhead for the local-only scope.

## Observations

- [insight] SQLite suits local-only scope #storage #insight
- [fact] Postgres needs replication tuning #postgres #ops
- [decision] Backend locked to SQLite #storage #decision

## Relations

- relates_to [[ADR-901: Backend Decision]]
- part_of [[SPEC-901: Storage Layer]]
`;

/**
 * Inline fixture: a DRAFT ANALYSIS that DOES carry an Open Questions section.
 * This is legitimate (research surfaces open questions); the ACCEPTED gate
 * only fires at ACCEPTED, so this parses cleanly and the derived
 * hasOpenQuestions flag is true.
 */
const DRAFT_WITH_OPEN_QUESTIONS = `---
title: 'ANALYSIS-902: Search Architecture'
type: analysis
status: DRAFT
permalink: analysis/analysis-902-search-architecture
tags:
  - analysis
  - search
---

# ANALYSIS-902: Search Architecture

## Background

Early research into the hybrid search design.

## Open Questions

- Which ranking model balances recall and latency?
- Do we need a separate vector store?

## Observations

- [problem] Ranking model undecided #search #open
- [insight] Hybrid lexical+vector looks promising #search
- [fact] Latency budget is 50ms p99 #perf

## Relations

- relates_to [[ADR-902: Search Stack]]
- part_of [[SPEC-902: Search Layer]]
`;

describe("parseAnalysisNote — happy path", () => {
  test("parses a valid ACCEPTED ANALYSIS without throwing", () => {
    const note = parseAnalysisNote(ACCEPTED_NO_OPEN_QUESTIONS);
    expect(note.frontmatter.title).toBe("ANALYSIS-901: Backend Tradeoffs");
    expect(note.frontmatter.type).toBe("analysis");
    expect(note.frontmatter.status).toBe("ACCEPTED");
    expect(note.frontmatter.permalink).toBe("analysis/analysis-901-backend-tradeoffs");
    expect(note.frontmatter.tags).toHaveLength(3);
  });

  test("collects non-special H2 sections into the opaque sections Record", () => {
    const note = parseAnalysisNote(ACCEPTED_NO_OPEN_QUESTIONS);
    expect(note.sections["Background"]).toBeDefined();
    expect(note.sections["Findings"]).toBeDefined();
    expect(note.sections["Observations"]).toBeUndefined();
    expect(note.sections["Relations"]).toBeUndefined();
  });

  test("derives hasOpenQuestions=false when no Open Questions section present", () => {
    const note = parseAnalysisNote(ACCEPTED_NO_OPEN_QUESTIONS);
    expect(note.hasOpenQuestions).toBe(false);
  });

  test("derives hasOpenQuestions=true on a DRAFT carrying Open Questions", () => {
    const note = parseAnalysisNote(DRAFT_WITH_OPEN_QUESTIONS);
    expect(note.hasOpenQuestions).toBe(true);
    expect(note.frontmatter.status).toBe("DRAFT");
  });

  test("parses Observations and Relations", () => {
    const note = parseAnalysisNote(ACCEPTED_NO_OPEN_QUESTIONS);
    expect(note.observations).toHaveLength(3);
    expect(note.observations[0]?.category).toBe("insight");
    expect(note.relations).toHaveLength(2);
    expect(note.relations[1]?.verb).toBe("part_of");
  });

  test("round-trip: validated model re-parses cleanly via the schema", async () => {
    // The schema-validated portion of the parser output must survive a
    // re-parse with no information loss (REQ-002 round-trip AC). The derived
    // hasOpenQuestions flag is stripped because the schema is .strict().
    const { AnalysisNoteSchema } = await import("../../src/schemas/analysis-note.js");
    const note = parseAnalysisNote(ACCEPTED_NO_OPEN_QUESTIONS);
    const { hasOpenQuestions: _drop, ...model } = note;
    expect(() => AnalysisNoteSchema.parse(model)).not.toThrow();
  });
});

describe("parseAnalysisNote — rejection paths", () => {
  test("rejects ACCEPTED + Open Questions (no-open-questions gate)", () => {
    const acceptedWithOpenQuestions = DRAFT_WITH_OPEN_QUESTIONS.replace(
      "status: DRAFT",
      "status: ACCEPTED",
    );
    expect(() => parseAnalysisNote(acceptedWithOpenQuestions)).toThrow(ZodError);
    try {
      parseAnalysisNote(acceptedWithOpenQuestions);
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("Open Questions"))).toBe(true);
    }
  });

  test("rejects a note with type !== analysis (frontmatter type-guard)", () => {
    const wrongType = ACCEPTED_NO_OPEN_QUESTIONS.replace("type: analysis", "type: decision");
    expect(() => parseAnalysisNote(wrongType)).toThrow(ZodError);
    try {
      parseAnalysisNote(wrongType);
    } catch (err) {
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("type"))).toBe(true);
    }
  });

  test("rejects malformed frontmatter (missing permalink)", () => {
    const noPermalink = ACCEPTED_NO_OPEN_QUESTIONS.replace(
      "permalink: analysis/analysis-901-backend-tradeoffs\n",
      "",
    );
    expect(() => parseAnalysisNote(noPermalink)).toThrow(ZodError);
  });
});
