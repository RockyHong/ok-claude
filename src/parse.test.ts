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

  it("skips lines flagged isCompactSummary: true (CC auto-conversation-summary)", () => {
    const content = [
      JSON.stringify({
        isCompactSummary: true,
        message: {
          role: "user",
          content:
            "Key Technical Concepts: ChewLingo monorepo: Next.js + React Native",
        },
      }),
      JSON.stringify({
        message: { role: "user", content: "real user text" },
      }),
    ].join("\n");

    const events = parseJsonl(content);

    expect(events.map((e) => e.text)).toEqual(["real user text"]);
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

  it("strips harness tag bodies from extracted text", () => {
    const lines = [
      JSON.stringify({
        message: {
          role: "user",
          content:
            "before <system-reminder>noise inside</system-reminder> after",
        },
      }),
      JSON.stringify({
        message: {
          role: "user",
          content:
            "wrap <command-name>/clear</command-name>" +
            "<command-message>clear</command-message>" +
            "<command-args></command-args> end",
        },
      }),
      JSON.stringify({
        message: {
          role: "user",
          content:
            "out <local-command-stdout>hidden</local-command-stdout>" +
            "<local-command-stderr>also</local-command-stderr> rest",
        },
      }),
      JSON.stringify({
        message: {
          role: "user",
          content: "<system-reminder>only noise</system-reminder>",
        },
      }),
    ].join("\n");

    const events = parseJsonl(lines);
    const texts = events.map((e) => e.text);

    expect(texts).toEqual([
      "before  after",
      "wrap  end",
      "out  rest",
    ]);
    // Fourth line collapses to whitespace after strip → dropped entirely
    expect(texts).toHaveLength(3);
  });

  it("strips multi-line tag bodies", () => {
    const line = JSON.stringify({
      message: {
        role: "assistant",
        content:
          "alpha\n<system-reminder>\nline1\nline2\n</system-reminder>\nomega",
      },
    });

    const events = parseJsonl(line);
    expect(events[0]?.text).toBe("alpha\n\nomega");
  });

  it("strips additional harness tags discovered in real logs (task-notification, bash-*)", () => {
    const content = [
      JSON.stringify({
        message: {
          role: "user",
          content:
            "alpha <task-notification>sub-agent done</task-notification> beta",
        },
      }),
      JSON.stringify({
        message: {
          role: "user",
          content:
            "x <bash-input>ls -la</bash-input>" +
            "<bash-stdout>total 42</bash-stdout>" +
            "<bash-stderr>permission denied</bash-stderr> y",
        },
      }),
    ].join("\n");

    const events = parseJsonl(content);
    expect(events.map((e) => e.text)).toEqual([
      "alpha  beta",
      "x  y",
    ]);
  });

  it("extracts usage.input_tokens / output_tokens when present (GAP-004)", () => {
    const content = JSON.stringify({
      message: {
        role: "assistant",
        content: "hi",
        usage: { input_tokens: 1200, output_tokens: 340 },
      },
    });

    const events = parseJsonl(content);
    expect(events).toEqual([
      { role: "assistant", text: "hi", tokensIn: 1200, tokensOut: 340 },
    ]);
  });

  it("leaves tokensIn / tokensOut undefined when usage is missing or non-numeric", () => {
    const content = [
      JSON.stringify({ message: { role: "assistant", content: "no-usage" } }),
      JSON.stringify({
        message: {
          role: "assistant",
          content: "bad-usage",
          usage: { input_tokens: "12", output_tokens: null },
        },
      }),
    ].join("\n");

    const events = parseJsonl(content);
    expect(events).toHaveLength(2);
    expect(events[0]).not.toHaveProperty("tokensIn");
    expect(events[0]).not.toHaveProperty("tokensOut");
    expect(events[1]).not.toHaveProperty("tokensIn");
    expect(events[1]).not.toHaveProperty("tokensOut");
  });

  it("drops lines flagged isSidechain: true (inline subagent dispatch — GAP-009)", () => {
    const content = [
      JSON.stringify({
        type: "user",
        isSidechain: true,
        message: { role: "user", content: "subagent dispatch prose" },
      }),
      JSON.stringify({
        type: "assistant",
        isSidechain: true,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "subagent reply prose" }],
        },
      }),
      JSON.stringify({
        type: "user",
        isSidechain: false,
        message: { role: "user", content: "human typed" },
      }),
    ].join("\n");

    expect(parseJsonl(content).map((e) => e.text)).toEqual(["human typed"]);
  });

  it("drops assistant lines flagged isApiErrorMessage: true (rate-limit stubs — GAP-009)", () => {
    const content = [
      JSON.stringify({
        type: "assistant",
        isApiErrorMessage: true,
        error: "rate_limit",
        apiErrorStatus: 429,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "rate limit hit" }],
        },
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "real reply" }],
        },
      }),
    ].join("\n");

    expect(parseJsonl(content).map((e) => e.text)).toEqual(["real reply"]);
  });

  it("drops non-prose line types via PROSE_TYPES whitelist (includes legacy summary)", () => {
    const dropTypes = [
      "system",
      "attachment",
      "progress",
      "last-prompt",
      "file-history-snapshot",
      "permission-mode",
      "ai-title",
      "queue-operation",
      "custom-title",
      "agent-name",
      "summary",
    ];
    const lines = dropTypes.map((t) =>
      JSON.stringify({
        type: t,
        message: { role: "user", content: "should be dropped" },
      }),
    );
    lines.push(
      JSON.stringify({
        type: "user",
        message: { role: "user", content: "kept" },
      }),
    );

    const events = parseJsonl(lines.join("\n"));

    expect(events.map((e) => e.text)).toEqual(["kept"]);
  });

  it("drops lines flagged isVisibleInTranscriptOnly: true even without isCompactSummary (forward-compat)", () => {
    const content = [
      JSON.stringify({
        type: "user",
        isVisibleInTranscriptOnly: true,
        message: { role: "user", content: "transcript-only synthetic line" },
      }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: "real user line" },
      }),
    ].join("\n");

    expect(parseJsonl(content).map((e) => e.text)).toEqual(["real user line"]);
  });
});
