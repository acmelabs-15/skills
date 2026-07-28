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

/**
 * Each group builds with its own `root`, which is what decides the shape of the
 * output path. The CLIs build from `packages/cli/src` so they land at
 * `dist/cli/<name>.js` rather than carrying the source tree's directory names
 * into the shipped artifact.
 */
const groups: readonly { readonly base: string; readonly glob: string; readonly outSub: string }[] = [
  { base: root, glob: "src/*.ts", outSub: "" },
  { base: root, glob: "hooks/*.ts", outSub: "" },
  { base: root, glob: "hooks/lib/*.ts", outSub: "" },
  { base: root, glob: "skills/*/scripts/*.ts", outSub: "" },
  { base: join(repoRoot, "packages/cli/src"), glob: "*.ts", outSub: "cli" },
];

const builds: { readonly entrypoints: string[]; readonly root: string; readonly outdir: string }[] = [];
for (const { base, glob, outSub } of groups) {
  const found: string[] = [];
  for await (const file of new Glob(glob).scan({ cwd: base, absolute: true })) {
    if (file.endsWith(".test.ts") || file.includes("__tests__")) continue;
    found.push(file);
  }
  if (found.length === 0) continue;
  const existing = builds.find((b) => b.root === base && b.outdir === join(outdir, outSub));
  if (existing) existing.entrypoints.push(...found);
  else builds.push({ entrypoints: found, root: base, outdir: join(outdir, outSub) });
}
const entrypoints = builds.flatMap((b) => b.entrypoints);

if (entrypoints.length === 0) {
  console.log("skills build: no entry points found — nothing to bundle.");
  process.exit(0);
}

await rm(outdir, { recursive: true, force: true });

let artifacts = 0;
for (const build of builds) {
  const result = await Bun.build({
    entrypoints: build.entrypoints,
    outdir: build.outdir,
    root: build.root,
    target: "bun",
    splitting: false,
    sourcemap: "linked",
  });

  if (!result.success) {
    console.error("skills build FAILED");
    for (const log of result.logs) console.error(`  ${log}`);
    process.exit(1);
  }
  artifacts += result.outputs.length;
}

const lines = [
  `# skills plugin build`,
  ``,
  `- **Entry points**: ${entrypoints.length}`,
  `- **Artifacts**: ${artifacts}`,
  `- **Output**: \`${relative(repoRoot, outdir)}/\``,
  ``,
  `Every artifact is self-contained: the workspace packages and npm dependencies`,
  `are inlined, so nothing resolves at runtime. Invoke via`,
  `\`bun "\${CLAUDE_PLUGIN_ROOT}/dist/…"\`.`,
];
console.log(lines.join("\n"));
