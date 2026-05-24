/**
 * spec-skill REQ schema validator (SPEC-008 TASK-015).
 *
 * Schema-only validator: parses a REQ note against RequirementNoteSchema (via
 * the composition-layer parser) and reports whether it structurally conforms.
 * Distinct from the terminal-status claim validators — answers "does this note
 * parse?" not "is this ACCEPTED claim honest?".
 *
 * Exit codes: 0 = valid (stdout "ok"); 2 = schema parse failure (Zod issue
 * tree to stderr) OR usage / path-containment error. Exit 1 is unused.
 */

import { resolve, sep } from "node:path";
import { parseRequirementNote } from "../../../shared/composition/src/parsers/requirement-note.ts";

/** Captured stream lines — exported for test ergonomics. */
export interface CaptureResult {
  out: string[];
  err: string[];
}

/**
 * Structural ZodError detector. The composition parsers throw `ZodError` on
 * schema-parse failure, but importing the `zod` class directly would breach the
 * import boundary (composition/src + node/bun only). A ZodError carries an
 * `issues` array — detect it by shape so we surface the issue tree to stderr.
 */
function zodIssues(err: unknown): unknown[] | undefined {
  if (typeof err === "object" && err !== null && "issues" in err) {
    const { issues } = err as { issues: unknown };
    if (Array.isArray(issues)) return issues;
  }
  return undefined;
}

/**
 * Resolve `userPath` against `projectRoot` and accept only when the result is
 * contained within the root (ADR-005 D-8). Bare `.startsWith(projectRoot)` is
 * forbidden — it would admit sibling dirs like `<root>-evil`.
 */
function resolveContained(projectRoot: string, userPath: string): string | undefined {
  const root = resolve(projectRoot);
  const target = resolve(root, userPath);
  if (target === root || target.startsWith(root + sep)) return target;
  return undefined;
}

export async function validateReqSchema(argv: string[], projectRoot: string): Promise<number> {
  const userPath = argv[0];
  if (userPath === undefined || userPath.length === 0) {
    console.error("usage: validate-req-schema <note-path>");
    return 2;
  }

  const resolved = resolveContained(projectRoot, userPath);
  if (resolved === undefined) {
    console.error(`path resolves outside project root: ${userPath}`);
    return 2;
  }

  try {
    const markdown = await Bun.file(resolved).text();
    parseRequirementNote(markdown);
    console.log("ok");
    return 0;
  } catch (err) {
    const issues = zodIssues(err);
    if (issues !== undefined) {
      console.error(JSON.stringify(issues, null, 2));
    } else {
      console.error(err instanceof Error ? err.message : String(err));
    }
    return 2;
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  validateReqSchema(Bun.argv.slice(2), process.cwd()).then((code) => process.exit(code));
}
