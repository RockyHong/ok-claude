import { describe, it, expect } from "vitest";
import { renderHtml, type RenderInput } from "./render.js";

function input(over: Partial<RenderInput> = {}): RenderInput {
  return {
    topUser: over.topUser ?? [["foo", 3], ["bar", 1]],
    topClaude: over.topClaude ?? [["baz", 2]],
    openersUser: over.openersUser ?? [{ display: "OK", count: 5 }],
    openersClaude: over.openersClaude ?? [{ display: "Looking", count: 3 }],
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      tokensIn: over.meta?.tokensIn ?? 0,
      tokensOut: over.meta?.tokensOut ?? 0,
      dateRange: over.meta?.dateRange ?? null,
    },
  };
}

describe("renderHtml", () => {
  it("emits a self-contained HTML page with inlined data and library", () => {
    const html = renderHtml(input());

    expect(html).toContain("<canvas");
    expect(html).toContain("WordCloud(");
    expect(html).toContain("wordcloud2.js");
    expect(html).toContain('"foo"');
    expect(html).toContain('"bar"');
    expect(html).toContain('"baz"');
    expect(html).toContain("OK Claude");
  });

  it("includes session count, message count, and date range in the subhead", () => {
    const html = renderHtml(
      input({
        meta: {
          sessions: 42,
          messages: 312,
          tokensIn: 0,
          tokensOut: 0,
          dateRange: ["2026-01-01", "2026-05-14"],
        },
      }),
    );
    expect(html).toContain("42 sessions");
    expect(html).toContain("312 messages");
    expect(html).toContain("2026-01-01");
    expect(html).toContain("2026-05-14");
  });

  it("uses singular nouns when counts are 1", () => {
    const html = renderHtml(
      input({
        meta: {
          sessions: 1,
          messages: 1,
          tokensIn: 0,
          tokensOut: 0,
          dateRange: null,
        },
      }),
    );
    expect(html).toContain("1 session ");
    expect(html).toContain("1 message");
  });

  it("contains no external URLs or CDN references", () => {
    const html = renderHtml(input());
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href=["']http/);
    expect(html).not.toContain("cdn.jsdelivr.net");
    expect(html).not.toContain("unpkg.com");
  });

  it("escapes </script> in user-derived strings", () => {
    const html = renderHtml(
      input({ topUser: [["</script><script>alert(1)</script>", 1]] }),
    );
    expect(html).not.toMatch(/<\/script><script>alert/);
  });
});

describe("renderHtml — tabs", () => {
  it("renders two tab buttons labelled You and Claude with You active by default", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<button[^>]*data-tab="user"[^>]*>\s*You\s*<\/button>/);
    expect(html).toMatch(/<button[^>]*data-tab="claude"[^>]*>\s*Claude\s*<\/button>/);
    expect(html).toMatch(/<button[^>]*data-tab="user"[^>]*class="[^"]*active/);
    expect(html).not.toMatch(/<button[^>]*data-tab="claude"[^>]*class="[^"]*active/);
  });

  it("includes a click handler that swaps the canvas to the selected speaker's list", () => {
    const html = renderHtml(input());
    expect(html).toContain('addEventListener(\'click\'');
    expect(html).toMatch(/data-tab/);
    expect(html).toContain("topClaude");
    expect(html).toContain("topUser");
  });
});

describe("renderHtml — empty-state per tab", () => {
  it("includes a labeled empty-state branch for each speaker in the boot script", () => {
    const html = renderHtml(input());
    expect(html).toContain("No words from You yet.");
    expect(html).toContain("No words from Claude yet.");
  });

  it("still renders both tab buttons even when one speaker's list is empty", () => {
    const html = renderHtml(input({ topClaude: [] }));
    expect(html).toMatch(/data-tab="user"/);
    expect(html).toMatch(/data-tab="claude"/);
    // empty array should still serialize into __DATA__
    expect(html).toMatch(/"topClaude"\s*:\s*\[\s*\]/);
  });
});

function inputWithTokens(over: Partial<RenderInput["meta"]> = {}): RenderInput {
  return {
    topUser: [["foo", 3]],
    topClaude: [["bar", 2]],
    openersUser: [],
    openersClaude: [],
    meta: {
      sessions: 1,
      messages: 4,
      tokensIn: over.tokensIn ?? 0,
      tokensOut: over.tokensOut ?? 0,
      dateRange: over.dateRange ?? null,
    },
  };
}

describe("renderHtml — token subhead (GAP-004)", () => {
  it("includes a formatted token total when tokensIn + tokensOut > 0", () => {
    const html = renderHtml(
      inputWithTokens({ tokensIn: 4_000_000, tokensOut: 200_000 }),
    );
    expect(html).toContain("4.2M tokens");
  });

  it("formats thousands with K suffix", () => {
    const html = renderHtml(
      inputWithTokens({ tokensIn: 12_000, tokensOut: 3_400 }),
    );
    expect(html).toContain("15.4K tokens");
  });

  it("omits the tokens segment when sum is zero (older logs)", () => {
    const html = renderHtml(inputWithTokens({ tokensIn: 0, tokensOut: 0 }));
    // tokensIn/tokensOut keys leak into the inlined __DATA__ JSON; only
    // assert the rendered subhead segment (" tokens · " / "M tokens" / "K tokens") is absent.
    expect(html).not.toMatch(/ tokens/);
  });
});

describe("renderHtml — opener side panel (F4 opener-frequency)", () => {
  it("renders an aside container with id='openers'", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<aside[^>]*id="openers"/);
  });

  it("includes an ordered list with id='opener-list' for JS to fill", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<ol[^>]*id="opener-list"/);
  });

  it("includes openersUser and openersClaude in __DATA__ payload", () => {
    const html = renderHtml(
      input({
        openersUser: [{ display: "WTH", count: 53 }],
        openersClaude: [{ display: "Looking", count: 12 }],
      }),
    );
    expect(html).toMatch(/"openersUser"\s*:\s*\[\s*\{\s*"display"\s*:\s*"WTH"\s*,\s*"count"\s*:\s*53\s*\}\s*\]/);
    expect(html).toMatch(/"openersClaude"\s*:\s*\[\s*\{\s*"display"\s*:\s*"Looking"\s*,\s*"count"\s*:\s*12\s*\}\s*\]/);
  });

  it("emits responsive @media (max-width: 640px) rule for stacking on mobile", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/@media\s*\(\s*max-width:\s*640px\s*\)/);
  });

  it("includes a paintOpeners function in the boot script", () => {
    const html = renderHtml(input());
    expect(html).toContain("paintOpeners");
  });

  it("survives XSS payload in opener display via safeJson + textContent", () => {
    const html = renderHtml(
      input({
        openersUser: [
          { display: "</script><script>alert(1)</script>", count: 1 },
        ],
      }),
    );
    // safeJson must escape </script
    expect(html).not.toMatch(/<\/script><script>alert/);
  });

  it("emits opener-list empty-state branch for both roles", () => {
    const html = renderHtml(input({ openersUser: [], openersClaude: [] }));
    expect(html).toContain("No openers yet.");
  });
});
