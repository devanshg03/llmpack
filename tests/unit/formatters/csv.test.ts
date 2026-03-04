import { test, expect } from "bun:test";
import { toCsv } from "../../../src/formatters/csv.ts";

test("empty array → empty string", () => {
  expect(toCsv([])).toBe("");
});

test("throws on non-array input", () => {
  expect(() => toCsv({ a: 1 })).toThrow();
});

test("single-item array → header + one data row", () => {
  const result = toCsv([{ id: 1, name: "Alice" }]);
  const lines = result.split("\n");
  expect(lines[0]).toBe("id,name");
  expect(lines[1]).toBe("1,Alice");
});

test("uniform array → correct CSV", () => {
  const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const result = toCsv(data);
  const lines = result.split("\n");
  expect(lines[0]).toBe("id,name");
  expect(lines[1]).toBe("1,Alice");
  expect(lines[2]).toBe("2,Bob");
});

test("value with comma → wrapped in quotes", () => {
  const result = toCsv([{ a: "hello, world" }]);
  expect(result).toContain('"hello, world"');
});

test("value with double quotes → doubled", () => {
  const result = toCsv([{ a: 'say "hi"' }]);
  expect(result).toContain('"say ""hi"""');
});

test("value with newline → wrapped in quotes", () => {
  const result = toCsv([{ a: "line1\nline2" }]);
  expect(result).toContain('"line1\nline2"');
});

test("null values → empty cell", () => {
  const result = toCsv([{ a: null, b: 1 }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe(",1");
});

test("missing keys → empty cell", () => {
  const data = [{ a: 1, b: 2 }, { a: 3 }];
  const result = toCsv(data);
  const lines = result.split("\n");
  expect(lines[2]).toBe("3,");
});

test("numeric and boolean values", () => {
  const result = toCsv([{ n: 3.14, b: true, z: 0 }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe("3.14,true,0");
});

test("object values → JSON.stringify then CSV-escaped", () => {
  const result = toCsv([{ meta: { x: 1 } }]);
  // {"x":1} contains quotes, so CSV wraps in "" and doubles internal quotes
  expect(result).toContain('"{""x"":1}"');
});

test("1000-row array completes in < 500ms", () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `user${i}`,
  }));
  const start = Date.now();
  toCsv(data);
  expect(Date.now() - start).toBeLessThan(500);
});
