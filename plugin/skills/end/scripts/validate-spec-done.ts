#!/usr/bin/env bun
/**
 * validate-spec-done — SPEC done-claim gate (end skill).
 *
 * Thin shell-composable wrapper around `validateSpecDoneClaim`. Reads a SPEC
 * root note path, enforces path-containment against the project root (ADR-005
 * D-8), parses the markdown via `parseSpecRootNote`, and reports whether every
 * `## Success Criteria` + `## Artifact Status` item is checked, carries the
 * `[~]` deferred marker, or is deferred-with-rationale.
 *
 * Exit codes:
 *   0  every gate item satisfied (stdout = "ok")
 *   1  validation failure (stderr names the unsatisfied items + their section)
 *   2  usage error / path-containment violation / file-not-found / parse failure
 *
 * Note on the status-DONE path: when a SPEC carries `status: DONE` with an
 * unsatisfied gate item, `SpecRootNoteSchema.superRefine` rejects at PARSE
 * time, surfacing as exit 2 (parse failure) per the CLI contract. Exit 1 is
 * reached when the note parses (status not DONE) yet `validateSpecDoneClaim`
 * returns FAIL — mirrors the validate-task-done precedent.
 */

import { resolve, sep } from "node:path";
import { parseSpecRootNote } from "@acmelabs/models/parsers/spec-root-note";
import { validateSpecDoneClaim } from "@acmelabs/models/validators/spec-claim-validator";

async function main(args: string[]): Promise<number> {
  const specPath = args[0];
  if (specPath === undefined || specPath.length === 0) {
    process.stderr.write("usage: validate-spec-done.ts <spec-root-path>\n");
    return 2;
  }

  // Path-containment (ADR-005 D-8): accept ONLY paths that resolve to the
  // project root itself or a descendant. The bare `.startsWith(root)` form is
  // forbidden — it false-accepts sibling prefixes (e.g. /repo-evil vs /repo).
  const projectRoot = process.cwd();
  const resolved = resolve(projectRoot, specPath);
  if (!(resolved === projectRoot || resolved.startsWith(projectRoot + sep))) {
    process.stderr.write(`path-containment violation: ${specPath}\n`);
    return 2;
  }

  let spec: ReturnType<typeof parseSpecRootNote>;
  try {
    const markdown = await Bun.file(resolved).text();
    spec = parseSpecRootNote(markdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`cannot read or parse spec root note: ${message}\n`);
    return 2;
  }

  const result = validateSpecDoneClaim(spec);
  if (result.verdict === "FAIL") {
    process.stderr.write(`unsatisfied:\n${JSON.stringify(result.unsatisfied, null, 2)}\n`);
    return 1;
  }

  process.stdout.write("ok\n");
  return 0;
}

if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}

export { main };
