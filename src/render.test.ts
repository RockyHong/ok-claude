import { describe, it, expect } from "vitest";
import { renderHtml } from "./render.js";

describe("renderHtml", () => {
  it("emits a self-contained HTML page with inlined data and library", () => {
    const html = renderHtml(
      [
        ["foo", 3],
        ["bar", 1],
      ],
      { sessions: 1, dateRange: null },
    );

    expect(html).toContain("<canvas");
    expect(html).toContain("WordCloud(");
    expect(html).toContain("wordcloud2.js");
    expect(html).toContain('"foo"');
    expect(html).toContain('"bar"');
    expect(html).toContain("What Did Claude Say");
  });

  it("includes session count and date range when provided", () => {
    const html = renderHtml(
      [["foo", 1]],
      { sessions: 42, dateRange: ["2026-01-01", "2026-05-14"] },
    );
    expect(html).toContain("42");
    expect(html).toContain("2026-01-01");
    expect(html).toContain("2026-05-14");
  });

  it("contains no external URLs or CDN references", () => {
    const html = renderHtml([["foo", 1]], { sessions: 1, dateRange: null });
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href=["']http/);
    expect(html).not.toContain("cdn.jsdelivr.net");
    expect(html).not.toContain("unpkg.com");
  });

  it("escapes </script> in user-derived strings", () => {
    const html = renderHtml(
      [["</script><script>alert(1)</script>", 1]],
      { sessions: 1, dateRange: null },
    );
    expect(html).not.toMatch(/<\/script><script>alert/);
  });
});
