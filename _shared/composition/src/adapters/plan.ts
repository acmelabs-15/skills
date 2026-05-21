import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import type { CompositionAdapter } from "../core/adapter.js";
import type { LineRange, MutationSpec } from "../core/types.js";

/**
 * Identifies a "regenerated" section's byte span within a PLAN markdown body.
 * start: byte offset of the section's `## Heading` line (inclusive).
 * end:   byte offset just past the last character of the section (exclusive)
 *        — i.e. the index of the next `## Heading` line, or content.length if last.
 */
interface SectionSpan {
  heading: string;
  start: number;
  end: number;
}

/**
 * Raised when reverseMutations preserves less than the configured floor
 * of non-regenerated content (default 50%).
 */
export class IntegrityFloorError extends Error {
  constructor(
    readonly preservedRatio: number,
    readonly floor: number,
  ) {
    super(
      `Integrity floor violation: ${(preservedRatio * 100).toFixed(1)}% preserved, floor is ${(floor * 100).toFixed(0)}%`,
    );
    this.name = "IntegrityFloorError";
  }
}

/**
 * PLAN adapter — a DISTINCT CompositionAdapter implementation (NOT BaseMarkdownAdapter).
 *
 * Why distinct: PLAN notes contain "regenerated sections" — derived views such as the
 * Progress Dashboard and Cross-Part Dependency Graph that are recomputed from structural
 * content (Tasks tables, Phase Progression) rather than preserved char-identically.
 *
 * Behaviour summary:
 * - parse / serialize: unified + remark-parse + remark-stringify pipeline (same as base).
 * - extractByRange: 1-indexed inclusive line slice (end=-1 means EOF).
 * - applyMutations / reverseMutations: apply renumber_map, wikilink_map, frontmatter_map
 *   only OUTSIDE the byte spans of regenerated_sections. Content inside regenerated
 *   sections passes through unchanged.
 */
export class PlanAdapter implements CompositionAdapter {
  readonly sourceType = "plan";

  /**
   * Public, observable section delimiter for PLAN phase boundaries.
   * Per REQ-001-SPEC-003 AC-1: phase sections under Workflow Plan use `### {phase}.{part-id}`.
   */
  readonly section_delimiter = "### ";

  /**
   * Public, observable identifier pattern matching `{phase}.{part-id}` per REQ-001-SPEC-003 AC-1.
   * Phase is a lowercase token (research, decisions, spec, build, review, end);
   * part-id is either a positive integer (e.g. `research.1`) or a CAPS-prefixed identifier
   * (e.g. `spec.SPEC-001`, `build.SPEC-003`).
   */
  readonly identifier_pattern = /^[a-z][a-z-]*\.(?:[A-Z][A-Z]+-\d+|\d+)$/;

  /** Minimum fraction of non-regenerated content that must be preserved through reverseMutations. */
  readonly integrityFloor: number;

  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify);

  constructor(integrityFloor = 0.5) {
    this.integrityFloor = integrityFloor;
  }

  parse(content: string): Root {
    return this.processor.parse(content);
  }

  serialize(ast: Root): string {
    return this.processor.stringify(ast);
  }

  /**
   * Extract content by line range. Two overloads:
   *
   * - Numeric range `{start, end}`: 1-indexed inclusive line slice (end=-1 means EOF).
   * - Section name `{section}`: section-aware extraction honouring `### {phase}.{part-id}`
   *   boundaries — INCLUSIVE of the named heading line, EXCLUSIVE of the next heading at
   *   the same or higher level (matches the ADR adapter boundary convention).
   *
   * Optionally accepts a third `regenerated_sections` argument; when supplied, lines
   * belonging to those regenerative spans are stripped from the extracted output.
   */
  extractByRange(
    content: string,
    range: LineRange | { section: string },
    regeneratedSections?: readonly string[],
  ): string {
    let extracted: string;
    if ("section" in range) {
      extracted = this.extractBySectionName(content, range.section);
    } else {
      const lines = content.split("\n");
      const start = range.start - 1; // convert 1-indexed to 0-indexed
      const end = range.end === -1 ? lines.length : range.end; // end is inclusive 1-indexed
      extracted = lines.slice(start, end).join("\n");
    }
    if (regeneratedSections && regeneratedSections.length > 0) {
      extracted = this.stripRegeneratedSections(extracted, regeneratedSections);
    }
    return extracted;
  }

  /**
   * Section-aware extraction for `### {phase}.{part-id}` headings. The returned string
   * includes the heading line itself and continues up to (but not including) the next
   * heading line of equal-or-higher level (matched by `^#{1,3} `).
   *
   * Returns "" if the section is not found.
   */
  private extractBySectionName(content: string, sectionName: string): string {
    const wanted = sectionName.trim();
    const lines = content.split("\n");
    const startIdx = lines.findIndex((line) => {
      const m = line.match(/^(###)[ \t]+(.+?)[ \t]*$/);
      return m !== null && (m[2] ?? "").trim() === wanted;
    });
    if (startIdx === -1) return "";
    // Find next H1/H2/H3 boundary
    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (/^#{1,3}[ \t]+/.test(lines[i] ?? "")) {
        endIdx = i;
        break;
      }
    }
    return lines.slice(startIdx, endIdx).join("\n");
  }

  applyMutations(content: string, mutations: MutationSpec): string {
    return this.transformExcludingRegenerated(content, mutations, false);
  }

  reverseMutations(content: string, mutations: MutationSpec): string {
    const result = this.transformExcludingRegenerated(content, mutations, true);
    this.enforceIntegrityFloor(content, result, mutations);
    return result;
  }

  /**
   * Locate the byte spans of every `## Heading` or `### Heading` whose text matches one
   * of `headings` (case-sensitive, trimmed). Returns spans sorted by start offset,
   * non-overlapping. Per REQ-002 AC-1, both H2 and H3 are supported because PLAN
   * regenerative sections may be authored at either level.
   *
   * Span end is the offset of the NEXT heading of equal-or-higher level (H2 closes on
   * H1/H2; H3 closes on H1/H2/H3) — or content.length if none.
   */
  findRegeneratedSpans(content: string, headings: readonly string[]): SectionSpan[] {
    if (headings.length === 0) return [];
    const wanted = new Set(headings.map((h) => h.trim()));
    const spans: SectionSpan[] = [];

    // Match `## ` or `### ` at start of line, capturing the heading level + text.
    const headingRe = /^(##|###)[ \t]+(.+?)[ \t]*$/gm;
    type Match = { heading: string; level: number; offset: number; lineEnd: number };
    const matches: Match[] = [];
    for (;;) {
      const m = headingRe.exec(content);
      if (m === null) break;
      const headingText = (m[2] ?? "").trim();
      const level = (m[1] ?? "").length; // 2 or 3
      matches.push({
        heading: headingText,
        level,
        offset: m.index,
        lineEnd: m.index + m[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      if (!current) continue;
      if (!wanted.has(current.heading)) continue;
      // Span ends at the next heading of equal-or-higher level (numerically <=).
      // An H2 span closes on the next H2/H1 (we don't model H1 here but lower index
      // means higher level). An H3 span closes on the next H3/H2/H1.
      let end = content.length;
      for (let j = i + 1; j < matches.length; j++) {
        const candidate = matches[j];
        if (!candidate) continue;
        if (candidate.level <= current.level) {
          end = candidate.offset;
          break;
        }
      }
      spans.push({ heading: current.heading, start: current.offset, end });
    }

    return spans;
  }

  /**
   * Apply (or reverse) all mutations to every non-regenerated segment of content.
   * Regenerated section spans pass through unchanged.
   */
  private transformExcludingRegenerated(
    content: string,
    mutations: MutationSpec,
    reverse: boolean,
  ): string {
    const regenerated = mutations.regenerated_sections ?? [];
    const spans = this.findRegeneratedSpans(content, regenerated);

    if (spans.length === 0) {
      return this.transformSegment(content, mutations, reverse);
    }

    const parts: string[] = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) {
        parts.push(this.transformSegment(content.slice(cursor, span.start), mutations, reverse));
      }
      parts.push(content.slice(span.start, span.end));
      cursor = span.end;
    }
    if (cursor < content.length) {
      parts.push(this.transformSegment(content.slice(cursor), mutations, reverse));
    }
    return parts.join("");
  }

  private transformSegment(segment: string, mutations: MutationSpec, reverse: boolean): string {
    const renumberMap = reverse ? this.invertMap(mutations.renumber_map) : mutations.renumber_map;
    const wikilinkMap = reverse ? this.invertMap(mutations.wikilink_map) : mutations.wikilink_map;

    let result = this.applySinglePassReplace(segment, renumberMap);
    result = this.applySinglePassReplace(result, wikilinkMap);

    // Per REQ-004 AC-2 (TASK-009): frontmatter_map uses old-VALUE → new-VALUE semantics.
    // Apply replaces old values with new values inside the frontmatter block; reverse
    // applies the inverted map (new → old) restoring originals. Array-valued entries
    // (e.g. branches[]) are JSON-parsed and re-serialized as proper YAML inline arrays.
    const fmMap = mutations.frontmatter_map;
    if (fmMap && Object.keys(fmMap).length > 0) {
      const map = reverse ? this.invertMap(fmMap) : fmMap;
      result = this.applyFrontmatterMutations(result, map);
    }
    return result;
  }

  private applySinglePassReplace(content: string, map: Record<string, string>): string {
    const keys = Object.keys(map);
    if (keys.length === 0) return content;
    // Sort by length descending so longer keys match first (e.g. D-100 before D-1).
    const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
    const escaped = sortedKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(escaped.join("|"), "g");
    return content.replace(pattern, (match) => map[match] ?? match);
  }

  private invertMap(map: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
      result[v] = k;
    }
    return result;
  }

  /**
   * Mutate frontmatter values using old-VALUE → new-VALUE semantics (REQ-004 AC-2).
   * Each entry's key is matched against the existing value of any single-line
   * `field: <value>` row in the YAML frontmatter; on match, the value is replaced
   * with the entry's value.
   *
   * Array-valued entries are detected by the JSON-array shape of the entry value
   * (`[…]`) and emitted as a YAML inline array literal (`field: [a, b, c]`).
   *
   * The inverse is mechanical: invert the map (new → old) and re-apply.
   */
  private applyFrontmatterMutations(
    content: string,
    frontmatterMap: Record<string, string>,
  ): string {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return content;
    let fm = fmMatch[1] ?? "";

    // Walk each line and try to replace its value if the existing value matches a key.
    const outLines: string[] = [];
    for (const line of fm.split("\n")) {
      const m = line.match(/^([^\s:][^:]*):[ \t]+(.+)$/);
      if (!m) {
        outLines.push(line);
        continue;
      }
      const field = m[1] ?? "";
      const existing = (m[2] ?? "").trim();
      // Direct value match (exact)
      if (Object.hasOwn(frontmatterMap, existing)) {
        const replacement = this.renderFrontmatterValue(frontmatterMap[existing] ?? "");
        outLines.push(`${field}: ${replacement}`);
        continue;
      }
      outLines.push(line);
    }
    fm = outLines.join("\n");

    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`);
  }

  /**
   * Render a frontmatter_map entry value into the YAML form. If the value is a JSON
   * array literal (`["a","b"]`), emit it as a YAML inline array (`[a, b]`). Otherwise
   * pass through verbatim (callers are responsible for quoting strings that require
   * it, e.g. `"PLAN-001: Example"`).
   */
  private renderFrontmatterValue(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return `[${parsed.map((item) => String(item)).join(", ")}]`;
        }
      } catch {
        // Not valid JSON — fall through and emit verbatim.
      }
    }
    return raw;
  }

  /**
   * Verify that reverseMutations recovered at least `integrityFloor` of the
   * non-regenerated bytes of the original (input) content. The "original" here
   * is the input to reverseMutations — typically the previously-mutated form.
   * We measure preservation as the longest-common-subsequence-ish ratio approximated
   * by line-overlap, since exact recovery beyond renumber/wikilink/frontmatter would
   * require the un-mutated source.
   *
   * Concretely: count the lines in the recovered text that also appear (anywhere)
   * in the non-regenerated portion of the input. preservedRatio = matches / total.
   */
  private enforceIntegrityFloor(input: string, recovered: string, mutations: MutationSpec): void {
    const regenerated = mutations.regenerated_sections ?? [];
    const inputNonRegenerated = this.stripRegeneratedSections(input, regenerated);
    const recoveredNonRegenerated = this.stripRegeneratedSections(recovered, regenerated);

    const recoveredLines = recoveredNonRegenerated
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (recoveredLines.length === 0) {
      // Empty body — nothing to validate.
      return;
    }

    const inputLineSet = new Set(
      inputNonRegenerated
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    );
    let matches = 0;
    for (const line of recoveredLines) {
      if (inputLineSet.has(line)) matches++;
    }
    const preservedRatio = matches / recoveredLines.length;
    if (preservedRatio < this.integrityFloor) {
      throw new IntegrityFloorError(preservedRatio, this.integrityFloor);
    }
  }

  /** Remove all regenerated section byte spans from content (replaced with empty). */
  private stripRegeneratedSections(content: string, headings: readonly string[]): string {
    const spans = this.findRegeneratedSpans(content, headings);
    if (spans.length === 0) return content;
    const parts: string[] = [];
    let cursor = 0;
    for (const span of spans) {
      parts.push(content.slice(cursor, span.start));
      cursor = span.end;
    }
    parts.push(content.slice(cursor));
    return parts.join("");
  }
}
