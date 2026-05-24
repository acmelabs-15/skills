#!/usr/bin/env bun
/**
 * validate-task-done — per-TASK Definition-of-Done gate (build skill).
 *
 * Thin shell-composable wrapper around `validateTaskDoneClaim`. Reads a TASK
 * note path, enforces path-containment against the project root, parses the
 * markdown via `parseTaskNote`, and reports whether every DoD item is checked
 * or deferred-with-rationale.
 *
 * Exit codes:
 *   0  every DoD item satisfied (stdout = "ok")
 *   1  validation failure (stderr names the unsatisfied items)
 *   2  usage error / path-containment violation / file-not-found / parse failure
 */

import { resolve, sep } from "node:path";
import { parseTaskNote } from "../../../shared/composition/src/parsers/task-note.ts";
import { validateTaskDoneClaim } from "../../../shared/composition/src/validators/task-claim-validator.ts";

async function main(args: string[]): Promise<number> {
  const taskPath = args[0];
  if (taskPath === undefined || taskPath.length === 0) {
    process.stderr.write("usage: validate-task-done.ts <task-path>\n");
    return 2;
  }

  // Path-containment (ADR-005 D-8): accept ONLY paths that resolve to the
  // project root itself or a descendant. The bare `.startsWith(root)` form is
  // forbidden — it false-accepts sibling prefixes (e.g. /repo-evil vs /repo).
  const projectRoot = process.cwd();
  const resolved = resolve(projectRoot, taskPath);
  if (!(resolved === projectRoot || resolved.startsWith(projectRoot + sep))) {
    process.stderr.write(`path-containment violation: ${taskPath}\n`);
    return 2;
  }

  let task: ReturnType<typeof parseTaskNote>;
  try {
    const markdown = await Bun.file(resolved).text();
    task = parseTaskNote(markdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`cannot read or parse task note: ${message}\n`);
    return 2;
  }

  const result = validateTaskDoneClaim(task);
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
