export interface ToonOptions {
  delimiter?: "," | "\t" | "|";
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value as object);
    if (keys.length === 1) return String((value as Record<string, unknown>)[keys[0]!]);
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function encodeKey(key: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) return key;
  return `"${key.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
}

function needsQuoting(str: string, delimiter: string): boolean {
  if (str === "") return true;
  if (str === "true" || str === "false" || str === "null") return true;
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/i.test(str)) return true;
  if (/^0\d/.test(str)) return true;
  if (str.includes(":") || str.includes('"') || str.includes("\\")) return true;
  if (str.includes("[") || str.includes("]") || str.includes("{") || str.includes("}")) return true;
  if (/[\n\r\t]/.test(str)) return true;
  if (str.includes(delimiter)) return true;
  if (str.startsWith("-")) return true;
  if (str !== str.trim()) return true;
  return false;
}

function encodeFieldValue(value: unknown, delimiter: string): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const str = String(value);
  if (needsQuoting(str, delimiter)) {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
  }
  return str;
}

function isTabularArray(arr: unknown[]): arr is Record<string, unknown>[] {
  if (arr.length === 0) return false;
  if (!arr.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) return false;
  const keys0 = new Set(Object.keys(arr[0] as object));
  if (
    !arr.every((item) => {
      const ks = new Set(Object.keys(item as object));
      return ks.size === keys0.size && [...ks].every((k) => keys0.has(k));
    })
  )
    return false;
  // All values must be primitives (no nested arrays/objects)
  return arr.every((item) =>
    Object.values(item as Record<string, unknown>).every((v) => v === null || typeof v !== "object")
  );
}

function encodeObjectFields(obj: Record<string, unknown>, depth: number, delimiter: string): string[] {
  const ind = "  ".repeat(depth);
  const rowInd = "  ".repeat(depth + 1);
  const lines: string[] = [];

  for (const [rawKey, value] of Object.entries(obj)) {
    const key = encodeKey(rawKey);

    if (value === null || typeof value !== "object") {
      lines.push(`${ind}${key}: ${encodeFieldValue(value, delimiter)}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${ind}${key}[0]:`);
      } else if (value.every((item) => item === null || typeof item !== "object")) {
        // Primitive array: inline
        const vals = value.map((v) => stringifyValue(v)).join(delimiter);
        lines.push(`${ind}${key}[${value.length}]: ${vals}`);
      } else if (isTabularArray(value)) {
        // Uniform tabular array — the core TOON efficiency win
        const keys = Object.keys(value[0]!);
        const encodedKeys = keys.map(encodeKey);
        lines.push(`${ind}${key}[${value.length}]{${encodedKeys.join(delimiter)}}:`);
        for (const item of value as Record<string, unknown>[]) {
          lines.push(`${rowInd}${keys.map((k) => stringifyValue(item[k])).join(delimiter)}`);
        }
      } else {
        // Non-uniform list
        lines.push(`${ind}${key}[${value.length}]:`);
        for (const item of value) {
          if (item === null || typeof item !== "object") {
            lines.push(`${rowInd}- ${stringifyValue(item)}`);
          } else if (Array.isArray(item)) {
            lines.push(`${rowInd}- ${JSON.stringify(item)}`);
          } else {
            const entries = Object.entries(item as Record<string, unknown>);
            if (entries.length === 0) {
              lines.push(`${rowInd}-`);
            } else {
              const [fk, fv] = entries[0]!;
              if (fv === null || typeof fv !== "object") {
                lines.push(`${rowInd}- ${encodeKey(fk)}: ${encodeFieldValue(fv, delimiter)}`);
              } else {
                lines.push(`${rowInd}- ${encodeKey(fk)}:`);
              }
              for (const [rk, rv] of entries.slice(1)) {
                lines.push(`${"  ".repeat(depth + 2)}${encodeKey(rk)}: ${encodeFieldValue(rv, delimiter)}`);
              }
            }
          }
        }
      }
    } else {
      // Nested object
      lines.push(`${ind}${key}:`);
      lines.push(...encodeObjectFields(value as Record<string, unknown>, depth + 1, delimiter));
    }
  }

  return lines;
}

export function toToon(data: unknown, opts?: ToonOptions): string {
  const delimiter = opts?.delimiter ?? ",";

  if (data === null || data === undefined || typeof data !== "object") {
    return String(data ?? "null");
  }

  if (!Array.isArray(data)) {
    // Object encoding
    const obj = data as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return "";
    return encodeObjectFields(obj, 0, delimiter).join("\n");
  }

  // Root array encoding
  if (data.length === 0) return "";

  // Collect union of all keys from object elements
  const keySet = new Set<string>();
  for (const item of data) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keySet.add(k);
      }
    }
  }

  const keys = [...keySet];
  const header =
    keys.length > 0 ? `[${data.length}]{${keys.join(delimiter)}}:` : `[${data.length}]:`;

  const rows: string[] = [header];
  for (const item of data) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      rows.push(stringifyValue(item));
    } else {
      const obj = item as Record<string, unknown>;
      rows.push(keys.map((k) => stringifyValue(obj[k])).join(delimiter));
    }
  }

  return rows.join("\n");
}
