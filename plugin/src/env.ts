/**
 * Path anchors for the skills plugin runtime.
 *
 * The only place Claude Code's plugin env vars are read — every hook, skill
 * script and CLI invocation resolves through here so nothing is hardcoded:
 *
 *   - CLAUDE_PLUGIN_ROOT  — installed plugin dir (read-only, replaced on update).
 *   - CLAUDE_PLUGIN_DATA  — persistent plugin state (survives updates, spans projects).
 *   - CLAUDE_PROJECT_DIR  — the user's project root; the knowledge graph is `docs/` under it.
 *
 * Two prohibitions follow from those lifecycles: never write state into
 * PLUGIN_ROOT, because an update replaces the directory; never put project data
 * in PLUGIN_DATA, because it spans projects and would bleed between them.
 *
 * Dev fallbacks let scripts run outside a Claude Code session (tests, local
 * runs). `pluginRoot`'s fallback is file-relative rather than cwd-relative —
 * `import.meta.dir` is the module's own location, so it cannot be redirected by
 * whatever directory the process happened to start in, which is the exact bug
 * the anchor exists to prevent.
 */

import { join } from "node:path";

/** Read an env var, falling back to `fallback()` when it is unset or empty. */
function fromEnv(name: string, fallback: () => string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback();
}

/** Installed plugin directory (shipped code, read-only). */
export function pluginRoot(): string {
  return fromEnv("CLAUDE_PLUGIN_ROOT", () => join(import.meta.dir, ".."));
}

/** Persistent plugin-state dir (survives updates). Callers create it on first write. */
export function pluginData(): string {
  return fromEnv("CLAUDE_PLUGIN_DATA", () => join(pluginRoot(), ".skills-data"));
}

/** The user's project root. */
export function projectDir(): string {
  return fromEnv("CLAUDE_PROJECT_DIR", () => process.cwd());
}

/** Knowledge-graph docs root for the current project (`${projectDir()}/docs`). */
export function docsDir(): string {
  return join(projectDir(), "docs");
}

/** Bundled output directory — where every shipped entry point lives. */
export function distDir(): string {
  return join(pluginRoot(), "dist");
}
