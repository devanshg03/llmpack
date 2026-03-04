import { test, expect } from "bun:test";
import { estimateTokens } from "../../src/tokenizer.ts";

test("empty string → 0 tokens", () => {
  expect(estimateTokens("")).toBe(0);
});

test("4-char string → 1 token", () => {
  expect(estimateTokens("abcd")).toBe(1);
});

test("8-char string → 2 tokens", () => {
  expect(estimateTokens("abcdefgh")).toBe(2);
});

test("5-char string → 2 tokens (ceil)", () => {
  expect(estimateTokens("abcde")).toBe(2);
});

test("matches Math.ceil(text.length / 4) formula", () => {
  const texts = ["", "a", "ab", "abc", "abcd", "hello world", "the quick brown fox"];
  for (const t of texts) {
    expect(estimateTokens(t)).toBe(Math.ceil(t.length / 4));
  }
});
