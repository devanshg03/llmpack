import { getUniformityScore } from "../detect.ts";
import { toToon } from "./toon.ts";
import { toYaml } from "./yaml.ts";

type FieldClass = "scalar" | "primitive-array" | "object-array" | "nested-object" | "null";

function classifyField(value: unknown): FieldClass {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return "scalar";
  if (Array.isArray(value)) {
    if (value.length === 0) return "null";
    const allPrimitive = value.every((v) => v === null || typeof v !== "object");
    if (allPrimitive) return "primitive-array";
    return "object-array";
  }
  return "nested-object";
}

function isAllNullCol(data: unknown[], key: string): boolean {
  return data.every((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return true;
    const val = (item as Record<string, unknown>)[key];
    return val === null || val === undefined || (Array.isArray(val) && val.length === 0);
  });
}

/** Returns true when obj's values are all plain objects with identical keys (≥2 entries, ≥2 value-keys). */
function isObjectMap(obj: Record<string, unknown>): boolean {
  const entries = Object.entries(obj);
  if (entries.length < 2) return false;
  if (!entries.every(([, v]) => v !== null && typeof v === "object" && !Array.isArray(v))) return false;
  const keys0 = new Set(Object.keys(entries[0]![1] as object));
  if (keys0.size < 2) return false;
  return entries.every(([, v]) => {
    const ks = new Set(Object.keys(v as object));
    return ks.size === keys0.size && [...ks].every((k) => keys0.has(k));
  });
}

/** Converts an object-map to TOON by prepending the map key as the `name` column. */
function objectMapToToon(obj: Record<string, unknown>): string {
  const rows = Object.entries(obj).map(([k, v]) => {
    const { name: _dropped, ...rest } = v as Record<string, unknown>;
    return { name: k, ...rest };
  });
  return toToon(rows);
}

export interface HybridOptions {
  omitNull?: boolean;
}

export function toHybrid(data: unknown, opts?: HybridOptions): string {
  const omitNull = opts?.omitNull ?? false;
  if (Array.isArray(data)) return hybridArray(data, omitNull);
  if (data !== null && typeof data === "object") {
    return hybridObjectParts(data as Record<string, unknown>, "", 0, 4, undefined, omitNull).join("\n\n");
  }
  return toYaml(data, { omitNull });
}

/**
 * Recursively formats an object into an array of section strings.
 * @param obj - the object to format
 * @param prefix - dotted path prefix for section headers (e.g. "additional_details.")
 * @param depth - current recursion depth (0 = top level)
 * @param maxDepth - max recursion depth before falling back to YAML
 * @param sectionHeader - if set, the scalars block gets this as a "## path [yaml]" header
 */
function hybridObjectParts(
  obj: Record<string, unknown>,
  prefix: string,
  depth: number,
  maxDepth: number,
  sectionHeader?: string,
  omitNull = false
): string[] {
  const scalarObj: Record<string, unknown> = {};
  const sections: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const cls = classifyField(value);
    const fullPath = `${prefix}${key}`;

    if (cls === "null") {
      continue;
    } else if (cls === "scalar" || cls === "primitive-array") {
      scalarObj[key] = value;
    } else if (cls === "object-array") {
      const arr = value as unknown[];
      const objects = arr.filter(
        (v) => v !== null && typeof v === "object" && !Array.isArray(v)
      ) as object[];

      // All single-key objects → list format
      const allSingleKey =
        objects.length > 0 &&
        objects.every((v) => Object.keys(v as object).length === 1);

      if (allSingleKey) {
        const items = objects.map((v) => String(Object.values(v as object)[0]));
        sections.push(`## ${fullPath} [list]\n${items.join("\n")}`);
      } else {
        const score = objects.length > 0 ? getUniformityScore(objects) : 0;
        if (score >= 0.7) {
          sections.push(`## ${fullPath} [toon]\n${toToon(arr)}`);
        } else {
          sections.push(`## ${fullPath} [yaml]\n${toYaml(arr, { omitNull })}`);
        }
      }
    } else {
      // nested-object: try object-map → toon, then recurse, then yaml fallback
      const nestedObj = value as Record<string, unknown>;
      if (isObjectMap(nestedObj)) {
        sections.push(`## ${fullPath} [toon]\n${objectMapToToon(nestedObj)}`);
      } else if (depth < maxDepth) {
        const innerParts = hybridObjectParts(nestedObj, `${fullPath}.`, depth + 1, maxDepth, fullPath, omitNull);
        sections.push(...innerParts);
      } else {
        sections.push(`## ${fullPath} [yaml]\n${toYaml(value, { omitNull })}`);
      }
    }
  }

  const parts: string[] = [];
  if (Object.keys(scalarObj).length > 0) {
    const yaml = toYaml(scalarObj, { omitNull });
    if (sectionHeader !== undefined) {
      parts.push(`## ${sectionHeader} [yaml]\n${yaml}`);
    } else {
      parts.push(yaml);
    }
  }
  parts.push(...sections);
  return parts;
}

function hybridArray(data: unknown[], omitNull = false): string {
  if (data.length === 0) return "";

  // Collect all column names
  const keySet = new Set<string>();
  for (const item of data) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keySet.add(k);
      }
    }
  }
  const allKeys = [...keySet];

  // Classify each column
  const complexKeys: string[] = [];
  const scalarKeys: string[] = [];

  for (const key of allKeys) {
    // Drop columns that are null/empty in every row
    if (isAllNullCol(data, key)) continue;

    let hasComplex = false;
    for (const item of data) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const val = (item as Record<string, unknown>)[key];
      if (val !== null && val !== undefined && typeof val === "object") {
        hasComplex = true;
        break;
      }
    }
    if (hasComplex) {
      complexKeys.push(key);
    } else {
      scalarKeys.push(key);
    }
  }

  const parts: string[] = [];

  // Scalar columns → TOON (construct scalar-only sub-array)
  if (scalarKeys.length > 0) {
    const scalarItems = data.map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
      const obj = item as Record<string, unknown>;
      const sub: Record<string, unknown> = {};
      for (const k of scalarKeys) sub[k] = obj[k];
      return sub;
    });
    parts.push(toToon(scalarItems));
  }

  // Complex columns → per-row sub-sections
  for (const key of complexKeys) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const val = (item as Record<string, unknown>)[key];
      if (val === null || val === undefined) continue;
      if (Array.isArray(val) && val.length === 0) continue;

      if (Array.isArray(val)) {
        const allPrimitive = val.every((v) => v === null || typeof v !== "object");
        if (allPrimitive) {
          parts.push(`## row[${i}].${key} [list]\n${val.join("\n")}`);
        } else {
          const objects = val.filter(
            (v) => v !== null && typeof v === "object" && !Array.isArray(v)
          ) as object[];
          if (objects.length > 0 && getUniformityScore(objects) >= 0.7) {
            parts.push(`## row[${i}].${key} [toon]\n${toToon(val)}`);
          } else {
            parts.push(`## row[${i}].${key} [yaml]\n${toYaml(val, { omitNull })}`);
          }
        }
      } else if (typeof val === "object") {
        // non-null object: check if all values are null → skip
        const entries = Object.entries(val as object).filter(
          ([, v]) => v !== null && v !== undefined
        );
        if (entries.length > 0) {
          parts.push(`## row[${i}].${key} [yaml]\n${toYaml(val, { omitNull })}`);
        }
      }
    }
  }

  return parts.join("\n\n");
}
