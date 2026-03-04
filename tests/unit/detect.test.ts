import { test, expect } from "bun:test";
import { detect, getDepth, getUniformityScore } from "../../src/detect.ts";

// getDepth tests
test("getDepth: primitive → 0", () => {
  expect(getDepth(42)).toBe(0);
  expect(getDepth("hello")).toBe(0);
  expect(getDepth(null)).toBe(0);
});

test("getDepth: flat object → 1", () => {
  expect(getDepth({ a: 1, b: 2 })).toBe(1);
});

test("getDepth: nested object → correct depth", () => {
  expect(getDepth({ a: { b: 1 } })).toBe(2);
  expect(getDepth({ a: { b: { c: 1 } } })).toBe(3);
});

test("getDepth: array of primitives", () => {
  expect(getDepth([1, 2, 3])).toBe(0);
});

test("getDepth: array of objects", () => {
  expect(getDepth([{ a: 1 }])).toBe(1);
});

// getUniformityScore tests
test("getUniformityScore: empty array → 1.0", () => {
  expect(getUniformityScore([])).toBe(1.0);
});

test("getUniformityScore: single item → 1.0", () => {
  expect(getUniformityScore([{ a: 1 }])).toBe(1.0);
});

test("getUniformityScore: identical keys → 1.0", () => {
  expect(getUniformityScore([{ a: 1, b: 2 }, { a: 3, b: 4 }])).toBe(1.0);
});

test("getUniformityScore: no overlap → 0.0", () => {
  expect(getUniformityScore([{ a: 1 }, { b: 2 }])).toBe(0.0);
});

test("getUniformityScore: partial overlap", () => {
  // intersection = {a}, union = {a, b, c} → 1/3
  const score = getUniformityScore([{ a: 1, b: 2 }, { a: 3, c: 4 }]);
  expect(score).toBeCloseTo(1 / 3, 5);
});

// detect tests
test("detect: null → scalar → json-compact", () => {
  const r = detect(null);
  expect(r.shape).toBe("scalar");
  expect(r.recommendedFormat).toBe("json-compact");
});

test("detect: number → scalar → json-compact", () => {
  const r = detect(42);
  expect(r.shape).toBe("scalar");
  expect(r.recommendedFormat).toBe("json-compact");
});

test("detect: empty object → flat-object → yaml", () => {
  const r = detect({});
  expect(r.shape).toBe("flat-object");
  expect(r.recommendedFormat).toBe("yaml");
});

test("detect: empty array → tabular → toon", () => {
  const r = detect([]);
  expect(r.shape).toBe("tabular");
  expect(r.recommendedFormat).toBe("toon");
});

test("detect: array of primitives → primitive-array → csv", () => {
  const r = detect([1, 2, 3]);
  expect(r.shape).toBe("primitive-array");
  expect(r.recommendedFormat).toBe("csv");
});

test("detect: mixed array (objects + primitives) → mixed → json-compact", () => {
  const r = detect([{ id: 1 }, "foo", 42]);
  expect(r.shape).toBe("mixed");
  expect(r.recommendedFormat).toBe("json-compact");
});

test("detect: uniform array (score ≥ 0.85) → tabular → toon", () => {
  const data = [
    { a: 1, b: 2, c: 3 },
    { a: 4, b: 5, c: 6 },
    { a: 7, b: 8, c: 9 },
  ];
  const r = detect(data);
  expect(r.shape).toBe("tabular");
  expect(r.recommendedFormat).toBe("toon");
  expect(r.uniformityScore).toBe(1.0);
});

test("detect: semi-uniform array (score 0.50–0.84) → mixed → yaml", () => {
  // Make arrays with ~0.6 uniformity: 3 shared keys out of 5 total
  const data = [
    { a: 1, b: 2, c: 3 },
    { a: 4, b: 5, d: 6 },
    { a: 7, c: 8, e: 9 },
  ];
  // intersection = {a}, union = {a,b,c,d,e} → 1/5 = 0.2 → json-compact
  // Let's use a different example: 3/4
  const data2 = [
    { a: 1, b: 2, c: 3, d: 4 },
    { a: 5, b: 6, c: 7, e: 8 },
  ];
  // intersection = {a,b,c}, union = {a,b,c,d,e} → 3/5 = 0.6
  const r = detect(data2);
  expect(r.shape).toBe("mixed");
  expect(r.recommendedFormat).toBe("yaml");
  expect(r.uniformityScore).toBeGreaterThanOrEqual(0.5);
  expect(r.uniformityScore).toBeLessThan(0.85);
});

test("detect: flat object depth ≤ 2 → flat-object → yaml", () => {
  const r = detect({ a: 1, b: 2 });
  expect(r.shape).toBe("flat-object");
  expect(r.recommendedFormat).toBe("yaml");
});

test("detect: nested object depth > 2 → nested → yaml", () => {
  const r = detect({ a: { b: { c: { d: 1 } } } });
  expect(r.shape).toBe("nested");
  expect(r.recommendedFormat).toBe("yaml");
  expect(r.depth).toBeGreaterThan(2);
});
