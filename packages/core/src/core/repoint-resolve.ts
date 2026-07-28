/**
 * What should this reference become?
 *
 * One function per mechanical reference class, each turning a finding plus the
 * caller's declared maps into the exact replacement text — or into the reason it
 * declined. Pure: no filesystem, no note index. The one check that needs the tree
 * (does the cited section exist at the destination) is deliberately left to the
 * orchestrator, and this module hands it the destination it would need to check.
 *
 * A rule applied uniformly across all four classes, and the reason the maps stay
 * F-8 clean: **lookup is by the form as WRITTEN in the document, falling back to
 * the target's canonical identity.** A citation written with a retired identifier
 * would otherwise need its own map entry pointing at the same new identifier as
 * the canonical one — two keys onto one value, which the F-8 injectivity rule
 * rejects outright. The fallback lets a plan declare only `current -> new` and
 * still repair citations written in a retired form.
 */

import type { ReferenceFinding, ResolvedTarget } from "../schemas/reference-manifest.js";
import type { RepointPlan, ResidualReason } from "../schemas/repoint-plan.js";

/** The four classes this executor repairs. Everything else is judgment. */
export const MECHANICAL_CLASSES = [
  "wikilink",
  "permalink",
  "permalink-project-prefixed",
  "entity-id-section",
  "entity-id",
] as const;

export interface Replacement {
  readonly newText: string;
  /**
   * Set for `entity-id-section` only: where the repointed citation will point.
   * The orchestrator resolves this note and verifies the fragment is really
   * there before allowing the edit.
   */
  readonly destination?: { readonly entityId: string; readonly fragment: string };
}

export type Resolution =
  | { readonly ok: true; readonly replacement: Replacement }
  | { readonly ok: false; readonly reason: ResidualReason; readonly detail: string };

function decline(reason: ResidualReason, detail: string): Resolution {
  return { ok: false, reason, detail };
}

/** Map lookup by document form, then by canonical form. */
function lookup(
  map: Readonly<Record<string, string>>,
  written: string,
  canonical: string | undefined,
): string | undefined {
  return map[written] ?? (canonical === undefined ? undefined : map[canonical]);
}

function resolveWikilink(
  finding: ReferenceFinding,
  plan: RepointPlan,
  target: ResolvedTarget | undefined,
): Resolution {
  const text = finding.matchedText;
  if (!text.startsWith("[[") || !text.endsWith("]]") || text.length < 5) {
    return decline(
      "malformed-reference",
      `class is wikilink but matchedText is not a [[...]] form: ${text}`,
    );
  }
  const inner = text.slice(2, -2);
  const newTitle = lookup(plan.wikilink_map, inner.trim(), target?.title);
  if (newTitle === undefined) {
    return decline("no-mapping", `wikilink_map declares no replacement for "${inner.trim()}"`);
  }
  // Interior padding is preserved so a `[[ Title ]]` form stays as the author
  // wrote it; only the title itself is substituted.
  const lead = /^\s*/.exec(inner)?.[0] ?? "";
  const trail = /\s*$/.exec(inner)?.[0] ?? "";
  return { ok: true, replacement: { newText: `[[${lead}${newTitle}${trail}]]` } };
}

/**
 * Bare-permalink candidates, longest first: every declared key, plus the target's
 * current and retired permalinks. Longest-first matters because one permalink can
 * be a suffix of another and the longer match is the real one.
 */
function permalinkCandidates(plan: RepointPlan, target: ResolvedTarget | undefined): string[] {
  const all = new Set<string>(Object.keys(plan.permalink_map));
  if (target) {
    if (target.permalink.length > 0) all.add(target.permalink);
    for (const alias of target.aliasPermalinks) all.add(alias);
  }
  return [...all].sort((a, b) => b.length - a.length);
}

function resolvePermalink(
  finding: ReferenceFinding,
  plan: RepointPlan,
  target: ResolvedTarget | undefined,
): Resolution {
  const text = finding.matchedText;
  const bare = permalinkCandidates(plan, target).find(
    (candidate) => text === candidate || text.endsWith(`/${candidate}`),
  );
  if (bare === undefined) {
    return decline("no-mapping", `no declared permalink is contained in "${text}"`);
  }
  const newBare = lookup(plan.permalink_map, bare, target?.permalink);
  if (newBare === undefined) {
    return decline("no-mapping", `permalink_map declares no replacement for "${bare}"`);
  }
  // Whatever project prefix the document carried is reattached verbatim: which
  // prefix appears depends on whose search results the citation was pasted from,
  // and it is not the plan's business to normalise it.
  const prefix = text.slice(0, text.length - bare.length);
  return { ok: true, replacement: { newText: prefix + newBare } };
}

function resolveEntityId(
  finding: ReferenceFinding,
  plan: RepointPlan,
  _target: ResolvedTarget | undefined,
): Resolution {
  const newId = lookup(plan.renumber_map, finding.matchedText, finding.target);
  return newId === undefined
    ? decline("no-mapping", `renumber_map declares no replacement for "${finding.matchedText}"`)
    : { ok: true, replacement: { newText: newId } };
}

function resolveEntityIdSection(
  finding: ReferenceFinding,
  plan: RepointPlan,
  _target: ResolvedTarget | undefined,
): Resolution {
  const fragment = finding.sectionFragment;
  if (fragment === undefined) {
    return decline(
      "malformed-reference",
      "class is entity-id-section but the finding carries no sectionFragment",
    );
  }
  const text = finding.matchedText;
  const writtenId = /^\S+/.exec(text)?.[0] ?? "";
  if (writtenId.length === 0 || writtenId === text) {
    return decline(
      "malformed-reference",
      `class is entity-id-section but matchedText has no "<id> <fragment>" shape: ${text}`,
    );
  }
  const tail = text.slice(writtenId.length);
  const newId = lookup(plan.renumber_map, writtenId, finding.target) ?? writtenId;
  const fragmentMap = plan.section_map[writtenId] ?? plan.section_map[finding.target];
  const newFragment = fragmentMap?.[fragment] ?? fragment;

  if (newId === writtenId && newFragment === fragment) {
    return decline(
      "no-mapping",
      `neither renumber_map nor section_map declares a replacement for "${writtenId} ${fragment}"`,
    );
  }
  // Tail is carried through byte-for-byte when only the identifier changes. When
  // the fragment changes too it is rebuilt from parts, which normalises interior
  // whitespace inside the fragment ("Section  6" becomes "Section 3") while the
  // separator and any trailing dots the document wrote are preserved.
  const newText =
    newFragment === fragment
      ? newId + tail
      : newId + (/^[ \t]*/.exec(tail)?.[0] ?? " ") + newFragment + (/\.+$/.exec(tail)?.[0] ?? "");
  return {
    ok: true,
    replacement: { newText, destination: { entityId: newId, fragment: newFragment } },
  };
}

/**
 * Resolve one finding. Callers filter to the mechanical classes first — a
 * judgment class reaching here is a caller bug, and is declined rather than
 * silently treated as unmapped.
 */
export function resolveReplacement(
  finding: ReferenceFinding,
  plan: RepointPlan,
  target: ResolvedTarget | undefined,
): Resolution {
  switch (finding.class) {
    case "wikilink":
      return resolveWikilink(finding, plan, target);
    case "permalink":
    case "permalink-project-prefixed":
      return resolvePermalink(finding, plan, target);
    case "entity-id":
      return resolveEntityId(finding, plan, target);
    case "entity-id-section":
      return resolveEntityIdSection(finding, plan, target);
    default:
      return decline("judgment-class", `class ${finding.class} is not mechanically repointable`);
  }
}
