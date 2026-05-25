/**
 * TASK-012-SPEC-004 — Adapter orchestration alignment to DESIGN-001 + DESIGN-003.
 *
 * Verifies:
 *   - SpecSubtreeAdapter.processSubtree() exists and orchestrates the full
 *     stage-all -> validate-all -> rename-all pipeline (DESIGN-001 Component 1+2).
 *   - validateSubtreeHashes() aggregates per-file results with allPass +
 *     firstFailure (DESIGN-003 Component 1).
 *   - rollbackCluster() removes staged .tmp files + renamed destinations
 *     (DESIGN-003 Component 2).
 *   - On validation failure, processSubtree returns success=false AND
 *     removes every staged .tmp from disk.
 *   - On all-pass, every destination is written and no .tmp remains.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SpecSubtreeAdapter,
  type SubtreeFileForValidation,
  type SubtreeProcessInput,
  rollbackCluster,
  validateSubtreeHashes,
} from "../src/adapters/spec-subtree.js";
import { sha256 } from "../src/core/hash.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new SpecSubtreeAdapter();

const rootFixture = `---
title: "SPEC-001: Composition Core"
type: spec
status: ACCEPTED
permalink: specs/spec-001-composition-core
tags:
  - composition
---

# SPEC-001: Composition Core

## Phases

- [ ] REQ-001 implemented

## Relations

- contains [[REQ-001-SPEC-001: Adapter Interface]]
`;

const reqFixture = `---
title: "REQ-001-SPEC-001: Adapter Interface"
type: requirement
status: ACCEPTED
permalink: specs/spec-001-composition-core/requirements/req-001-spec-001-adapter-interface
tags:
  - requirement
---

# REQ-001-SPEC-001: Adapter Interface

## EARS

WHEN an adapter parses content, IT SHALL emit a valid mdast Root.

## Relations

- part_of [[SPEC-001: Composition Core]]
`;

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "spec-subtree-orch-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function buildInput(mutations: MutationSpec): SubtreeProcessInput {
  return {
    rootPath: join(tmpRoot, "SPEC-001-composition-core.md"),
    rootContent: rootFixture,
    rootDir: tmpRoot,
    children: [
      {
        relativePath: "requirements/REQ-001-SPEC-001-adapter-interface.md",
        content: reqFixture,
        identifier: "REQ-001",
      },
    ],
    mutations,
  };
}

describe("validateSubtreeHashes (DESIGN-003 Component 1)", () => {
  test("allPass=true with empty firstFailure when every file round-trips", () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {
        "[[REQ-001-SPEC-001: Adapter Interface]]": "[[REQ-100-SPEC-001: Adapter Interface]]",
      },
    };
    const staged = adapter.applyMutations(rootFixture, mutations);
    const files: SubtreeFileForValidation[] = [
      { filePath: "root.md", sourceContent: rootFixture, stagedContent: staged, mutations },
    ];
    const result = validateSubtreeHashes(adapter, files);
    expect(result.allPass).toBe(true);
    expect(result.firstFailure).toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.match).toBe(true);
  });

  test("aggregates per-file entries even after first failure (full diagnostics)", () => {
    const goodMutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {},
    };
    // Non-injective map produces a hash mismatch (irreversible mutation):
    // both keys collide on the same value, so reverseMutations cannot recover.
    const badMutations: MutationSpec = {
      renumber_map: { "REQ-001": "X", EARS: "X" },
      wikilink_map: {},
    };
    const goodStaged = adapter.applyMutations(rootFixture, goodMutations);
    const badStaged = adapter.applyMutations(reqFixture, badMutations);
    const files: SubtreeFileForValidation[] = [
      {
        filePath: "a.md",
        sourceContent: rootFixture,
        stagedContent: goodStaged,
        mutations: goodMutations,
      },
      {
        filePath: "b.md",
        sourceContent: reqFixture,
        stagedContent: badStaged,
        mutations: badMutations,
      },
    ];
    const result = validateSubtreeHashes(adapter, files);
    expect(result.allPass).toBe(false);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure?.filePath).toBe("b.md");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.match).toBe(true);
    expect(result.entries[1]?.match).toBe(false);
  });
});

describe("rollbackCluster (DESIGN-003 Component 2)", () => {
  test("removes staged .tmp files unconditionally", () => {
    const tmpA = join(tmpRoot, "a.md.tmp");
    const tmpB = join(tmpRoot, "b.md.tmp");
    writeFileSync(tmpA, "staged-a");
    writeFileSync(tmpB, "staged-b");
    expect(existsSync(tmpA)).toBe(true);
    expect(existsSync(tmpB)).toBe(true);
    rollbackCluster([tmpA, tmpB], []);
    expect(existsSync(tmpA)).toBe(false);
    expect(existsSync(tmpB)).toBe(false);
  });

  test("removes already-renamed destinations when failure occurs mid-rename", () => {
    const dest = join(tmpRoot, "already-renamed.md");
    writeFileSync(dest, "renamed");
    expect(existsSync(dest)).toBe(true);
    rollbackCluster([], [dest]);
    expect(existsSync(dest)).toBe(false);
  });

  test("never throws when paths do not exist (best-effort cleanup)", () => {
    expect(() =>
      rollbackCluster([join(tmpRoot, "missing.md.tmp")], [join(tmpRoot, "missing-dest.md")]),
    ).not.toThrow();
  });
});

describe("SpecSubtreeAdapter.processSubtree (DESIGN-001 Components 1+2)", () => {
  test("all-pass: stages, validates, renames every file; no .tmp remains; destinations match mutated content", async () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {
        "[[REQ-001-SPEC-001: Adapter Interface]]": "[[REQ-100-SPEC-001: Adapter Interface]]",
      },
    };
    const input = buildInput(mutations);
    const result = await adapter.processSubtree(input);

    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.hashEntries).toHaveLength(2);

    // Destinations exist with mutated content.
    const rootDest = readFileSync(input.rootPath, "utf8");
    const reqDest = readFileSync(
      join(tmpRoot, "requirements/REQ-001-SPEC-001-adapter-interface.md"),
      "utf8",
    );
    expect(rootDest).toContain("REQ-100 implemented");
    expect(rootDest).toContain("[[REQ-100-SPEC-001: Adapter Interface]]");
    expect(reqDest).toContain("REQ-100-SPEC-001: Adapter Interface");

    // No .tmp files remain.
    expect(existsSync(`${input.rootPath}.tmp`)).toBe(false);
    expect(
      existsSync(join(tmpRoot, "requirements/REQ-001-SPEC-001-adapter-interface.md.tmp")),
    ).toBe(false);
  });

  test("validation-failure: returns success=false, per-file errors, and removes all staged .tmp files (cluster rollback)", async () => {
    // Non-injective renumber_map: "REQ-001" + "REQ" both map to "X" — irreversible.
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "X", REQ: "X" },
      wikilink_map: {},
    };
    const input = buildInput(mutations);
    const result = await adapter.processSubtree(input);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Errors carry filePath + expected (sourceHash) + actual (reversedHash).
    for (const err of result.errors) {
      expect(err.filePath).toBeTruthy();
      expect(err.expected).toMatch(/^[0-9a-f]{64}$/);
      expect(err.actual).toMatch(/^[0-9a-f]{64}$/);
      expect(err.expected).not.toBe(err.actual);
    }

    // No .tmp files remain (cluster rollback).
    expect(existsSync(`${input.rootPath}.tmp`)).toBe(false);
    expect(
      existsSync(join(tmpRoot, "requirements/REQ-001-SPEC-001-adapter-interface.md.tmp")),
    ).toBe(false);

    // No destinations exist either (failure aborts before rename phase).
    expect(existsSync(input.rootPath)).toBe(false);
    expect(existsSync(join(tmpRoot, "requirements/REQ-001-SPEC-001-adapter-interface.md"))).toBe(
      false,
    );
  });

  test("empty children array: SPEC root only is staged + validated + renamed", async () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {},
    };
    const input: SubtreeProcessInput = {
      rootPath: join(tmpRoot, "SPEC-001-root-only.md"),
      rootContent: rootFixture,
      rootDir: tmpRoot,
      children: [],
      mutations,
    };
    const result = await adapter.processSubtree(input);
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(1);
    expect(existsSync(input.rootPath)).toBe(true);
    expect(existsSync(`${input.rootPath}.tmp`)).toBe(false);
  });

  test("post-rename per-file SHA-256 matches reverse-mutated destination content (the PROOF, under filesystem orchestration)", async () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {
        "[[REQ-001-SPEC-001: Adapter Interface]]": "[[REQ-100-SPEC-001: Adapter Interface]]",
      },
    };
    const input = buildInput(mutations);
    const result = await adapter.processSubtree(input);
    expect(result.success).toBe(true);

    const rootDest = readFileSync(input.rootPath, "utf8");
    const reqDest = readFileSync(
      join(tmpRoot, "requirements/REQ-001-SPEC-001-adapter-interface.md"),
      "utf8",
    );
    const rootRecovered = adapter.reverseMutations(rootDest, mutations);
    const reqRecovered = adapter.reverseMutations(reqDest, mutations);
    expect(sha256(rootRecovered)).toBe(sha256(rootFixture));
    expect(sha256(reqRecovered)).toBe(sha256(reqFixture));
  });
});
