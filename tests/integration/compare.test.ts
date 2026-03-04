import { test, expect } from "bun:test";
import { compare } from "../../src/index.ts";
import userList from "../fixtures/user-list.json";

test("returns array with all format entries", async () => {
  const results = await compare(userList);
  // 6 formatters + json baseline = 7
  expect(results.length).toBe(7);
});

test("sorted ascending by tokens", async () => {
  const results = await compare(userList);
  for (let i = 1; i < results.length; i++) {
    expect(results[i]!.tokens).toBeGreaterThanOrEqual(results[i - 1]!.tokens);
  }
});

test("JSON baseline present with savings = 0", async () => {
  const results = await compare(userList);
  const json = results.find((r) => r.format === "json");
  expect(json).toBeDefined();
  expect(json!.savings).toBe(0);
});

test("all outputs are non-empty strings", async () => {
  const results = await compare(userList);
  for (const r of results) {
    expect(typeof r.output).toBe("string");
    expect(r.output.length).toBeGreaterThan(0);
  }
});

test("TOON savings > 30% on user-list fixture", async () => {
  const results = await compare(userList);
  const toon = results.find((r) => r.format === "toon");
  expect(toon).toBeDefined();
  expect(toon!.savings).toBeGreaterThan(30);
});

test("all savings are non-negative", async () => {
  const results = await compare(userList);
  for (const r of results) {
    expect(r.savings).toBeGreaterThanOrEqual(0);
  }
});
