/**
 * The one frontmatter_map implementation, shared by every adapter.
 *
 * Semantics are VALUE-KEYED: a map entry is `existingValue -> replacement`, and
 * a frontmatter line is rewritten when its current value matches a key. This is
 * the shape REQ-004 AC-2 specifies and the PLAN adapter has always used.
 *
 * Why value-keyed rather than field-keyed: F-8 requires `reverseMutations` to be
 * an exact inverse of `applyMutations`. A value-to-value map inverts trivially
 * (swap keys and values). A field-keyed map — `{field: newValue}` — cannot,
 * because it never records the old value: inverting `{status: "SUPERSEDED"}`
 * yields `{SUPERSEDED: "status"}`, which looks for a field named SUPERSEDED.
 *
 * Two adapters previously carried private field-keyed copies of this logic, so
 * `frontmatter_map` failed the hash comparison on every plan that used it while
 * working correctly on PLAN. Adopting the working semantics everywhere made the
 * remedy a deletion: those copies are gone and all adapters call this module.
 * One implementation, arbitrarily many call sites.
 */

import type { FrontmatterMap } from "./types.js";

/**
 * Rewrite frontmatter values according to a value-keyed map.
 *
 * Only the YAML frontmatter block is considered; body content is never touched.
 * Lines whose current value is not a key in the map pass through unchanged,
 * which is what makes a no-op safely round-trippable.
 */
export function applyFrontmatterMutations(content: string, frontmatterMap: FrontmatterMap): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const outLines: string[] = [];
  for (const line of (fmMatch[1] ?? "").split("\n")) {
    const parsed = line.match(/^([^\s:][^:]*):[ \t]+(.+)$/);
    if (!parsed) {
      outLines.push(line);
      continue;
    }
    const field = parsed[1] ?? "";
    const existing = (parsed[2] ?? "").trim();
    if (Object.hasOwn(frontmatterMap, existing)) {
      outLines.push(`${field}: ${renderFrontmatterValue(frontmatterMap[existing] ?? "")}`);
      continue;
    }
    outLines.push(line);
  }

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${outLines.join("\n")}\n---`);
}

/** Swap keys and values — the inverse of a value-keyed map (ADR-001 F-8). */
export function invertFrontmatterMap(map: FrontmatterMap): FrontmatterMap {
  const inverted: FrontmatterMap = {};
  for (const [from, to] of Object.entries(map)) {
    inverted[to] = from;
  }
  return inverted;
}

/**
 * Render a frontmatter_map entry value into YAML form. A JSON array literal
 * (`["a","b"]`) becomes a YAML inline array (`[a, b]`) per REQ-004 AC-5;
 * anything else passes through verbatim, so callers remain responsible for
 * quoting values that need it (e.g. `"PLAN-001: Example"`).
 */
function renderFrontmatterValue(raw: string): string {
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
