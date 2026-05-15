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

import { foldOpener, topNOpeners, type OpenerMap } from "./aggregate.js";

describe("foldOpener", () => {
  it("creates a key entry on first fold", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    expect(map.get("wth")?.get("WTH")).toBe(1);
  });

  it("increments existing surface count", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    foldOpener(map, { key: "wth", surface: "WTH" });
    expect(map.get("wth")?.get("WTH")).toBe(2);
  });

  it("tracks distinct surfaces under same key", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    foldOpener(map, { key: "wth", surface: "wth" });
    expect(map.get("wth")?.get("WTH")).toBe(1);
    expect(map.get("wth")?.get("wth")).toBe(1);
  });
});

describe("topNOpeners", () => {
  it("returns empty array for empty map", () => {
    expect(topNOpeners(new Map(), 10)).toEqual([]);
  });

  it("clusters surfaces under one key, displays dominant surface", () => {
    const map: OpenerMap = new Map([
      [
        "wth",
        new Map([
          ["WTH", 30],
          ["wth", 20],
          ["WTh", 3],
        ]),
      ],
    ]);
    expect(topNOpeners(map, 10)).toEqual([{ display: "WTH", count: 53 }]);
  });

  it("sorts clusters by total count descending", () => {
    const map: OpenerMap = new Map([
      ["sorry", new Map([["sorry", 5]])],
      ["ok", new Map([["OK", 100]])],
      ["wth", new Map([["WTH", 30]])],
    ]);
    expect(topNOpeners(map, 10)).toEqual([
      { display: "OK", count: 100 },
      { display: "WTH", count: 30 },
      { display: "sorry", count: 5 },
    ]);
  });

  it("breaks display tie by codepoint-asc surface (uppercase wins)", () => {
    const map: OpenerMap = new Map([
      [
        "sorry",
        new Map([
          ["Sorry", 5],
          ["SORRY", 5],
        ]),
      ],
    ]);
    // 'SORRY' < 'Sorry' by codepoint ('O'=79 < 'o'=111)
    expect(topNOpeners(map, 10)).toEqual([{ display: "SORRY", count: 10 }]);
  });

  it("breaks cluster-total tie by display codepoint-asc", () => {
    const map: OpenerMap = new Map([
      ["zebra", new Map([["zebra", 3]])],
      ["alpha", new Map([["alpha", 3]])],
      ["mango", new Map([["mango", 3]])],
    ]);
    expect(topNOpeners(map, 10)).toEqual([
      { display: "alpha", count: 3 },
      { display: "mango", count: 3 },
      { display: "zebra", count: 3 },
    ]);
  });

  it("truncates to n", () => {
    const map: OpenerMap = new Map([
      ["a", new Map([["a", 5]])],
      ["b", new Map([["b", 4]])],
      ["c", new Map([["c", 3]])],
      ["d", new Map([["d", 2]])],
      ["e", new Map([["e", 1]])],
    ]);
    expect(topNOpeners(map, 2)).toEqual([
      { display: "a", count: 5 },
      { display: "b", count: 4 },
    ]);
  });

  it("returns all entries when n exceeds size", () => {
    const map: OpenerMap = new Map([
      ["a", new Map([["a", 2]])],
      ["b", new Map([["b", 1]])],
    ]);
    expect(topNOpeners(map, 100)).toEqual([
      { display: "a", count: 2 },
      { display: "b", count: 1 },
    ]);
  });
});
