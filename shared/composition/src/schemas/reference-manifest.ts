/**
 * Zod schemas for the inbound-reference impact manifest and its closure report.
 *
 * A decompose/recompose operation preserves the content of the notes it moves,
 * but says nothing about the notes that POINT AT them. Those inbound references
 * — wikilinks, permalink strings, bare entity IDs, and section citations — go
 * stale the moment a note is split, merged, or renumbered. The manifest is the
 * enumeration of that blast radius, computed at plan time so the repointing
 * worklist is known BEFORE any bytes move, and re-checkable afterwards.
 *
 * Schemas live here rather than as bare interfaces because the closure checker
 * reads a manifest back from disk. That read is an untrusted-input boundary in
 * the same sense the plan-YAML loader is: a hand-edited or truncated manifest
 * must fail loudly at parse time rather than silently under-report closure.
 */

import { z } from "zod";

/**
 * The reference forms a repointing pass has to find, ordered most-specific
 * first. The order is load-bearing: `SUPPRESSION_PRECEDENCE` below relies on
 * it to stop one textual reference being counted once per class it happens to
 * contain (a bare `ANALYSIS-034` lives inside every `[[ANALYSIS-034: ...]]`).
 *
 * - `wikilink` — `[[Title]]` matching a target's current or alias title exactly.
 * - `wikilink-malformed` — same title modulo punctuation, but not the canonical
 *   colon form (`[[ANALYSIS-034 Consolidated Decision Agenda]]`, or the
 *   filename-stem form). Already broken before any split; surfaced as its own
 *   class because the remedy differs — repair, not repoint.
 * - `permalink` — the bare `folder/note-stem` permalink string.
 * - `permalink-project-prefixed` — the same permalink behind a `<project>/`
 *   prefix, the form Brain MCP results carry.
 * - `entity-id-section` — an ID plus a section fragment (`ANALYSIS-034 Part C`).
 *   Captured separately from a bare ID because repointing has to check that the
 *   cited section still exists in whichever child inherited it.
 * - `entity-id` — a bare `ANALYSIS-034` token.
 * - `bidirectional-missing-on-target` — a referencing note carries a formal
 *   Relations edge to the target, but the target carries no inverse edge back.
 *   Repair goes on the TARGET.
 * - `bidirectional-missing-on-referencer` — the target's own Relations name a
 *   note that carries no matching outbound edge. Repair goes on the REFERENCER.
 * - `index-stale` — a retired title or permalink still served by semantic
 *   search after the note moved. Never produced by this library (it makes no
 *   search calls); accepted from externally supplied entries.
 */
export const REFERENCE_CLASSES = [
  "wikilink",
  "wikilink-malformed",
  "permalink",
  "permalink-project-prefixed",
  "entity-id-section",
  "entity-id",
  "bidirectional-missing-on-target",
  "bidirectional-missing-on-referencer",
  "index-stale",
] as const;

export const ReferenceClassSchema = z.enum(REFERENCE_CLASSES);
export type ReferenceClass = z.infer<typeof ReferenceClassSchema>;

/**
 * Containment precedence for de-duplicating overlapping matches on one line.
 * A lower index wins; a match contained inside a higher-precedence match FOR
 * THE SAME TARGET is dropped. Kept same-target so each target's impact count
 * stays independently meaningful rather than depending on scan companions.
 */
export const SUPPRESSION_PRECEDENCE: readonly ReferenceClass[] = REFERENCE_CLASSES;

/**
 * Which leg produced the entry.
 *
 * - `TEXT` — the deterministic prose/wikilink/permalink/token scan.
 * - `GRAPH` — derived from a Relations section under the bi-directional rule.
 *   When note A carries `verb [[B]]`, B's Relations are a formal index of the
 *   notes that reference it, so traversal finds inbound edges no text scan of
 *   B would ever surface.
 * - `BOTH` — the text scan landed on the formal Relations entry itself, so the
 *   two deterministic legs corroborate.
 * - `SEARCH` — supplied externally by an executing agent from a search-index
 *   query. Covers DESCRIPTIVE references ("the substrate analysis") that carry
 *   no identifier for a text scan to match, and exact-identifier recall the
 *   text scan cannot see because the reference lives outside the tree. Always
 *   advisory. The search tool offers several modes, so the entry records WHICH
 *   mode produced it — a keyword hit and a semantic hit warrant very different
 *   confidence, and collapsing them would hide that.
 */
export const REFERENCE_SOURCES = ["TEXT", "GRAPH", "BOTH", "SEARCH"] as const;
export const ReferenceSourceSchema = z.enum(REFERENCE_SOURCES);
export type ReferenceSource = z.infer<typeof ReferenceSourceSchema>;

/** Search modes offered by the Brain search tool — the REQUESTED routing dial. */
export const SEARCH_MODES = ["auto", "semantic", "keyword", "hybrid"] as const;
export const SearchModeSchema = z.enum(SEARCH_MODES);
export type SearchMode = z.infer<typeof SearchModeSchema>;

/**
 * Retrieval strategies offered alongside `mode`, and ORTHOGONAL to it.
 *
 * `mode` selects which legs run; `search_type` selects how the proxied leg
 * retrieves. The two compose, so recording only the mode under-specifies the
 * query: `mode: "keyword"` with `search_type: "text"` is a full-text scan, and
 * the same mode with `search_type: "permalink"` is an exact-identifier lookup
 * that additionally does prefix matching on a `*`. Those return categorically
 * different result shapes, and a finding tagged only `keyword` cannot be told
 * apart from the other.
 */
export const SEARCH_TYPES = ["text", "title", "permalink", "vector", "semantic", "hybrid"] as const;
export const SearchTypeSchema = z.enum(SEARCH_TYPES);
export type SearchType = z.infer<typeof SearchTypeSchema>;

/**
 * Which leg ACTUALLY served a row, as reported by the search surface.
 *
 * Distinct from `mode` because the request is routed: a structured filter forces
 * the request onto the proxied leg whatever mode was asked for, and `auto` tries
 * semantic then falls back. Requests recorded as `semantic` and as `auto` have
 * both been observed coming back served by `keyword`. Without this field the
 * recorded mode no longer establishes which leg produced the row, which defeats
 * the reason `mode` is recorded at all.
 *
 * `auto` is deliberately absent: it is a request-only routing value and never a
 * leg that serves. A response claiming it is malformed and should fail here
 * rather than be stored as provenance that explains nothing.
 */
/**
 * `unreported` is the explicit stand-in for a response that carried no
 * `actual_source` at all. Modelled as a VALUE rather than by leaving the field
 * optional, because "the surface did not say" and "nobody recorded it" are different
 * facts and only the first is acceptable. An optional field collapses them, and that
 * collapse is what let the old shape claim provenance it never had.
 */
export const ACTUAL_SOURCES = ["semantic", "keyword", "hybrid", "unreported"] as const;
export const ActualSourceSchema = z.enum(ACTUAL_SOURCES);
export type ActualSource = z.infer<typeof ActualSourceSchema>;

/** Evidence for a bi-directional closure violation. */
export const RelationEvidenceSchema = z.object({
  verb: z.string().min(1),
  expectedInverse: z.string().min(1),
  /** The note on which the missing inverse edge must be added. */
  counterpartFile: z.string().min(1),
});

/**
 * A target after its identity has been read off disk. Aliases are supplied by
 * the CALLER (from a distribution plan, a renumbering map, or a known history)
 * — the scanner never infers what a note used to be called.
 */
export const ResolvedTargetSchema = z.object({
  /** Path relative to the docs root, so manifests stay machine-portable. */
  path: z.string().min(1),
  entityId: z.string().min(1),
  title: z.string().min(1),
  permalink: z.string(),
  aliasTitles: z.array(z.string()),
  aliasPermalinks: z.array(z.string()),
  aliasEntityIds: z.array(z.string()),
});
export type ResolvedTarget = z.infer<typeof ResolvedTargetSchema>;

/**
 * Fields every finding carries, whichever leg produced it. Split out so the two
 * branches below cannot drift: a field added here reaches both, and neither branch
 * can quietly omit one.
 */
const findingCore = {
  /** Path relative to the docs root. */
  referencingFile: z.string().min(1),
  /** 1-indexed. */
  line: z.number().int().positive(),
  /** 1-indexed offset within the line. */
  column: z.number().int().positive(),
  matchedText: z.string().min(1),
  class: ReferenceClassSchema,
  /** The target's entity ID — stable across a rename of title or permalink. */
  target: z.string().min(1),
  /** True when the match came from an alias rather than the current identity. */
  viaAlias: z.boolean(),
  /** Populated for `entity-id-section` only, e.g. "Section 6" or "Part C". */
  sectionFragment: z.string().optional(),
  relation: RelationEvidenceSchema.optional(),
};

/**
 * A finding from a deterministic leg. It MUST NOT carry search provenance.
 *
 * `.strict()` is what enforces that: `mode`, `searchType` and `actualSource` are not
 * declared here, so a deterministic entry carrying any of them is rejected rather
 * than silently accepted with meaningless provenance. While those fields were merely
 * optional there was no shape difference between "a text match" and "a text match
 * claiming a search mode", and nothing anywhere could tell the two apart.
 *
 * `advisory` is a literal `false` because a deterministic finding IS the gate. The
 * flag is therefore redundant with `source` by construction — deliberately, since
 * every consumer already branches on it, and a derived value that cannot disagree
 * with its source is safer than one that can.
 */
const deterministicFinding = (source: "TEXT" | "GRAPH" | "BOTH") =>
  z
    .object({
      ...findingCore,
      source: z.literal(source),
      advisory: z.literal(false).default(false),
    })
    .strict();

/**
 * A finding from the search leg. It MUST carry all three provenance fields.
 *
 * Required rather than optional, because an advisory entry is the one kind a reader
 * has to confirm by hand, and confirming it means reproducing the query. A recorded
 * mode alone cannot do that: `searchType` is an orthogonal retrieval dial the mode
 * cannot express, and the leg that actually served the row routinely differs from the
 * one requested. An entry missing any of the three is not reproducible, so it is
 * refused at the boundary instead of stored as evidence it cannot support.
 */
const searchFinding = z
  .object({
    ...findingCore,
    source: z.literal("SEARCH"),
    /** The mode REQUESTED. */
    mode: SearchModeSchema,
    /** The retrieval strategy requested alongside `mode`. */
    searchType: SearchTypeSchema,
    /** The leg that actually served the row, or `unreported`. */
    actualSource: ActualSourceSchema,
    /**
     * Advisory entries widen the repointing worklist but NEVER gate closure. The
     * search leg is a recall aid — over prose that names a note without naming its
     * identifier, and over an index with known live defects. It is not reproducible
     * enough to fail a build on, so the deterministic legs remain the gate.
     */
    advisory: z.literal(true).default(true),
  })
  .strict();

/**
 * Discriminated on `source`. The discriminator has NO default: a finding that does
 * not say which leg produced it cannot be placed in either branch, and defaulting it
 * to `TEXT` — as the previous shape did — would admit an unlabelled entry straight
 * into the closure gate.
 */
export const ReferenceFindingSchema = z.discriminatedUnion("source", [
  deterministicFinding("TEXT"),
  deterministicFinding("GRAPH"),
  deterministicFinding("BOTH"),
  searchFinding,
]);
export type ReferenceFinding = z.infer<typeof ReferenceFindingSchema>;

/**
 * Detect a manifest written under the pre-discriminated shape, so the failure names
 * the remedy instead of surfacing a four-branch union error.
 *
 * Deliberately a detector rather than a compatibility path. There is no migration:
 * the provenance a legacy SEARCH entry lacks was never recorded and cannot be
 * reconstructed, so re-running the scan is the only honest repair. Returns the message
 * to raise, or null when the input is not recognisably legacy.
 */
export function detectLegacyManifest(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const findings = (raw as { findings?: unknown }).findings;
  if (!Array.isArray(findings)) return null;
  for (const entry of findings) {
    if (typeof entry !== "object" || entry === null) continue;
    const finding = entry as Record<string, unknown>;
    const source = finding["source"];
    if (source === undefined) {
      return "manifest predates the discriminated finding shape: a finding carries no `source`. Re-run the scan to regenerate it.";
    }
    if (source === "SEARCH") {
      const missing = ["mode", "searchType", "actualSource"].filter(
        (field) => finding[field] === undefined,
      );
      if (missing.length > 0) {
        return `manifest predates the discriminated finding shape: a SEARCH finding is missing ${missing.join(", ")}. That provenance was never recorded and cannot be reconstructed, so re-run the scan to regenerate the manifest.`;
      }
    } else if (
      finding["mode"] !== undefined ||
      finding["searchType"] !== undefined ||
      finding["actualSource"] !== undefined
    ) {
      return `manifest predates the discriminated finding shape: a ${String(source)} finding carries search provenance, which no deterministic leg produces. Re-run the scan to regenerate it.`;
    }
  }
  return null;
}

/** The SEARCH branch alone — what the advisory leg produces and `--merge` accepts. */
export const SearchReferenceFindingSchema = searchFinding;
export type SearchReferenceFinding = z.infer<typeof searchFinding>;

const classCountsShape = Object.fromEntries(
  REFERENCE_CLASSES.map((cls) => [cls, z.number().int().nonnegative()]),
) as Record<ReferenceClass, z.ZodNumber>;

export const ClassCountsSchema = z.object(classCountsShape);
export type ClassCounts = z.infer<typeof ClassCountsSchema>;

export const TargetSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  byClass: ClassCountsSchema,
});

export const ImpactManifestSchema = z.object({
  /** Absolute path the scan ran against; recorded for provenance only. */
  docsRoot: z.string().min(1),
  generatedAt: z.string().min(1),
  filesScanned: z.number().int().nonnegative(),
  targets: z.array(ResolvedTargetSchema),
  findings: z.array(ReferenceFindingSchema),
  summary: z.object({
    totalFindings: z.number().int().nonnegative(),
    byClass: ClassCountsSchema,
    /** Keyed by target entity ID. */
    byTarget: z.record(z.string(), TargetSummarySchema),
    /** Which leg found what — the deterministic/advisory split at a glance. */
    bySource: z.object({
      TEXT: z.number().int().nonnegative(),
      GRAPH: z.number().int().nonnegative(),
      BOTH: z.number().int().nonnegative(),
      SEARCH: z.number().int().nonnegative(),
    }),
  }),
});
export type ImpactManifest = z.infer<typeof ImpactManifestSchema>;

/**
 * CLI input shape for `--targets <file.json>`. The alias lists are the only
 * place history enters the scan, and they are always declared rather than
 * derived — the scanner has no way to know a note used to be numbered 028.
 */
export const TargetSpecSchema = z.object({
  path: z.string().min(1),
  aliasTitles: z.array(z.string()).optional(),
  aliasPermalinks: z.array(z.string()).optional(),
  aliasEntityIds: z.array(z.string()).optional(),
});
export type TargetSpecInput = z.infer<typeof TargetSpecSchema>;

export const TargetsFileSchema = z.array(TargetSpecSchema).min(1);

export const CLOSURE_STATUSES = ["UPDATED", "RETAINED", "OUTSTANDING"] as const;
export const ClosureStatusSchema = z.enum(CLOSURE_STATUSES);
export type ClosureStatus = z.infer<typeof ClosureStatusSchema>;

/**
 * A caller-supplied allow-list rule. An entry is RETAINED when every field the
 * rule specifies equals the finding's. The checker owns no retention policy of
 * its own: an inbound reference that survives a restructuring is either a
 * deliberate historical citation or an unrepaired break, and only the caller
 * knows which.
 *
 * An all-undefined rule is refused rather than treated as "retain everything",
 * because the shape that silently passes a whole audit is exactly the shape a
 * typo produces.
 */
export const RetainRuleSchema = z
  .object({
    referencingFile: z.string().optional(),
    target: z.string().optional(),
    class: ReferenceClassSchema.optional(),
    matchedText: z.string().optional(),
  })
  .refine((rule) => Object.values(rule).some((value) => value !== undefined), {
    message:
      "retain rule must constrain at least one field; an unconstrained rule would retain every finding",
  });
export type RetainRule = z.infer<typeof RetainRuleSchema>;

/** CLI input shape for `--retain <file.json>`. */
export const RetainFileSchema = z.array(RetainRuleSchema);

/**
 * CLI input shape for `--merge <file.json>`: externally-supplied findings, the
 * route by which an executing agent contributes search-index and
 * index-staleness results the library cannot produce itself. Merged entries are
 * forced advisory regardless of what the file claims, so no external input can
 * promote itself into the closure gate.
 */
export const MergeFileSchema = z.array(
  searchFinding.extend({
    // Forced to SEARCH/advisory by the scanner regardless of what the file claims, so
    // an author need not restate them. The provenance triple is NOT defaulted: an entry
    // that cannot say how it was found has nothing to contribute.
    source: z.literal("SEARCH").default("SEARCH"),
    advisory: z.literal(true).default(true),
  }),
);

export const ClosureEntrySchema = z.object({
  finding: ReferenceFindingSchema,
  status: ClosureStatusSchema,
  /** Where the stale form now sits, when it is still present. */
  currentLine: z.number().int().positive().optional(),
  detail: z.string(),
});
export type ClosureEntry = z.infer<typeof ClosureEntrySchema>;

export const ClosureReportSchema = z.object({
  docsRoot: z.string().min(1),
  checkedAt: z.string().min(1),
  entries: z.array(ClosureEntrySchema),
  /**
   * References present now but absent from the prior manifest — a repointing
   * pass that introduced a fresh stale form, or a note added since the scan.
   * Reported alongside rather than folded into `entries` so the per-entry
   * UPDATED/RETAINED/OUTSTANDING contract stays exactly the prior manifest.
   */
  newFindings: z.array(ReferenceFindingSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
    retained: z.number().int().nonnegative(),
    /** OUTSTANDING entries from the deterministic legs. These gate closure. */
    outstanding: z.number().int().nonnegative(),
    /**
     * OUTSTANDING entries from the advisory (semantic) leg. Reported so the
     * worklist stays visible, excluded from `closed` so a recall aid can never
     * fail a gate it was never precise enough to own.
     */
    outstandingAdvisory: z.number().int().nonnegative(),
    newFindings: z.number().int().nonnegative(),
    /**
     * New bi-directional closure violations — edges the repointing pass itself made
     * one-way. Broken out of `newFindings` because it is the only part of that set
     * that represents damage the operation caused rather than unrelated drift, and it
     * is therefore the only part that gates.
     */
    introducedAsymmetry: z.number().int().nonnegative(),
    /**
     * The closure condition: no DETERMINISTIC entry OUTSTANDING, and no asymmetry
     * introduced. Both halves are required — a pass that repaired every stale
     * reference while leaving the graph one-way has not finished.
     */
    closed: z.boolean(),
  }),
});
export type ClosureReport = z.infer<typeof ClosureReportSchema>;
