import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CANONICAL_ENTITY_TYPES,
  detectProjectContext,
  extractFrontmatter,
} from "./detect-context.ts";

async function makeTmp(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "detect-context-"));
}

describe("detectProjectContext", () => {
  test("returns basic-memory when docs/ is absent", async () => {
    const root = await makeTmp();
    try {
      const r = await detectProjectContext(root);
      expect(r.contextType).toBe("basic-memory");
      expect(r.evidence).toHaveLength(0);
      expect(r.confidence).toBe("high");
      expect(r.flagOverride).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("returns brain when docs/ has canonical type frontmatter", async () => {
    const root = await makeTmp();
    try {
      await mkdir(join(root, "docs", "decisions"), { recursive: true });
      await writeFile(
        join(root, "docs", "decisions", "ADR-001-foo.md"),
        "---\ntitle: 'ADR-001: Foo'\ntype: decision\n---\n# ADR-001: Foo\n",
      );
      const r = await detectProjectContext(root);
      expect(r.contextType).toBe("brain");
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.evidence[0]?.isCanonical).toBe(true);
      expect(r.confidence).toBe("medium"); // exactly 1 match → medium
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("returns brain with high confidence when more than 5 canonical files found", async () => {
    const root = await makeTmp();
    try {
      await mkdir(join(root, "docs", "specs"), { recursive: true });
      for (let i = 1; i <= 7; i++) {
        await writeFile(
          join(root, "docs", "specs", `SPEC-${String(i).padStart(3, "0")}-x.md`),
          `---\ntitle: 'SPEC-${i}: X'\ntype: spec\n---\n# SPEC-${i}: X\n`,
        );
      }
      const r = await detectProjectContext(root);
      expect(r.contextType).toBe("brain");
      expect(r.confidence).toBe("high");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("returns basic-memory when docs/ exists but no canonical types present", async () => {
    const root = await makeTmp();
    try {
      await mkdir(join(root, "docs"), { recursive: true });
      await writeFile(
        join(root, "docs", "random.md"),
        "---\ntitle: random\ntype: note\n---\n# random\n",
      );
      const r = await detectProjectContext(root);
      expect(r.contextType).toBe("basic-memory");
      expect(r.evidence.length).toBe(1);
      expect(r.evidence[0]?.isCanonical).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("explicit basicMemory flag overrides detection", async () => {
    const root = await makeTmp();
    try {
      await mkdir(join(root, "docs", "decisions"), { recursive: true });
      await writeFile(
        join(root, "docs", "decisions", "ADR-001-foo.md"),
        "---\ntitle: 'ADR-001: Foo'\ntype: decision\n---\n",
      );
      const r = await detectProjectContext(root, { basicMemory: true });
      expect(r.contextType).toBe("basic-memory");
      expect(r.flagOverride).toBe(true);
      expect(r.confidence).toBe("low");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("extractFrontmatter", () => {
  test("parses simple frontmatter", () => {
    const fm = extractFrontmatter("---\ntitle: hello\ntype: decision\n---\nbody\n");
    expect(fm).not.toBeNull();
    expect(fm?.["type"]).toBe("decision");
  });

  test("returns null when no frontmatter", () => {
    expect(extractFrontmatter("# heading\nbody\n")).toBeNull();
  });

  test("returns null on malformed YAML", () => {
    expect(extractFrontmatter("---\n: : : oops\n---\n")).toBeNull();
  });
});

describe("CANONICAL_ENTITY_TYPES", () => {
  test("has 16 entries", () => {
    expect(CANONICAL_ENTITY_TYPES).toHaveLength(16);
  });
});
