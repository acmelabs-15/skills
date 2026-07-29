/**
 * The status-atom invariant: every note type's status enum is a SUBSET of the
 * shared vocabulary, never an extension of it.
 *
 * `StatusAtom.extract([...])` already fails at build time on a name that is not
 * an atom, so most drift cannot compile. What it cannot catch is a note type
 * declaring a fresh `z.enum([...])` with hand-typed strings — which is precisely
 * how the nine independent enums this replaced came to disagree. These tests are
 * the runtime half of that guard: they assert membership from the outside, so a
 * new enum that bypasses `extract` still gets caught.
 *
 * The one sanctioned exception is TASK's `TODO`, asserted explicitly below rather
 * than quietly tolerated, so it stays visible as a known duplicate of `PENDING`
 * with a reason.
 */
import { describe, expect, test } from "bun:test";
import { AdrNoteStatusEnum } from "@acmelabs/models/schemas/adr-note";
import { AnalysisNoteStatusEnum } from "@acmelabs/models/schemas/analysis-note";
import {
  ARTIFACT_LIFECYCLE_ATOMS,
  PartSubstatusEnum,
  PlanStatusEnum,
  SessionStatusEnum,
  StatusAtom,
  TERMINAL_WORK_ATOMS,
  TaskStatusEnum,
  WORK_PROGRESS_ATOMS,
} from "@acmelabs/models/schemas/common";
import { DesignNoteStatusEnum } from "@acmelabs/models/schemas/design-note";
import { EpicNoteStatusEnum } from "@acmelabs/models/schemas/epic-note";
import { RequirementNoteStatusEnum } from "@acmelabs/models/schemas/requirement-note";
import { SpecRootNoteStatusEnum } from "@acmelabs/models/schemas/spec-root-note";
import { TaskNoteStatusEnum } from "@acmelabs/models/schemas/task-note";

const ATOMS = new Set<string>(StatusAtom.options);

/** Every status enum in the models package, by the note type that declares it. */
const ENUMS: Record<string, readonly string[]> = {
  "plan part substatus": PartSubstatusEnum.options,
  "plan-scoped task": TaskStatusEnum.options,
  plan: PlanStatusEnum.options,
  session: SessionStatusEnum.options,
  ADR: AdrNoteStatusEnum.options,
  DESIGN: DesignNoteStatusEnum.options,
  REQ: RequirementNoteStatusEnum.options,
  "SPEC root": SpecRootNoteStatusEnum.options,
  ANALYSIS: AnalysisNoteStatusEnum.options,
  EPIC: EpicNoteStatusEnum.options,
  TASK: TaskNoteStatusEnum.options,
};

describe("status atoms — subset, never redefine", () => {
  for (const [noteType, values] of Object.entries(ENUMS)) {
    test(`${noteType} declares only known atoms`, () => {
      // TODO is the one sanctioned synonym; see TaskNoteStatusEnum's own comment.
      const unknown = values.filter((v) => !ATOMS.has(v) && v !== "TODO");
      expect(unknown).toEqual([]);
    });
  }

  test("the two families do not overlap, except where sharing is intended", () => {
    const work = new Set<string>(WORK_PROGRESS_ATOMS);
    const artifact = new Set<string>(ARTIFACT_LIFECYCLE_ATOMS);
    const both = [...work].filter((a) => artifact.has(a));
    // An atom in both families would mean one name for two questions — the exact
    // ambiguity the split exists to remove.
    expect(both).toEqual([]);
  });

  test("every atom belongs to at least one family", () => {
    const claimed = new Set<string>([
      ...WORK_PROGRESS_ATOMS,
      ...ARTIFACT_LIFECYCLE_ATOMS,
      "PAUSED", // the session family's only atom not shared with work progress
      "IN_PROGRESS",
      "DONE",
    ]);
    const orphans = StatusAtom.options.filter((a) => !claimed.has(a));
    expect(orphans).toEqual([]);
  });

  test("terminal work atoms are terminal, and are work atoms", () => {
    for (const atom of TERMINAL_WORK_ATOMS) {
      expect(ATOMS.has(atom)).toBe(true);
      expect((WORK_PROGRESS_ATOMS as readonly string[]).includes(atom)).toBe(true);
    }
    // Three, not one. A phase may close over a consciously-deferred item and
    // never over a merely-pending one, so the distinction has to survive.
    expect(TERMINAL_WORK_ATOMS.length).toBe(3);
  });

  test("PAUSED is accepted by plan and session alike", () => {
    // Resolves a contradiction the prose carried: the plan-note schema reference
    // asserted PAUSED was session-only while this enum always accepted it.
    expect(PlanStatusEnum.safeParse("PAUSED").success).toBe(true);
    expect(SessionStatusEnum.safeParse("PAUSED").success).toBe(true);
  });

  test("parts cannot be DRAFT, PROPOSED or SPLIT", () => {
    // Parts are work, not artifacts. SPLIT belonged to a removed plan mode and
    // would additionally have been non-terminal, blocking its plan from ever
    // reaching DONE.
    for (const rejected of ["DRAFT", "PROPOSED", "SPLIT"]) {
      expect(PartSubstatusEnum.safeParse(rejected).success).toBe(false);
    }
  });

  test("TASK uses TODO exclusively, never both spellings", () => {
    // The exception is one name for the not-started state, not two. Accepting
    // PENDING here as well would reintroduce the synonym inside a single note
    // type, which is what the vocabulary exists to prevent.
    expect(TaskNoteStatusEnum.safeParse("TODO").success).toBe(true);
    expect(TaskNoteStatusEnum.safeParse("PENDING").success).toBe(false);
  });

  test("CANCELLED is not an atom", () => {
    // One real TASK note carries it, which is why this is asserted rather than
    // assumed: the note is the thing to correct, to ABANDONED. Admitting the
    // value would give "stopped deliberately" two spellings.
    expect(ATOMS.has("CANCELLED")).toBe(false);
    expect(TaskNoteStatusEnum.safeParse("CANCELLED").success).toBe(false);
  });
});
