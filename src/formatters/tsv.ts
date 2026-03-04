export interface TsvOptions {
  delimiter?: "\t";
}

function escapeTsvCell(value: unknown): string {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  // Replace tabs and newlines
  return str.replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

export function toTsv(data: unknown, _opts?: TsvOptions): string {
  if (!Array.isArray(data)) {
    throw new Error("toTsv requires an array input");
  }

  if (data.length === 0) return "";

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
  rows.push(keys.map(escapeTsvCell).join("\t"));

  // Data rows
  for (const item of data) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      rows.push(escapeTsvCell(item));
    } else {
      const obj = item as Record<string, unknown>;
      rows.push(keys.map((k) => escapeTsvCell(obj[k])).join("\t"));
    }
  }

  return rows.join("\n");
}
