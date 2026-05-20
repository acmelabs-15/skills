/** 1-indexed line range. end=-1 means "to end of file". */
export interface LineRange {
  start: number;
  end: number;
}

/** Maps old identifier strings to new identifier strings (e.g., "D-1" → "D-2"). */
export type RenumberMap = Record<string, string>;

/** Maps old wikilink targets to new wikilink targets. */
export type WikilinkMap = Record<string, string>;

/** Maps frontmatter field names to new values. */
export type FrontmatterMap = Record<string, string>;

/**
 * All permitted mutations for a single extraction unit.
 * renumber_map and wikilink_map are applied via single-pass string replacement
 * (all keys replaced simultaneously, not sequentially).
 * frontmatter_map mutates YAML frontmatter fields.
 * regenerated_sections lists heading names excluded from hash validation.
 */
export interface MutationSpec {
  renumber_map: RenumberMap;
  wikilink_map: WikilinkMap;
  frontmatter_map?: FrontmatterMap;
  regenerated_sections?: string[];
}
