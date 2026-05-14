import { describe, it, expect } from "vitest";
import { renderHtml, type RenderInput } from "./render.js";

function input(over: Partial<RenderInput> = {}): RenderInput {
  return {
    topUser: over.topUser ?? [["foo", 3], ["bar", 1]],
    topClaude: over.topClaude ?? [["baz", 2]],
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
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
      input({ meta: { sessions: 1, messages: 1, dateRange: null } }),
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
