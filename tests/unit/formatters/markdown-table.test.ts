import { test, expect } from "bun:test";
import { toMarkdownTable } from "../../../src/formatters/markdown-table.ts";

test("empty array → empty string", () => {
  expect(toMarkdownTable([])).toBe("");
});

test("throws on non-array input", () => {
  expect(() => toMarkdownTable({ a: 1 })).toThrow();
});

test("single-item array → header + separator + one row", () => {
  const result = toMarkdownTable([{ id: 1, name: "Alice" }]);
  const lines = result.split("\n");
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain("id");
  expect(lines[0]).toContain("name");
  expect(lines[1]).toMatch(/^\|[-| ]+\|$/);
  expect(lines[2]).toContain("1");
  expect(lines[2]).toContain("Alice");
});

test("pipe in value → escaped as \\|", () => {
  const result = toMarkdownTable([{ a: "foo|bar" }]);
  expect(result).toContain("foo\\|bar");
});

test("null values → empty cell", () => {
  const result = toMarkdownTable([{ a: null, b: 1 }]);
  const lines = result.split("\n");
  expect(lines[2]).toContain("|");
});

test("missing keys → empty cell", () => {
  const data = [{ a: 1, b: 2 }, { a: 3 }];
  const result = toMarkdownTable(data);
  const lines = result.split("\n");
  expect(lines).toHaveLength(4);
});

test("column widths are padded correctly", () => {
  const data = [
    { short: "a", longer_column: "val" },
    { short: "b", longer_column: "another" },
  ];
  const result = toMarkdownTable(data);
  const lines = result.split("\n");
  // All rows should have same length (padded)
  const lengths = lines.map((l) => l.length);
  expect(new Set(lengths).size).toBe(1);
});

test("1000-row array completes in < 500ms", () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `user${i}`,
  }));
  const start = Date.now();
  toMarkdownTable(data);
  expect(Date.now() - start).toBeLessThan(500);
});
