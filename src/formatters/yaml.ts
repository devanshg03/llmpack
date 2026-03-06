export interface YamlOptions {
  maxDepth?: number;
  omitNull?: boolean;
}

function needsQuotes(value: string): boolean {
  if (value === "") return true;
  // Numeric-looking
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  // Boolean-looking
  if (/^(true|false|null|yes|no|on|off)$/i.test(value)) return true;
  // Contains special chars
  if (/[:#{}\[\]'",|>&*!%@`]/.test(value)) return true;
  // Leading/trailing spaces
  if (value !== value.trim()) return true;
  return false;
}

function yamlStringValue(value: string): string {
  if (needsQuotes(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function serializeValue(value: unknown, indent: number, omitNull = false): string {
  const pad = " ".repeat(indent);

  if (value === null) return "null";
  if (value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return yamlStringValue(value);

  if (Array.isArray(value)) {
    // Check if all primitives → flow style
    const allPrimitive = value.every(
      (v) => v === null || typeof v !== "object"
    );
    if (allPrimitive) {
      const items = value.map((v) => serializeValue(v, 0, omitNull));
      return `[${items.join(", ")}]`;
    }
    // Block style for complex arrays
    const lines: string[] = [];
    for (const item of value) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        let entries = Object.entries(item as Record<string, unknown>);
        if (omitNull) {
          entries = entries.filter(([, v]) => v !== null && v !== undefined);
        }
        if (entries.length === 0) {
          lines.push(`${pad}- {}`);
        } else {
          const [firstKey, firstVal] = entries[0]!;
          lines.push(`${pad}- ${firstKey}: ${serializeValue(firstVal, indent + 2, omitNull)}`);
          for (const [k, v] of entries.slice(1)) {
            lines.push(`${pad}  ${k}: ${serializeValue(v, indent + 2, omitNull)}`);
          }
        }
      } else {
        lines.push(`${pad}- ${serializeValue(item, 0, omitNull)}`);
      }
    }
    return "\n" + lines.join("\n");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    let entries = Object.entries(obj);
    if (omitNull) {
      entries = entries.filter(([, v]) => v !== null && v !== undefined);
    }
    if (entries.length === 0) return "{}";
    const lines: string[] = [];
    for (const [k, v] of entries) {
      const serialized = serializeValue(v, indent + 2, omitNull);
      if (serialized.startsWith("\n")) {
        lines.push(`${pad}${k}:${serialized}`);
      } else {
        lines.push(`${pad}${k}: ${serialized}`);
      }
    }
    return "\n" + lines.join("\n");
  }

  return String(value);
}

export function toYaml(data: unknown, opts?: YamlOptions): string {
  const omitNull = opts?.omitNull ?? false;

  if (Array.isArray(data)) {
    if (data.length === 0) return "";

    const lines: string[] = [];
    for (const item of data) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        let entries = Object.entries(item as Record<string, unknown>);
        if (omitNull) {
          entries = entries.filter(([, v]) => v !== null && v !== undefined);
        }
        if (entries.length === 0) {
          lines.push("- {}");
        } else {
          const [firstKey, firstVal] = entries[0]!;
          const serialized = serializeValue(firstVal, 4, omitNull);
          if (serialized.startsWith("\n")) {
            lines.push(`- ${firstKey}:${serialized}`);
          } else {
            lines.push(`- ${firstKey}: ${serialized}`);
          }
          for (const [k, v] of entries.slice(1)) {
            const s = serializeValue(v, 4, omitNull);
            if (s.startsWith("\n")) {
              lines.push(`  ${k}:${s}`);
            } else {
              lines.push(`  ${k}: ${s}`);
            }
          }
        }
      } else {
        lines.push(`- ${serializeValue(item, 0, omitNull)}`);
      }
    }
    return lines.join("\n");
  }

  if (data !== null && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    let entries = Object.entries(obj);
    if (omitNull) {
      entries = entries.filter(([, v]) => v !== null && v !== undefined);
    }
    if (entries.length === 0) return "{}";
    const lines: string[] = [];
    for (const [k, v] of entries) {
      const serialized = serializeValue(v, 2, omitNull);
      if (serialized.startsWith("\n")) {
        lines.push(`${k}:${serialized}`);
      } else {
        lines.push(`${k}: ${serialized}`);
      }
    }
    return lines.join("\n");
  }

  // Scalar
  return serializeValue(data, 0, omitNull);
}
