#!/usr/bin/env bun
/**
 * skills plugin build — bundles every runtime entry point into `dist/`, INLINING
 * the workspace packages (@acmelabs/models, @acmelabs/core, @acmelabs/cli) and
 * npm deps so the installed plugin needs ZERO runtime dependency resolution.
 *
 * Why: Anthropic documents that an installed plugin cannot reference files
 * outside its own directory — "Paths that traverse outside the plugin root (such
 * as `../shared-utils`) will not work after installation because those external
 * files are not copied to the cache." The packages live at ../packages, outside
 * this plugin root, so nothing would resolve them at the other end. Bundling
 * makes the shipped plugin self-contained.
 *
 * Entry points:
 *   - src/*.ts                      → dist/*.js
 *   - hooks/<name>.ts               → dist/hooks/<name>.js
 *   - skills/<name>/scripts/*.ts    → dist/skills/<name>/scripts/*.js
 *   - the composition CLIs          → dist/cli/*.js
 *
 * Tests are excluded — they are not part of the shipped artifact and there is no
 * reason to bundle them.
 */

import { Glob } from "bun";
import { rm } from "node:fs/promises";
import { join, relative } from "node:path";

const root = import.meta.dir;
const repoRoot = join(root, "..");
const outdir = join(root, "dist");

const patterns: readonly { readonly base: string; readonly glob: string }[] = [
  { base: root, glob: "src/*.ts" },
  { base: root, glob: "hooks/*.ts" },
  { base: root, glob: "hooks/lib/*.ts" },
  { base: root, glob: "skills/*/scripts/*.ts" },
  { base: repoRoot, glob: "packages/cli/src/*.ts" },
];

const entrypoints: string[] = [];
for (const { base, glob } of patterns) {
  for await (const file of new Glob(glob).scan({ cwd: base, absolute: true })) {
    if (file.endsWith(".test.ts") || file.includes("__tests__")) continue;
    entrypoints.push(file);
  }
}

if (entrypoints.length === 0) {
  console.log("skills build: no entry points found — nothing to bundle.");
  process.exit(0);
}

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints,
  outdir,
  root: repoRoot,
  target: "bun",
  splitting: false,
  sourcemap: "linked",
});

if (!result.success) {
  console.error("skills build FAILED");
  for (const log of result.logs) console.error(`  ${log}`);
  process.exit(1);
}

const lines = [
  `# skills plugin build`,
  ``,
  `- **Entry points**: ${entrypoints.length}`,
  `- **Artifacts**: ${result.outputs.length}`,
  `- **Output**: \`${relative(repoRoot, outdir)}/\``,
  ``,
  `Every artifact is self-contained: the workspace packages and npm dependencies`,
  `are inlined, so nothing resolves at runtime. Invoke via`,
  `\`bun "\${CLAUDE_PLUGIN_ROOT}/dist/…"\`.`,
];
console.log(lines.join("\n"));
