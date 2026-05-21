import { BaseMarkdownAdapter } from "../core/base-markdown-adapter.js";

export class AdrAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "adr";
  protected readonly sectionDelimiter = "### ";
  protected readonly identifierPattern = /D-(\d+)/;
}
