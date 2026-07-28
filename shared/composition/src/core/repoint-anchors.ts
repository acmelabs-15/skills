/**
 * Does a cited section still exist at the note a repoint would send it to?
 *
 * This is the one check standing between the executor and its worst possible
 * output: a citation that reads correctly, passes the closure gate because the
 * stale form is gone, and points at a section that is not there. Repointing
 * `ANALYSIS-034 Section 6` to `ANALYSIS-041 Section 6` is only right if the note
 * now numbered 041 actually has a section 6, and a split is precisely the
 * operation that moves sections between notes.
 *
 * The gate is deliberately ASYMMETRIC. Failing to find an anchor that exists
 * costs an entry on the residual worklist, which an agent then adjudicates by
 * hand — the work the pipeline already assumes for judgment classes. Finding an
 * anchor that does not exist writes a broken citation into the graph and reports
 * success. So every rule below requires positive, position-anchored evidence and
 * declines on anything weaker.
 *
 * Everything here is pure: a fragment and a note's text in, a verdict out.
 */

import { fencedLines, listHeadings, splitLines } from "./markdown-slices.js";

/**
 * The two shapes a citation fragment takes, mirroring the two branches the
 * scanner's own citation matcher recognises.
 *
 * - keyword: `Section 6`, `Section 2.3`, `Sections 6.1`, `Part C`, `Appendix A`
 * - designator: `D-5`, `S-1`, `P0-2` — a note-local label rather than an ordinal
 */
export type SectionFragment =
  | { readonly kind: "keyword"; readonly keyword: string; readonly ordinal: string }
  | { readonly kind: "designator"; readonly token: string };

const KEYWORD_RE = /^(Sections?|Parts?|Appendix)[ \t]+([A-Za-z0-9][\w.]*)$/;
const DESIGNATOR_RE = /^[A-Za-z]{1,8}[0-9]*-[0-9][\w.]*$/;

/**
 * Characters that legitimately end an anchor token in a heading or a table cell:
 * `## 6. Foo`, `### D-5: Title`, `| S-1 | ...`, `- **D-5** ...`, `## 4 — Foo`.
 */
const BOUNDARY = /[\s.:)\]|*—–,;]/;

export function parseSectionFragment(fragment: string): SectionFragment | null {
  const trimmed = fragment.trim();
  const keyword = KEYWORD_RE.exec(trimmed);
  if (keyword) {
    // Plural is how the document reads ("Sections 6.1"), singular is how a
    // heading writes it, so the plural is folded here rather than at every
    // comparison site. `Appendix` has no plural form to fold.
    const raw = keyword[1] ?? "";
    return {
      kind: "keyword",
      keyword: raw === "Appendix" ? raw : raw.replace(/s$/, ""),
      ordinal: keyword[2] ?? "",
    };
  }
  return DESIGNATOR_RE.test(trimmed) ? { kind: "designator", token: trimmed } : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does `text` begin with `token` as a complete token?
 *
 * The lookahead is what separates a section label from a deeper one. `6.` in
 * `6. Objective` is section 6; `6.` in `6.1 Detail` is the start of subsection
 * 6.1 and is NOT evidence that a section 6 heading exists. Rejecting a following
 * digit — directly, or across a single dot — draws that line, and the same rule
 * stops `6.1` matching `6.10`.
 */
function startsWithToken(text: string, token: string): boolean {
  const pattern = new RegExp(`^${escapeRegExp(token)}(?!\\d|\\.\\d)(?:${BOUNDARY.source}|$)`);
  return pattern.test(text);
}

/**
 * Strip the markup a designator hides behind at the start of a line: list
 * bullets, table pipes, blockquote arrows, heading hashes and bold runs. What
 * remains is the line's first content token, which is where a designator label
 * sits when it labels something.
 */
function leadingToken(line: string): string {
  return line.replace(/^[\s>|*_+#-]*/, "");
}

/** Heading texts plus every line-leading content token, fenced lines excluded. */
function anchorTexts(content: string): string[] {
  const lines = splitLines(content);
  const fenced = fencedLines(lines);
  const out = listHeadings(content).map((heading) => heading.text);
  for (let index = 0; index < lines.length; index++) {
    if (fenced[index]) continue;
    const stripped = leadingToken(lines[index] ?? "");
    if (stripped.length > 0) out.push(stripped);
  }
  return out;
}

function keywordAnchored(
  fragment: Extract<SectionFragment, { kind: "keyword" }>,
  content: string,
): boolean {
  const headings = listHeadings(content).map((heading) => heading.text);
  // Numbered-heading form: `## 6. Objective`, `### 2.3 The trap`.
  if (headings.some((text) => startsWithToken(text, fragment.ordinal))) return true;
  // Spelled form: `## Section 6 — Objective`, `## Part C`. Case-insensitive
  // because a heading may title-case a keyword the citation lower-cased.
  const spelled = new RegExp(
    `\\b${escapeRegExp(fragment.keyword)}s?[ \\t]+${escapeRegExp(fragment.ordinal)}(?!\\d|\\.\\d)`,
    "i",
  );
  return headings.some((text) => spelled.test(text));
}

/**
 * Is `fragment` locatable in `content`?
 *
 * A fragment this module cannot parse returns false rather than true. An
 * unrecognised shape is not evidence of presence, and the executor's contract is
 * that an unverifiable citation is downgraded to the worklist.
 */
export function sectionAnchored(fragment: string, content: string): boolean {
  const parsed = parseSectionFragment(fragment);
  if (parsed === null) return false;
  if (parsed.kind === "keyword") return keywordAnchored(parsed, content);
  return anchorTexts(content).some((text) => startsWithToken(text, parsed.token));
}
