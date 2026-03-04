export interface ToonOptions {
  delimiter?: "," | "\t" | "|";
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toToon(data: unknown, opts?: ToonOptions): string {
  if (!Array.isArray(data)) {
    throw new Error("toToon requires an array input");
  }

  if (data.length === 0) return "";

  const delimiter = opts?.delimiter ?? ",";

  // Collect all keys (union) from all objects
  const keySet = new Set<string>();
  for (const item of data) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keySet.add(k);
      }
    }
  }

  const keys = [...keySet];
  const header = `[${data.length},]{${keys.join(",")}}:`;

  const rows: string[] = [header];
  for (const item of data) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      rows.push(stringifyValue(item));
    } else {
      const obj = item as Record<string, unknown>;
      const cells = keys.map((k) => stringifyValue(obj[k]));
      rows.push(cells.join(delimiter));
    }
  }

  return rows.join("\n");
}
