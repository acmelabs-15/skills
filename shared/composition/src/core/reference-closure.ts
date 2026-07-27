/**
 * Closure checking for a prior impact manifest.
 *
 * A repointing worklist is only worth producing if someone later proves it was
 * worked. This module re-scans the tree against the manifest's own targets and
 * aliases, then reports each prior finding as UPDATED (the stale form is gone),
 * RETAINED (the caller allow-listed it), or OUTSTANDING (still there, nobody
 * said to keep it).
 *
 * The checker decides nothing about retention. Whether a surviving reference is
 * a deliberate historical citation or an unrepaired break is a judgement about
 * intent, and intent lives with the caller — a checker that guessed would
 * quietly convert real breakage into a pass.
 */

import { resolve } from "node:path";
import { PlanValidationError } from "../schemas/plan-yaml.js";
import {
  type ClosureEntry,
  type ClosureReport,
  type ImpactManifest,
  type ReferenceFinding,
  type RetainRule,
  RetainRuleSchema,
} from "../schemas/reference-manifest.js";
import type { SearchRunner } from "./brain-cli.js";
import type { NoteFileSystem } from "./note-identity.js";
import { discoverCandidates } from "./reference-funnel.js";
import { scanReferences } from "./reference-scan.js";

export interface ClosureOptions {
  manifest: ImpactManifest;
  /** Defaults to the manifest's recorded root. */
  docsRoot?: string;
  /** Caller-owned allow-list; empty means nothing is retained. */
  retain?: readonly RetainRule[];
  fileSystem?: NoteFileSystem;
  /** Defaults to the project the manifest recorded. */
  project?: string;
  /** Subprocess seam for the funnel's CLI calls, injected in tests. */
  runner?: SearchRunner | undefined;
  now?: string;
}

/**
 * Identity of a reference independent of where it sits in the file. Line is
 * deliberately excluded: a repointing pass shifts lines throughout a note, and
 * keying on line would report every untouched reference below an edit as both
 * UPDATED and new.
 */
function keyOf(finding: ReferenceFinding): string {
  return [finding.referencingFile, finding.class, finding.target, finding.matchedText].join(
    "\u0000",
  );
}

function matchesRule(finding: ReferenceFinding, rule: RetainRule): boolean {
  return (
    (rule.referencingFile === undefined || rule.referencingFile === finding.referencingFile) &&
    (rule.target === undefined || rule.target === finding.target) &&
    (rule.class === undefined || rule.class === finding.class) &&
    (rule.matchedText === undefined || rule.matchedText === finding.matchedText)
  );
}

function validateRules(retain: readonly RetainRule[]): RetainRule[] {
  return retain.map((rule, index) => {
    const parsed = RetainRuleSchema.safeParse(rule);
    if (!parsed.success) {
      // The reason goes in the message as well as the issues array: a caller
      // reading only stderr's first line still learns what to fix.
      const reason = parsed.error.issues[0]?.message ?? "invalid rule";
      throw new PlanValidationError(`retain rule ${index} is invalid — ${reason}`, [
        { path: `retain[${index}]`, message: reason },
      ]);
    }
    return parsed.data;
  });
}

/**
 * The provenance of an advisory entry, as a parenthetical for its detail string.
 *
 * All three fields are reported, not just the requested mode: a carried-forward
 * entry is exactly the thing a reader has to confirm by hand, and "which mode was
 * asked for" is the least useful of the three when the request was routed elsewhere.
 * Since the schema now REQUIRES all three on a SEARCH entry, there is no absent-field
 * case left to render.
 */
function provenanceOf(finding: ReferenceFinding): string {
  // Narrowing on the discriminator is what the union buys: only a SEARCH finding has
  // provenance to report, and the compiler now says so rather than the reader having
  // to remember it.
  if (finding.source !== "SEARCH") return "";
  return `, mode=${finding.mode}, search_type=${finding.searchType}, actual_source=${finding.actualSource}`;
}

/** Group current findings by identity, each queue ordered by line. */
function queueByKey(findings: readonly ReferenceFinding[]): Map<string, ReferenceFinding[]> {
  const queues = new Map<string, ReferenceFinding[]>();
  for (const finding of [...findings].sort((a, b) => a.line - b.line || a.column - b.column)) {
    const key = keyOf(finding);
    const queue = queues.get(key);
    if (queue) queue.push(finding);
    else queues.set(key, [finding]);
  }
  return queues;
}

function classify(
  prior: ReferenceFinding,
  survivor: ReferenceFinding | undefined,
  rules: readonly RetainRule[],
): ClosureEntry {
  if (!survivor) {
    return {
      finding: prior,
      status: "UPDATED",
      detail: `no longer present in ${prior.referencingFile}`,
    };
  }
  const retained = rules.some((rule) => matchesRule(prior, rule));
  return {
    finding: prior,
    status: retained ? "RETAINED" : "OUTSTANDING",
    currentLine: survivor.line,
    detail: retained
      ? `allow-listed by the caller; still present at line ${survivor.line}`
      : `stale form still present at ${prior.referencingFile}:${survivor.line}`,
  };
}

/**
 * Re-scan and diff against the prior manifest.
 *
 * Occurrences are consumed one-for-one rather than by presence, so repairing
 * two of three identical references reports two UPDATED and one OUTSTANDING
 * instead of collapsing partial progress into a single verdict.
 */
export async function checkClosure(options: ClosureOptions): Promise<ClosureReport> {
  const rules = validateRules(options.retain ?? []);
  const docsRoot = resolve(options.docsRoot ?? options.manifest.docsRoot);
  const scanOptions = options.fileSystem
    ? { docsRoot, fileSystem: options.fileSystem }
    : { docsRoot };

  // The re-scan uses the SAME discovery mechanism the manifest was built with —
  // there is no tree-walking alternative to fall back to, by design, so a check can
  // never take a different path to a different answer than the scan did.
  //
  // The prior manifest's own files are folded in unconditionally. After a repointing
  // pass those references are GONE, so the index legitimately stops returning their
  // notes; re-deriving scope purely from a fresh query would drop exactly the files
  // being verified and report every repaired reference as UPDATED without ever
  // opening the file to confirm. Stage two always reads current disk content, so
  // including a file that no longer references anything costs one read and proves
  // the repair.
  const recorded = options.project ?? options.manifest.discovery.project;
  const scope = await discoverCandidates(options.manifest.targets, {
    // The recorded project is preferred even when the manifest's was CLI-resolved:
    // pinning the check to the graph the scan actually used is what makes the two
    // comparable, and re-resolving could silently move the check to another one.
    ...(recorded.length > 0 ? { project: recorded } : {}),
    docsRoot,
    alwaysInclude: options.manifest.findings.map((finding) => finding.referencingFile),
    ...(options.fileSystem === undefined ? {} : { fileSystem: options.fileSystem }),
    ...(options.runner === undefined ? {} : { runner: options.runner }),
  });
  const { findings: current } = await scanReferences(
    options.manifest.targets,
    scope.candidates,
    scanOptions,
  );

  const queues = queueByKey(current);
  // Advisory entries were never produced by the deterministic scan, so they can
  // never be re-derived by it. Re-checking them against `current` would report
  // every one as UPDATED and quietly erase the worklist they exist to widen.
  // They are carried through with their prior status intact instead.
  const entries: ClosureEntry[] = options.manifest.findings.map((prior) =>
    prior.advisory
      ? {
          finding: prior,
          status: rules.some((rule) => matchesRule(prior, rule)) ? "RETAINED" : "OUTSTANDING",
          detail: `advisory (search leg${provenanceOf(prior)}) — carried forward unverified; never gates closure. Confirm by hand or re-run the search.`,
        }
      : classify(prior, queues.get(keyOf(prior))?.shift(), rules),
  );
  // Whatever survives the consumption pass above is an occurrence the manifest
  // never accounted for — a wholly new reference, or a surplus copy of one the
  // manifest recorded fewer times than the tree now holds.
  const newFindings = [...queues.values()]
    .flat()
    .sort((a, b) => a.referencingFile.localeCompare(b.referencingFile) || a.line - b.line);

  const updated = entries.filter((entry) => entry.status === "UPDATED").length;
  const retained = entries.filter((entry) => entry.status === "RETAINED").length;
  const stillOpen = entries.filter((entry) => entry.status === "OUTSTANDING");
  const outstanding = stillOpen.filter((entry) => !entry.finding.advisory).length;
  const outstandingAdvisory = stillOpen.length - outstanding;

  /**
   * Bi-directional closure violations that were NOT in the prior manifest — edges the
   * repointing pass itself made one-way.
   *
   * Counted separately from `newFindings` as a whole because the two mean different
   * things. A new text reference is usually just a note edited since the scan, which
   * is not a failure. A new asymmetric edge is damage the operation caused: repointing
   * a note's inbound references without renumbering the note leaves its own Relations
   * pointing at notes that no longer point back. Reporting `closed: true` and exit 0
   * over that passes a graph the pass just broke.
   */
  const introducedAsymmetry = newFindings.filter(
    (finding) =>
      finding.class === "bidirectional-missing-on-target" ||
      finding.class === "bidirectional-missing-on-referencer",
  ).length;
  return {
    docsRoot,
    checkedAt: options.now ?? new Date().toISOString(),
    entries,
    newFindings,
    summary: {
      total: entries.length,
      updated,
      retained,
      outstanding,
      outstandingAdvisory,
      newFindings: newFindings.length,
      introducedAsymmetry,
      // Advisory entries are excluded on purpose: a recall aid over descriptive
      // prose is not reproducible enough to fail a gate it was never precise
      // enough to own.
      //
      // Introduced asymmetry IS included. `closed` is what a CI gate reads through the
      // exit code, and a pass that repaired every stale reference while leaving the
      // graph's edges one-way has not finished the job it was asked to do. Scoped to
      // the bi-directional classes rather than to `newFindings` generally, so an
      // unrelated edit landing between the scan and the check does not fail a gate it
      // has nothing to do with.
      closed: outstanding === 0 && introducedAsymmetry === 0,
    },
  };
}
