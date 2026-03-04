export interface MarkdownTableOptions {
  // future options
}

function escapeCell(value: unknown): string {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return str.replace(/\|/g, "\\|");
}

export function toMarkdownTable(
  data: unknown,
  _opts?: MarkdownTableOptions
): string {
  if (!Array.isArray(data)) {
    throw new Error("toMarkdownTable requires an array input");
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

  // Build all cell strings first for width calculation
  const headerCells = keys.map(escapeCell);
  const dataRows = data.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return [escapeCell(item), ...new Array(keys.length - 1).fill("")];
    }
    const obj = item as Record<string, unknown>;
    return keys.map((k) => escapeCell(obj[k]));
  });

  // Compute column widths
  const widths = keys.map((_, i) => {
    const headerLen = headerCells[i]!.length;
    const maxData = Math.max(...dataRows.map((row) => (row[i] ?? "").length));
    return Math.max(headerLen, maxData, 3); // minimum 3 for separator ---
  });

  const pad = (str: string, width: number) => str.padEnd(width);

  const headerRow =
    "| " + headerCells.map((c, i) => pad(c, widths[i]!)).join(" | ") + " |";
  const separator =
    "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  const rows = dataRows.map(
    (row) =>
      "| " + row.map((c, i) => pad(c, widths[i]!)).join(" | ") + " |"
  );

  return [headerRow, separator, ...rows].join("\n");
}
