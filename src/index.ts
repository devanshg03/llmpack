import { estimateTokens, countTokens } from "./tokenizer.ts";
import { flattenObject } from "./flatten.ts";
import {
  detect as detectShape,
  type DetectionResult,
  type InputShape,
  type OutputFormat,
} from "./detect.ts";
import { toToon } from "./formatters/toon.ts";
import { toYaml } from "./formatters/yaml.ts";
import { toCsv } from "./formatters/csv.ts";
import { toTsv } from "./formatters/tsv.ts";
import { toMarkdownTable } from "./formatters/markdown-table.ts";

export type { InputShape, OutputFormat, DetectionResult };

export interface FormatOptions {
  as?: OutputFormat;
  tokenizer?: "estimate" | "tiktoken";
  maxDepth?: number;
  flatten?: boolean;
  report?: boolean;
  delimiter?: "," | "\t" | "|";
}

export interface FormatReport {
  inputShape: InputShape;
  depth: number;
  uniformityScore: number;
  reason: string;
}

export interface FormatResult {
  output: string;
  format: OutputFormat;
  inputTokens: number;
  outputTokens: number;
  tokensSaved: number;
  report?: FormatReport;
}

export interface ComparisonResult {
  format: OutputFormat | "json";
  output: string;
  tokens: number;
  savings: number;
}

function applyFormatter(
  data: unknown,
  format: OutputFormat,
  delimiter?: "," | "\t" | "|"
): string {
  switch (format) {
    case "toon":
      return toToon(data, { delimiter });
    case "yaml":
      return toYaml(data);
    case "csv":
      return toCsv(data, { delimiter });
    case "tsv":
      return toTsv(data);
    case "markdown-table":
      return toMarkdownTable(data);
    case "json-compact":
      return JSON.stringify(data);
  }
}

export async function format(
  data: unknown,
  opts?: FormatOptions
): Promise<FormatResult> {
  const tokenizerMode = opts?.tokenizer ?? "estimate";
  const maxDepth = opts?.maxDepth ?? 2;
  const jsonStr = JSON.stringify(data);
  const inputTokens = await countTokens(jsonStr, tokenizerMode);

  // Optionally flatten
  let processedData = data;
  if (
    opts?.flatten &&
    processedData !== null &&
    typeof processedData === "object" &&
    !Array.isArray(processedData)
  ) {
    processedData = flattenObject(processedData as Record<string, unknown>);
  }

  const detection = detectShape(processedData, maxDepth);
  const chosenFormat = opts?.as ?? detection.recommendedFormat;

  const output = applyFormatter(processedData, chosenFormat, opts?.delimiter);
  const outputTokens = await countTokens(output, tokenizerMode);
  const rawSavings = Math.round((1 - outputTokens / inputTokens) * 100);
  const tokensSaved = Math.max(0, rawSavings);

  const result: FormatResult = {
    output,
    format: chosenFormat,
    inputTokens,
    outputTokens,
    tokensSaved,
  };

  if (opts?.report) {
    result.report = {
      inputShape: detection.shape,
      depth: detection.depth,
      uniformityScore: detection.uniformityScore,
      reason: detection.reason,
    };
  }

  return result;
}

export function detect(data: unknown, maxDepth = 2): DetectionResult {
  return detectShape(data, maxDepth);
}

export async function compare(data: unknown): Promise<ComparisonResult[]> {
  const jsonStr = JSON.stringify(data);
  const baselineTokens = estimateTokens(jsonStr);

  const formats: OutputFormat[] = [
    "toon",
    "yaml",
    "csv",
    "tsv",
    "markdown-table",
    "json-compact",
  ];

  const results: ComparisonResult[] = [];

  // JSON baseline
  results.push({
    format: "json",
    output: jsonStr,
    tokens: baselineTokens,
    savings: 0,
  });

  for (const fmt of formats) {
    try {
      const output = applyFormatter(data, fmt);
      const tokens = estimateTokens(output);
      const savings = Math.max(
        0,
        Math.round((1 - tokens / baselineTokens) * 100)
      );
      results.push({ format: fmt, output, tokens, savings });
    } catch {
      // Skip formatters that don't support this shape
    }
  }

  return results.sort((a, b) => a.tokens - b.tokens);
}

export { toToon, toYaml, toCsv, toTsv, toMarkdownTable };
export { estimateTokens, countTokens } from "./tokenizer.ts";
export { flattenObject } from "./flatten.ts";
export { getDepth, getUniformityScore } from "./detect.ts";
