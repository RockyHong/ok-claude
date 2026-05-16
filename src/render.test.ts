import { describe, it, expect } from "vitest";
import { renderHtml, type RenderInput } from "./render.js";

function input(over: Partial<RenderInput> = {}): RenderInput {
  return {
    topUser: over.topUser ?? [["foo", 3], ["bar", 1]],
    topClaude: over.topClaude ?? [["baz", 2]],
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      tokensIn: over.meta?.tokensIn ?? 0,
      tokensOut: over.meta?.tokensOut ?? 0,
      dateRange: over.meta?.dateRange ?? null,
    },
  };
}

describe("renderHtml — self-containment", () => {
  it("emits a self-contained HTML page with inlined data, dual canvas, and library", () => {
    const html = renderHtml(input());

    expect(html).toMatch(/<canvas[^>]*id="canvas-user"/);
    expect(html).toMatch(/<canvas[^>]*id="canvas-claude"/);
    expect(html).toContain("WordCloud(");
    expect(html).toContain("wordcloud2.js");
    expect(html).toContain('"foo"');
    expect(html).toContain('"bar"');
    expect(html).toContain('"baz"');
    expect(html).toContain("OK Claude");
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

describe("renderHtml — dual canvas layout", () => {
  it("renders both half containers with side-labels in the correct alignment", () => {
    const html = renderHtml(input({ meta: { sessions: 1, messages: 42, tokensIn: 0, tokensOut: 0, dateRange: null } }));
    expect(html).toMatch(/<section[^>]*class="half user"/);
    expect(html).toMatch(/<section[^>]*class="half claude"/);
    expect(html).toMatch(/\.half\.user \.side-label\s*\{[^}]*text-align: left/);
    expect(html).toMatch(/\.half\.claude \.side-label\s*\{[^}]*text-align: right/);
  });

  it("includes lowercase asymmetric side-label copy with message-count placeholder", () => {
    const html = renderHtml(input());
    expect(html).toContain("This is what you dump across");
    expect(html).toContain("messages:");
    expect(html).toContain("And this is what claude response:");
    expect(html).toMatch(/<span[^>]*class="msg-count"/);
  });

  it("emits LOCKED config — rotation 0.25 user / 0 claude, fontMin 6, fontMax 500, gapRatio 3, edge origin", () => {
    const html = renderHtml(input());
    expect(html).toContain("rotationUser: 0.25");
    expect(html).toContain("rotationClaude: 0");
    expect(html).toContain("fontMin: 6");
    expect(html).toContain("fontMax: 500");
    expect(html).toContain("gapRatio: 3");
    expect(html).toContain("origin: 'edge'");
  });

  it("does NOT emit tab / opener-panel / strip surface (removed in F8)", () => {
    const html = renderHtml(input());
    expect(html).not.toMatch(/<div[^>]*id="tabs"/);
    expect(html).not.toMatch(/<aside[^>]*id="openers"/);
    expect(html).not.toMatch(/<ol[^>]*id="opener-list"/);
    expect(html).not.toMatch(/data-tab=/);
    expect(html).not.toContain("paintOpeners");
  });
});

describe("renderHtml — brutal header", () => {
  it("emits the OK. CLAUDE brand wordmark + burn-fact + perDay sub-line", () => {
    const html = renderHtml(
      input({
        meta: {
          sessions: 1,
          messages: 4,
          tokensIn: 0,
          tokensOut: 10_276_899,
          dateRange: ["2026-04-15T00:00:00Z", "2026-05-15T00:00:00Z"],
        },
      }),
    );
    expect(html).toMatch(/class="hl-top"/);
    expect(html).toMatch(/class="hl-bot"/);
    expect(html).toMatch(/class="hl-brand"[^>]*>OK\. CLAUDE/);
    expect(html).toContain("burned in");
    expect(html).toContain("avg");
    expect(html).toContain("tokens/day");
    // formatted token total (10.3M) appears as accent
    expect(html).toMatch(/class="m-accent"/);
  });

  it("includes inline JS fitHeadlineWidth() measure-scale routine", () => {
    const html = renderHtml(input());
    expect(html).toContain("fitHeadlineWidth");
    expect(html).toContain("scrollWidth");
  });
});

describe("renderHtml — install CTA", () => {
  it("renders the install-cta inside #artifact (travels with PNG export)", () => {
    const html = renderHtml(input());
    // CTA element exists
    expect(html).toMatch(/<div[^>]*class="install-cta"/);
    expect(html).toMatch(/<span[^>]*class="cta-cmd"[^>]*>npx ok-claude/);
    expect(html).toContain("# confess yours");
    // CTA must be inside #artifact, not below it
    const artifactMatch = html.match(/<div[^>]*id="artifact"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<script/);
    expect(artifactMatch?.[0]).toContain("install-cta");
  });
});

describe("renderHtml — empty state per side", () => {
  it("still emits both canvases even when one side is empty", () => {
    const html = renderHtml(input({ topClaude: [] }));
    expect(html).toMatch(/id="canvas-user"/);
    expect(html).toMatch(/id="canvas-claude"/);
    expect(html).toMatch(/"topClaude"\s*:\s*\[\s*\]/);
  });
});
