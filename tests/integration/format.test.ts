import { test, expect } from "bun:test";
import { format } from "../../src/index.ts";
import userList from "../fixtures/user-list.json";
import configObject from "../fixtures/config-object.json";
import productCatalog from "../fixtures/product-catalog.json";

test("auto-selects TOON for user-list fixture", async () => {
  const result = await format(userList);
  expect(result.format).toBe("toon");
});

test("auto-selects YAML for config-object fixture", async () => {
  const result = await format(configObject);
  expect(result.format).toBe("yaml");
});

test("as: 'csv' on tabular data → CSV regardless of detection", async () => {
  const result = await format(userList, { as: "csv" });
  expect(result.format).toBe("csv");
  expect(result.output).toContain("id,name,role,active");
});

test("flatten: true on product-catalog → TOON", async () => {
  const result = await format(productCatalog, { flatten: true });
  expect(result.format).toBe("toon");
});

test("report: true → result.report exists with non-empty reason", async () => {
  const result = await format(userList, { report: true });
  expect(result.report).toBeDefined();
  expect(result.report!.reason.length).toBeGreaterThan(0);
  expect(result.report!.inputShape).toBeDefined();
});

test("inputTokens > 0", async () => {
  const result = await format(userList);
  expect(result.inputTokens).toBeGreaterThan(0);
});

test("outputTokens > 0", async () => {
  const result = await format(userList);
  expect(result.outputTokens).toBeGreaterThan(0);
});

test("outputTokens < inputTokens for user-list (TOON is efficient)", async () => {
  const result = await format(userList);
  expect(result.outputTokens).toBeLessThan(result.inputTokens);
});

test("deterministic: 3 calls on same input → identical output", async () => {
  const [r1, r2, r3] = await Promise.all([
    format(userList),
    format(userList),
    format(userList),
  ]);
  expect(r1.output).toBe(r2.output);
  expect(r2.output).toBe(r3.output);
});

test("tokensSaved is non-negative", async () => {
  const result = await format(userList);
  expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
});
