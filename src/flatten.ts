export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const nested = flattenObject(value as Record<string, unknown>, fullKey);
      for (const k of Object.keys(nested)) {
        result[k] = nested[k];
      }
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
