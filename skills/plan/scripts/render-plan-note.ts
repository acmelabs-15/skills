#!/usr/bin/env bun
/**
 * render-plan-note CLI (plan skill gate-point script).
 *
 * Drives the deterministic PlanNote renderer: reads a PLAN markdown file,
 * parses it to the typed model (parsePlanNote), re-renders the canonical
 * markdown (renderPlanNote), and writes the result back. The renderer
 * regenerates derived sections (Progress Dashboard + Cross-Part Dependency
 * Graph) from `parts[]` on every render, so this script is the mechanism by
 * which a PLAN's rollups are reconciled.
 *
 * Determinism (D-4): the render is a pure generator — same input PLAN produces
 * byte-identical output every time (no timestamps, randomness, or env reads in
 * the output). Re-running on already-canonical markdown is a no-op (the write
 * is skipped when output equals input).
 *
 * Thin wrapper: `if (import.meta.main)` guard, exported `renderPlanNoteCli` fn,
 * strict D-8 path-containment before any file read.
 *
 * Exit codes:
 *   0  success (rendered + written, or already canonical — no-op)
 *   1  render failure (parse/validation error; stderr names the cause)
 *   2  usage error / path-containment violation / missing required flag
 */

import path from "node:path";
import { parsePlanNote } from "../../../shared/composition/src/parsers/plan-note.ts";
import { renderPlanNote } from "../../../shared/composition/src/renderers/plan-note.ts";

interface RenderArgs {
  readonly planPath: string;
  readonly projectRoot: string;
}

const FLAG_MAP: Record<string, keyof RenderArgs> = {
  "--plan-path": "planPath",
  "--project-root": "projectRoot",
};

type ParseResult = { ok: true; value: RenderArgs } | { ok: false; error: string };

function parseArgs(argv: readonly string[]): ParseResult {
  const raw: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === undefined) continue;
    const key = FLAG_MAP[flag];
    if (!key) return { ok: false, error: `unknown flag: ${flag}` };
    const value = argv[++i];
    if (value === undefined) return { ok: false, error: `missing value for ${flag}` };
    raw[flag] = value;
  }

  if (raw["--plan-path"] === undefined) {
    return { ok: false, error: "missing required flag: --plan-path" };
  }

  return {
    ok: true,
    value: {
      planPath: raw["--plan-path"],
      projectRoot: raw["--project-root"] ?? process.cwd(),
    },
  };
}

/** D-8 path-containment: accept only paths resolving to root or beneath it. */
function isContained(projectRoot: string, userPath: string): boolean {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, userPath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

/**
 * Pure render step: parse the PLAN markdown to the typed model, then re-render
 * the canonical markdown. Deterministic — same input yields byte-identical
 * output. Throws on parse/validation failure (caller maps to exit 1).
 */
export function renderPlanMarkdown(markdown: string): string {
  return renderPlanNote(parsePlanNote(markdown));
}

export async function renderPlanNoteCli(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    console.error(`Usage error: ${parsed.error}`);
    return 2;
  }
  const args = parsed.value;

  if (!isContained(args.projectRoot, args.planPath)) {
    console.error(`Path-containment violation: ${args.planPath} escapes ${args.projectRoot}`);
    return 2;
  }

  const file = Bun.file(args.planPath);
  if (!(await file.exists())) {
    console.error(`Usage error: plan not found at ${args.planPath}`);
    return 2;
  }

  const before = await file.text();
  let after: string;
  try {
    after = renderPlanMarkdown(before);
  } catch (err) {
    console.error(`Render failure: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (after === before) {
    return 0; // Already canonical — byte-identical no-op.
  }

  await Bun.write(args.planPath, after);
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  renderPlanNoteCli(Bun.argv.slice(2)).then((code) => process.exit(code));
}
