import { describe, it, expect } from "vitest";
import { aggregate, topN } from "./aggregate.js";

describe("aggregate", () => {
  it("returns empty map for empty input", () => {
    expect(aggregate([])).toEqual(new Map());
  });

  it("counts duplicates", () => {
    const freq = aggregate(["foo", "bar", "foo", "baz", "foo", "bar"]);
    expect(freq.get("foo")).toBe(3);
    expect(freq.get("bar")).toBe(2);
    expect(freq.get("baz")).toBe(1);
  });
});

describe("topN", () => {
  it("returns empty array for empty map", () => {
    expect(topN(new Map(), 5)).toEqual([]);
  });

  it("sorts by count desc", () => {
    const freq = new Map([
      ["b", 1],
      ["a", 3],
      ["c", 2],
    ]);
    expect(topN(freq, 3)).toEqual([
      ["a", 3],
      ["c", 2],
      ["b", 1],
    ]);
  });

  it("breaks ties by token ascending lex order", () => {
    const freq = new Map([
      ["zebra", 3],
      ["alpha", 3],
      ["mango", 3],
    ]);
    expect(topN(freq, 3)).toEqual([
      ["alpha", 3],
      ["mango", 3],
      ["zebra", 3],
    ]);
  });

  it("truncates to n", () => {
    const freq = new Map([
      ["a", 5],
      ["b", 4],
      ["c", 3],
      ["d", 2],
      ["e", 1],
    ]);
    expect(topN(freq, 2)).toEqual([
      ["a", 5],
      ["b", 4],
    ]);
  });

  it("returns all entries when n exceeds size", () => {
    const freq = new Map([
      ["a", 2],
      ["b", 1],
    ]);
    expect(topN(freq, 100)).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
  });
});
