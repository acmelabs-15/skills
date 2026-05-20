import { describe, expect, test } from "bun:test";
import { AdrAdapter } from "../src/adapters/adr.js";
import { AnalysisAdapter } from "../src/adapters/analysis.js";
import { SessionAdapter } from "../src/adapters/session.js";
import { getAdapter, listAdapters } from "../src/core/dispatcher.js";

describe("dispatcher registry", () => {
  test("getAdapter('adr') returns an AdrAdapter instance", () => {
    const adapter = getAdapter("adr");
    expect(adapter).toBeInstanceOf(AdrAdapter);
    expect(adapter.sourceType).toBe("adr");
  });

  test("getAdapter('analysis') returns an AnalysisAdapter instance", () => {
    const adapter = getAdapter("analysis");
    expect(adapter).toBeInstanceOf(AnalysisAdapter);
    expect(adapter.sourceType).toBe("analysis");
  });

  test("getAdapter('session') returns a SessionAdapter instance", () => {
    const adapter = getAdapter("session");
    expect(adapter).toBeInstanceOf(SessionAdapter);
    expect(adapter.sourceType).toBe("session");
  });

  test("getAdapter('unknown') throws a descriptive error", () => {
    expect(() => getAdapter("unknown")).toThrow(/No adapter registered for source_type: unknown/);
  });

  test("listAdapters returns all registered source_type discriminants", () => {
    const keys = listAdapters();
    expect(keys).toEqual(["adr", "analysis", "session"]);
  });
});
