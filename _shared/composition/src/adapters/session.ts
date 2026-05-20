import { BaseMarkdownAdapter } from "../core/base-markdown-adapter.js";

/**
 * Adapter for SESSION notes.
 * Sections are H2-delimited by `## Event ` and identifiers follow the
 * `Event-<number>` pattern (case-insensitive at the prefix).
 */
export class SessionAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "session";
  protected readonly sectionDelimiter = "## Event ";
  protected readonly identifierPattern = /Event-(\d+)/i;
}
