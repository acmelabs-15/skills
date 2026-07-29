import { afterEach, describe, expect, test } from "bun:test";
import { invokedName } from "@acmelabs/cli/invoked-name";

const originalArgv1 = process.argv[1];

afterEach(() => {
  process.argv[1] = originalArgv1 as string;
});

describe("invokedName", () => {
  test("returns the basename of the invoked script", () => {
    process.argv[1] = "/opt/plugin/dist/cli/decompose.js";
    expect(invokedName("decompose.ts")).toBe("decompose.js");
  });

  test("reports the source name when run from source", () => {
    process.argv[1] = "/repo/packages/cli/src/decompose.ts";
    expect(invokedName("decompose.ts")).toBe("decompose.ts");
  });

  test("falls back when argv[1] is absent", () => {
    // @ts-expect-error deliberately clearing argv[1] to exercise the guard
    process.argv[1] = undefined;
    expect(invokedName("decompose.ts")).toBe("decompose.ts");
  });

  test("falls back when argv[1] has a trailing separator", () => {
    process.argv[1] = "/repo/packages/cli/src/";
    expect(invokedName("decompose.ts")).toBe("decompose.ts");
  });
});
