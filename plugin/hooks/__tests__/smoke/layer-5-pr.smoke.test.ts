/**
 * Layer 5 (`Bash` + `gh pr create`) end-to-end smoke test.
 *
 * Covers TASK-046 DoD smoke test 6 (Layer-5 boundary deny against a lying-claim
 * fixture). Drives the ACTUAL handler script (`pre-pr-create-validate.ts`) via
 * `bun run` in a throwaway repo wired to a bare `origin` remote.
 *
 * Setup: `origin/main` is seeded, a lying Brain note is committed locally
 * (HEAD ahead of origin/main), and the handler parses `gh pr create --base main`,
 * diffs `main...HEAD`, reads each PR-diff note's post-image, and applies
 * BOUNDARY-gate semantics. An explicit `--base main` is used so the diff base is
 * deterministic without relying on a configured `origin/HEAD` symbolic ref.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { lyingClaim } from "./_helpers/fixtures.ts";
import {
  attachOriginRemote,
  initRepo,
  removeRepo,
  runGit,
  writeFixtureFile,
} from "./_helpers/git-repo.ts";
import { type PreToolUseResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "pre-pr-create-validate";

describe("Layer 5 smoke — pre-PR-create boundary gate", () => {
  let repoRoot: string;
  let remotePath: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-5");
    remotePath = await attachOriginRemote(repoRoot, "layer-5");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
    await removeRepo(remotePath);
  });

  // Smoke 6 (Layer 5 deny): a Brain note in the PR diff (main...HEAD) carrying a
  // lying SPEC-DONE claim (Success Criteria checked but Artifact Status rows
  // unchecked) denies the PR open, naming the failing note.
  test("denies a PR open whose diff carries a lying SPEC-DONE claim", async () => {
    const relPath = "docs/specs/SPEC-092-adversarial/SPEC-092-adversarial.md";
    const lying = await lyingClaim("spec/drift-02-artifact-status-unchecked.md", "spec");
    // Commit the lying note on a FEATURE branch so the PR diff base (`main`) and
    // the PR head (`HEAD` = feature) differ — `main...HEAD` then carries the note.
    await runGit(repoRoot, ["checkout", "-b", "feature", "--quiet"]);
    await writeFixtureFile(repoRoot, relPath, lying);
    await runGit(repoRoot, ["add", relPath]);
    await runGit(repoRoot, ["commit", "-m", "add lying spec root", "--quiet"]);

    const payload = {
      tool_name: "Bash",
      tool_input: { command: "gh pr create --base main --title smoke --body smoke" },
      cwd: repoRoot,
    };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain(relPath);
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain(
      "DESIGN-001-SPEC-092: Coverage Design",
    );
  });
});
