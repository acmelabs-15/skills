import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AuditCandidate, AuditResult } from "./audit.ts";
import {
  type DefragOptions,
  type DelegationAdapter,
  parseArgs,
  runInteractive,
  runReportOnly,
} from "./defrag.ts";

function makeCandidate(
  path: string,
  vt: AuditCandidate["violationType"],
  entityType = "task",
): AuditCandidate {
  return {
    path,
    entityType,
    violationType: vt,
    violationDetail: "x",
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

function makeResult(candidates: AuditCandidate[]): AuditResult {
  const by: AuditResult["by"] = { split: [], merge: [], stale: [], "structural-fix": [] };
  for (const c of candidates) by[c.violationType].push(c);
  return { candidates, notesScanned: candidates.length, by };
}

describe("parseArgs", () => {
  test("parses --report-only", () => {
    const o = parseArgs(["--report-only"]);
    expect(o.reportOnly).toBe(true);
  });

  test("parses --project-root and --staleness", () => {
    const o = parseArgs(["--project-root", "/x", "--staleness", "90"]);
    expect(o.projectRoot).toBe("/x");
    expect(o.stalenessDays).toBe(90);
  });

  test("parses --basic-memory", () => {
    const o = parseArgs(["--basic-memory"]);
    expect(o.basicMemory).toBe(true);
  });
});

describe("runReportOnly", () => {
  test("writes report file and returns exit code 2 when candidates exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "defrag-"));
    try {
      const candidate = makeCandidate("docs/a.md", "split");
      const options: DefragOptions = {
        reportOnly: true,
        projectRoot: root,
        stalenessDays: 180,
        basicMemory: false,
        today: "2026-05-21",
      };
      const r = await runReportOnly(options, makeResult([candidate]));
      expect(r.exitCode).toBe(2);
      const text = await readFile(r.reportPath, "utf8");
      expect(text).toContain("docs/a.md");
      expect(r.reportPath).toContain("defrag-2026-05-21.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("returns exit code 0 when no candidates", async () => {
    const root = await mkdtemp(join(tmpdir(), "defrag-"));
    try {
      const options: DefragOptions = {
        reportOnly: true,
        projectRoot: root,
        stalenessDays: 180,
        basicMemory: false,
        today: "2026-05-21",
      };
      const r = await runReportOnly(options, makeResult([]));
      expect(r.exitCode).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("runInteractive — delegation error handling", () => {
  function makeOptions(delegation: DelegationAdapter): DefragOptions {
    return {
      reportOnly: false,
      projectRoot: "/x",
      stalenessDays: 180,
      basicMemory: false,
      delegation,
    };
  }

  test("delegates split candidates to decompose adapter", async () => {
    let called = 0;
    const adapter: DelegationAdapter = {
      decompose: async () => {
        called++;
        return { status: "ok" };
      },
      recompose: async () => ({ status: "ok" }),
      deleteNote: async () => ({ status: "ok" }),
      structuralFix: async () => ({ status: "ok" }),
    };
    const summary = await runInteractive(
      makeOptions(adapter),
      makeResult([makeCandidate("a.md", "split")]),
    );
    expect(called).toBe(1);
    expect(summary.split).toBe(1);
  });

  test("logs and skips when /decompose fails; cycle continues", async () => {
    const adapter: DelegationAdapter = {
      decompose: async (c) =>
        c.path === "fail.md" ? { status: "failed", error: "hash mismatch" } : { status: "ok" },
      recompose: async () => ({ status: "ok" }),
      deleteNote: async () => ({ status: "ok" }),
      structuralFix: async () => ({ status: "ok" }),
    };
    const result = makeResult([makeCandidate("fail.md", "split"), makeCandidate("ok.md", "split")]);
    const summary = await runInteractive(makeOptions(adapter), result);
    expect(summary.split).toBe(1);
    expect(summary.failed).toBe(1);
  });

  test("handles thrown errors as failed", async () => {
    const adapter: DelegationAdapter = {
      decompose: async () => {
        throw new Error("boom");
      },
      recompose: async () => ({ status: "ok" }),
      deleteNote: async () => ({ status: "ok" }),
      structuralFix: async () => ({ status: "ok" }),
    };
    const summary = await runInteractive(
      makeOptions(adapter),
      makeResult([makeCandidate("a.md", "split")]),
    );
    expect(summary.failed).toBe(1);
  });

  test("respects user 'no' confirmation", async () => {
    const adapter: DelegationAdapter = {
      decompose: async () => ({ status: "ok" }),
      recompose: async () => ({ status: "ok" }),
      deleteNote: async () => ({ status: "ok" }),
      structuralFix: async () => ({ status: "ok" }),
    };
    const summary = await runInteractive(
      makeOptions(adapter),
      makeResult([makeCandidate("a.md", "split")]),
      () => Promise.resolve(false),
    );
    expect(summary.skipped).toBe(1);
    expect(summary.split).toBe(0);
  });

  test("groups merge candidates by entityType and delegates per group", async () => {
    let count = 0;
    const adapter: DelegationAdapter = {
      decompose: async () => ({ status: "ok" }),
      recompose: async (cs) => {
        count += cs.length;
        return { status: "ok" };
      },
      deleteNote: async () => ({ status: "ok" }),
      structuralFix: async () => ({ status: "ok" }),
    };
    const summary = await runInteractive(
      makeOptions(adapter),
      makeResult([
        makeCandidate("a.md", "merge", "task"),
        makeCandidate("b.md", "merge", "task"),
        makeCandidate("c.md", "merge", "design"),
      ]),
    );
    expect(count).toBe(3);
    expect(summary.merge).toBe(3);
  });
});
