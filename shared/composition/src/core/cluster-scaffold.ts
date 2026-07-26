/**
 * Hash-excluded destination scaffolding for the /decompose executor.
 *
 * A partitioned destination is a verbatim slice of the source, which means it is
 * not by itself a canonical Brain note: only the cluster covering line 1 inherits
 * the source's frontmatter and H1, and only the final cluster inherits its
 * Observations/Relations. Scaffolding closes that gap by wrapping each written
 * slice in a prologue (frontmatter + H1) and an epilogue (Observations +
 * Relations), so every destination satisfies the knowledge graph's structural
 * invariants on its own.
 *
 * Why this does not weaken the F-8 char-identity guarantee:
 *
 * ADR-002 D-2 already establishes that derived content sits outside the hash
 * chain — `regenerated_sections` are excluded from BOTH extraction and
 * hash-comparison because they are Information Model Category 2 (derived views,
 * regenerated rather than preserved). Scaffolding is the same class of content
 * travelling the other way: authored into the destination rather than stripped
 * out of the source. It is never source-of-truth, so it is never hashed.
 *
 * The exclusion is safe because scaffolding is a pure function of the plan. It is
 * therefore re-derived and VERIFIED against the written bytes — `stripScaffold`
 * checks the exact prefix and suffix rather than trusting a recorded offset — and
 * only the remaining body enters the hash comparison. Over that body, the proof is
 * byte-for-byte identical in strength to the unscaffolded case.
 */

import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";

const NL = "\n";

/** Frontmatter fields required for a destination to stand alone as a Brain note. */
export interface ScaffoldFrontmatter {
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly permalink: string;
  readonly tags: readonly string[];
}

/** Everything the executor needs to wrap one cluster's slice. */
export interface ClusterScaffold {
  readonly frontmatter: ScaffoldFrontmatter;
  readonly observations: readonly Observation[];
  readonly relations: readonly Relation[];
}

/** Outcome of recovering a body from scaffolded content. */
export type StripResult = { ok: true; body: string } | { ok: false; reason: string };

/**
 * Render the frontmatter block followed by the H1.
 *
 * The H1 is derived from `frontmatter.title` rather than accepted as a separate
 * input, which makes the CONVENTIONS rule "H1 matches the frontmatter title
 * verbatim" impossible to violate through the plan.
 */
/**
 * Frozen serialization options for scaffold frontmatter.
 *
 * `stripScaffold` recovers a body by RE-RENDERING the prologue and matching it
 * against the bytes on disk, so the renderer's output is part of the recovery
 * contract, not merely a formatting choice. If `yaml.dump` changed its wrapping,
 * quoting or key spacing across a js-yaml upgrade, previously-written shards
 * would stop matching and become un-strippable — recompose would fail closed
 * (exit 2), which is the right direction, but the shards would be stranded.
 *
 * Keeping the options in one frozen constant makes that coupling explicit and
 * gives an upgrade a single place to diff. The options chosen are also the
 * stable ones: `lineWidth: -1` disables line wrapping (the most likely thing to
 * change between versions), and explicit `quotingType` pins quote style rather
 * than inheriting a default.
 *
 * js-yaml is pinned at ^4.1.0 in package.json. Any bump should re-run the
 * scaffold round-trip tests before landing.
 */
const SCAFFOLD_YAML_OPTIONS = Object.freeze({
  lineWidth: -1,
  quotingType: '"',
  forceQuotes: false,
} as const);

export function renderPrologue(fm: ScaffoldFrontmatter): string {
  // Stable key order, matching the house renderer in renderers/spec-root-note.ts.
  const ordered: Record<string, unknown> = {
    title: fm.title,
    type: fm.type,
    status: fm.status,
    permalink: fm.permalink,
    tags: [...fm.tags],
  };
  const body = yaml.dump(ordered, { ...SCAFFOLD_YAML_OPTIONS }).trimEnd();
  return `---${NL}${body}${NL}---${NL}${NL}# ${fm.title}${NL}${NL}`;
}

/**
 * Render the trailing `## Observations` and `## Relations` sections.
 *
 * Emitted in that order with nothing after them, satisfying the universal
 * final-two-sections invariant for every destination.
 */
export function renderEpilogue(
  observations: readonly Observation[],
  relations: readonly Relation[],
): string {
  const lines: string[] = ["## Observations", ""];
  for (const o of observations) {
    lines.push(`- [${o.category}] ${o.text} ${o.tags.map((t) => `#${t}`).join(" ")}`);
  }
  lines.push("", "## Relations", "");
  for (const r of relations) {
    lines.push(`- ${r.verb} [[${r.target}]]`);
  }
  lines.push("");
  return lines.join(NL);
}

/**
 * Wrap a body slice in its scaffolding. The body is copied verbatim — no
 * trimming, padding, or newline normalisation — because it is the hashed content.
 */
export function assembleScaffolded(scaffold: ClusterScaffold, body: string): string {
  return (
    renderPrologue(scaffold.frontmatter) +
    body +
    renderEpilogue(scaffold.observations, scaffold.relations)
  );
}

/**
 * Recover the body from scaffolded content by verifying and removing the exact
 * prologue and epilogue the plan specifies.
 *
 * Verification (rather than offset arithmetic) is what lets the hash comparison
 * stay honest: content that does not carry precisely the planned scaffolding is
 * rejected instead of silently mis-sliced, so a tampered or drifted destination
 * surfaces as an integrity failure rather than passing on a coincidental length.
 */
export function stripScaffold(scaffold: ClusterScaffold, content: string): StripResult {
  const prologue = renderPrologue(scaffold.frontmatter);
  const epilogue = renderEpilogue(scaffold.observations, scaffold.relations);
  if (content.length < prologue.length + epilogue.length) {
    return { ok: false, reason: "content is shorter than its declared prologue plus epilogue" };
  }
  if (!content.startsWith(prologue)) {
    return { ok: false, reason: "content does not begin with the planned prologue" };
  }
  if (!content.endsWith(epilogue)) {
    return { ok: false, reason: "content does not end with the planned epilogue" };
  }
  return { ok: true, body: content.slice(prologue.length, content.length - epilogue.length) };
}
