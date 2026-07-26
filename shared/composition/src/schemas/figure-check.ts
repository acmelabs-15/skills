/**
 * Zod schemas for figure re-derivation checks and their findings.
 *
 * The failure this describes: a stated figure is internally consistent, cited
 * downstream, and stale against the structure it summarises. Eighty-nine rows
 * against a table of ninety-seven. "At least eight" against thirty-two. Ten
 * measurements against fifteen. A Totals row that disagrees with the columns
 * directly above it. Nothing about any of those reads as wrong — the sentence
 * is fluent, the number is plausible, and the structure it describes is a
 * scroll away.
 *
 * The remedy is to stop reading the figure and count the structure instead. A
 * check is therefore a pair: where the claim is stated, and how to re-derive it
 * from the thing it claims to summarise.
 *
 * Schemas rather than bare interfaces because check definitions are read from
 * disk. A typo'd derivation must fail at parse time; a check that silently
 * derives nothing would report MATCH against a figure it never verified.
 */

import { z } from "zod";

/**
 * How a section is named. Mirrors the slicing primitive's matcher so a config
 * author can pin an exact heading, a stable prefix, or a pattern — headings in
 * this corpus carry numbering that renumbers ("## 5. Part C"), so prefix and
 * pattern forms are the durable ones.
 */
export const SectionMatcherSchema = z
  .object({
    equals: z.string().min(1).optional(),
    startsWith: z.string().min(1).optional(),
    matches: z.string().min(1).optional(),
    flags: z.string().optional(),
  })
  .refine((matcher) => matcher.equals ?? matcher.startsWith ?? matcher.matches, {
    message: "a section matcher must set one of equals, startsWith or matches",
  });
export type SectionMatcherInput = z.infer<typeof SectionMatcherSchema>;

/**
 * Where the claim is stated. The pattern needs exactly one capture group, and
 * that group's text is what gets parsed as a figure — "\\*\\*(\\w+)\\*\\* rows
 * now carry" captures the word and nothing else. Requiring the caller to point
 * at the number rather than inferring it is what keeps a sentence with three
 * numbers in it from being checked against whichever one matched first.
 */
export const FigureLocationSchema = z.object({
  section: SectionMatcherSchema.optional(),
  pattern: z.string().min(1),
  flags: z.string().optional(),
});
export type FigureLocation = z.infer<typeof FigureLocationSchema>;

const derivationBase = {
  /** Defaults to the note carrying the figure; set it for a cross-note claim. */
  note: z.string().min(1).optional(),
  section: SectionMatcherSchema.optional(),
};

/**
 * The four ways to re-derive a count. Every one is mechanical: no derivation
 * interprets text, because a derivation that interprets is a second opinion
 * rather than a check.
 */
export const DerivationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("countTableRows"),
    ...derivationBase,
    /** Restrict to rows whose cell in this column matches `matching`. */
    column: z.string().min(1).optional(),
    matching: z.string().min(1).optional(),
    matchingFlags: z.string().optional(),
  }),
  z.object({
    kind: z.literal("countCheckboxes"),
    ...derivationBase,
    /** Which marker states to count; all three when omitted. */
    states: z
      .array(z.enum(["open", "done", "deferred"]))
      .min(1)
      .optional(),
  }),
  z.object({
    kind: z.literal("countRegexMatches"),
    ...derivationBase,
    pattern: z.string().min(1),
    flags: z.string().optional(),
  }),
  z.object({
    kind: z.literal("sumTableColumn"),
    ...derivationBase,
    column: z.string().min(1),
    /** Which table in the section, 0-indexed. Defaults to the only one. */
    tableIndex: z.number().int().nonnegative().optional(),
  }),
]);
export type Derivation = z.infer<typeof DerivationSchema>;

export const FigureCheckSchema = z.object({
  /** Caller's label, echoed on the finding so a report is readable. */
  id: z.string().min(1),
  /** Path, entity ID, title or permalink of the note carrying the figure. */
  note: z.string().min(1),
  figureLocation: FigureLocationSchema,
  derivation: DerivationSchema,
});
export type FigureCheck = z.infer<typeof FigureCheckSchema>;

export const ChecksFileSchema = z.array(FigureCheckSchema).min(1);

/**
 * Verdicts.
 *
 * - `MATCH` — stated equals derived.
 * - `MISMATCH` — they differ. The finding, and the reason the tool exists.
 * - `UNANCHORED` — the claim could not be tied to a structure with confidence:
 *   the pattern matched nothing, the section did not resolve, the number was
 *   unparseable, or a built-in found no single countable structure to anchor
 *   against. Reported rather than guessed, because a guessed anchor produces a
 *   confident MISMATCH against a figure that was never stale, and one of those
 *   costs more trust than ten honest UNANCHORED lines.
 */
export const FIGURE_VERDICTS = ["MATCH", "MISMATCH", "UNANCHORED"] as const;
export const FigureVerdictSchema = z.enum(FIGURE_VERDICTS);
export type FigureVerdict = z.infer<typeof FigureVerdictSchema>;

export const FIGURE_CHECK_KINDS = [
  "config",
  "totals-row",
  "checkbox-tally",
  "stated-count",
] as const;
export const FigureCheckKindSchema = z.enum(FIGURE_CHECK_KINDS);
export type FigureCheckKind = z.infer<typeof FigureCheckKindSchema>;

export const FigureFindingSchema = z.object({
  /** Config id, or a generated label for a built-in. */
  id: z.string().min(1),
  kind: FigureCheckKindSchema,
  /** Docs-root-relative path of the note carrying the figure. */
  note: z.string().min(1),
  /** Heading the figure sits under, empty when it sits outside any section. */
  section: z.string(),
  /** 1-indexed line of the claim. */
  line: z.number().int().positive().nullable(),
  /** The claim verbatim, so a finding is actionable without opening the file. */
  statedText: z.string(),
  statedFigure: z.number().nullable(),
  derivedFigure: z.number().nullable(),
  verdict: FigureVerdictSchema,
  /** How the derived figure was obtained, or why the check went unanchored. */
  detail: z.string(),
});
export type FigureFinding = z.infer<typeof FigureFindingSchema>;

export const FigureReportSchema = z.object({
  docsRoot: z.string().min(1),
  generatedAt: z.string().min(1),
  notesScanned: z.number().int().nonnegative(),
  findings: z.array(FigureFindingSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    match: z.number().int().nonnegative(),
    mismatch: z.number().int().nonnegative(),
    unanchored: z.number().int().nonnegative(),
    /** True when nothing mismatched. Unanchored checks do not fail a run. */
    clean: z.boolean(),
  }),
});
export type FigureReport = z.infer<typeof FigureReportSchema>;
