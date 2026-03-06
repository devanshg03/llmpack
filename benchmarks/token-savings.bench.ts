import { format, compare, detect } from "../src/index.ts";
import userList from "../tests/fixtures/user-list.json";
import configObject from "../tests/fixtures/config-object.json";
import logEntries from "../tests/fixtures/log-entries.json";
import productCatalog from "../tests/fixtures/product-catalog.json";
import mixedArray from "../tests/fixtures/mixed-array.json";
import linkedinProfile from "../tests/fixtures/linkedin-profile.json";
import linkedinPosts from "../tests/fixtures/linkedin-posts.json";
import complexNested from "../tests/fixtures/complex-nested.json";
import exa from "../tests/fixtures/exa.json";
import githubRepos from "../tests/fixtures/github-repos.json";
import timeSeriesAnalytics from "../tests/fixtures/time-series-analytics.json";
import nestedDeep from "../tests/fixtures/nested-deep.json";

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
    { label: "user-list", data: userList, threshold: 30, opts: {} },
    { label: "config-object", data: configObject, threshold: 15, opts: {} },
    { label: "log-entries", data: logEntries, threshold: 40, opts: {} },
    {
      label: "product-catalog (flattened)",
      data: productCatalog,
      threshold: 25,
      opts: { flatten: true },
    },
    { label: "mixed-array", data: mixedArray, threshold: 8, opts: {} },
    { label: "linkedin-profile", data: linkedinProfile, threshold: 28, opts: {} },
    { label: "linkedin-posts", data: linkedinPosts, threshold: 10, opts: {} },
    { label: "complex-nested", data: complexNested, threshold: 0, opts: {} },
    { label: "exa", data: exa, threshold: 0, opts: {} },
    { label: "github-repos", data: githubRepos, threshold: 30, opts: {} },
    { label: "time-series-analytics", data: timeSeriesAnalytics, threshold: 45, opts: {} },
    { label: "nested-deep", data: nestedDeep, threshold: 0, opts: {} },
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

async function compareToonVsAuto() {
  const fixtures = [
    { label: "user-list", data: userList },
    { label: "config-object", data: configObject },
    { label: "log-entries", data: logEntries },
    { label: "product-catalog", data: productCatalog },
    { label: "mixed-array", data: mixedArray },
    { label: "linkedin-profile", data: linkedinProfile },
    { label: "linkedin-posts", data: linkedinPosts },
    { label: "complex-nested", data: complexNested },
    { label: "exa", data: exa },
    { label: "github-repos", data: githubRepos },
    { label: "time-series-analytics", data: timeSeriesAnalytics },
    { label: "nested-deep", data: nestedDeep },
  ];

  console.log("\n--- TOON vs Auto-Optimized ---");
  console.log(
    `${"Fixture".padEnd(26)} ${"TOON%".padStart(6)} ${"Auto%".padStart(6)} ${"Auto fmt".padStart(14)} ${"Winner".padStart(8)}`
  );
  console.log("-".repeat(66));

  for (const { label, data } of fixtures) {
    const [toonResult, autoResult] = await Promise.all([
      format(data as unknown[], { as: "toon" }).catch(() => null),
      format(data as unknown[]),
    ]);
    const toonPct = toonResult !== null ? toonResult.tokensSaved : null;
    const winner =
      toonPct === null
        ? "n/a"
        : autoResult.tokensSaved > toonPct
        ? `auto +${autoResult.tokensSaved - toonPct}%`
        : autoResult.tokensSaved === toonPct
        ? "tie"
        : `toon +${toonPct - autoResult.tokensSaved}%`;
    const toonStr = toonPct !== null ? toonPct + "%" : "n/a";
    console.log(
      `${label.padEnd(26)} ${toonStr.padStart(6)} ${String(autoResult.tokensSaved + "%").padStart(6)} ${autoResult.format.padStart(14)} ${winner.padStart(8)}`
    );
  }
}

console.log("--- Performance Benchmarks ---");
await bench("format() on 1000-row array", () => format(bigArray), 100);
await bench("compare() on 1000-row array", () => compare(bigArray), 500);
await bench("detect() on small input", () => detect(userList), 10);
await bench("detect() on 1000-row array", () => detect(bigArray), 10);
await bench("format(linkedin-profile)", () => format(linkedinProfile), 200);
await bench("format(linkedin-posts)", () => format(linkedinPosts), 500);
await bench("format(complex-nested)", () => format(complexNested), 200);
await bench("format(exa)", () => format(exa), 500);
await bench("format(github-repos)", () => format(githubRepos), 200);

await checkSavings();
await compareToonVsAuto();
