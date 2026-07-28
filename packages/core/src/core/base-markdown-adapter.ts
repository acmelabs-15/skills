import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import type { CompositionAdapter } from "./adapter.js";
import { applyFrontmatterMutations, invertFrontmatterMap } from "./frontmatter-mutations.js";
import type { LineRange, MutationSpec } from "./types.js";

export abstract class BaseMarkdownAdapter implements CompositionAdapter {
  abstract readonly sourceType: string;

  // Subclasses provide these for adapter-specific behavior
  protected abstract readonly sectionDelimiter: string;
  protected abstract readonly identifierPattern: RegExp;
  protected abstract readonly identifierPrefix: string;

  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify);

  parse(content: string): Root {
    return this.processor.parse(content);
  }

  serialize(ast: Root): string {
    return this.processor.stringify(ast);
  }

  extractByRange(content: string, range: LineRange): string {
    const lines = content.split("\n");
    const start = range.start - 1; // convert 1-indexed to 0-indexed
    const end = range.end === -1 ? lines.length : range.end; // end is inclusive 1-indexed
    return lines.slice(start, end).join("\n");
  }

  applyMutations(content: string, mutations: MutationSpec): string {
    let result = this.applySinglePassReplace(content, mutations.renumber_map);
    result = this.applySinglePassReplace(result, mutations.wikilink_map);
    if (mutations.frontmatter_map && Object.keys(mutations.frontmatter_map).length > 0) {
      result = applyFrontmatterMutations(result, mutations.frontmatter_map);
    }
    return result;
  }

  reverseMutations(content: string, mutations: MutationSpec): string {
    const invertedRenumber = this.invertMap(mutations.renumber_map);
    const invertedWikilink = this.invertMap(mutations.wikilink_map);
    let result = this.applySinglePassReplace(content, invertedRenumber);
    result = this.applySinglePassReplace(result, invertedWikilink);
    if (mutations.frontmatter_map && Object.keys(mutations.frontmatter_map).length > 0) {
      result = applyFrontmatterMutations(result, invertFrontmatterMap(mutations.frontmatter_map));
    }
    return result;
  }

  private applySinglePassReplace(content: string, map: Record<string, string>): string {
    const keys = Object.keys(map);
    if (keys.length === 0) return content;
    // Sort by length descending for greedy matching (longer keys take precedence)
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
}
