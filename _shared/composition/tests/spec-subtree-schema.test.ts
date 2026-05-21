import { describe, expect, test } from "bun:test";
import { specSubtreeCompositionPlanSchema } from "../schemas/composition/spec-subtree.plan.schema.js";
import {
  specSubtreeDistributionPlanSchema,
  specSubtreeManifestSchema,
} from "../schemas/distribution/spec-subtree.plan.schema.js";
import { planSchema } from "../schemas/index.js";

describe("specSubtreeManifestSchema", () => {
  test("accepts a valid manifest", () => {
    const valid = {
      root_path: "SPEC-001-foo.md",
      root_hash: "abc123",
      children: [
        {
          relative_path: "requirements/REQ-001-SPEC-001.md",
          hash: "def456",
          identifier: "REQ-001",
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("rejects duplicate relative_path (non-injective)", () => {
    const invalid = {
      root_path: "SPEC-001-foo.md",
      root_hash: "abc",
      children: [
        { relative_path: "x.md", hash: "h1", identifier: "REQ-001" },
        { relative_path: "x.md", hash: "h2", identifier: "REQ-002" },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("non-injective"))).toBe(true);
    }
  });

  test("rejects path traversal (..) in child paths", () => {
    const invalid = {
      root_path: "SPEC-001-foo.md",
      root_hash: "abc",
      children: [{ relative_path: "../escape.md", hash: "h1", identifier: "REQ-001" }],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("traversal"))).toBe(true);
    }
  });

  test("rejects absolute paths in child paths", () => {
    const invalid = {
      root_path: "SPEC-001-foo.md",
      root_hash: "abc",
      children: [{ relative_path: "/etc/passwd", hash: "h1", identifier: "REQ-001" }],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("rejects path traversal in root_path", () => {
    const invalid = {
      root_path: "../escape.md",
      root_hash: "abc",
      children: [{ relative_path: "child.md", hash: "h1", identifier: "REQ-001" }],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("specSubtreeDistributionPlanSchema", () => {
  test("accepts a valid distribution plan", () => {
    const valid = {
      plan_type: "distribution" as const,
      source_type: "spec-subtree" as const,
      manifest: {
        root_path: "SPEC-001-foo.md",
        root_hash: "abc",
        children: [{ relative_path: "requirements/REQ-001.md", hash: "h1", identifier: "REQ-001" }],
      },
      destinations: [
        {
          root_path: "SPEC-100-foo.md",
          children: [{ relative_path: "requirements/REQ-100.md", new_identifier: "REQ-100" }],
        },
      ],
      mutations: {
        renumber_map: { "REQ-001": "REQ-100" },
        wikilink_map: {},
      },
    };
    const result = specSubtreeDistributionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("planSchema discriminated union routes spec-subtree distribution", () => {
    const valid = {
      plan_type: "distribution" as const,
      source_type: "spec-subtree" as const,
      manifest: {
        root_path: "SPEC-001-foo.md",
        root_hash: "abc",
        children: [{ relative_path: "x.md", hash: "h1", identifier: "REQ-001" }],
      },
      destinations: [{ root_path: "SPEC-100-foo.md", children: [] }],
      mutations: { renumber_map: {}, wikilink_map: {} },
    };
    const result = planSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("specSubtreeCompositionPlanSchema", () => {
  test("accepts a valid composition plan", () => {
    const valid = {
      plan_type: "composition" as const,
      source_type: "spec-subtree" as const,
      manifest: {
        root_path: "SPEC-001-foo.md",
        root_hash: "abc",
        children: [{ relative_path: "x.md", hash: "h1", identifier: "REQ-001" }],
      },
      destinations: [{ root_path: "SPEC-2-foo.md", children: [] }],
      mutations: { renumber_map: {}, wikilink_map: {} },
    };
    const result = specSubtreeCompositionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
