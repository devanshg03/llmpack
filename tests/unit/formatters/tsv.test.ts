import { test, expect } from "bun:test";
import { toTsv } from "../../../src/formatters/tsv.ts";

test("empty array → empty string", () => {
  expect(toTsv([])).toBe("");
});

test("throws on non-array input", () => {
  expect(() => toTsv({ a: 1 })).toThrow();
});

test("single-item array → header + one data row", () => {
  const result = toTsv([{ id: 1, name: "Alice" }]);
  const lines = result.split("\n");
  expect(lines[0]).toBe("id\tname");
  expect(lines[1]).toBe("1\tAlice");
});

test("uniform array → correct TSV", () => {
  const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const result = toTsv(data);
  const lines = result.split("\n");
  expect(lines[0]).toBe("id\tname");
  expect(lines[1]).toBe("1\tAlice");
  expect(lines[2]).toBe("2\tBob");
});

test("tab in value → escaped as \\t", () => {
  const result = toTsv([{ a: "col1\tcol2" }]);
  expect(result).toContain("col1\\tcol2");
});

test("null values → empty cell", () => {
  const result = toTsv([{ a: null, b: 1 }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe("\t1");
});

test("missing keys → empty cell", () => {
  const data = [{ a: 1, b: 2 }, { a: 3 }];
  const result = toTsv(data);
  const lines = result.split("\n");
  expect(lines[2]).toBe("3\t");
});

test("boolean and numeric values", () => {
  const result = toTsv([{ n: 3.14, b: true }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe("3.14\ttrue");
});

test("1000-row array completes in < 500ms", () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `user${i}`,
  }));
  const start = Date.now();
  toTsv(data);
  expect(Date.now() - start).toBeLessThan(500);
});
