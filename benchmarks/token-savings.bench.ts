import { format, compare, detect } from "../src/index.ts";
import userList from "../tests/fixtures/user-list.json";
import configObject from "../tests/fixtures/config-object.json";
import logEntries from "../tests/fixtures/log-entries.json";
import productCatalog from "../tests/fixtures/product-catalog.json";
import mixedArray from "../tests/fixtures/mixed-array.json";

// Generate 1000-row array for perf tests
const bigArray = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `user${i}`,
  role: i % 3 === 0 ? "admin" : "editor",
  active: i % 2 === 0,
  email: `user${i}@example.com`,
}));

async function bench(
  name: string,
  fn: () => unknown | Promise<unknown>,
  maxMs: number
) {
  const start = performance.now();
  await fn();
  const elapsed = performance.now() - start;
  const status = elapsed < maxMs ? "✓" : "✗";
  console.log(
    `${status} ${name}: ${elapsed.toFixed(2)}ms (limit: ${maxMs}ms)`
  );
  if (elapsed >= maxMs) {
    console.warn(`  [WARN] Exceeded time limit`);
  }
}

async function checkSavings() {
  const checks = [
    { label: "user-list TOON", data: userList, threshold: 30, opts: {} },
    { label: "config-object YAML", data: configObject, threshold: 15, opts: {} },
    { label: "log-entries TOON", data: logEntries, threshold: 40, opts: {} },
    {
      label: "product-catalog (flattened) TOON",
      data: productCatalog,
      threshold: 25,
      opts: { flatten: true },
    },
    { label: "mixed-array json-compact", data: mixedArray, threshold: 10, opts: {} },
  ] as const;

  console.log("\n--- Token Savings ---");
  for (const { label, data, threshold, opts } of checks) {
    const result = await format(data as unknown[], opts);
    const status = result.tokensSaved >= threshold ? "✓" : "⚠";
    console.log(
      `${status} ${label}: savings=${result.tokensSaved}% (threshold: ${threshold}%)`
    );
    if (result.tokensSaved < threshold) {
      console.warn(`  [WARN] Below threshold`);
    }
  }
}

console.log("--- Performance Benchmarks ---");
await bench("format() on 1000-row array", () => format(bigArray), 100);
await bench("compare() on 1000-row array", () => compare(bigArray), 500);
await bench("detect() on small input", () => detect(userList), 10);
await bench("detect() on 1000-row array", () => detect(bigArray), 10);

await checkSavings();
