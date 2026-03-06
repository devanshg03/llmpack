import { test, expect } from "bun:test";
import { toHybrid } from "../../../src/formatters/hybrid.ts";

// objectMapToToon: map key always wins as the name column

test("objectMapToToon: map key is used as name, not overridden by nested name property", () => {
  const data = {
    Openness: { name: "should be dropped", score: "84/100", description: "High openness" },
    Neuroticism: { name: "should be dropped", score: "26/100", description: "Low neuroticism" },
  };
  // big5Personality.subDomains pattern — each value has identical keys including "name"
  const output = toHybrid({ traits: data });
  // The map keys (Openness, Neuroticism) must appear as name column values
  expect(output).toContain("Openness");
  expect(output).toContain("Neuroticism");
  // The nested "name" value must not appear
  expect(output).not.toContain("should be dropped");
});

test("objectMapToToon: map key wins when nested object has name property", () => {
  const data = {
    alpha: { name: "wrong", score: 10 },
    beta: { name: "wrong", score: 20 },
  };
  const output = toHybrid({ items: data });
  const lines = output.split("\n");
  // header should list name column
  const header = lines.find((l) => l.includes("{"));
  expect(header).toContain("name");
  // rows should use map keys, not "wrong"
  expect(output).toContain("alpha");
  expect(output).toContain("beta");
  expect(output).not.toContain("wrong");
});

test("objectMapToToon: works correctly when nested objects have no name property", () => {
  const data = {
    Ideas: { score: "18/20", explanation: "High curiosity" },
    Values: { score: "14/20", explanation: "Broad values" },
  };
  const output = toHybrid({ subDomain: data });
  expect(output).toContain("Ideas");
  expect(output).toContain("Values");
  expect(output).toContain("18/20");
  expect(output).toContain("14/20");
});
