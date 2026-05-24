---
title: 'DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-002-spec-008-per-skill-script-layout-and-cli-contract-1
status: DRAFT
tags:
- design
- spec-008
- track-2
- per-skill-scripts
- cli-contract
---

# DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract

## Context

This design fixes the directory layout, CLI entry shape, naming convention, import boundary, and security trust boundary for the eleven gate-point invocation scripts of REQ-004 and the six dispatch-brief generator scripts of REQ-005. The decisions are constrained by [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 (per-skill scripts pattern), D-4 (programmatic per-skill brief generators), and D-8 security boundary (path-containment for inputs from external sources). All seventeen scripts are colocated under `skills/<skill-name>/scripts/` and import only from `shared/composition/src/`; no business logic lives in the per-skill script files themselves.

## Design

The Wave 2 scripts extend the per-skill scripts pattern established by `skills/defrag/scripts/` and `skills/ingest/scripts/`. The pattern has three load-bearing properties:

1. **Skill-local**: each script lives under the skill directory it serves; orchestrator dispatch briefs reference `skills/<name>/scripts/<verb>.ts` and never reach across skill boundaries.
2. **Thin wrapper**: each script is fewer than 60 lines and imports its core logic from `shared/composition/src/`. The script handles CLI arg parsing, file I/O, and process exit codes; the composition library handles parsing, validation, and mutation.
3. **Shell-composable**: every script exits zero on success and non-zero on failure, prints structured stdout on success and structured stderr on failure, and uses the `if (import.meta.main)` Bun guard to support both `bun skills/.../verb.ts` invocation and programmatic import from a colocated `.test.ts`.

The seventeen scripts split into two functional categories with distinct trust boundaries:

| Category | Scripts | Trust boundary |
| --- | --- | --- |
| Gate-point invocation (REQ-004) | 11 validator/mutation wrappers | Receives file path from external dispatcher; MUST validate path-containment against project root per ADR-005 D-8 |
| Dispatch-brief generator (REQ-005) | 6 brief emitters | Receives args from trusted orchestrator runtime; no path-containment check needed; produces markdown to stdout |

The distinction matters because gate-point scripts read files identified by externally-supplied paths (and could in principle be invoked by a hook handler dispatching on an attacker-controlled tool_input shape), whereas brief generators emit text from in-process constants and receive their scope args from the orchestrator's dispatch logic, never from user input.

## Module Structure

```text
skills/
  build/scripts/
    validate-task-done.ts                 # NEW (REQ-004) — TASK DoD claim gate
    validate-task-done.test.ts            # NEW
    transition-impl-item.ts               # NEW (REQ-004) — PLAN impl-item mutation
    transition-impl-item.test.ts          # NEW
    transition-qa-item.ts                 # NEW (REQ-004) — PLAN qa-item mutation
    transition-qa-item.test.ts            # NEW
    dispatch-implementer.ts               # NEW (REQ-005) — implementer brief generator
    dispatch-implementer.test.ts          # NEW
    dispatch-qa.ts                        # NEW (REQ-005) — QA brief generator
    dispatch-qa.test.ts                   # NEW
  end/scripts/
    validate-spec-done.ts                 # NEW (REQ-004) — SPEC done-claim gate
    validate-spec-done.test.ts            # NEW
    run-pre-flight.ts                     # NEW (REQ-004) — pre-flight checklist runner
    run-pre-flight.test.ts                # NEW
  spec/scripts/
    validate-task-schema.ts               # NEW (REQ-004) — TASK schema-only validator
    validate-task-schema.test.ts          # NEW
    validate-req-schema.ts                # NEW (REQ-004) — REQ schema-only validator
    validate-req-schema.test.ts           # NEW
    validate-design-schema.ts             # NEW (REQ-004) — DESIGN schema-only validator
    validate-design-schema.test.ts        # NEW
  decisions/scripts/
    lock-decision-mutation.ts             # NEW (REQ-004) — decision-lock mutation runner
    lock-decision-mutation.test.ts        # NEW
    dispatch-architect.ts                 # NEW (REQ-005) — architect brief generator
    dispatch-architect.test.ts            # NEW
    dispatch-decision-critic.ts           # NEW (REQ-005) — decision-critic brief generator
    dispatch-decision-critic.test.ts      # NEW
  plan/scripts/
    render-plan-note.ts                   # NEW (REQ-004) — PLAN render-and-write driver
    render-plan-note.test.ts              # NEW
    set-part-done.ts                      # NEW (REQ-004) — PLAN part DONE mutation
    set-part-done.test.ts                 # NEW
  research/scripts/
    dispatch-analyst.ts                   # NEW (REQ-005) — analyst brief generator
    dispatch-analyst.test.ts              # NEW
  review/scripts/
    dispatch-reviewer.ts                  # NEW (REQ-005) — reviewer brief generator
    dispatch-reviewer.test.ts             # NEW
```

The layout adds twelve `.ts` scripts plus seventeen colocated `.test.ts` files across seven skill directories. Existing scripts in `skills/defrag/scripts/` and `skills/ingest/scripts/` remain untouched. No `index.ts` barrel inside each skill's `scripts/` directory; each script is independently invokable via `bun skills/.../verb.ts`.

## Interfaces

### Gate-point invocation script CLI contract

```typescript
// skills/build/scripts/validate-task-done.ts (representative shape)
import { resolve, sep } from "node:path";
import { TaskNoteSchema } from "shared/composition/src/schemas/task-note";
import { validateTaskDoneClaim } from "shared/composition/src/validators/task-claim-validator";

async function main(args: string[]): Promise<number> {
  const taskPath = args[0];
  if (!taskPath) {
    process.stderr.write("usage: validate-task-done.ts <task-path>\n");
    return 2;
  }
  const projectRoot = process.cwd();
  const resolved = resolve(projectRoot, taskPath);
  if (!resolved.startsWith(projectRoot + sep) && resolved !== projectRoot) {
    process.stderr.write(`path-containment violation: ${taskPath}\n`);
    return 2;
  }
  const text = await Bun.file(resolved).text();
  const parsed = TaskNoteSchema.parse(text);
  const result = validateTaskDoneClaim(parsed);
  if (!result.ok) {
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
```

### Brief-generator script CLI contract

```typescript
// skills/build/scripts/dispatch-qa.ts (representative shape)
import { validRelationTypes } from "shared/composition/src/schemas/common";

interface QaBriefArgs {
  taskRef: string;
  reqRefs: string[];
}

function renderQaBrief(args: QaBriefArgs): string {
  return [
    "# QA Dispatch Brief",
    "",
    `## Scope`,
    `- TASK: ${args.taskRef}`,
    `- REQs: ${args.reqRefs.join(", ")}`,
    "",
    `## Valid relation types (from common.ts)`,
    ...validRelationTypes.map((v) => `- ${v}`),
    "",
    "## Reviewer asymmetry mandate",
    "...",
  ].join("\n");
}

async function main(args: string[]): Promise<number> {
  const parsed = parseArgs(args);  // simple flag-based parser; no path resolution
  process.stdout.write(renderQaBrief(parsed));
  return 0;
}

if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}

export { renderQaBrief };
```

### Exit-code contract

| Exit code | Meaning |
| --- | --- |
| 0 | Success; stdout is meaningful payload (validator OK or brief markdown) |
| 1 | Validation or mutation failed; stderr names the failing item |
| 2 | Usage error (missing args, path-containment violation, schema parse failure on input) |

## Naming Conventions

| Artifact | Pattern | Example |
| --- | --- | --- |
| Gate-point validator script | `validate-<entity>-<terminal-status>.ts` | `validate-task-done.ts`, `validate-spec-done.ts` |
| Schema-only validator script | `validate-<entity>-schema.ts` | `validate-task-schema.ts` |
| Mutation script | `<verb>-<entity>[-<modifier>].ts` | `transition-impl-item.ts`, `set-part-done.ts`, `lock-decision-mutation.ts` |
| Render script | `render-<entity>-note.ts` | `render-plan-note.ts` |
| Pre-flight script | `run-pre-flight.ts` | (singular; only one per skill) |
| Brief generator | `dispatch-<agent>.ts` | `dispatch-implementer.ts`, `dispatch-qa.ts`, `dispatch-architect.ts` |
| Colocated test | `<script>.test.ts` | `validate-task-done.test.ts` |

Names use lowercase ASCII letters and hyphens; no underscores. The `dispatch-<agent>` form encodes the target subagent type rather than the workflow phase, so the same agent dispatched from two skills uses the same agent name with a different skill-directory parent.

## Import Boundary

Per-skill scripts import only from these sources:

| Source | Purpose |
| --- | --- |
| `shared/composition/src/schemas/*` | Zod schemas, parser functions, cross-cutting constants |
| `shared/composition/src/validators/*` | Claim validators |
| `shared/composition/src/mutations/*` | Plan and checkbox mutations |
| `shared/composition/src/renderers/*` | Plan and session renderers (REQ-004 render-plan-note only) |
| `node:path`, `node:fs/promises`, `Bun.file`, `Bun.argv` | Standard runtime |

Per-skill scripts MUST NOT import from:

- Other skills (`skills/<other-skill>/scripts/*`)
- Test fixtures (`tests/**`)
- Anywhere in `apps/`, `packages/`, or any non-composition source tree

This boundary is enforced manually at code-review time and via the colocated `.test.ts` files that exercise the script in isolation.

## Security Trust Boundary

Per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary section, gate-point invocation scripts (REQ-004) MUST validate path-containment on every file-path argument before reading the file. The canonical check resolves the user-supplied path against `process.cwd()` and asserts the resolved absolute path starts with the project root plus a path separator. This rejects `..` traversal and absolute paths pointing outside the project.

Brief-generator scripts (REQ-005) have a SEPARATE trust boundary documented in ADR-005 D-4. Their inputs are scope identifiers (TASK ref, REQ refs, decision-critic option set) supplied by the trusted orchestrator runtime, not by external user input. They emit text to stdout and perform no filesystem reads beyond importing constants at module load. The path-containment check is therefore not applicable.

The hook layer of REQ-011 also performs path-containment; the per-skill validator scripts and the hook handlers share the same containment rule so an attacker cannot bypass containment by switching attack surface.

## Compliance

- [ ] Every gate-point invocation script (REQ-004) calls a path-containment check before any filesystem read of an argument-supplied path
- [ ] Every brief-generator script (REQ-005) accepts only scope-identifier args; no file-path resolution against external input
- [ ] Every script includes the `if (import.meta.main)` guard for CLI invocation
- [ ] Every script exits 0 on success, 1 on validation/mutation failure, 2 on usage error
- [ ] Every script imports only from `shared/composition/src/` (plus Node and Bun standard runtime)
- [ ] Every script ships with a colocated `<script>.test.ts` that asserts both success and failure paths
- [ ] Every script is fewer than 60 lines excluding the CLI guard block (target; 80-line ceiling acceptable for the two mutation scripts with multi-flag parsing)
- [ ] Every gate-point script exit-code contract matches the table in Interfaces (0 / 1 / 2 semantics)

## Algorithms

The Wave 2 scripts use no new algorithms beyond CLI arg parsing, file I/O, and delegation to composition-library functions. The path-containment check is a single `path.resolve` plus `startsWith` comparison; the brief-rendering is template-literal string concatenation over imported constants.

## Edge Cases

| Case | Behavior |
| --- | --- |
| Gate-point script called with no args | Exit 2; stderr prints usage line |
| Gate-point script called with `..` segments in path | Exit 2; stderr names path-containment violation |
| Gate-point script called with absolute path outside project root | Exit 2; same containment violation |
| File-path argument points to nonexistent file | Bun.file().text() throws; caught and surfaced as exit 2 with "file not found" stderr |
| Schema parse fails on input | Exit 2; stderr includes Zod issue tree |
| Validator returns `unsatisfied` | Exit 1; stderr JSON-stringifies the unsatisfied array |
| Brief generator called with missing scope arg | Exit 2; stderr lists required scope args |
| Two concurrent invocations of a mutation script on the same PLAN file | Last writer wins; mutation scripts are not concurrency-safe by design (file-level locking is hook-layer responsibility) |

## Performance Considerations

Per-invocation overhead is dominated by Bun cold-start (~30-50ms) plus composition-library import resolution (~10-20ms). Each script's logic runs sub-millisecond after imports resolve. For a typical per-TASK build+qa cycle of five script invocations, cumulative overhead is ~250ms — bounded and well under the wall-clock of the agent dispatches themselves. Brief generators are even faster (no file I/O after module load).

## Observations

- [design] Seventeen per-skill scripts split across seven skill directories with two distinct trust boundaries (gate-point validators vs brief generators) #script-layout #trust-boundaries
- [decision] Gate-point scripts validate path-containment via `path.resolve(projectRoot, userPath).startsWith(projectRoot + sep)`; the same rule applies in the hook layer of REQ-011 per ADR-005 D-8 #security #path-containment
- [decision] Brief generators have a separate trust boundary per ADR-005 D-4; their args come from the trusted orchestrator runtime so no path-containment is needed #d-4 #trust-boundary-separation
- [constraint] Every script imports only from `shared/composition/src/` plus Node and Bun standard runtime; no cross-skill or test-fixture imports permitted #import-boundary
- [technique] Exit-code contract is uniform across all seventeen scripts (0/1/2 semantics); colocated `.test.ts` files assert both success and failure paths #shell-composable #testability
- [constraint] Mutation scripts are not concurrency-safe by design; concurrent-write protection lives in the hook layer (REQ-011) not in per-skill scripts #concurrency

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- relates_to [[SPEC-006: Defrag and Ingest Skills]]
