import { describe, expect, test } from "bun:test";
import type { AuditCandidate, AuditResult } from "../audit.ts";
import { emptySummary, formatActionSummary, report } from "../report.ts";

function ac(
  path: string,
  violationType: AuditCandidate["violationType"],
  violationDetail: string,
): AuditCandidate {
  return {
    path,
    entityType: "task",
    violationType,
    violationDetail,
    evidence: {
      observationCount: 0,
      relationCount: 0,
      lineCount: 0,
      hasObservationH3Grouping: false,
      hasRelationH3Grouping: false,
      lastModifiedISO: null,
      status: null,
    },
  };
}

describe("report", () => {
  test("renders all 4 sections even when some are empty", () => {
    const r: AuditResult = {
      candidates: [],
      notesScanned: 0,
      by: { split: [], merge: [], stale: [], "structural-fix": [] },
    };
    const md = report(r, { date: "2026-05-21", projectRoot: "/p" });
    expect(md).toContain("# defrag report — 2026-05-21");
    expect(md).toContain("## Split candidates");
    expect(md).toContain("## Merge candidates");
    expect(md).toContain("## Stale candidates");
    expect(md).toContain("## Structural fixes");
    expect(md).toContain("_None._");
  });

  test("renders candidates with violation detail", () => {
    const c = ac("docs/a.md", "split", "observations=20 exceeds 15");
    const r: AuditResult = {
      candidates: [c],
      notesScanned: 1,
      by: { split: [c], merge: [], stale: [], "structural-fix": [] },
    };
    const md = report(r);
    expect(md).toContain("`docs/a.md` (task) — observations=20 exceeds 15");
  });

  test("summary table reflects counts", () => {
    const splitC = ac("a.md", "split", "x");
    const mergeC = ac("b.md", "merge", "y");
    const r: AuditResult = {
      candidates: [splitC, mergeC],
      notesScanned: 2,
      by: { split: [splitC], merge: [mergeC], stale: [], "structural-fix": [] },
    };
    const md = report(r);
    expect(md).toContain("| Split candidates | 1 |");
    expect(md).toContain("| Merge candidates | 1 |");
    expect(md).toContain("| Stale candidates | 0 |");
  });
});

describe("formatActionSummary", () => {
  test("formats all six counters", () => {
    const s = emptySummary();
    s.split = 2;
    s.merge = 1;
    s.delete = 3;
    s.structuralFix = 0;
    s.skipped = 4;
    s.failed = 1;
    const line = formatActionSummary(s);
    expect(line).toContain("split=2");
    expect(line).toContain("merge=1");
    expect(line).toContain("delete=3");
    expect(line).toContain("structural-fix=0");
    expect(line).toContain("skipped=4");
    expect(line).toContain("failed=1");
  });
});
