import { test, expect } from "bun:test";
import { toToon } from "../../src/formatters/toon.ts";
import { toYaml } from "../../src/formatters/yaml.ts";
import { toCsv } from "../../src/formatters/csv.ts";
import { toTsv } from "../../src/formatters/tsv.ts";
import { toMarkdownTable } from "../../src/formatters/markdown-table.ts";
import { toHybrid } from "../../src/formatters/hybrid.ts";
import { format } from "../../src/index.ts";
import userList from "../fixtures/user-list.json";
import configObject from "../fixtures/config-object.json";
import productCatalog from "../fixtures/product-catalog.json";
import mixedArray from "../fixtures/mixed-array.json";
import linkedinProfile from "../fixtures/linkedin-profile.json";
import linkedinPosts from "../fixtures/linkedin-posts.json";
import complexNested from "../fixtures/complex-nested.json";

// user-list snapshots
test("user-list to toon snapshot", () => {
  expect(toToon(userList)).toMatchSnapshot();
});

test("user-list to yaml snapshot", () => {
  expect(toYaml(userList)).toMatchSnapshot();
});

test("user-list to csv snapshot", () => {
  expect(toCsv(userList)).toMatchSnapshot();
});

test("user-list to tsv snapshot", () => {
  expect(toTsv(userList)).toMatchSnapshot();
});

test("user-list to markdown-table snapshot", () => {
  expect(toMarkdownTable(userList)).toMatchSnapshot();
});

// config-object snapshots
test("config-object to yaml snapshot", () => {
  expect(toYaml(configObject)).toMatchSnapshot();
});

// product-catalog snapshots
test("product-catalog to toon snapshot", () => {
  expect(toToon(productCatalog)).toMatchSnapshot();
});

test("product-catalog to yaml snapshot", () => {
  expect(toYaml(productCatalog)).toMatchSnapshot();
});

test("product-catalog to csv snapshot", () => {
  expect(toCsv(productCatalog)).toMatchSnapshot();
});

// mixed-array snapshot
test("mixed-array to toon snapshot (via format)", async () => {
  const result = await format(mixedArray);
  expect(result.output).toMatchSnapshot();
});

// format() result snapshots
test("format(user-list) result snapshot", async () => {
  const result = await format(userList);
  expect(result).toMatchSnapshot();
});

test("format(config-object) result snapshot", async () => {
  const result = await format(configObject);
  expect(result).toMatchSnapshot();
});

// new fixture snapshots
test("linkedin-profile toon format snapshot", async () => {
  const result = await format(linkedinProfile);
  expect(result.format).toBe("toon");
  expect(result.output).toMatchSnapshot();
});

test("linkedin-posts hybrid format snapshot", async () => {
  const result = await format(linkedinPosts);
  expect(result.output).toMatchSnapshot();
});

test("complex-nested hybrid format snapshot", async () => {
  const result = await format(complexNested);
  expect(result.format).toBe("hybrid");
  expect(result.output).toMatchSnapshot();
});

test("toHybrid direct call snapshot (linkedin-profile)", () => {
  expect(toHybrid(linkedinProfile)).toMatchSnapshot();
});

test("toHybrid direct call snapshot (complex-nested)", () => {
  expect(toHybrid(complexNested)).toMatchSnapshot();
});
