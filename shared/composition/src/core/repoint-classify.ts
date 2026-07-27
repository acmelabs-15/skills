/**
 * Which findings become edits, and which become worklist entries.
 *
 * The whole write/no-write decision lives here, deliberately ahead of any file
 * being opened for editing: a finding is declined for what it IS — a judgment
 * class, an advisory recall aid, an unmapped identifier, an unverifiable section —
 * before its address is ever consulted. Keeping that separation means the
 * dry-run preview and the live apply reach identical verdicts on every finding,
 * and the only difference between them is the rename at the end.
 *
 * The one thing here that touches the tree is the destination check, which needs
 * to read the note a repointed citation would land on. It is behind a lazy index
 * so a manifest with no section citation never pays for a full-tree read.
 */

import type {
  ImpactManifest,
  ReferenceClass,
  ReferenceFinding,
  ResolvedTarget,
} from "../schemas/reference-manifest.js";
import type { RepointPlan, RepointResidual, ResidualReason } from "../schemas/repoint-plan.js";
import type { NoteFileSystem } from "./note-identity.js";
import { type IndexedNote, type NoteIndex, buildNoteIndex } from "./note-index.js";
import { sectionAnchored } from "./repoint-anchors.js";
import type { AddressedEdit } from "./repoint-edits.js";
import { resolveReplacement } from "./repoint-resolve.js";

/** Classes whose repair is judgment, with the reason each is declined. */
const NON_MECHANICAL: Partial<Record<ReferenceClass, ResidualReason>> = {
  "bidirectional-missing-on-target": "judgment-class",
  "bidirectional-missing-on-referencer": "judgment-class",
  "index-stale": "judgment-class",
  "wikilink-malformed": "malformed-reference",
};

/** A resolved edit still awaiting address verification against the file. */
export interface Candidate {
  readonly finding: ReferenceFinding;
  readonly edit: AddressedEdit;
}

/** Deterministic order, so two runs over one manifest produce one report. */
export function compareFindings(a: ReferenceFinding, b: ReferenceFinding): number {
  return (
    a.referencingFile.localeCompare(b.referencingFile) || a.line - b.line || a.column - b.column
  );
}

/**
 * Reads and indexes the tree at most once, and only when something asks. A
 * manifest carrying no `entity-id-section` finding never triggers the read.
 */
export class LazyNoteIndex {
  private index: NoteIndex | undefined;
  constructor(
    private readonly docsRoot: string,
    private readonly fileSystem: NoteFileSystem,
  ) {}

  async get(): Promise<NoteIndex> {
    this.index ??= await buildNoteIndex(this.docsRoot, this.fileSystem);
    return this.index;
  }
}

/**
 * Confirm a repointed section citation lands on a section that exists.
 *
 * The failure this prevents is the executor's worst possible output: a citation
 * that reads correctly, passes the closure gate because the stale form is gone,
 * and points at a section that is not there. A split is exactly the operation
 * that moves sections between notes, so the check is not hypothetical.
 */
export async function verifyDestination(
  destination: { entityId: string; fragment: string },
  index: LazyNoteIndex,
): Promise<{ ok: true } | { ok: false; reason: ResidualReason; detail: string }> {
  const note: IndexedNote | undefined = (await index.get()).resolve(destination.entityId);
  if (!note) {
    return {
      ok: false,
      reason: "destination-unresolved",
      detail: `no note in the tree resolves to "${destination.entityId}", so "${destination.fragment}" cannot be verified`,
    };
  }
  if (!sectionAnchored(destination.fragment, note.content)) {
    return {
      ok: false,
      reason: "section-absent",
      detail: `"${destination.fragment}" is not anchored in ${note.path}; repointing would cite a section that is not there`,
    };
  }
  return { ok: true };
}

/** The instruction a judgment-class finding already carries, surfaced verbatim. */
function judgmentDetail(finding: ReferenceFinding): string {
  const repair = finding.relation
    ? ` — add "${finding.relation.expectedInverse}" on ${finding.relation.counterpartFile}`
    : "";
  return `class ${finding.class} is repaired by editing the graph, not by substituting text${repair}`;
}

export async function classifyFindings(
  manifest: ImpactManifest,
  plan: RepointPlan,
  index: LazyNoteIndex,
): Promise<{ candidates: Candidate[]; residual: RepointResidual[] }> {
  const targets = new Map<string, ResolvedTarget>(
    manifest.targets.map((target) => [target.entityId, target]),
  );
  const candidates: Candidate[] = [];
  const residual: RepointResidual[] = [];

  for (const finding of [...manifest.findings].sort(compareFindings)) {
    // Reading the discriminator alone: the schema makes `advisory` a literal per
    // branch, so `advisory === true` and `source === "SEARCH"` can no longer disagree
    // and testing both is now provably redundant.
    if (finding.source === "SEARCH") {
      residual.push({
        finding,
        reason: "advisory",
        detail: "advisory entries never gate closure and are never written from",
      });
      continue;
    }
    const declined = NON_MECHANICAL[finding.class];
    if (declined !== undefined) {
      residual.push({
        finding,
        reason: declined,
        detail:
          declined === "judgment-class"
            ? judgmentDetail(finding)
            : `class ${finding.class} was already broken before anything moved; repair to the canonical form rather than repointing`,
      });
      continue;
    }
    const resolution = resolveReplacement(finding, plan, targets.get(finding.target));
    if (!resolution.ok) {
      residual.push({ finding, reason: resolution.reason, detail: resolution.detail });
      continue;
    }
    const destination = resolution.replacement.destination;
    if (destination) {
      const verified = await verifyDestination(destination, index);
      if (!verified.ok) {
        residual.push({ finding, reason: verified.reason, detail: verified.detail });
        continue;
      }
    }
    candidates.push({
      finding,
      edit: {
        line: finding.line,
        column: finding.column,
        oldText: finding.matchedText,
        newText: resolution.replacement.newText,
      },
    });
  }
  return { candidates, residual };
}
