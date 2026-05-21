/**
 * Shared Brain vs Basic Memory context detection.
 *
 * Per DESIGN-003 SPEC-006: a project is "Brain" when (1) a `docs/` directory exists
 * at the project root AND (2) at least one markdown file under `docs/` has YAML
 * frontmatter with a `type` field matching one of the 16 canonical entity types.
 *
 * Otherwise (or when the caller passes `basicMemory: true`), the project is
 * treated as "basic-memory" and the simplified ingest/defrag path is used.
 *
 * Detection samples up to 10 files for performance. Confidence is HIGH when more
 * than 5 canonical-type files are observed, MEDIUM when 1-5, LOW when 0 (only
 * reachable via the explicit flag override).
 */

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

/** Canonical entity types per CONVENTIONS Section 3 (16 types). */
export const CANONICAL_ENTITY_TYPES = [
  "decision",
  "session",
  "requirement",
  "design",
  "task",
  "analysis",
  "feature",
  "epic",
  "critique",
  "test-report",
  "security",
  "retrospective",
  "skill",
  "spec",
  "plan",
  "prd",
] as const;

export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

export type ContextType = "brain" | "basic-memory";
export type Confidence = "high" | "medium" | "low";

export interface DetectContextEvidence {
  /** Path relative to projectRoot. */
  path: string;
  /** Frontmatter `type` value (or null if no parseable frontmatter). */
  type: string | null;
  /** Whether `type` matched a canonical entity type. */
  isCanonical: boolean;
}

export interface DetectContextResult {
  contextType: ContextType;
  evidence: DetectContextEvidence[];
  confidence: Confidence;
  /** Whether the result was forced by an explicit override flag. */
  flagOverride: boolean;
}

export interface DetectContextOptions {
  /** Force basic-memory regardless of detection. */
  basicMemory?: boolean;
  /** Max number of docs/ files to sample (default 10). */
  sampleSize?: number;
}

/**
 * Detect whether `projectRoot` is a Brain or Basic Memory project.
 *
 * Pure-function shape: takes a path, returns a structured verdict. Side-effectful
 * only in that it reads files from disk.
 */
export async function detectProjectContext(
  projectRoot: string,
  options: DetectContextOptions = {},
): Promise<DetectContextResult> {
  const sampleSize = options.sampleSize ?? 10;

  // Explicit override.
  if (options.basicMemory === true) {
    return {
      contextType: "basic-memory",
      evidence: [],
      confidence: "low",
      flagOverride: true,
    };
  }

  const docsPath = join(projectRoot, "docs");
  if (!existsSync(docsPath) || !statSync(docsPath).isDirectory()) {
    return {
      contextType: "basic-memory",
      evidence: [],
      confidence: "high",
      flagOverride: false,
    };
  }

  const glob = new Bun.Glob("**/*.md");
  const evidence: DetectContextEvidence[] = [];
  let canonicalCount = 0;

  for await (const relPath of glob.scan({
    cwd: docsPath,
    onlyFiles: true,
    absolute: false,
  })) {
    if (evidence.length >= sampleSize) break;
    const full = join(docsPath, relPath);
    let text: string;
    try {
      text = await Bun.file(full).text();
    } catch {
      continue;
    }
    const fm = extractFrontmatter(text);
    const typeValue = fm && typeof fm["type"] === "string" ? fm["type"] : null;
    const isCanonical =
      typeValue !== null && (CANONICAL_ENTITY_TYPES as readonly string[]).includes(typeValue);
    evidence.push({ path: `docs/${relPath}`, type: typeValue, isCanonical });
    if (isCanonical) canonicalCount++;
  }

  if (canonicalCount === 0) {
    return {
      contextType: "basic-memory",
      evidence,
      confidence: "high",
      flagOverride: false,
    };
  }

  const confidence: Confidence = canonicalCount > 5 ? "high" : "medium";
  return {
    contextType: "brain",
    evidence,
    confidence,
    flagOverride: false,
  };
}

/** Parse a YAML frontmatter block from the head of a markdown string. */
export function extractFrontmatter(text: string): Record<string, unknown> | null {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return null;
  const rest = text.slice(4);
  // Find the closing fence at line start.
  const end = rest.search(/\n---\s*(?:\n|$)/);
  if (end < 0) return null;
  const yamlBlock = rest.slice(0, end);
  try {
    const doc = yaml.load(yamlBlock);
    if (doc && typeof doc === "object" && !Array.isArray(doc)) {
      return doc as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
