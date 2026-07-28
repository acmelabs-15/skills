#!/usr/bin/env bun
/**
 * dispatch-qa — build skill dispatch-brief generator (REQ-005).
 *
 * Emits the full QA dispatch brief to stdout given a TASK ref and REQ refs.
 * Imports validRelationTypes from shared/composition/src/schemas/common.ts so
 * the relation-verb allowlist auto-propagates when common.ts changes — no
 * manual prose sync needed (ADR-005 D-4, Audit C root cause fix).
 *
 * Deterministic: same args → byte-identical stdout.
 * No filesystem reads beyond module load (ADR-005 D-4 trust boundary).
 *
 * Exit codes:
 *   0  success (stdout = brief markdown)
 *   2  usage error (missing required args — stderr = usage line)
 */

import { validRelationTypes } from "../../../shared/composition/src/schemas/common.ts";

interface QaBriefArgs {
  taskRef: string;
  reqRefs: string[];
}

type ParseResult = { ok: true; value: QaBriefArgs } | { ok: false; error: string };

function parseArgs(argv: string[]): ParseResult {
  const raw: Record<string, string> = {};
  const reqRefs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--task-ref") {
      const value = argv[++i];
      if (value === undefined) return { ok: false, error: "missing value for --task-ref" };
      raw["--task-ref"] = value;
    } else if (flag === "--req-ref") {
      const value = argv[++i];
      if (value === undefined) return { ok: false, error: "missing value for --req-ref" };
      reqRefs.push(value);
    } else if (flag !== undefined) {
      return { ok: false, error: `unknown flag: ${flag}` };
    }
  }
  if (!raw["--task-ref"]) return { ok: false, error: "missing required flag: --task-ref" };
  return { ok: true, value: { taskRef: raw["--task-ref"], reqRefs } };
}

export function renderQaBrief(args: QaBriefArgs): string {
  const reqSection =
    args.reqRefs.length > 0
      ? args.reqRefs.map((r) => `- ${r}`).join("\n")
      : "- (no REQ refs provided)";

  return [
    "# QA Dispatch Brief",
    "",
    "## Scope",
    `- **TASK**: ${args.taskRef}`,
    "- **REQs**:",
    reqSection,
    "",
    "## Valid relation types (imported from common.ts)",
    "",
    ...validRelationTypes.map((v) => `- ${v}`),
    "",
    "## Reviewer asymmetry mandate",
    "",
    "You are the adversarial reviewer. Your job is to find failures, not to confirm success.",
    "Do NOT give the implementer the benefit of the doubt on ambiguous items.",
    "Every `[ ]` checkbox is a finding unless you have explicit evidence it is satisfied.",
    "",
    "## Contract",
    "",
    "Read the ENTIRE spec subtree (TASK DoD + linked REQ Acceptance Criteria + linked DESIGN Compliance).",
    "Evaluate each checkbox individually with evidence (file:line, test name, or explicit absence).",
    "Mark `[x]` for items with evidence; leave `[ ]` for items without evidence.",
    "Write per-checkbox findings to a QA-NNN-SPEC-NNN-{task-slug}.md note via a single `write_note` call passing the full colon title.",
    "Return verdict ONLY: `PASS` or `FAILED + see QA-NNN-SPEC-NNN-{task-slug}`.",
    "The QA note is the contract document — do not summarize findings in your return message.",
    "",
    "## Your judgment is the verification",
    "",
    "No validator runs behind you. The valid/invalid ruling on every checkbox is yours alone,",
    "and the QA note's per-item evidence is what the orchestrator acts on:",
    "- A `PASS` verdict must match your per-row results — if any row failed, the verdict is `FAILED`.",
    "- Report `tests_run` as the true total: it must equal passed + failed + skipped.",
    "Nothing downstream will catch an inaccurate verdict, which is why the accuracy has to come from you.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(
      `Usage: dispatch-qa.ts --task-ref <ref> [--req-ref <ref>...]\nError: ${parsed.error}\n`,
    );
    return 2;
  }
  process.stdout.write(renderQaBrief(parsed.value));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  main(Bun.argv.slice(2)).then((code) => process.exit(code));
}
