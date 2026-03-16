# llmpress

Auto-detects your data's shape and converts it to the most token-efficient format for LLM prompts. Feed it anything — arrays, objects, nested structures — and get back a compact string representation along with token savings stats.

## Install

```bash
bun add llmpress
# or: npm install llmpress
```

## Quick Start

```ts
import { format } from "llmpress";

const users = [
  { id: 1, name: "Alice", role: "admin", active: true },
  { id: 2, name: "Bob",   role: "editor", active: true },
  { id: 3, name: "Carol", role: "viewer", active: false },
];

const result = await format(users);

console.log(result.output);
// [3]{id,name,role,active}:
// 1,Alice,admin,true
// 2,Bob,editor,true
// 3,Carol,viewer,false

console.log(result.format);       // "toon"
console.log(result.tokensSaved);  // 52  (% reduction vs raw JSON)
```

## API

### `format(data, options?)`

Auto-detects shape, picks the best format, returns the result.

```ts
const result = await format(data, {
  as?: "toon" | "yaml" | "csv" | "tsv" | "markdown-table" | "json-compact" | "hybrid",
  tokenizer?: "estimate" | "tiktoken",  // default: "estimate"
  maxDepth?: number,                    // default: 2
  flatten?: boolean,                    // default: false
  report?: boolean,                     // default: false
  delimiter?: "," | "\t" | "|",
});
```

**`as`** — override auto-detection and force a specific format.

**`flatten`** — flatten nested keys with dot notation before formatting. `{ a: { b: 1 } }` becomes `{ "a.b": 1 }`. Useful for nested objects you want in TOON/CSV.

**`report`** — attach a human-readable explanation of why this format was chosen.

**`tokenizer`** — `"estimate"` uses `Math.ceil(length / 4)` (fast, ~94% accurate). `"tiktoken"` uses `cl100k_base` encoding via `@dqbd/tiktoken` (optional peer dep).

**Return value:**

```ts
{
  output: string;
  format: OutputFormat;
  inputTokens: number;
  outputTokens: number;
  tokensSaved: number;   // 0–100, clamped to 0 if output is larger
  report?: {
    inputShape: "tabular" | "nested" | "flat-object" | "primitive-array" | "scalar" | "mixed";
    depth: number;
    uniformityScore: number;
    reason: string;
  };
}
```

---

### `compare(data)`

Runs all formatters and returns token counts for each, sorted cheapest first. Use this to audit which format works best for your data.

```ts
const results = await compare(users);
// [
//   { format: "toon",           tokens: 38,  savings: 52 },
//   { format: "csv",            tokens: 46,  savings: 42 },
//   { format: "tsv",            tokens: 46,  savings: 42 },
//   { format: "yaml",           tokens: 54,  savings: 33 },
//   { format: "markdown-table", tokens: 74,  savings: 7  },
//   { format: "json-compact",   tokens: 75,  savings: 6  },
//   { format: "json",           tokens: 80,  savings: 0  },
// ]
```

---

### `detect(data)`

Inspect data shape without formatting.

```ts
import { detect } from "llmpress";

const info = detect(users);
// {
//   shape: "tabular",
//   depth: 1,
//   uniformityScore: 1.0,
//   recommendedFormat: "toon",
//   reason: "Uniform tabular array (score=1.00) — TOON is most token-efficient"
// }
```

---

### Individual formatters

All formatters are exported for direct use:

```ts
import { toToon, toYaml, toCsv, toTsv, toMarkdownTable } from "llmpress";

toToon(data, options?)
toYaml(data, options?)
toCsv(data, options?)
toTsv(data, options?)
toMarkdownTable(data, options?)
```

---

## Output Formats

### TOON (Token-Oriented Object Notation)

The most compact format for structured data. Handles both arrays and objects natively.

**Uniform array** — header encodes row count and field names once; rows are bare values:
```
[3]{id,name,role,active}:
1,Alice,admin,true
2,Bob,editor,true
3,Carol,viewer,false
```

**Object with nested table** — scalars as `key: value`, arrays as inline headers:
```
title: Q1 Metrics
metrics[3]{date,views,clicks}:
  2025-01-01,6138,174
  2025-01-02,4616,274
  2025-01-03,4460,143
```

Best for: uniform arrays, objects containing tabular data, composite profiles.

### YAML

Readable key-value format. Hand-rolled serializer — no dependencies. Strings are quoted only when necessary.

```yaml
- id: 1
  name: Alice
  role: admin
  active: true
```

Best for: flat objects, config data, sparse/non-uniform arrays.

### CSV / TSV

Standard comma or tab-separated with header row. Values containing delimiters or quotes are properly escaped.

```
id,name,role,active
1,Alice,admin,true
```

Best for: data destined for further parsing or spreadsheet-style display.

### Markdown Table

Padded table with alignment. Values containing `|` are escaped.

```
| id | name  | role   | active |
|----|-------|--------|--------|
| 1  | Alice | admin  | true   |
```

Best for: data being rendered directly in markdown (e.g. in a chat UI).

---

## Auto-Detection

`detect()` classifies data and picks the best format:

| Input shape | Condition | Format |
|---|---|---|
| Primitive / null | — | `json-compact` |
| Object | shallow flat scalars only | `yaml` |
| Object | has uniform array field(s) | `toon` |
| Object | composite: deeply nested fields (depth > 3) | `hybrid` |
| Object | composite: few complex sections (≤ 3 non-scalar fields) | `hybrid` |
| Object | composite: many complex sections | `toon` |
| Empty array | — | `toon` |
| Array of primitives | — | `csv` |
| Array of objects + primitives | — | `toon` |
| Array of objects | uniformity ≥ 0.85, no array columns | `toon` |
| Array of objects | uniformity ≥ 0.85, has array columns | `hybrid` |
| Array of objects | uniformity 0.50–0.84 | `yaml` |
| Array of objects | uniformity < 0.50 | `json-compact` |

**Uniformity score** = shared keys across all items / total unique keys. Measures how consistent the schema is across rows.

---

## Nested Data

Use `flatten: true` to dot-flatten nested objects before formatting:

```ts
const products = [
  { id: 1, name: "Widget", specs: { weight: "100g", dims: "10x5" } },
];

const result = await format(products, { flatten: true });
// Detects as tabular after flattening:
// [1]{id,name,specs.weight,specs.dims}:
// 1,Widget,100g,10x5
```

---

## Benchmarks

Measured on Bun 1.3.10, Apple Silicon. Selected highlights:

| Fixture | Format | Savings |
|---|---|---|
| User list (uniform array) | TOON | **53%** |
| Time-series analytics (object + table) | TOON | **51%** |
| Log entries (500 rows) | TOON | **48%** |
| GitHub repos (25 repos) | TOON | **38%** |
| Product catalog (flattened) | TOON | **39%** |
| LinkedIn profile (composite object) | TOON | **31%** |
| LinkedIn posts (array + nested cols) | hybrid | **13%** |
| Config object (flat key-value) | YAML | 10% |
| Search API response (exa) | hybrid | 4% |
| Deeply nested composite | hybrid | 4% |

`format()` runs in ~10ms on a 1000-row array. See [docs/BENCHMARKS.md](./docs/BENCHMARKS.md) for full results across all fixtures.

---

## Development

```bash
bun test                    # run all tests
bun test tests/unit         # unit tests only
bun test tests/integration  # integration tests only
bun test --update-snapshots # regenerate snapshots
bun run bench               # performance + savings benchmarks
bun tsc --noEmit            # type check
```

## Optional: tiktoken

For precise token counts instead of the character-length heuristic:

```bash
bun add @dqbd/tiktoken
```

```ts
const result = await format(data, { tokenizer: "tiktoken" });
```

Uses `cl100k_base` encoding (GPT-4 / Claude).
