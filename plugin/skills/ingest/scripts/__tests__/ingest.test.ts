import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type NoteWriter,
  type WritePlan,
  ingestFile,
  parseArgs,
  verifyAssembledNote,
} from "../ingest.ts";

async function makeTmp(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "ingest-"));
}

function recordingWriter(): {
  writer: NoteWriter;
  plans: WritePlan[];
  brainCalls: number;
  bmCalls: number;
} {
  const plans: WritePlan[] = [];
  let brainCalls = 0;
  let bmCalls = 0;
  return {
    plans,
    get brainCalls() {
      return brainCalls;
    },
    get bmCalls() {
      return bmCalls;
    },
    writer: {
      async writeBrainNote(plan) {
        brainCalls++;
        plans.push(plan);
        return { status: "ok", finalPath: join(plan.folder, plan.filename) };
      },
      async writeBasicMemoryNote(plan) {
        bmCalls++;
        plans.push(plan);
        return { status: "ok", finalPath: join(plan.folder, plan.filename) };
      },
    },
  };
}

describe("parseArgs", () => {
  test("requires a positional source path", () => {
    expect(parseArgs([])).toBeNull();
  });

  test("collects flags", () => {
    const o = parseArgs(["src.md", "--type", "analysis", "--dry-run"]);
    expect(o?.typeOverride).toBe("analysis");
    expect(o?.dryRun).toBe(true);
    expect(o?.sourcePath).toBe("src.md");
  });
});

describe("ingestFile end-to-end (analysis, brain path)", () => {
  test("writes a CONVENTIONS-compliant note via the writer", async () => {
    const root = await makeTmp();
    try {
      const src = join(root, "src.md");
      await writeFile(src, "# Something Cool\n\nThis is the source body content for the note.\n");
      const rec = recordingWriter();
      const result = await ingestFile({
        sourcePath: src,
        projectRoot: root,
        typeOverride: "analysis",
        writer: rec.writer,
      });
      expect(result.status).toBe("ok");
      expect(rec.plans).toHaveLength(1);
      const plan = rec.plans[0];
      if (!plan) throw new Error("no plan recorded");
      expect(plan.title).toMatch(/^ANALYSIS-\d{3}: /);
      expect(plan.filename).toMatch(/^ANALYSIS-\d{3}-.*\.md$/);
      expect(plan.spaceSeparatedTitle).not.toContain(":");
      expect(plan.body).toContain(plan.title);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("fails when spec-nested type missing parent", async () => {
    const root = await makeTmp();
    try {
      const src = join(root, "src.md");
      await writeFile(src, "# Task\n\nbody\n");
      const rec = recordingWriter();
      const result = await ingestFile({
        sourcePath: src,
        projectRoot: root,
        typeOverride: "task",
        writer: rec.writer,
      });
      expect(result.status).toBe("failed");
      if (result.status === "failed") expect(result.error).toContain("--parent-spec");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("dry-run does not call the writer", async () => {
    const root = await makeTmp();
    try {
      const src = join(root, "src.md");
      await writeFile(src, "# H\n\nbody\n");
      const rec = recordingWriter();
      const result = await ingestFile({
        sourcePath: src,
        projectRoot: root,
        typeOverride: "analysis",
        dryRun: true,
        writer: rec.writer,
      });
      expect(result.status).toBe("ok");
      expect(rec.brainCalls).toBe(0);
      expect(rec.bmCalls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("basic-memory mode routes to bm writer", async () => {
    const root = await makeTmp();
    try {
      const src = join(root, "src.md");
      await writeFile(src, "# H\n\nbody\n");
      const rec = recordingWriter();
      await ingestFile({
        sourcePath: src,
        projectRoot: root,
        typeOverride: "analysis",
        basicMemory: true,
        writer: rec.writer,
      });
      expect(rec.bmCalls).toBe(1);
      expect(rec.brainCalls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("increments counter when target folder already has notes", async () => {
    const root = await makeTmp();
    try {
      await mkdir(join(root, "docs", "analysis"), { recursive: true });
      await writeFile(
        join(root, "docs", "analysis", "ANALYSIS-001-x.md"),
        "---\ntype: analysis\n---\n",
      );
      await writeFile(
        join(root, "docs", "analysis", "ANALYSIS-002-y.md"),
        "---\ntype: analysis\n---\n",
      );
      const src = join(root, "src.md");
      await writeFile(src, "# Z\n\nbody\n");
      const rec = recordingWriter();
      await ingestFile({
        sourcePath: src,
        projectRoot: root,
        typeOverride: "analysis",
        writer: rec.writer,
      });
      expect(rec.plans[0]?.title).toMatch(/^ANALYSIS-003: /);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("verifyAssembledNote", () => {
  test("passes a well-formed Brain note", () => {
    const text = `---
title: 'ANALYSIS-001: Foo'
type: analysis
status: DRAFT
permalink: analysis/analysis-001-foo
tags: [analysis]
---

# ANALYSIS-001: Foo

body.

## Observations

- [fact] a #tag
- [fact] b #tag
- [fact] c #tag

## Relations

- relates_to [[A]]
- depends_on [[B]]
`;
    const errors = verifyAssembledNote(
      text,
      {
        folder: "/p/docs/analysis",
        filename: "ANALYSIS-001-foo.md",
        permalink: "analysis/analysis-001-foo",
        title: "ANALYSIS-001: Foo",
        body: text,
        spaceSeparatedTitle: "ANALYSIS-001 Foo",
      },
      false,
    );
    expect(errors).toEqual([]);
  });

  test("flags missing observations count", () => {
    const text = `---
title: 'ANALYSIS-001: Foo'
type: analysis
status: DRAFT
permalink: analysis/analysis-001-foo
tags: [analysis]
---

# ANALYSIS-001: Foo

## Observations

- [fact] a #tag

## Relations

- relates_to [[A]]
- depends_on [[B]]
`;
    const errors = verifyAssembledNote(
      text,
      {
        folder: "/p/docs/analysis",
        filename: "ANALYSIS-001-foo.md",
        permalink: "analysis/analysis-001-foo",
        title: "ANALYSIS-001: Foo",
        body: text,
        spaceSeparatedTitle: "ANALYSIS-001 Foo",
      },
      false,
    );
    expect(errors.join("\n")).toContain("observations count");
  });

  test("flags section after Relations", () => {
    const text = `---
title: 'X: Y'
---

# X: Y

## Observations
- [fact] a #t
- [fact] b #t
- [fact] c #t

## Relations
- relates_to [[A]]
- depends_on [[B]]

## Extra
trailing
`;
    const errors = verifyAssembledNote(
      text,
      {
        folder: "/p",
        filename: "X-001-y.md",
        permalink: "x/x-001-y",
        title: "X: Y",
        body: text,
        spaceSeparatedTitle: "X Y",
      },
      false,
    );
    expect(errors.join("\n")).toContain("after ## Relations");
  });

  test("basic-memory mode skips observations/relations checks", () => {
    const text = `---
title: 'ANALYSIS-001: Foo'
---

# ANALYSIS-001: Foo

simple body, no sections.
`;
    const errors = verifyAssembledNote(
      text,
      {
        folder: "/p",
        filename: "ANALYSIS-001-foo.md",
        permalink: "x/x",
        title: "ANALYSIS-001: Foo",
        body: text,
        spaceSeparatedTitle: "ANALYSIS-001 Foo",
      },
      true,
    );
    expect(errors).toEqual([]);
  });
});
