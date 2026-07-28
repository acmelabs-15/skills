/**
 * A stage-one runner that serves a whole fixture tree as the candidate set.
 *
 * Discovery is now the funnel and only the funnel, so every scan needs a search
 * surface to ask. Most tests are not ABOUT discovery — they cover the matchers, the
 * graph leg, closure arithmetic, the manifest shape — and for those the honest
 * fixture is a search that returns every note in the tree. That reproduces exactly
 * what the removed tree walk used to hand stage two, so those tests keep testing
 * what they were written to test.
 *
 * Tests that ARE about discovery build their own narrower runners; see
 * `reference-funnel.test.ts`.
 */

import { resolve } from "node:path";
import type { SearchRunner } from "@acmelabs/core/core/brain-cli";

function envelope(payload: Record<string, unknown>): string {
  return JSON.stringify({ content: [{ type: "text", text: JSON.stringify(payload) }] });
}

function rows(paths: readonly string[]): Array<Record<string, unknown>> {
  return paths.map((path) => ({
    permalink: path.replace(/\.md$/, "").toLowerCase(),
    title: `Title of ${path}`,
    file_path: path,
    direction: "both",
    evidence: "index",
  }));
}

/** Every markdown path under `docsRoot`, docs-root-relative and sorted. */
export async function treePaths(docsRoot: string): Promise<string[]> {
  const glob = new Bun.Glob("**/*.md");
  const found: string[] = [];
  for await (const rel of glob.scan({ cwd: resolve(docsRoot), onlyFiles: true, absolute: false })) {
    found.push(rel);
  }
  return found.sort();
}

/**
 * A runner whose every leg returns `paths`, each query proving itself complete.
 *
 * `calls` is exposed so a test can assert how many queries a scan actually issued.
 */
export function wholeTreeRunner(paths: readonly string[]): {
  runner: SearchRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const runner: SearchRunner = async (args) => {
    calls.push([...args]);
    const isReferences = args.includes("--references");
    return {
      exitCode: 0,
      stdout: envelope({
        total: paths.length,
        completeness: { provable: true },
        scope: isReferences
          ? "wikilink edges only; bare text mentions are covered by exhaustive"
          : "literal content containment; wikilink edges are covered by references",
        results: rows(paths),
      }),
      stderr: "",
    };
  };
  return { runner, calls };
}

/** `wholeTreeRunner` over whatever is on disk under `docsRoot`. */
export async function treeRunner(docsRoot: string): Promise<SearchRunner> {
  return wholeTreeRunner(await treePaths(docsRoot)).runner;
}
