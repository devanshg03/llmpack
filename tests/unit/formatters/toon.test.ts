import { test, expect } from "bun:test";
import { toToon } from "../../../src/formatters/toon.ts";

test("empty array → empty string", () => {
  expect(toToon([])).toBe("");
});

test("throws on non-array input", () => {
  expect(() => toToon({ a: 1 })).toThrow();
  expect(() => toToon("hello")).toThrow();
});

test("single-item array → correct header + one row", () => {
  const result = toToon([{ id: 1, name: "Alice" }]);
  const lines = result.split("\n");
  expect(lines[0]).toBe("[1,]{id,name}:");
  expect(lines[1]).toBe("1,Alice");
});

test("uniform array → correct tabular output", () => {
  const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const result = toToon(data);
  const lines = result.split("\n");
  expect(lines[0]).toBe("[2,]{id,name}:");
  expect(lines[1]).toBe("1,Alice");
  expect(lines[2]).toBe("2,Bob");
});

test("non-uniform array — missing keys → empty cells", () => {
  const data = [{ a: 1, b: 2 }, { a: 3, c: 4 }];
  const result = toToon(data);
  const lines = result.split("\n");
  // header should have union of keys
  expect(lines[0]).toContain("a");
  expect(lines[0]).toContain("b");
  expect(lines[0]).toContain("c");
  // second row missing b → empty
  const row2 = lines[2]!.split(",");
  // a=3, b=empty, c=4
  expect(row2[0]).toBe("3");
  expect(row2[2]).toBe("4");
});

test("null values → empty string", () => {
  const result = toToon([{ a: null, b: 1 }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe(",1");
});

test("nested object values → JSON.stringify", () => {
  const data = [{ id: 1, meta: { x: 1 } }];
  const result = toToon(data);
  const lines = result.split("\n");
  expect(lines[1]).toContain(JSON.stringify({ x: 1 }));
});

test("boolean values", () => {
  const result = toToon([{ active: true, deleted: false }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe("true,false");
});

test("numeric values (int, float, negative, zero)", () => {
  const result = toToon([{ a: 0, b: -1, c: 3.14, d: 1000 }]);
  const lines = result.split("\n");
  expect(lines[1]).toBe("0,-1,3.14,1000");
});

test("custom delimiter", () => {
  const result = toToon([{ a: 1, b: 2 }], { delimiter: "|" });
  const lines = result.split("\n");
  expect(lines[1]).toBe("1|2");
});

test("1000-row array completes in < 500ms", () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `user${i}`,
    role: "editor",
    active: true,
  }));
  const start = Date.now();
  toToon(data);
  expect(Date.now() - start).toBeLessThan(500);
});
