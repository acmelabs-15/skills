import { describe, expect, test } from "bun:test";
import { SpecSubtreeAdapter, type SubtreeManifest } from "../src/adapters/spec-subtree.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new SpecSubtreeAdapter();

const rootFixture = `---
title: "SPEC-001: Composition Core"
type: spec
status: ACCEPTED
permalink: specs/spec-001-composition-core
tags:
  - composition
  - core
---

# SPEC-001: Composition Core

## Phases

- [ ] REQ-001 implemented
- [ ] REQ-002 implemented

## Observations

- [decision] Composition is single-file at the adapter interface #design

## Relations

- contains [[REQ-001-SPEC-001: Adapter Interface]]
- contains [[REQ-002-SPEC-001: Hash Utility]]
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

## Observations

- [requirement] Adapter MUST implement parse/serialize #ears

## Relations

- part_of [[SPEC-001: Composition Core]]
`;

const taskFixture = `---
title: "TASK-001-SPEC-001: Scaffold Adapter"
type: task
status: TODO
permalink: specs/spec-001-composition-core/tasks/task-001-spec-001-scaffold-adapter
tags:
  - task
---

# TASK-001-SPEC-001: Scaffold Adapter

## DoD

- [ ] Adapter file created
- [ ] Tests pass

## Observations

- [requirement] TASK-001 scaffolds the adapter #task

## Relations

- part_of [[SPEC-001: Composition Core]]
`;

const manifest: SubtreeManifest = {
  rootPath: "SPEC-001-composition-core.md",
  rootContent: rootFixture,
  children: [
    {
      relativePath: "requirements/REQ-001-SPEC-001-adapter-interface.md",
      content: reqFixture,
      identifier: "REQ-001",
    },
    {
      relativePath: "tasks/TASK-001-SPEC-001-scaffold-adapter.md",
      content: taskFixture,
      identifier: "TASK-001",
    },
  ],
};

describe("SpecSubtreeAdapter", () => {
  test("sourceType is 'spec'", () => {
    expect(adapter.sourceType).toBe("spec");
  });

  test("parse + serialize is structure-preserving and idempotent", () => {
    const ast = adapter.parse(rootFixture);
    const serialized = adapter.serialize(ast);
    expect(serialized).toContain("SPEC-001: Composition Core");
    expect(serialized).toContain("## Observations");
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });

  test("extractByRange returns lines [start, end]", () => {
    const lines = rootFixture.split("\n");
    const phasesIdx = lines.findIndex((l) => l === "## Phases");
    const extracted = adapter.extractByRange(rootFixture, {
      start: phasesIdx + 1,
      end: phasesIdx + 4,
    });
    expect(extracted).toContain("## Phases");
    expect(extracted).toContain("REQ-001 implemented");
  });

  test("applyMutations on single file rewrites identifiers (root only)", () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100", "REQ-002": "REQ-101" },
      wikilink_map: {},
    };
    const result = adapter.applyMutations(rootFixture, mutations);
    expect(result).toContain("REQ-100 implemented");
    expect(result).toContain("REQ-101 implemented");
    expect(result).not.toContain("REQ-001 implemented");
  });

  test("applySubtreeMutations applies mutations to root and every child", () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100", "TASK-001": "TASK-100" },
      wikilink_map: {},
    };
    const result = adapter.applySubtreeMutations(manifest, mutations);
    expect(result.rootContent).toContain("REQ-100 implemented");
    expect(result.children).toHaveLength(2);
    const reqChild = result.children.find((c) => c.relativePath.startsWith("requirements/"));
    expect(reqChild?.content).toContain("REQ-100-SPEC-001: Adapter Interface");
    const taskChild = result.children.find((c) => c.relativePath.startsWith("tasks/"));
    expect(taskChild?.content).toContain("TASK-100-SPEC-001: Scaffold Adapter");
  });

  test("applySubtreeMutations with frontmatter_map updates titles across the subtree", () => {
    // Value-keyed per REQ-004 AC-2, now the semantics on every adapter: each
    // entry names the EXISTING value. The retired field-keyed shape allowed one
    // `{title: ...}` entry to blanket-replace every file's title, but it could
    // not be inverted — so it failed the F-8 comparison on every plan that used
    // it. Naming each existing value is what makes the mutation reversible.
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        '"SPEC-001: Composition Core"': '"SPEC-900: Replaced Root"',
        '"REQ-001-SPEC-001: Adapter Interface"': '"REQ-900-SPEC-900: Replaced Req"',
        '"TASK-001-SPEC-001: Scaffold Adapter"': '"TASK-900-SPEC-900: Replaced Task"',
      },
    };
    const result = adapter.applySubtreeMutations(manifest, mutations);
    expect(result.rootContent).toContain('title: "SPEC-900: Replaced Root"');
    expect(result.children.map((c) => c.content).join("\n")).toContain(
      'title: "REQ-900-SPEC-900: Replaced Req"',
    );
    expect(result.children.map((c) => c.content).join("\n")).toContain(
      'title: "TASK-900-SPEC-900: Replaced Task"',
    );

    // And the whole subtree reverses cleanly — the property field-keyed lacked.
    const reversed = adapter.reverseSubtreeMutations(
      {
        ...manifest,
        rootContent: result.rootContent,
        children: manifest.children.map((c, i) => ({
          ...c,
          content: result.children[i]?.content ?? c.content,
        })),
      },
      mutations,
    );
    expect(reversed.rootContent).toBe(manifest.rootContent);
  });

  test("reverseMutations round-trips a renumber+wikilink combination", () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100" },
      wikilink_map: {
        "[[REQ-001-SPEC-001: Adapter Interface]]": "[[REQ-100-SPEC-001: Adapter Interface]]",
      },
    };
    const mutated = adapter.applyMutations(rootFixture, mutations);
    expect(mutated).not.toBe(rootFixture);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(rootFixture);
  });

  test("reverseSubtreeMutations recovers original content for all files", () => {
    const mutations: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-100", "TASK-001": "TASK-100" },
      wikilink_map: {
        "[[SPEC-001: Composition Core]]": "[[SPEC-100: Composition Core]]",
      },
    };
    const mutated = adapter.applySubtreeMutations(manifest, mutations);
    const mutatedManifest: SubtreeManifest = {
      rootPath: manifest.rootPath,
      rootContent: mutated.rootContent,
      children: mutated.children.map((c, i) => ({
        relativePath: c.relativePath,
        content: c.content,
        identifier: manifest.children[i]?.identifier ?? "",
      })),
    };
    const recovered = adapter.reverseSubtreeMutations(mutatedManifest, mutations);
    expect(recovered.rootContent).toBe(rootFixture);
    expect(recovered.children).toHaveLength(2);
    expect(recovered.children[0]?.content).toBe(reqFixture);
    expect(recovered.children[1]?.content).toBe(taskFixture);
  });
});
