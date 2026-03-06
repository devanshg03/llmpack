# Benchmarks

All measurements on Bun 1.3.10, Apple Silicon. Token counts use the built-in estimator (`Math.ceil(length / 4)`).

## Performance

| Operation | Time | Limit |
|---|---|---|
| `format()` on 1000-row array | ~10ms | 100ms |
| `compare()` on 1000-row array | ~12ms | 500ms |
| `detect()` on small input | <1ms | 10ms |
| `detect()` on 1000-row array | ~2ms | 10ms |
| `format(linkedin-profile)` toon | ~2ms | 200ms |
| `format(linkedin-posts)` hybrid | ~2ms | 500ms |
| `format(exa)` hybrid | ~4ms | 500ms |
| `format(github-repos)` toon | <1ms | 200ms |
| `format(complex-nested)` hybrid | ~1ms | 200ms |

## Token Savings vs Raw JSON

| Fixture | Description | Format | Savings |
|---|---|---|---|
| `user-list` | 10-row uniform array of users | TOON | **53%** |
| `log-entries` | 500-row uniform log array | TOON | **48%** |
| `time-series-analytics` | Wrapper object with uniform metrics array | TOON | **51%** |
| `github-repos` | 25 GitHub repos, uniform schema | TOON | **38%** |
| `product-catalog` | Nested products, dot-flattened | TOON | **39%** |
| `linkedin-profile` | Composite professional profile | TOON | **31%** |
| `linkedin-posts` | Array of posts with nested fields | hybrid | **13%** |
| `mixed-array` | Array mixing objects + primitives | TOON | 10% |
| `config-object` | Flat key-value config | YAML | 10% |
| `exa` | Search API response (scalars + results array) | hybrid | 4% |
| `complex-nested` | Deeply nested composite object | hybrid | 4% |
| `nested-deep` | Tiny deeply nested object | hybrid | 0% |

### Notes

- **TOON** encodes objects natively (`key: value` lines, `key[N]{fields}:\n  rows` for nested uniform arrays). This is the primary driver of savings on uniform and composite data.
- **hybrid** is recommended for three cases: tabular arrays with array-valued columns (`linkedin-posts`, +9% vs TOON), composite objects with deeply nested fields (`complex-nested`, +4%), and API-style wrapper objects with few complex sections (`exa`, +4%).
- `nested-deep` shows 0% savings — the structure is tiny and content-bound.
- `config-object` falls below the 15% threshold because flat YAML is already minimal; savings are in the values, not the structure.

## TOON vs Auto-Optimized

Comparing forced TOON against the auto-selected format for each fixture.

| Fixture | TOON | Auto | Auto Format | Winner |
|---|---|---|---|---|
| `user-list` | 53% | 53% | toon | tie |
| `config-object` | 10% | 10% | yaml | tie |
| `log-entries` | 48% | 48% | toon | tie |
| `product-catalog` | 39% | 39% | toon | tie |
| `mixed-array` | 10% | 10% | toon | tie |
| `linkedin-profile` | 31% | 31% | toon | tie |
| `linkedin-posts` | 4% | 13% | hybrid | **auto +9%** |
| `complex-nested` | 0% | 4% | hybrid | **auto +4%** |
| `exa` | 0% | 4% | hybrid | **auto +4%** |
| `github-repos` | 38% | 38% | toon | tie |
| `time-series-analytics` | 51% | 51% | toon | tie |
| `nested-deep` | 0% | 0% | hybrid | tie |

### Notes

- Auto-detection matches or beats TOON on every fixture.
- `linkedin-posts`: array of objects with array-valued columns — hybrid stratifies by column type, TOON can't replicate this.
- `complex-nested`: deeply nested composite (big5 subdomains, engagement traits) — hybrid recurses into nested objects and converts uniform object-maps to TOON tables.
- `exa`: API wrapper with few complex sections (scalars + options + results) — hybrid's per-section treatment beats TOON's inline encoding.
- `linkedin-profile`: many shallow arrays — TOON's inline table format is already optimal; hybrid section header overhead would reduce savings from 31% to 17%.

## Running Benchmarks

```bash
bun run bench
```
