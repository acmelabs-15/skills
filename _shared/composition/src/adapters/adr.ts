import { BaseMarkdownAdapter } from "../core/base-markdown-adapter.js";

export class AdrAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "adr";
  protected readonly sectionDelimiter = "### ";
  protected readonly identifierPrefix = "D-";
  protected readonly identifierPattern = /D-(\d+)/;
}
