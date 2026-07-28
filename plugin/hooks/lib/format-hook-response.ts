/**
 * Emit hook response JSON to stdout per the Claude Code hooks contract.
 *
 * Per DESIGN-004-SPEC-008 Interfaces section. The runtime reads a single
 * JSON line from the handler's stdout and parses it; pretty-printing or
 * multiple JSON documents would break the contract.
 *
 * Four response shapes:
 *   - PreToolUseDeny: blocks the tool call with a permission denial reason.
 *   - PreToolUseAllow: lets the tool call proceed, optionally with warning
 *     `additionalContext` (hybrid failure semantics per REQ-011).
 *   - StopBlock: blocks turn completion at the Stop event (Layer 6 backstop).
 *   - FileChangedObserve: passes observation text into the transcript via
 *     `additionalContext` only — cannot block (Layer 7).
 */

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

export type HookResponse = PreToolUseDeny | PreToolUseAllow | StopBlock | FileChangedObserve;

/**
 * Serialize the response as a single-line JSON document followed by `\n`
 * and write it to stdout. No pretty-printing, no surrounding whitespace.
 */
export function emitResponse(response: HookResponse): void {
  const json = JSON.stringify(response);
  process.stdout.write(`${json}\n`);
}
