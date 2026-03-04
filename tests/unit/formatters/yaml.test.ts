import { test, expect } from "bun:test";
import { toYaml } from "../../../src/formatters/yaml.ts";

test("empty array → empty string", () => {
  expect(toYaml([])).toBe("");
});

test("empty object → '{}'", () => {
  expect(toYaml({})).toBe("{}");
});

test("single-item array", () => {
  const result = toYaml([{ id: 1, name: "Alice" }]);
  expect(result).toContain("- id: 1");
  expect(result).toContain("name: Alice");
});

test("flat object → key: value lines", () => {
  const result = toYaml({ port: 3000, host: "localhost" });
  expect(result).toContain("port: 3000");
  expect(result).toContain("host: localhost");
});

test("string values needing quotes", () => {
  const result = toYaml({ a: "hello: world", b: "123", c: "true" });
  expect(result).toContain('"hello: world"');
  expect(result).toContain('"123"');
  expect(result).toContain('"true"');
});

test("null values → null", () => {
  const result = toYaml({ a: null });
  expect(result).toContain("a: null");
});

test("boolean values → true/false", () => {
  const result = toYaml({ active: true, deleted: false });
  expect(result).toContain("active: true");
  expect(result).toContain("deleted: false");
});

test("numeric values", () => {
  const result = toYaml({ count: 0, price: -1.5, big: 1000 });
  expect(result).toContain("count: 0");
  expect(result).toContain("price: -1.5");
  expect(result).toContain("big: 1000");
});

test("primitive array values → flow style", () => {
  const result = toYaml({ tags: [1, 2, 3] });
  expect(result).toContain("[1, 2, 3]");
});

test("1000-row array completes in < 500ms", () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `item${i}`,
  }));
  const start = Date.now();
  toYaml(data);
  expect(Date.now() - start).toBeLessThan(500);
});
