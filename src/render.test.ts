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
