export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function countTokens(
  text: string,
  mode: "estimate" | "tiktoken" = "estimate"
): Promise<number> {
  if (mode === "estimate") {
    return estimateTokens(text);
  }

  try {
    // @ts-ignore — optional peer dep, may not be installed
    const { get_encoding } = await import("@dqbd/tiktoken");
    const enc = get_encoding("cl100k_base");
    const tokens = enc.encode(text);
    const count = tokens.length;
    enc.free();
    return count;
  } catch {
    throw new Error(
      "tiktoken mode requires @dqbd/tiktoken to be installed. " +
        "Run: bun add @dqbd/tiktoken"
    );
  }
}
