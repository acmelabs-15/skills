#!/usr/bin/env bun
/**
 * dispatch-implementer — build skill dispatch-brief generator (REQ-005).
 *
 * Emits the full implementer dispatch brief to stdout given a TASK ref and the
 * rendered TASK content. Deterministic: same args → byte-identical stdout.
 *
 * No filesystem reads beyond module load; inputs come from the trusted
 * orchestrator runtime (ADR-005 D-4 trust-boundary — no path-containment
 * check needed).
 *
 * Exit codes:
 *   0  success (stdout = brief markdown)
 *   2  usage error (missing required args — stderr = usage line)
 */

interface ImplementerBriefArgs {
  taskRef: string;
  taskContent: string;
}

type ParseResult = { ok: true; value: ImplementerBriefArgs } | { ok: false; error: string };

function parseArgs(argv: string[]): ParseResult {
  const raw: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--task-ref" || flag === "--task-content") {
      const value = argv[++i];
      if (value === undefined) return { ok: false, error: `missing value for ${flag}` };
      raw[flag] = value;
    } else if (flag !== undefined) {
      return { ok: false, error: `unknown flag: ${flag}` };
    }
  }
  if (!raw["--task-ref"]) return { ok: false, error: "missing required flag: --task-ref" };
  if (!raw["--task-content"]) return { ok: false, error: "missing required flag: --task-content" };
  return {
    ok: true,
    value: { taskRef: raw["--task-ref"], taskContent: raw["--task-content"] },
  };
}

export function renderImplementerBrief(args: ImplementerBriefArgs): string {
  return [
    "# Implementer Dispatch Brief",
    "",
    "## Scope",
    `- **TASK**: ${args.taskRef}`,
    "",
    "## Rendered TASK content",
    "",
    args.taskContent,
    "",
    "## Directives",
    "",
    "**TDD directive**: Write failing tests for each acceptance criterion BEFORE implementation code.",
    "",
    "**Canonical-source-mirror constraint**: If code mirrors an existing source, cite path + quote verbatim.",
    "",
    "**Evidence hierarchy**: Cite tool output > files read > web/docs > training knowledge.",
    "",
    "**Quality self-check**: Is the code hard to test? Do methods read like sentences? Is coupling intentional?",
    "",
    "**Memory-first gate**: Before changing existing code/architecture/protocol, search Brain memory for related context via `mcp__plugin_brain_brain__search`. Document findings inline.",
    "",
    "## Contract",
    "",
    "You implement against the Definition of Done checkboxes verbatim. Mark `[x]` on each item as it is satisfied. Implement ONLY this TASK — do not touch other TASKs.",
    "",
    "Return `## State Changes` listing ONLY this TASK's status transition when complete.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(
      `Usage: dispatch-implementer.ts --task-ref <ref> --task-content <content>\nError: ${parsed.error}\n`,
    );
    return 2;
  }
  process.stdout.write(renderImplementerBrief(parsed.value));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  main(Bun.argv.slice(2)).then((code) => process.exit(code));
}
