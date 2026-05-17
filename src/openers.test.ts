import { describe, it, expect } from "vitest";
import { firstOpener } from "./openers.js";

describe("firstOpener", () => {
  it("returns null for empty input", () => {
    expect(firstOpener("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(firstOpener("   ")).toBeNull();
  });

  it("returns null for punctuation only", () => {
    expect(firstOpener("???")).toBeNull();
  });

  it("returns null for symbol-only prefix with no wordlike segment", () => {
    expect(firstOpener(">>>")).toBeNull();
  });

  it("extracts first Latin word, preserves case", () => {
    expect(firstOpener("OK Claude let's go")).toEqual({
      key: "ok",
      surface: "OK",
    });
  });

  it("strips trailing Latin punctuation from key and surface", () => {
    expect(firstOpener("Sorry, my bad")).toEqual({
      key: "sorry",
      surface: "Sorry",
    });
  });

  it("preserves all-caps surface, lowercases key", () => {
    expect(firstOpener("WTH broken")).toEqual({
      key: "wth",
      surface: "WTH",
    });
  });

  it("preserves lowercase surface", () => {
    expect(firstOpener("sorry try again")).toEqual({
      key: "sorry",
      surface: "sorry",
    });
  });

  it("handles single-character word", () => {
    expect(firstOpener("Y")).toEqual({ key: "y", surface: "Y" });
  });

  it("skips symbol prefix and grabs the first wordlike segment", () => {
    expect(firstOpener(">>> note this")).toEqual({
      key: "note",
      surface: "note",
    });
  });

  it("skips markdown header marker and grabs the first wordlike segment", () => {
    expect(firstOpener("## hello")).toEqual({
      key: "hello",
      surface: "hello",
    });
  });

  it("returns first segment when input mixes Latin and CJK", () => {
    // 'OK' is the first wordlike segment.
    expect(firstOpener("OK 但是")).toEqual({ key: "ok", surface: "OK" });
  });

  it("strips full-width CJK trailing punctuation", () => {
    // Whatever Intl.Segmenter chunks first from the CJK string,
    // the trailing fullwidth comma must not appear in surface or key.
    const op = firstOpener("好的，看看");
    expect(op).not.toBeNull();
    expect(op!.surface.endsWith("，")).toBe(false);
    expect(op!.key.endsWith("，")).toBe(false);
    // First chunk should not be empty.
    expect(op!.surface.length).toBeGreaterThan(0);
    // Key should equal surface lowercased (CJK Han is case-invariant).
    expect(op!.key).toBe(op!.surface.toLocaleLowerCase());
  });

  it("returns the first wordlike CJK segment for pure CJK input", () => {
    // ICU chunking varies — assert structural shape, not exact segment.
    const op = firstOpener("但是不對啊");
    expect(op).not.toBeNull();
    expect(op!.surface.length).toBeGreaterThan(0);
    expect(op!.key).toBe(op!.surface.toLocaleLowerCase());
  });

  // DEBT-003 rule 1: list-marker strip (digit/letter + . ) : + whitespace).
  describe("list-marker strip", () => {
    it("strips numbered list marker with period", () => {
      expect(firstOpener("1. fix this")).toEqual({
        key: "fix",
        surface: "fix",
      });
    });

    it("strips lettered list marker with paren", () => {
      expect(firstOpener("A) approve")).toEqual({
        key: "approve",
        surface: "approve",
      });
    });

    it("strips lettered list marker with colon", () => {
      expect(firstOpener("B: lgtm")).toEqual({
        key: "lgtm",
        surface: "lgtm",
      });
    });

    it("strips multi-digit list marker", () => {
      expect(firstOpener("12. do thing")).toEqual({
        key: "do",
        surface: "do",
      });
    });

    it("strips lowercase lettered marker", () => {
      expect(firstOpener("a. one")).toEqual({
        key: "one",
        surface: "one",
      });
    });

    it("tolerates leading whitespace before marker", () => {
      expect(firstOpener("   1. fix")).toEqual({
        key: "fix",
        surface: "fix",
      });
    });

    it("preserves digit when no list-marker shape (no punctuation)", () => {
      expect(firstOpener("1 thing missing")).toEqual({
        key: "1",
        surface: "1",
      });
    });

    it("preserves digit when decimal lacks trailing whitespace", () => {
      // "1.5" — no whitespace after `.`, not a list marker.
      // Segmenter may chunk "1.5" whole; assert no strip happened.
      const op = firstOpener("1.5 things");
      expect(op).not.toBeNull();
      expect(op!.key.startsWith("1")).toBe(true);
    });

    it("does not strip when marker lacks trailing whitespace", () => {
      // "1.fix" — no whitespace, treat as normal token.
      const op = firstOpener("1.fix");
      expect(op).not.toBeNull();
      expect(op!.key).toBe("1");
    });

    it("only strips one marker (conservative)", () => {
      // "1. 2. fix" → strip first only → "2. fix" → next wordlike is 2.
      // Conservative: marker chains are rare; one strip kills 99% of noise.
      const op = firstOpener("1. 2. fix");
      expect(op).not.toBeNull();
      expect(op!.key).toBe("2");
    });
  });
});
