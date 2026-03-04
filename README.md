# llmpack

Auto-detects your data's shape and converts it to the most token-efficient format for LLM prompts. Feed it anything — arrays, objects, nested structures — and get back a compact string representation along with token savings stats.

## Install

```bash
bun add llmpack
# or: npm install llmpack
```

## Quick Start

```ts
import { format } from "llmpack";

const users = [
  { id: 1, name: "Alice", role: "admin", active: true },
  { id: 2, name: "Bob",   role: "editor", active: true },
  { id: 3, name: "Carol", role: "viewer", active: false },
];

const result = await format(users);

console.log(result.output);
// [3,]{id,name,role,active}:
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
  as?: "toon" | "yaml" | "csv" | "tsv" | "markdown-table" | "json-compact",
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
import { detect } from "llmpack";

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
import { toToon, toYaml, toCsv, toTsv, toMarkdownTable } from "llmpack";

toToon(data, options?)
toYaml(data, options?)
toCsv(data, options?)
toTsv(data, options?)
toMarkdownTable(data, options?)
```

---

## Output Formats

### TOON (Token-Optimized Object Notation)

The most compact format for uniform arrays of objects. Header encodes row count and column names; rows are bare comma-separated values.

```
[3,]{id,name,role,active}:
1,Alice,admin,true
2,Bob,editor,true
3,Carol,viewer,false
```

Best for: large uniform datasets (log entries, user lists, query results).

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
| Object | depth ≤ `maxDepth` | `yaml` |
| Object | depth > `maxDepth` | `yaml` |
| Empty array | — | `toon` |
| Array of primitives | — | `csv` |
| Array of objects + primitives | — | `json-compact` |
| Array of objects | uniformity ≥ 0.85 | `toon` |
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
// [1,]{id,name,specs.weight,specs.dims}:
// 1,Widget,100g,10x5
```

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
