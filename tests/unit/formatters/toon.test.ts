import { test, expect } from "bun:test";
import { toToon } from "../../../src/formatters/toon.ts";

test("empty array → empty string", () => {
  expect(toToon([])).toBe("");
});

test("empty object → empty string", () => {
  expect(toToon({})).toBe("");
});

test("single-item array → correct header + one row", () => {
  const result = toToon([{ id: 1, name: "Alice" }]);
  const lines = result.split("\n");
  expect(lines[0]).toBe("[1]{id,name}:");
  expect(lines[1]).toBe("1,Alice");
});

test("uniform array → correct tabular output", () => {
  const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const result = toToon(data);
  const lines = result.split("\n");
  expect(lines[0]).toBe("[2]{id,name}:");
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

test("nested single-key object values → inline scalar", () => {
  const data = [{ id: 1, meta: { x: 1 } }];
  const result = toToon(data);
  const lines = result.split("\n");
  // single-key object {x:1} inlines to just "1"
  expect(lines[1]).toBe("1,1");
});

test("nested multi-key object values → JSON.stringify", () => {
  const data = [{ id: 1, meta: { x: 1, y: 2 } }];
  const result = toToon(data);
  const lines = result.split("\n");
  expect(lines[1]).toContain(JSON.stringify({ x: 1, y: 2 }));
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

test("flat object → key: value lines", () => {
  const result = toToon({ name: "Alice", age: 30, active: true });
  expect(result).toBe("name: Alice\nage: 30\nactive: true");
});

test("object with uniform tabular array field → TOON nested table", () => {
  const result = toToon({
    metrics: [
      { date: "2025-01-01", views: 100 },
      { date: "2025-01-02", views: 200 },
    ],
  });
  const lines = result.split("\n");
  expect(lines[0]).toBe("metrics[2]{date,views}:");
  expect(lines[1]).toBe("  2025-01-01,100");
  expect(lines[2]).toBe("  2025-01-02,200");
});

test("object with scalar and array fields", () => {
  const result = toToon({ title: "Report", items: [1, 2, 3] });
  const lines = result.split("\n");
  expect(lines[0]).toBe("title: Report");
  expect(lines[1]).toBe("items[3]: 1,2,3");
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
