// Scaffold sentinel — Bun's test runner exits 1 on "no tests found", so this
// trivial test proves the runner is wired up. Remove once TASK-002+ add real tests.
import { expect, test } from "bun:test";

test("scaffold is wired up", () => {
  expect(true).toBe(true);
});
