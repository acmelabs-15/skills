import { join } from "node:path";
import { specSubtreeCompositionPlanSchema } from "../schemas/composition/spec-subtree.plan.schema.js";
import { specSubtreeDistributionPlanSchema, specSubtreeManifestSchema } from "../schemas/distribution/spec-subtree.plan.schema.js";
import { sha256 } from "../src/core/hash.js";

const fixtureDir = "./tests/fixtures/spec-subtree";
const rootContent = await Bun.file(join(fixtureDir, "SPEC-001-composition-core.md")).text();
const req001 = await Bun.file(join(fixtureDir, "requirements/REQ-001-SPEC-001-adapter-interface.md")).text();
const req002 = await Bun.file(join(fixtureDir, "requirements/REQ-002-SPEC-001-hash-utility.md")).text();
const design001 = await Bun.file(join(fixtureDir, "design/DESIGN-001-SPEC-001-adapter-architecture.md")).text();
const task001 = await Bun.file(join(fixtureDir, "tasks/TASK-001-SPEC-001-scaffold.md")).text();

const validManifest = {
  root_path: "SPEC-001-composition-core.md",
  root_hash: sha256(rootContent),
  children: [
    { relative_path: "requirements/REQ-001-SPEC-001-adapter-interface.md", hash: sha256(req001), identifier: "REQ-001" },
    { relative_path: "requirements/REQ-002-SPEC-001-hash-utility.md", hash: sha256(req002), identifier: "REQ-002" },
    { relative_path: "design/DESIGN-001-SPEC-001-adapter-architecture.md", hash: sha256(design001), identifier: "DESIGN-001" },
    { relative_path: "tasks/TASK-001-SPEC-001-scaffold.md", hash: sha256(task001), identifier: "TASK-001" },
  ],
};
const r1 = specSubtreeManifestSchema.safeParse(validManifest);
console.log("=== manifest parse ===", r1.success ? "OK" : JSON.stringify(r1.error.issues, null, 2));

const yamlMod = await import("js-yaml");
const compText = await Bun.file("./tests/fixtures/spec-subtree-composition.plan.yaml").text();
const comp = yamlMod.load(compText);
console.log("=== composition parsed keys ===", Object.keys(comp ?? {}));
console.log("=== composition.manifest ===", JSON.stringify((comp as any)?.manifest, null, 2).slice(0, 500));
const r2 = specSubtreeCompositionPlanSchema.safeParse(comp);
console.log("=== composition parse ===", r2.success ? "OK" : JSON.stringify(r2.error.issues, null, 2));

const distText = await Bun.file("./tests/fixtures/spec-subtree-distribution.plan.yaml").text();
const dist = yamlMod.load(distText);
console.log("=== distribution keys ===", Object.keys(dist ?? {}));
console.log("=== distribution.mutations ===", JSON.stringify((dist as any)?.mutations, null, 2).slice(0, 300));
