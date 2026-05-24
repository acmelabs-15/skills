---
title: 'DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-004-spec-008-hook-layer-and-plugin-directory-layout
status: DRAFT
tags:
- design
- spec-008
- hooks
- plugin-layout
- architecture
- wave-2
---

# DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 mandates a plugin-level hook layer that auto-invokes composition library validators at the moments Brain note state changes. The architecture is a seven-layer stack: five `PreToolUse` blocking gates (Edit/Write/MultiEdit on `docs/**`; MCP `edit_note`/`write_note`; `Bash(git commit *)`; `Bash(git push *)`; `Bash(gh pr create *)`), one `Stop` turn-end backstop, and one `FileChanged` post-commit observability hook. The hooks invoke validators built by Track 1 ([[REQ-001-SPEC-008: New Schema Suite]], [[REQ-002-SPEC-008: New Parser Suite]], [[REQ-003-SPEC-008: New Claim Validator Suite]]) and per-skill scripts from Track 2.

This design realizes [[REQ-011-SPEC-008: PreToolUse Blocking Gates]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]. It defines the plugin directory layout, the shared-utility decomposition under `hooks/lib/`, the per-layer handler scripts under `hooks/scripts/`, the dispatch routing from frontmatter `type:` to validator, the hybrid failure-semantics decision matrix, and the security boundary for hook handler inputs.

## Design

The hook layer ships inside the skills plugin at `${CLAUDE_PLUGIN_ROOT}/hooks/`. Plugin-level placement (vs project-level `.claude/settings.json`) means every install carries the enforcement layer by default; no per-project opt-in is required. All seven layers are declared in a single `hooks.json` manifest with `PreToolUse`/`Stop`/`FileChanged` event blocks and per-hook `matcher` and `if` filters.

Handler scripts run under Bun (~30-50ms startup; ~50-200ms validation per Brain note; ~80-250ms total per edit hook; ~500ms-2s per commit hook scaling with staged file count). Handlers read input as JSON on stdin per the Claude Code hooks contract, emit decision JSON on stdout, and exit zero on success. Non-zero exit is treated as a non-blocking infrastructure error by `PreToolUse` and `FileChanged` (fail-open) and as a turn-blocking error by `Stop` (fail-closed) — asymmetric fail-mode protects the protocol at the turn boundary while allowing inflight edits to land when infrastructure fails.

The hybrid failure semantics for Layers 1-5 partition every parse outcome into three buckets:

1. Status-flip claim failures (TASK/SPEC/REQ/DESIGN/QA/ADR/PLAN/ANALYSIS/EPIC with a terminal status and unsatisfied checkboxes) — `permissionDecision: "deny"` with a `permissionDecisionReason` naming the failing checkbox.
2. Non-blocking schema issues (missing inline `#tag` on an observation, malformed-but-parseable frontmatter, observation count below quality threshold) — `permissionDecision: "allow"` with `additionalContext` carrying the warning text.
3. Unparseable input or unexpected validator exception — handler emits a structured error to stderr and exits non-zero; runtime fail-open applies.

Layers 3-5 (commit/push/PR) iterate over staged or diff content and apply the same per-note semantics; one failing note denies the whole operation.

Layer 6 (`Stop`) re-runs the per-note validation against every `docs/**` file modified during the turn by walking the hook input's transcript record of tool calls. If any note fails, the handler emits `{ decision: "block", reason: "..." }` to block turn completion. The Stop hook is the defense-in-depth backstop for the matcher-gap risk: if a `PreToolUse` matcher fails to fire on `mcp__plugin_brain_brain__*` (Layer 2) or any other path, the turn end still runs the validators before the agent yields control.

Layer 7 (`FileChanged`) watches `.git/HEAD|.git/index|.git/logs/HEAD` literal paths (the matcher uses literal filenames, not globs). When a commit lands, the handler runs validation across all notes touched by the new commit and emits a summary as `additionalContext` to the transcript. The handler cannot block; its purpose is to make the post-commit graph state explicit in the transcript ledger.

The security boundary follows the Phase 3 security reviewer P1 directive: all `file_path` and `command` arguments arrive from the Claude Code hook dispatcher (trusted runtime), not from external user input. Handlers MUST resolve every path to its absolute form and verify it falls within the project root before reading staged content or shelling out to `git` and `gh`. Composition library validators receive parsed markdown content, not shell strings; no command injection surface exists at the validator boundary.

## Module Structure

```text
${CLAUDE_PLUGIN_ROOT}/hooks/
├── hooks.json                                ← Hook declarations for all 7 layers
├── lib/                                      ← Shared handler utilities
│   ├── dispatch-validator.ts                 ← Route by frontmatter type to validator
│   ├── apply-edit-operation.ts               ← Compute proposed content for Edit/MultiEdit
│   ├── git-staged-files.ts                   ← Read staged content via `git show :file`
│   ├── git-diff-commits.ts                   ← Read commits-being-pushed/PRed diff
│   ├── parse-tool-input.ts                   ← Handle tool_input shapes for each tool type
│   └── format-hook-response.ts               ← Emit PreToolUse/Stop/FileChanged JSON
└── scripts/                                  ← Per-layer hook handler scripts
    ├── pre-write-brain-note.ts               ← Layer 1: Edit/Write/MultiEdit on docs/**
    ├── pre-write-brain-note-mcp.ts           ← Layer 2: MCP edit_note/write_note
    ├── pre-commit-validate.ts                ← Layer 3: Bash(git commit *)
    ├── pre-push-validate.ts                  ← Layer 4: Bash(git push *)
    ├── pre-pr-create-validate.ts             ← Layer 5: Bash(gh pr create *)
    ├── stop-backstop.ts                      ← Layer 6: Stop event
    └── git-state-observer.ts                 ← Layer 7: FileChanged on .git/*
```

All handlers import composition library validators from `shared/composition/src/validators/` (per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 layout) — `validateTaskDoneClaim`, `validateRequirementAcClaim`, `validateDesignComplianceClaim`, `validateSpecDoneClaim`, `validateTestReportPassClaim`, plus the new validators from Track 1 ([[REQ-003-SPEC-008: New Claim Validator Suite]]). The `dispatch-validator.ts` utility owns the type-to-validator routing table.

## Interfaces

```typescript
// hooks/lib/dispatch-validator.ts
import { z } from "zod";
import type { ValidationResult } from "shared/composition/src/validators/common";

type NoteType =
  | "task" | "requirement" | "design" | "spec" | "qa"
  | "decision" | "plan" | "analysis" | "epic";

export interface DispatchOutcome {
  verdict: "deny" | "allow-with-warning" | "allow";
  reason?: string;            // populated when verdict is "deny"
  warning?: string;           // populated when verdict is "allow-with-warning"
}

export function dispatchValidator(
  noteContent: string,
  filePath: string,
): DispatchOutcome;

// hooks/lib/apply-edit-operation.ts
export interface EditOperation {
  tool: "Edit" | "Write" | "MultiEdit";
  filePath: string;
  oldString?: string;         // Edit/MultiEdit
  newString?: string;         // Edit/MultiEdit
  edits?: Array<{ oldString: string; newString: string }>; // MultiEdit
  content?: string;           // Write
}

export function applyEditOperation(
  op: EditOperation,
  currentContent: string,
): string;

// hooks/lib/git-staged-files.ts
export interface StagedNote {
  filePath: string;
  content: string;            // from `git show :<file>`
}

export function readStagedBrainNotes(repoRoot: string): Promise<StagedNote[]>;

// hooks/lib/git-diff-commits.ts
export interface DiffNote {
  filePath: string;
  content: string;            // post-image from the diff
  sha: string;
}

export function readPushDiffBrainNotes(
  repoRoot: string,
  remote: string,
  branch: string,
): Promise<DiffNote[]>;

export function readPrDiffBrainNotes(
  repoRoot: string,
  baseBranch: string,
): Promise<DiffNote[]>;

// hooks/lib/parse-tool-input.ts
export interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  transcript_path?: string;   // Stop / FileChanged hooks
  cwd: string;
}

export function readHookInput(): Promise<HookInput>;

// hooks/lib/format-hook-response.ts
export interface PreToolUseDeny {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "deny";
    permissionDecisionReason: string;
  };
}

export interface PreToolUseAllow {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow";
    additionalContext?: string;
  };
}

export interface StopBlock {
  decision: "block";
  reason: string;
}

export interface FileChangedObserve {
  hookSpecificOutput: {
    hookEventName: "FileChanged";
    additionalContext: string;
  };
}

export function emitResponse(
  response: PreToolUseDeny | PreToolUseAllow | StopBlock | FileChangedObserve,
): void;
```

The `hooks.json` shape follows the Claude Code hooks contract:

```json
{
  "PreToolUse": [
    {
      "matcher": "Edit|Write|MultiEdit",
      "if": "Edit(docs/**/*.md)|Write(docs/**/*.md)|MultiEdit(docs/**/*.md)",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-write-brain-note.ts" }]
    },
    {
      "matcher": "mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-write-brain-note-mcp.ts" }]
    },
    {
      "matcher": "Bash",
      "if": "Bash(git commit *)",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-commit-validate.ts" }]
    },
    {
      "matcher": "Bash",
      "if": "Bash(git push *)",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-push-validate.ts" }]
    },
    {
      "matcher": "Bash",
      "if": "Bash(gh pr create *)",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-pr-create-validate.ts" }]
    }
  ],
  "Stop": [
    { "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/stop-backstop.ts" }] }
  ],
  "FileChanged": [
    {
      "matcher": ".git/HEAD|.git/index|.git/logs/HEAD",
      "hooks": [{ "type": "command", "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/git-state-observer.ts" }]
    }
  ]
}
```

## Compliance

- [ ] All seven layers declared in `hooks/hooks.json` with the exact matchers and `if` filters specified in [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 table
- [ ] Handler scripts use `${CLAUDE_PLUGIN_ROOT}` placeholder (resolves to plugin install dir) per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Implementation Notes
- [ ] Handlers import validators from `shared/composition/src/validators/` per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 directory layout
- [ ] Layers 1-5 implement HYBRID failure semantics (deny on status-flip claim failures; allow with `additionalContext` warning on other schema issues) per [[REQ-011-SPEC-008: PreToolUse Blocking Gates]] AC
- [ ] Layer 6 (`Stop`) blocks turn completion on any unvalidated `docs/**` modification per [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC
- [ ] Layer 7 (`FileChanged`) emits `additionalContext` only (no `permissionDecision`) per [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC
- [ ] Every handler validates `file_path` and `command` arguments fall within project root before reading content or shelling out, per Phase 3 security reviewer P1
- [ ] Handler crash exits non-zero; `PreToolUse`/`FileChanged` fail-open (tool call proceeds); `Stop` fails-closed (turn blocked)
- [ ] Per-edit hook latency stays within ~80-250ms budget; per-commit hook latency for typical 5-10 file commit stays within ~500ms-2s

## Observations

- [design] Seven-layer hook stack converts Wave 2's potential enforcement (validators exist) into actual enforcement (validators fire mechanically at every state-change gate) #defense-in-depth #enforcement
- [decision] Plugin-level `${CLAUDE_PLUGIN_ROOT}/hooks/` placement ships hooks with every install; project-level `.claude/settings.json` was rejected because it requires per-project opt-in #plugin-layout #ubiquity
- [decision] Hybrid failure semantics (deny on status-flip claim failures; allow-with-warning on other issues) preserve low-friction edits while hard-blocking lying claims #hybrid-semantics #ux
- [decision] Asymmetric fail-mode — PreToolUse and FileChanged fail-open on infrastructure error; Stop fails-closed — keeps inflight work moving while preserving the conservative default at the turn boundary #fail-mode #asymmetry
- [constraint] Layer 7 cannot watch `docs/**/*.md` for external edits because `FileChanged` matchers use literal filenames not globs; external editor edits are explicitly out of scope per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 threat model #file-changed #threat-model
- [technique] `dispatch-validator.ts` routes by frontmatter `type:` to validator, decoupling per-layer handlers from the validator catalog and letting Track 1 grow the catalog without per-handler edits #dispatch #single-responsibility

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- depends_on [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]