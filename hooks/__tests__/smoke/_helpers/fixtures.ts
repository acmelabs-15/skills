/**
 * Fixture loaders for the hook smoke tests.
 *
 * The adversarial fixtures authored by Track 3 (REQ-006) live under
 * `shared/composition/tests/fixtures/adversarial/<type>/`. Per ADR-005 D-8
 * Cross-D-N Implications, each fixture IS the lying claim a hook must deny, so
 * the smoke tests reuse them directly rather than re-authoring lying notes.
 *
 * TERMINAL-STATUS FLIP (load-bearing): the adversarial fixtures carry a
 * NON-terminal frontmatter `status` (task=IN_PROGRESS, requirement/design=
 * PROPOSED, qa=DRAFT, spec=ACCEPTED). The lying claim lives in the BODY
 * (unsatisfied DoD / AC / compliance / artifact checkboxes), but the hook
 * dispatcher (`dispatchValidator`) only runs the claim check when the
 * frontmatter status equals the note type's TERMINAL status. The Track-3
 * validator-level harness invokes the validator directly (status-agnostic), so
 * it catches the lie as-authored; the hook layer does not until the status is
 * flipped to terminal. These helpers model the real hook threat — an agent that
 * flips `status` to the terminal value while leaving the contract unsatisfied —
 * by flipping the fixture's status to terminal before dispatch. (Reported as a
 * finding in the TASK return.)
 */

import { resolve } from "node:path";

/** Repo root resolved from this file's location (…/hooks/__tests__/smoke/_helpers). */
const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..", "..");

/** Directory holding the Track-3 adversarial fixture tree. */
const ADVERSARIAL_DIR = resolve(
  REPO_ROOT,
  "shared",
  "composition",
  "tests",
  "fixtures",
  "adversarial",
);

/** Canonical composition-library TASK sample (status IN_PROGRESS by default). */
const TASK_SAMPLE = resolve(
  REPO_ROOT,
  "shared",
  "composition",
  "tests",
  "fixtures",
  "task-note-sample.md",
);

/** Terminal status per claim-bearing note type (the status the hook gate runs at). */
export const TERMINAL_STATUS = {
  task: "DONE",
  requirement: "ACCEPTED",
  design: "ACCEPTED",
  spec: "DONE",
  qa: "DONE",
} as const;

/** Read an adversarial fixture by `<type>/<slug>.md` relative path. */
export async function readAdversarialFixture(relPath: string): Promise<string> {
  return Bun.file(resolve(ADVERSARIAL_DIR, relPath)).text();
}

/** Replace the frontmatter `status:` line with the given terminal value. */
export function withStatus(content: string, status: string): string {
  return content.replace(/^status:.*$/m, `status: ${status}`);
}

/**
 * Load an adversarial fixture and flip its frontmatter status to the terminal
 * value for its note type — modelling the real lying-claim a hook faces (status
 * flipped to terminal, contract left unsatisfied). Returns the flipped markdown.
 */
export async function lyingClaim(
  relPath: string,
  type: keyof typeof TERMINAL_STATUS,
): Promise<string> {
  const raw = await readAdversarialFixture(relPath);
  return withStatus(raw, TERMINAL_STATUS[type]);
}

/** Read the canonical TASK sample (status IN_PROGRESS — claim gate dormant). */
export async function taskSample(): Promise<string> {
  return Bun.file(TASK_SAMPLE).text();
}

/**
 * The canonical TASK sample sits at the structural floor (3 observations, 2
 * relations), so its dispatch verdict is `allow-with-warning`. Lift BOTH counts
 * above the floor (a 4th observation + a 3rd relation) so a genuinely clean note
 * yields a plain `allow` with no warning — the Smoke-9 happy path.
 */
export function asFullyClean(content: string): string {
  const withObs = content.replace(
    "## Relations",
    "- [outcome] Fourth observation lifts the count above the floor #clean\n\n## Relations",
  );
  return `${withObs.trimEnd()}\n- relates_to [[ANALYSIS-001: Sample]]\n`;
}

/**
 * Take a fully-clean note and strip the inline `#tag` from its 4th observation,
 * producing a low-severity HYGIENE issue (an observation with zero tags) while
 * keeping the claim satisfied and counts above the floor. The dispatcher routes
 * this to `allow-with-warning` (allow + additionalContext) — the Smoke-10 path.
 */
export function withMissingObservationTag(cleanContent: string): string {
  return cleanContent.replace(
    "- [outcome] Fourth observation lifts the count above the floor #clean",
    "- [outcome] Fourth observation deliberately omits its inline tag",
  );
}
