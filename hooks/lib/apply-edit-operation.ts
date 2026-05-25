/**
 * Apply an Edit/Write/MultiEdit operation in memory and return the proposed
 * post-edit content. Used by Layer 1 PreToolUse to compute what the file
 * WOULD look like after the edit, then dispatched to the validator before
 * the write lands on disk.
 *
 * Per DESIGN-004-SPEC-008 Interfaces section.
 */

export interface EditOperation {
  tool: "Edit" | "Write" | "MultiEdit";
  filePath: string;
  /** Edit/MultiEdit: the substring to be replaced. */
  oldString?: string;
  /** Edit/MultiEdit: the replacement substring. */
  newString?: string;
  /** MultiEdit: ordered list of find/replace pairs applied sequentially. */
  edits?: Array<{ oldString: string; newString: string }>;
  /** Write: full file content overwrite. */
  content?: string;
}

/**
 * Error thrown when an Edit/MultiEdit oldString does not exist in the
 * current content, or matches non-uniquely. Callers in Layer 1 catch this
 * and fall back to fail-open per DESIGN-004 asymmetric fail-mode.
 */
export class EditOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditOperationError";
  }
}

function applySingleEdit(
  currentContent: string,
  oldString: string,
  newString: string,
  context: string,
): string {
  if (oldString === "") {
    throw new EditOperationError(`${context}: oldString must be non-empty`);
  }
  const firstIndex = currentContent.indexOf(oldString);
  if (firstIndex === -1) {
    throw new EditOperationError(`${context}: oldString not found in current content`);
  }
  const secondIndex = currentContent.indexOf(oldString, firstIndex + 1);
  if (secondIndex !== -1) {
    throw new EditOperationError(
      `${context}: oldString matches non-uniquely (found at offsets ${firstIndex} and ${secondIndex})`,
    );
  }
  return (
    currentContent.slice(0, firstIndex) +
    newString +
    currentContent.slice(firstIndex + oldString.length)
  );
}

export function applyEditOperation(op: EditOperation, currentContent: string): string {
  switch (op.tool) {
    case "Write": {
      if (op.content === undefined) {
        throw new EditOperationError("Write: content field is required");
      }
      return op.content;
    }
    case "Edit": {
      if (op.oldString === undefined || op.newString === undefined) {
        throw new EditOperationError("Edit: oldString and newString fields are required");
      }
      return applySingleEdit(currentContent, op.oldString, op.newString, "Edit");
    }
    case "MultiEdit": {
      if (!op.edits || op.edits.length === 0) {
        throw new EditOperationError("MultiEdit: edits array must be present and non-empty");
      }
      let working = currentContent;
      for (let i = 0; i < op.edits.length; i++) {
        const edit = op.edits[i];
        if (!edit) {
          throw new EditOperationError(`MultiEdit[${i}]: edit entry is undefined`);
        }
        working = applySingleEdit(working, edit.oldString, edit.newString, `MultiEdit[${i}]`);
      }
      return working;
    }
    default: {
      const exhaustive: never = op.tool;
      throw new EditOperationError(`Unsupported tool: ${String(exhaustive)}`);
    }
  }
}
