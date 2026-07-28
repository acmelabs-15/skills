/**
 * Layer 4 (`Bash` + `git push`) end-to-end smoke test.
 *
 * Covers TASK-046 DoD smoke test 5 (Layer-4 boundary deny against a lying-claim
 * fixture). Drives the ACTUAL handler script (`pre-push-validate.ts`) via
 * `bun run` in a throwaway repo wired to a bare `origin` remote.
 *
 * Setup models the real push threat: `origin/main` is seeded, then a lying
 * Brain note is committed locally so HEAD is ahead of `origin/main`. The
 * handler parses the `git push origin main` command, diffs `origin/main...HEAD`,
 * reads each pushed note's post-image, and applies BOUNDARY-gate semantics.
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

const HANDLER = "pre-push-validate";

describe("Layer 4 smoke — pre-push boundary gate", () => {
  let repoRoot: string;
  let remotePath: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-4");
    remotePath = await attachOriginRemote(repoRoot, "layer-4");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
    await removeRepo(remotePath);
  });

  // Smoke 5 (Layer 4 deny): a Brain note committed locally (ahead of
  // origin/main) that carries a lying DESIGN-ACCEPTED claim denies the push,
  // naming the failing note.
  test("denies a push whose diff carries a lying DESIGN-ACCEPTED claim", async () => {
    const relPath = "docs/specs/SPEC-008/design/DESIGN-099-SPEC-008-lying.md";
    const lying = await lyingClaim(
      "design/drift-01-design-compliance-flip-without-evidence.md",
      "design",
    );
    await writeFixtureFile(repoRoot, relPath, lying);
    await runGit(repoRoot, ["add", relPath]);
    await runGit(repoRoot, ["commit", "-m", "add lying design", "--quiet"]);

    const payload = {
      tool_name: "Bash",
      tool_input: { command: "git push origin main" },
      cwd: repoRoot,
    };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain(relPath);
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("Honors ADR-005 D-1");
  });
});
