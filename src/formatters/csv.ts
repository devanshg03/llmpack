export interface CsvOptions {
  delimiter?: "," | "\t" | "|";
}

function escapeCell(value: unknown, delimiter: string): string {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(data: unknown, opts?: CsvOptions): string {
  if (!Array.isArray(data)) {
    throw new Error("toCsv requires an array input");
  }

  if (data.length === 0) return "";

  const delimiter = opts?.delimiter ?? ",";

  // Collect all unique keys
  const keySet = new Set<string>();
  for (const item of data) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keySet.add(k);
      }
    }
  }

  const keys = [...keySet];
  const rows: string[] = [];

  // Header
  rows.push(keys.map((k) => escapeCell(k, delimiter)).join(delimiter));

  // Data rows
  for (const item of data) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      // Primitive in array — single cell
      rows.push(escapeCell(item, delimiter));
    } else {
      const obj = item as Record<string, unknown>;
      rows.push(keys.map((k) => escapeCell(obj[k], delimiter)).join(delimiter));
    }
  }

  return rows.join("\n");
}
