export type InputShape =
  | "tabular"
  | "nested"
  | "flat-object"
  | "primitive-array"
  | "scalar"
  | "mixed";

export type OutputFormat =
  | "toon"
  | "yaml"
  | "csv"
  | "tsv"
  | "markdown-table"
  | "json-compact";

export interface DetectionResult {
  shape: InputShape;
  depth: number;
  uniformityScore: number;
  recommendedFormat: OutputFormat;
  reason: string;
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
        recommendedFormat: "json-compact",
        reason: "Mixed array of objects and primitives — JSON preserves structure",
      };
    }

    // Array of objects only
    const objects = data.filter(
      (item) => item !== null && typeof item === "object"
    ) as object[];
    const score = getUniformityScore(objects);

    if (score >= 0.85) {
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
