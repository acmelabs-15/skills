import { BaseMarkdownAdapter } from "../core/base-markdown-adapter.js";

/**
 * Adapter for ANALYSIS notes.
 * Sections are H3-delimited (`### item-N`) and identifiers follow the
 * `item-<number>` pattern (case-insensitive at the prefix).
 */
export class AnalysisAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "analysis";
  protected readonly sectionDelimiter = "### ";
  protected readonly identifierPattern = /item-(\d+)/i;
  protected readonly identifierPrefix = "item-";
}
