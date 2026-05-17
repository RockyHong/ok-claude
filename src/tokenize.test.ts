import { describe, it, expect } from "vitest";
import { tokenize } from "./tokenize.js";

describe("tokenize", () => {
  it("strips stopwords and length-1 Latin tokens", () => {
    expect(tokenize("The quick brown fox")).toEqual(["quick", "brown", "fox"]);
  });

  it("keeps single-char CJK Han tokens", () => {
    const tokens = tokenize("今天天气很好");
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(t).toMatch(/^[\p{Script=Han}]+$/u);
    }
  });

  it("mixes Latin + CJK", () => {
    // ICU may segment Han as one run or per char depending on locale dict.
    // Spec accepts either — assert Latin + non-empty Han presence.
    const tokens = tokenize("hello 世界");
    expect(tokens).toContain("hello");
    const han = tokens.filter((t) => /^[\p{Script=Han}]+$/u.test(t));
    expect(han.join("")).toContain("世");
    expect(han.join("")).toContain("界");
  });

  it("drops pure punctuation", () => {
    expect(tokenize("!!! ??? ---")).toEqual([]);
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("lowercases Latin tokens", () => {
    expect(tokenize("HELLO World")).toEqual(["hello", "world"]);
  });

  it("drops length-1 digits", () => {
    const tokens = tokenize("1 2 3 word");
    expect(tokens).toEqual(["word"]);
  });

  it("keeps Hiragana and Katakana single chars", () => {
    const tokens = tokenize("あ ア");
    expect(tokens).toContain("あ");
    expect(tokens).toContain("ア");
  });

  it("drops pure multi-digit tokens (10, 2026, 200000)", () => {
    const tokens = tokenize("year 2026 line 10 size 200000 word");
    expect(tokens).toEqual(["year", "line", "size", "word"]);
  });
});

describe("tokenize — short-Latin whitelist (GAP-009 D3)", () => {
  it("keeps `y` as a standalone token", () => {
    expect(tokenize("y or no")).toContain("y");
  });
  it("keeps `n` as a standalone token", () => {
    expect(tokenize("oh n")).toContain("n");
  });
  it("keeps `k` as a standalone token", () => {
    expect(tokenize("k cool")).toContain("k");
  });
  it("still drops other single-char Latin tokens", () => {
    expect(tokenize("a b c d e f g h i j")).toEqual([]);
  });
});

describe("tokenize — orphan clitic safety (GAP-014)", () => {
  // ICU keeps contractions whole, but bare clitic suffixes ('re alone) split
  // to multi-char fragments (re/ve/ll/nt). Length-1 filter catches s/d/m/t;
  // STOPWORDS defends the rest.
  it("drops orphan `re` fragment", () => {
    expect(tokenize("re alone here")).toEqual(["alone", "here"]);
  });
  it("drops orphan `ve` fragment", () => {
    expect(tokenize("ve nothing left")).toEqual(["nothing", "left"]);
  });
  it("drops orphan `ll` fragment", () => {
    expect(tokenize("ll later then")).toEqual(["later", "then"]);
  });
  it("drops orphan `nt` fragment", () => {
    expect(tokenize("nt soon enough")).toEqual(["soon", "enough"]);
  });
  it("preserves whole contractions as single tokens", () => {
    expect(tokenize("we're don't it's")).toEqual(["we're", "don't", "it's"]);
  });
});
