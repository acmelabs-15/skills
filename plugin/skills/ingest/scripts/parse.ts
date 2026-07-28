/**
 * ingest source parser.
 *
 * Reads a markdown source file, extracts YAML frontmatter (if present), the
 * first H1, and detects any existing `## Observations` and `## Relations`
 * sections. Returns a structured `ParsedSource` that downstream pipeline
 * steps consume.
 */

import yaml from "js-yaml";
import { extractFrontmatter } from "../../../src/detect-context.ts";

export interface ParsedSource {
  /** Raw source text (untouched). */
  raw: string;
  /** Parsed frontmatter object, or null if absent / malformed. */
  frontmatter: Record<string, unknown> | null;
  /** Body text after frontmatter (or full raw text if no frontmatter). */
  body: string;
  /** First H1 heading text (without `# `), or null. */
  h1: string | null;
  /** Whether body already has a `## Observations` section. */
  hasObservations: boolean;
  /** Whether body already has a `## Relations` section. */
  hasRelations: boolean;
}

export function parseSource(text: string): ParsedSource {
  const frontmatter = extractFrontmatter(text);
  const body = stripFrontmatter(text);
  return {
    raw: text,
    frontmatter,
    body,
    h1: extractH1(body),
    hasObservations: /^## Observations\s*$/m.test(body),
    hasRelations: /^## Relations\s*$/m.test(body),
  };
}

export function stripFrontmatter(text: string): string {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return text;
  const rest = text.slice(4);
  const end = rest.search(/\n---\s*(?:\n|$)/);
  if (end < 0) return text;
  const fenceMatch = rest.slice(end).match(/^\n---\s*(?:\n|$)/);
  if (!fenceMatch) return text;
  const afterFenceIdx = end + fenceMatch[0].length;
  return rest.slice(afterFenceIdx);
}

export function extractH1(body: string): string | null {
  const m = /^# (.+?)\s*$/m.exec(body);
  return m ? (m[1] ?? null) : null;
}

/** Parse a source path and return the parsed object (async file read). */
export async function parseSourceFile(path: string): Promise<ParsedSource> {
  const text = await Bun.file(path).text();
  return parseSource(text);
}

// Re-export for test convenience.
export { yaml };
