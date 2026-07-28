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
import { exists, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const pluginRoot = join(repoRoot, "plugin");
/**
 * Output lands INSIDE the plugin because installation copies only the plugin
 * directory. A root-level dist/ would sit outside that boundary and be
 * unreachable at runtime — the same constraint that makes bundling necessary.
 */
const outdir = join(pluginRoot, "dist");

/**
 * Entry points come from two places in the source tree — the per-skill scripts
 * inside the plugin, and the composition CLIs in `packages/cli`. They are
 * collected into ONE list because `splitting` only deduplicates across entry
 * points it can see in a single build: two `Bun.build()` calls produce two
 * independent chunk graphs, so every module shared between the groups ships
 * twice. Both groups import `@acmelabs/models` and `@acmelabs/core`, so that
 * cost is not hypothetical — it measured ~800 KB of the artifact.
 *
 * `root` is therefore the repo root, the only ancestor common to both, which
 * makes Bun mirror the source layout into the output. `relocations` maps the
 * groups that do not already sit at the right depth back to their shipped
 * paths, because `SKILL.md` files invoke `dist/cli/<name>.js` and nothing in
 * the artifact should carry `packages/cli/src` in its path.
 */
const groups: readonly { readonly base: string; readonly glob: string }[] = [
  { base: pluginRoot, glob: "skills/*/scripts/*.ts" },
  { base: join(repoRoot, "packages/cli/src"), glob: "*.ts" },
];

/** Built path (relative to `outdir`) → shipped path. Applied after the build. */
const relocations: readonly { readonly from: string; readonly to: string }[] = [
  { from: "packages/cli/src", to: "cli" },
  { from: "plugin/skills", to: "skills" },
];

const entrypoints: string[] = [];
for (const { base, glob } of groups) {
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

let artifacts = 0;
{
  const result = await Bun.build({
    entrypoints,
    outdir,
    root: repoRoot,
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

/**
 * Lift each group from its source-mirrored location to its shipped one. Chunks
 * stay at the `dist/` root where the build put them, and the entry points'
 * relative imports of those chunks are rewritten to match their new depth.
 */
for (const { from, to } of relocations) {
  const src = join(outdir, from);
  if (!(await exists(src))) continue;
  const dest = join(outdir, to);
  await mkdir(dirname(dest), { recursive: true });
  await rename(src, dest);
}

/** Prune the now-empty source-mirror scaffolding (`packages/`, `plugin/`). */
for (const stem of new Set(relocations.map(({ from }) => from.split("/")[0]))) {
  await rm(join(outdir, stem), { recursive: true, force: true });
}

/**
 * A relocated entry point moved by some number of directory levels, so the
 * `../` prefix it uses to reach a root-level chunk no longer resolves. Rewrite
 * each import to the depth the file now sits at.
 */
let repointed = 0;
for await (const file of new Glob("**/*.js").scan({ cwd: outdir, absolute: true })) {
  const depth = relative(outdir, file).split("/").length - 1;
  const source = await Bun.file(file).text();
  const fixed = source.replace(/(["'])(?:\.\.\/)+(chunk-[^"']+)\1/g, (_m, quote, chunk) => {
    const prefix = depth === 0 ? "./" : "../".repeat(depth);
    return `${quote}${prefix}${chunk}${quote}`;
  });
  if (fixed !== source) {
    await Bun.write(file, fixed);
    repointed += 1;
  }
}

const lines = [
  `# skills plugin build`,
  ``,
  `- **Entry points**: ${entrypoints.length}`,
  `- **Artifacts**: ${artifacts}`,
  `- **Output**: \`${relative(repoRoot, outdir)}/\``,
  ``,
  `- **Shared chunks**: ${artifacts - entrypoints.length}`,
  `- **Relocated imports repointed**: ${repointed}`,
  ``,
  `The workspace packages and npm dependencies are bundled in, so nothing`,
  `resolves against \`node_modules\` at runtime. Code shared across entry points`,
  `is emitted once as a chunk those entry points import, rather than inlined`,
  `into each. Invoke via \`bun "\${CLAUDE_PLUGIN_ROOT}/dist/…"\`.`,
];
console.log(lines.join("\n"));
