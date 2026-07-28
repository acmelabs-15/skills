import { describe, expect, test } from "bun:test";
import * as core from "../src/core/index.js";
import * as schemas from "../src/schemas/index.js";

/**
 * A barrel that typechecks can still be wrong at runtime — a stale path or a
 * renamed symbol resolves to `undefined` rather than failing the compile. These
 * tests import the barrels as namespaces and assert the surface is actually
 * populated, so a drifted re-export fails here instead of in a consumer.
 */
describe("src/core barrel", () => {
  const identityExports = [
    "ENTITY_PREFIXES",
    "ENTITY_PREFIX_SET",
    "defaultNoteFileSystem",
    "entityIdOfTitle",
    "findEntityIds",
    "locateNote",
    "normalizeReference",
    "readFrontmatter",
    "stringField",
  ] as const;

  const familyExports = [
    // reference
    "buildImpactManifest",
    "scanReferences",
    "resolveTargets",
    "summarize",
    "applyGraphLeg",
    "checkClosure",
    "matchLine",
    "escapeRegExp",
    // repoint
    "executeRepoint",
    "resolveReplacement",
    "sectionAnchored",
    "parseSectionFragment",
    "applyEdits",
    "invertEdits",
    "verifyAddress",
    "overlappingEdits",
    "lineDiff",
    "MECHANICAL_CLASSES",
    // correction
    "extractObligations",
    "resolveItemTarget",
    "reconcile",
    "verifyObligation",
    "findCorrectionMarkers",
    "retirementMatch",
    // figure
    "scanNote",
    "derive",
    "runCheck",
    // shared
    "NoteIndex",
    "buildNoteIndex",
    "readNoteAt",
    "parseRelations",
    "parseRelationEntries",
    "inverseVerb",
    "isSymmetricVerb",
    "sliceSections",
    "findTables",
    "parseFigure",
    "findQuoteMatches",
  ] as const;

  test("every identity primitive resolves", () => {
    for (const name of identityExports) {
      expect(core[name], `core barrel is missing ${name}`).toBeDefined();
    }
  });

  test("every tool-family entry point resolves", () => {
    for (const name of familyExports) {
      expect(core[name], `core barrel is missing ${name}`).toBeDefined();
    }
  });

  test("the identity primitives behave through the barrel", () => {
    expect(core.entityIdOfTitle("ANALYSIS-034: Consolidated Decision Agenda")).toBe("ANALYSIS-034");
    expect(core.normalizeReference("ANALYSIS-034: Agenda")).toBe("analysis-034-agenda");
    expect(core.inverseVerb("part_of")).toBe("contains");
    expect(core.ENTITY_PREFIX_SET.has("ADR")).toBe(true);
  });

  test("no export resolves to undefined", () => {
    const undefinedExports = Object.entries(core)
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    expect(undefinedExports).toEqual([]);
  });
});

describe("src/schemas barrel", () => {
  const schemaExports = [
    // pre-existing note schemas
    "AdrNoteSchema",
    "AnalysisNoteSchema",
    "CritNoteSchema",
    "EpicNoteSchema",
    // reference manifest
    "ImpactManifestSchema",
    "ReferenceFindingSchema",
    "ClosureReportSchema",
    "RetainRuleSchema",
    "MergeFileSchema",
    "TargetsFileSchema",
    "REFERENCE_CLASSES",
    "REFERENCE_SOURCES",
    "SEARCH_MODES",
    "SEARCH_TYPES",
    "ACTUAL_SOURCES",
    // repoint plan + report
    "RepointPlanSchema",
    "RepointReportSchema",
    "RepointEditSchema",
    "RepointResidualSchema",
    "RESIDUAL_REASONS",
    // correction obligations
    "CorrectionObligationSchema",
    "ReconcileReportSchema",
    "ObligationsFileSchema",
    "RECONCILE_VERDICTS",
    // figure checks
    "FigureCheckSchema",
    "FigureReportSchema",
    "ChecksFileSchema",
    "FIGURE_VERDICTS",
  ] as const;

  test("every schema resolves", () => {
    for (const name of schemaExports) {
      expect(schemas[name], `schemas barrel is missing ${name}`).toBeDefined();
    }
  });

  test("a schema parses through the barrel", () => {
    expect(schemas.ReferenceClassSchema.safeParse("wikilink").success).toBe(true);
    expect(schemas.ReferenceClassSchema.safeParse("not-a-class").success).toBe(false);
  });

  test("no export resolves to undefined", () => {
    const undefinedExports = Object.entries(schemas)
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    expect(undefinedExports).toEqual([]);
  });
});
