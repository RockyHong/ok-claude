import { describe, it, expect } from "vitest";
import { parseJsonl } from "./parse.js";

describe("parseJsonl", () => {
  it("extracts well-formed user + assistant lines", () => {
    const content = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-05-01T10:00:00Z",
        message: { role: "user", content: "hello there" },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-05-01T10:00:01Z",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "hi back" }],
        },
      }),
    ].join("\n");

    const events = parseJsonl(content);

    expect(events).toEqual([
      { role: "user", text: "hello there", timestamp: "2026-05-01T10:00:00Z" },
      { role: "assistant", text: "hi back", timestamp: "2026-05-01T10:00:01Z" },
    ]);
  });

  it("skips malformed JSON without throwing", () => {
    const content = [
      "not json at all",
      JSON.stringify({
        message: { role: "user", content: "kept" },
      }),
      "{ broken",
    ].join("\n");

    const events = parseJsonl(content);

    expect(events).toHaveLength(1);
    expect(events[0]?.text).toBe("kept");
  });

  it("skips lines with unknown role", () => {
    const content = [
      JSON.stringify({ message: { role: "system", content: "skip me" } }),
      JSON.stringify({ message: { role: "tool", content: "skip too" } }),
      JSON.stringify({ message: { role: "user", content: "keep" } }),
    ].join("\n");

    const events = parseJsonl(content);

    expect(events.map((e) => e.text)).toEqual(["keep"]);
  });

  it("skips lines with empty text", () => {
    const content = [
      JSON.stringify({ message: { role: "user", content: "" } }),
      JSON.stringify({ message: { role: "user", content: [] } }),
      JSON.stringify({
        message: {
          role: "user",
          content: [{ type: "text", text: "" }],
        },
      }),
      JSON.stringify({ message: { role: "user", content: "real text" } }),
    ].join("\n");

    const events = parseJsonl(content);

    expect(events.map((e) => e.text)).toEqual(["real text"]);
  });

  it("handles content as string", () => {
    const content = JSON.stringify({
      message: { role: "user", content: "string form" },
    });

    const events = parseJsonl(content);

    expect(events).toEqual([{ role: "user", text: "string form" }]);
  });

  it("handles content as array of text blocks", () => {
    const content = JSON.stringify({
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "part one " },
          { type: "tool_use", input: { foo: "bar" } },
          { type: "text", text: "part two" },
        ],
      },
    });

    const events = parseJsonl(content);

    expect(events).toEqual([
      { role: "assistant", text: "part one part two" },
    ]);
  });

  it("ignores empty lines and trailing newline", () => {
    const content =
      "\n\n" +
      JSON.stringify({ message: { role: "user", content: "alone" } }) +
      "\n\n";

    const events = parseJsonl(content);

    expect(events).toHaveLength(1);
    expect(events[0]?.text).toBe("alone");
  });

  it("returns empty array for empty input", () => {
    expect(parseJsonl("")).toEqual([]);
  });

  it("skips lines flagged isMeta: true (harness-injected)", () => {
    const content = [
      JSON.stringify({
        isMeta: true,
        message: { role: "user", content: "harness-injected skill body" },
      }),
      JSON.stringify({
        message: { role: "user", content: "human-typed line" },
      }),
    ].join("\n");

    const events = parseJsonl(content);

    expect(events.map((e) => e.text)).toEqual(["human-typed line"]);
  });
});
