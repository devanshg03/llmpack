export type InputShape =
  | "tabular"
  | "nested"
  | "flat-object"
  | "primitive-array"
  | "scalar"
  | "mixed"
  | "composite";

export type OutputFormat =
  | "toon"
  | "yaml"
  | "csv"
  | "tsv"
  | "markdown-table"
  | "json-compact"
  | "hybrid";

export type FieldClass =
  | "scalar"
  | "primitive-array"
  | "object-array"
  | "nested-object"
  | "null";

export interface DetectionResult {
  shape: InputShape;
  depth: number;
  uniformityScore: number;
  recommendedFormat: OutputFormat;
  reason: string;
  fieldMap?: Record<string, FieldClass>;
}

export function getDepth(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    return Math.max(...value.map(getDepth));
  }
  const vals = Object.values(value as Record<string, unknown>);
  if (vals.length === 0) return 1;
  return 1 + Math.max(...vals.map(getDepth));
}

export function getUniformityScore(arr: object[]): number {
  if (arr.length === 0) return 1.0;
  if (arr.length === 1) return 1.0;

  const keySets = arr.map(
    (item) => new Set(Object.keys(item as Record<string, unknown>))
  );

  const intersection = keySets.reduce((acc, set) => {
    return new Set([...acc].filter((k) => set.has(k)));
  });

  const union = keySets.reduce((acc, set) => {
    return new Set([...acc, ...set]);
  });

  if (union.size === 0) return 1.0;
  return intersection.size / union.size;
}

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

function detectCompositeObject(
  obj: Record<string, unknown>
): DetectionResult | null {
  const fieldMap: Record<string, FieldClass> = {};
  const distinctClasses = new Set<FieldClass>();

  for (const [key, value] of Object.entries(obj)) {
    const cls = classifyField(value);
    fieldMap[key] = cls;
    if (cls !== "null") distinctClasses.add(cls);
  }

  if (distinctClasses.size < 2) return null;

  const depth = getDepth(obj);

  // Use hybrid when either:
  // 1. A nested-object field is deeply nested (depth > 3) — recursive optimization pays off
  // 2. The composite has few complex sections (≤ 3 non-scalar fields) — section header
  //    overhead is negligible, and hybrid's per-section treatment beats TOON's inline encoding.
  //    (e.g. API wrapper: {scalars..., options: {}, results: [...]})
  // When there are many non-scalar fields (like linkedin-profile with 20+ arrays),
  // TOON's inline table format is more compact overall.
  const hasDeepNestedObject = Object.entries(obj).some(
    ([, v]) =>
      v !== null && typeof v === "object" && !Array.isArray(v) && getDepth(v) > 3
  );
  const complexFieldCount = Object.values(fieldMap).filter(
    (cls) => cls === "nested-object" || cls === "object-array"
  ).length;
  const useHybrid = hasDeepNestedObject || complexFieldCount <= 3;

  return {
    shape: "composite",
    depth,
    uniformityScore: 1.0,
    recommendedFormat: useHybrid ? "hybrid" : "toon",
    reason: useHybrid
      ? `Composite object with ${hasDeepNestedObject ? "deeply nested fields" : "few complex sections"} (${[...distinctClasses].join(", ")}) — hybrid applies per-section optimization`
      : `Composite object with many complex fields (${[...distinctClasses].join(", ")}) — TOON inline tables are more compact`,
    fieldMap,
  };
}

export function detect(
  data: unknown,
  maxDepth = 2
): DetectionResult {
  // null/undefined/primitive
  if (data === null || data === undefined || typeof data !== "object") {
    return {
      shape: "scalar",
      depth: 0,
      uniformityScore: 1.0,
      recommendedFormat: "json-compact",
      reason: "Scalar value — JSON compact is simplest representation",
    };
  }

  // Array
  if (Array.isArray(data)) {
    // Empty array
    if (data.length === 0) {
      return {
        shape: "tabular",
        depth: 0,
        uniformityScore: 1.0,
        recommendedFormat: "toon",
        reason: "Empty array — TOON produces minimal output",
      };
    }

    const depth = getDepth(data);

    // Primitive array
    const allPrimitive = data.every(
      (item) => item === null || typeof item !== "object"
    );
    if (allPrimitive) {
      return {
        shape: "primitive-array",
        depth,
        uniformityScore: 1.0,
        recommendedFormat: "csv",
        reason: "Array of primitives — CSV is most compact",
      };
    }

    // Check for mixed (objects + primitives)
    const hasObjects = data.some(
      (item) => item !== null && typeof item === "object"
    );
    const hasPrimitives = data.some(
      (item) => item === null || typeof item !== "object"
    );
    if (hasObjects && hasPrimitives) {
      return {
        shape: "mixed",
        depth,
        uniformityScore: 0,
        recommendedFormat: "toon",
        reason: "Mixed array of objects and primitives — TOON shared header eliminates repeated keys",
      };
    }

    // Array of objects only
    const objects = data.filter(
      (item) => item !== null && typeof item === "object"
    ) as object[];
    const score = getUniformityScore(objects);

    if (score >= 0.85) {
      // Prefer hybrid when some columns contain arrays (stratification saves tokens)
      const hasArrayColumns = objects.some((item) =>
        Object.values(item as Record<string, unknown>).some(
          (v) => Array.isArray(v) && v.length > 0
        )
      );
      if (hasArrayColumns) {
        return {
          shape: "tabular",
          depth,
          uniformityScore: score,
          recommendedFormat: "hybrid",
          reason: `Tabular array with array-valued columns (score=${score.toFixed(2)}) — hybrid stratifies by column type for better compression`,
        };
      }
      return {
        shape: "tabular",
        depth,
        uniformityScore: score,
        recommendedFormat: "toon",
        reason: `Uniform tabular array (score=${score.toFixed(2)}) — TOON is most token-efficient`,
      };
    } else if (score >= 0.5) {
      return {
        shape: "mixed",
        depth,
        uniformityScore: score,
        recommendedFormat: "yaml",
        reason: `Partially uniform array (score=${score.toFixed(2)}) — YAML handles sparse keys well`,
      };
    } else {
      return {
        shape: "mixed",
        depth,
        uniformityScore: score,
        recommendedFormat: "json-compact",
        reason: `Non-uniform array (score=${score.toFixed(2)}) — JSON compact preserves all structure`,
      };
    }
  }

  // Plain object
  const obj = data as Record<string, unknown>;
  const depth = getDepth(obj);

  if (Object.keys(obj).length === 0) {
    return {
      shape: "flat-object",
      depth: 0,
      uniformityScore: 1.0,
      recommendedFormat: "yaml",
      reason: "Empty object — YAML produces minimal output",
    };
  }

  // Check for composite (mixed scalar/array/object fields)
  const composite = detectCompositeObject(obj);
  if (composite) return composite;

  // Object with uniform tabular array field(s) → TOON encodes nested tables efficiently
  const hasTabularField = Object.values(obj).some((value) => {
    if (!Array.isArray(value) || value.length < 2) return false;
    if (!value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) return false;
    return getUniformityScore(value as object[]) >= 0.85;
  });
  if (hasTabularField) {
    return {
      shape: "nested",
      depth,
      uniformityScore: 1.0,
      recommendedFormat: "toon",
      reason: `Object with uniform tabular array field(s) — TOON encodes the nested table with a single header row`,
    };
  }

  if (depth <= maxDepth) {
    return {
      shape: "flat-object",
      depth,
      uniformityScore: 1.0,
      recommendedFormat: "yaml",
      reason: `Flat/shallow object (depth=${depth}) — YAML is readable and compact`,
    };
  }

  return {
    shape: "nested",
    depth,
    uniformityScore: 1.0,
    recommendedFormat: "yaml",
    reason: `Deeply nested object (depth=${depth}) — YAML handles nesting well`,
  };
}
