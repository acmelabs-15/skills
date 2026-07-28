import { expect, test } from "bun:test";
import { sha256 } from "@acmelabs/core/core/hash";

test("sha256 of empty string matches known value", () => {
  expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("sha256 of 'hello' matches known value", () => {
  expect(sha256("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
});

test("sha256 is deterministic", () => {
  const input = "test input string";
  expect(sha256(input)).toBe(sha256(input));
});

test("sha256 produces different output for different inputs", () => {
  expect(sha256("foo")).not.toBe(sha256("bar"));
});

test("sha256 returns lowercase hex string of length 64", () => {
  const result = sha256("any content");
  expect(result).toMatch(/^[0-9a-f]{64}$/);
});
