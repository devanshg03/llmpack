import { test, expect } from "bun:test";
import { flattenObject } from "../../src/flatten.ts";

test("flat object stays flat", () => {
  const result = flattenObject({ a: 1, b: 2 });
  expect(result).toEqual({ a: 1, b: 2 });
});

test("nested object is flattened with dot notation", () => {
  const result = flattenObject({ a: { b: 1, c: 2 } });
  expect(result).toEqual({ "a.b": 1, "a.c": 2 });
});

test("deeply nested object", () => {
  const result = flattenObject({ a: { b: { c: 42 } } });
  expect(result).toEqual({ "a.b.c": 42 });
});

test("arrays are left as-is (not indexed)", () => {
  const arr = [1, 2, 3];
  const result = flattenObject({ items: arr });
  expect(result).toEqual({ items: arr });
});

test("null values are kept as null", () => {
  const result = flattenObject({ a: null, b: { c: null } });
  expect(result).toEqual({ a: null, "b.c": null });
});

test("empty object returns empty object", () => {
  const result = flattenObject({});
  expect(result).toEqual({});
});

test("mixed nested and flat keys", () => {
  const result = flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } });
  expect(result).toEqual({ a: 1, "b.c": 2, "b.d.e": 3 });
});
