#!/usr/bin/env bun
/**
 * skills plugin build — bundles every runtime entry point into `dist/`, pulling
 * in the workspace packages (@acmelabs/models, @acmelabs/core, @acmelabs/cli)
 * and npm deps so the installed plugin needs ZERO runtime dependency
 * resolution.
 *
 * The packages are NOT build targets. They are dependencies of the entry
 * points, resolved through the workspace by specifier exactly as a published
 * package would be, and the bundler decides how they land in the output. No
 * source file references `dist/`; the build reads source and writes artifacts,
 * never the reverse.
 *
 * Why: Anthropic documents that an installed plugin cannot reference files
 * outside its own directory — "Paths that traverse outside the plugin root (such
 * as `../shared-utils`) will not work after installation because those external
 * files are not copied to the cache." The packages live at ../packages, outside
 * this plugin root, so nothing would resolve them at the other end. Bundling
 * makes the shipped plugin self-contained.
 *
 * An entry point is a file something INVOKES. Library modules — plugin/src/*,
 * hooks/lib/* — are not listed: their code is inlined into whatever imports
 * them, so shipping them separately produces output nothing reads. The hook
 * handlers live in scripts.disabled/ and are deliberately inert until their
 * layer is complete, so there is nothing to bundle for them either.
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

const repoRoot = join(import.meta.dir, "..");
const pluginRoot = join(repoRoot, "plugin");
/**
 * Output lands INSIDE the plugin because installation copies only the plugin
 * directory. A root-level dist/ would sit outside that boundary and be
 * unreachable at runtime — the same constraint that makes bundling necessary.
 */
const outdir = join(pluginRoot, "dist");

/**
 * Each group builds with its own `root`, which is what decides the shape of the
 * output path. The CLIs build from `packages/cli/src` so they land at
 * `dist/cli/<name>.js` rather than carrying the source tree's directory names
 * into the shipped artifact.
 */
const groups: readonly { readonly base: string; readonly glob: string; readonly outSub: string }[] = [
  { base: pluginRoot, glob: "skills/*/scripts/*.ts", outSub: "" },
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
    /**
     * Shared code is emitted ONCE as a content-hashed chunk that the entry
     * points import, instead of being inlined into all 31 of them. The
     * workspace packages are large relative to the scripts that use them, so
     * inlining them per entry point produced 31 copies — 34 MB where 1.6 MB
     * carries the same code.
     *
     * Nothing in the source tree references a chunk: entry points import
     * `@acmelabs/models/...` by workspace specifier and the bundler decides
     * the output shape. Chunk filenames are content-hashed and disposable,
     * which is what keeps them out of the source tree's vocabulary.
     */
    splitting: true,
    /**
     * Sourcemaps are a development artifact, not a shipped one — they were
     * 24 MB of the previous 34 MB output. Debugging happens against the
     * source tree, which is what the maps would point back at anyway.
     */
    sourcemap: "none",
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
  `- **Shared chunks**: ${artifacts - entrypoints.length}`,
  ``,
  `The workspace packages and npm dependencies are bundled in, so nothing`,
  `resolves against \`node_modules\` at runtime. Code shared across entry points`,
  `is emitted once as a chunk those entry points import, rather than inlined`,
  `into each. Invoke via \`bun "\${CLAUDE_PLUGIN_ROOT}/dist/…"\`.`,
];
console.log(lines.join("\n"));
