/**
 * The one Relations parser, shared by every note parser and by the reference
 * scanner. Also carries the inverse-verb table the bi-directional rule needs.
 *
 * Eleven byte-identical private copies of this function previously lived one per
 * note parser, and every one of them had the same two defects:
 *
 *   1. `children.find(n => n.type === "list")` took only the FIRST list in the
 *      section. An H3-grouped Relations section has one list per sub-header, so
 *      every group after the first was dropped.
 *   2. The entry pattern required a leading verb (`- implements [[X]]`). Under
 *      H3 grouping the verb is the sub-header and entries are bare `- [[X]]`,
 *      so every entry in every group failed to match.
 *
 * Together those meant a note using the H3-grouped form — the form the
 * conventions REQUIRE above twelve relations — parsed as ZERO relations. A
 * relation cap by construction rather than by declaration: the library could not
 * read the shape that high-relation notes are obliged to use. One
 * implementation, arbitrarily many call sites, both defects fixed at the source.
 */

import type { List, ListItem, RootContent } from "mdast";
import { type Relation, validRelationTypes } from "../schemas/common.js";

/**
 * Inverse pairs. When note A carries `verb [[B]]`, note B must carry
 * `inverse(verb) [[A]]`. `pairs_with` and `relates_to` are symmetric — the same
 * verb appears on both ends.
 */
const INVERSE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["implements", "implemented_by"],
  ["depends_on", "required_by"],
  ["extends", "extended_by"],
  ["part_of", "contains"],
  ["inspired_by", "inspires"],
  ["supersedes", "superseded_by"],
  ["leads_to", "caused_by"],
];

const INVERSE_VERBS: ReadonlyMap<string, string> = new Map([
  ...INVERSE_PAIRS.flatMap(([outbound, inverse]): Array<[string, string]> => [
    [outbound, inverse],
    [inverse, outbound],
  ]),
  ["pairs_with", "pairs_with"] as [string, string],
  ["relates_to", "relates_to"] as [string, string],
]);

/** The verb that must appear on the far end, or null if the verb is unknown. */
export function inverseVerb(verb: string): string | null {
  return INVERSE_VERBS.get(verb) ?? null;
}

export function isSymmetricVerb(verb: string): boolean {
  return INVERSE_VERBS.get(verb) === verb;
}

const KNOWN_VERBS: ReadonlySet<string> = new Set<string>(validRelationTypes);

/** A parsed entry, retaining the provenance the note parsers discard. */
export interface ParsedRelation {
  verb: string;
  target: string;
  /** 1-indexed source line, when the AST carried position info. */
  line: number | null;
  /** True when the verb came from an H3 sub-header rather than the entry text. */
  grouped: boolean;
}

const VERB_PREFIXED = /^(\w+)\s+\[\[(.+?)\]\]\s*$/;
const BARE_WIKILINK = /^\[\[(.+?)\]\]\s*$/;

function listItemText(item: RootContent): string {
  const parts: string[] = [];
  const walk = (node: RootContent): void => {
    if (node.type === "text" || node.type === "inlineCode") {
      parts.push(node.value);
      return;
    }
    for (const child of (node as { children?: RootContent[] }).children ?? []) walk(child);
  };
  walk(item);
  return parts.join("").trim();
}

/**
 * An H3 inside `## Relations` names a relation type when grouping by type, but
 * may equally be an ordinary sub-heading. Only a heading whose normalized text
 * is a canonical verb supplies a verb; anything else clears the group so bare
 * entries beneath it are not silently mis-typed.
 */
function verbFromHeading(text: string): string | undefined {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, "_");
  return KNOWN_VERBS.has(normalized) ? normalized : undefined;
}

/**
 * Parse the children of a `## Relations` section into entries, handling both
 * the flat form (`- verb [[Target]]`) and the H3-grouped form (`### verb` with
 * bare `- [[Target]]` entries beneath it). Explicit verbs always win over the
 * enclosing group, so a mixed section parses correctly either way.
 */
export function parseRelationEntries(children: readonly RootContent[]): ParsedRelation[] {
  const out: ParsedRelation[] = [];
  let groupVerb: string | undefined;

  for (const node of children) {
    if (node.type === "heading" && node.depth === 3) {
      groupVerb = verbFromHeading(listItemText(node));
      continue;
    }
    if (node.type !== "list") continue;
    for (const item of (node as List).children as ListItem[]) {
      const text = listItemText(item);
      const line = item.position?.start.line ?? null;

      const prefixed = VERB_PREFIXED.exec(text);
      if (prefixed?.[1] && prefixed[2]) {
        out.push({ verb: prefixed[1], target: prefixed[2], line, grouped: false });
        continue;
      }
      const bare = BARE_WIKILINK.exec(text);
      if (bare?.[1] && groupVerb) {
        out.push({ verb: groupVerb, target: bare[1], line, grouped: true });
      }
    }
  }
  return out;
}

/**
 * Schema-shaped view for the note parsers. The verb is cast rather than
 * validated here because each note schema validates its own relations array and
 * reports the failure with that note's field path.
 */
export function parseRelations(children: readonly RootContent[]): Relation[] {
  return parseRelationEntries(children).map((entry) => ({
    verb: entry.verb as Relation["verb"],
    target: entry.target,
  }));
}
