import { describe, expect, test } from "bun:test";
import { AdrAdapter } from "@acmelabs/core/adapters/adr";
import { getAdapter, listRegisteredSourceTypes } from "@acmelabs/cli/registry";

describe("SPEC-005 registry dispatcher", () => {
  test("getAdapter('adr') returns AdrAdapter instance", () => {
    const adapter = getAdapter("adr");
    expect(adapter).toBeInstanceOf(AdrAdapter);
    expect(adapter.sourceType).toBe("adr");
  });

  test("getAdapter('bogus') throws with valid registered types listed", () => {
    expect(() => getAdapter("bogus")).toThrow(/Unknown source_type "bogus"/);
    expect(() => getAdapter("bogus")).toThrow(/Valid types: .*adr/);
  });

  test("listRegisteredSourceTypes includes adr", () => {
    const types = listRegisteredSourceTypes();
    expect(types).toContain("adr");
  });

  test("registry contains all SPEC-shipped adapter source_types", () => {
    const types = listRegisteredSourceTypes();
    // SPEC-001..SPEC-004 have all shipped; per spec evolution all 5 source_types
    // are registered. If a future SPEC adds a new source_type, it lands here.
    expect(types.sort()).toEqual(["adr", "analysis", "plan", "session", "spec"]);
  });
});
