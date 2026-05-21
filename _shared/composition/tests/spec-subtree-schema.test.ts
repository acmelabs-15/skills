import { describe, expect, test } from "bun:test";
import { specSubtreeCompositionPlanSchema } from "../schemas/composition/spec-subtree.plan.schema.js";
import {
  specSubtreeDistributionPlanSchema,
  specSubtreeManifestSchema,
} from "../schemas/distribution/spec-subtree.plan.schema.js";
import { planSchema } from "../schemas/index.js";

// Reusable valid MutationSpec for tests below.
const validMutations = {
  renumber_map: { "REQ-001-SPEC-001": "REQ-100-SPEC-100" },
  wikilink_map: {
    "[[REQ-001-SPEC-001: Foo]]": "[[REQ-100-SPEC-100: Foo]]",
  },
};

const validRoot = {
  source_path: "docs/specs/SPEC-001-foo/SPEC-001-foo.md",
  mutations: {
    renumber_map: { "SPEC-001": "SPEC-100" },
    wikilink_map: { "[[SPEC-001: Foo]]": "[[SPEC-100: Foo]]" },
  },
};

const validChild = {
  source_path: "docs/specs/SPEC-001-foo/requirements/REQ-001-SPEC-001-foo.md",
  dest_path: "docs/specs/SPEC-100-foo/requirements/REQ-100-SPEC-100-foo.md",
  mutations: validMutations,
  filename_rewrite_map: {
    "REQ-001-SPEC-001-foo.md": "REQ-100-SPEC-100-foo.md",
  },
};

describe("specSubtreeManifestSchema (ADR-002 D-5 shape)", () => {
  // REQ-005 AC1: valid root + children manifest validates
  test("accepts a valid manifest with root + non-empty children", () => {
    const valid = { root: validRoot, children: [validChild] };
    const result = specSubtreeManifestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  // REQ-005 AC5: empty children is VALID (no .min(1))
  test("AC5: accepts a manifest with an empty children array (SPEC with no children notes)", () => {
    const valid = { root: validRoot, children: [] };
    const result = specSubtreeManifestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  // REQ-005 AC4: missing required field is rejected
  test("AC4: rejects a manifest missing the root field", () => {
    const invalid = { children: [] };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("AC4: rejects a manifest missing the children field", () => {
    const invalid = { root: validRoot };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("AC4: rejects a child missing dest_path", () => {
    const invalid = {
      root: validRoot,
      children: [
        {
          source_path: validChild.source_path,
          mutations: validChild.mutations,
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  // REQ-005 AC3: dest_path path-traversal is rejected
  test("AC3: rejects path traversal (..) in child dest_path", () => {
    const invalid = {
      root: validRoot,
      children: [
        {
          ...validChild,
          dest_path: "docs/specs/../../../etc/passwd",
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Path traversal"))).toBe(true);
    }
  });

  test("AC3: rejects absolute dest_path", () => {
    const invalid = {
      root: validRoot,
      children: [
        {
          ...validChild,
          dest_path: "/etc/passwd",
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("AC3: rejects path traversal (..) in child source_path", () => {
    const invalid = {
      root: validRoot,
      children: [
        {
          ...validChild,
          source_path: "../../etc/passwd",
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("AC3: rejects path traversal in root.source_path", () => {
    const invalid = {
      root: {
        source_path: "../escape.md",
        mutations: validRoot.mutations,
      },
      children: [],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("rejects duplicate dest_path across children (non-injective)", () => {
    const invalid = {
      root: validRoot,
      children: [
        validChild,
        {
          ...validChild,
          source_path: "docs/specs/SPEC-001-foo/requirements/REQ-002-SPEC-001-bar.md",
          // same dest_path as validChild — non-injective
        },
      ],
    };
    const result = specSubtreeManifestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("non-injective"))).toBe(true);
    }
  });

  test("filename_rewrite_map is optional on children", () => {
    const validChildNoRewrite = {
      source_path: validChild.source_path,
      dest_path: validChild.dest_path,
      mutations: validChild.mutations,
    };
    const valid = { root: validRoot, children: [validChildNoRewrite] };
    const result = specSubtreeManifestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("specSubtreeDistributionPlanSchema (ADR-002 D-5)", () => {
  // REQ-005 AC1: valid distribution plan with root + 3 children validates
  test("AC1: accepts a valid distribution plan (root + 3 children)", () => {
    const valid = {
      plan_type: "distribution" as const,
      source_type: "spec" as const,
      subtree_manifest: {
        root: validRoot,
        children: [
          validChild,
          {
            ...validChild,
            source_path: "docs/specs/SPEC-001-foo/requirements/REQ-002-SPEC-001-bar.md",
            dest_path: "docs/specs/SPEC-100-foo/requirements/REQ-101-SPEC-100-bar.md",
          },
          {
            ...validChild,
            source_path: "docs/specs/SPEC-001-foo/tasks/TASK-001-SPEC-001-baz.md",
            dest_path: "docs/specs/SPEC-100-foo/tasks/TASK-100-SPEC-100-baz.md",
          },
        ],
      },
    };
    const result = specSubtreeDistributionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("planSchema discriminated union routes spec distribution", () => {
    const valid = {
      plan_type: "distribution" as const,
      source_type: "spec" as const,
      subtree_manifest: { root: validRoot, children: [validChild] },
    };
    const result = planSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("AC4: rejects a SPEC plan missing the subtree_manifest field", () => {
    const invalid = {
      plan_type: "distribution" as const,
      source_type: "spec" as const,
    };
    const result = specSubtreeDistributionPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("specSubtreeCompositionPlanSchema (ADR-002 D-5)", () => {
  test("accepts a valid composition plan", () => {
    const valid = {
      plan_type: "composition" as const,
      source_type: "spec" as const,
      subtree_manifest: { root: validRoot, children: [validChild] },
    };
    const result = specSubtreeCompositionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("composition variant also accepts empty children (AC5 parity)", () => {
    const valid = {
      plan_type: "composition" as const,
      source_type: "spec" as const,
      subtree_manifest: { root: validRoot, children: [] },
    };
    const result = specSubtreeCompositionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
