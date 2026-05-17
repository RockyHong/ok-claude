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
      timestamp: over.meta?.timestamp ?? "2026-05-16-1234",
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

  it("contains no external script or CDN references", () => {
    const html = renderHtml(input());
    expect(html).not.toMatch(/<script[^>]+src=/);
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

describe("renderHtml — tabloid layout", () => {
  it("renders both half containers with divider between", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*class="half user"/);
    expect(html).toMatch(/<div[^>]*class="half claude"/);
    expect(html).toMatch(/<div[^>]*class="divider"/);
  });

  it("renders labels row with amber message-count accent on user side", () => {
    const html = renderHtml(input({ meta: { sessions: 1, messages: 11629, tokensIn: 0, tokensOut: 0, dateRange: null, timestamp: "2026-05-16-1234" } }));
    expect(html).toMatch(/<div[^>]*class="labels"/);
    expect(html).toContain("this is what you dump across");
    expect(html).toContain("messages:");
    expect(html).toContain("and this is what claude response:");
    expect(html).toMatch(/<span[^>]*class="n"[^>]*>11,629<\/span>/);
  });

  it("emits per-side cloud config — user rotateRatio 0.35 / fontMax 240, claude rotateRatio 0 / fontMax 200, gridSize 6", () => {
    const html = renderHtml(input());
    expect(html).toContain("rotateRatio: 0.35");
    expect(html).toContain("rotateRatio: 0");
    expect(html).toContain("fontMax: 240");
    expect(html).toContain("fontMax: 200");
    expect(html).toContain("fontMin: 16");
    expect(html).toContain("gridSize: 6");
    expect(html).toContain("'#f4f1ea'");
    expect(html).toContain("'#d97757'");
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

describe("renderHtml — tabloid header", () => {
  it("emits hdr-top brand wordmark + burn-fact + hdr-bot per-day sub-line with amber num accents", () => {
    const html = renderHtml(
      input({
        meta: {
          sessions: 1,
          messages: 4,
          tokensIn: 0,
          tokensOut: 10_276_899,
          dateRange: ["2026-04-15T00:00:00Z", "2026-05-15T00:00:00Z"],
          timestamp: "2026-05-16-1234",
        },
      }),
    );
    expect(html).toMatch(/<div[^>]*class="hdr-top"/);
    expect(html).toMatch(/<div[^>]*class="hdr-bot"/);
    expect(html).toContain("OK. CLAUDE");
    expect(html).toContain("burned in");
    expect(html).toContain("avg");
    expect(html).toContain("/day");
    expect(html).toMatch(/<span class="num">10\.3M tokens<\/span>/);
    expect(html).toMatch(/<span class="num">30 days<\/span>/);
  });

  it("includes double-rule under header", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*class="hdr-rule"/);
  });

  it("includes fitHeadline auto-shrink + whenFontsReady boot gate", () => {
    const html = renderHtml(input());
    expect(html).toContain("fitHeadline");
    expect(html).toContain("scrollWidth");
    expect(html).toContain("whenFontsReady");
    expect(html).toContain("document.fonts");
  });
});

describe("renderHtml — footer CTA", () => {
  it("renders single-line CTA inside .artifact — 'npx ok-claude # confess yours' (travels with PNG export)", () => {
    const html = renderHtml(input({ meta: { sessions: 441, messages: 11629, tokensIn: 0, tokensOut: 0, dateRange: null, timestamp: "2026-05-16-1234" } }));
    expect(html).toMatch(/<div[^>]*class="footer"/);
    // Old masthead bits dropped — footer is CTA-only.
    expect(html).not.toContain("vol. you");
    expect(html).not.toContain("441 sessions");
    expect(html).not.toContain("mechanical freq");
    expect(html).not.toContain("no llm");
    expect(html).toMatch(/<div[^>]*class="cta"[^>]*>[\s\S]*?npx ok-claude[\s\S]*?# confess yours/);
    expect(html).toMatch(/<span[^>]*class="cmt"[^>]*>\s*# confess yours<\/span>/);
    const artifactMatch = html.match(/<div[^>]*id="artifact"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div[^>]*class="chrome"/);
    expect(artifactMatch?.[1]).toContain("footer");
    expect(artifactMatch?.[1]).toContain("cta");
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

describe("renderHtml — F5 chrome row + html-to-image", () => {
  it('adds id="artifact" to the artifact div (PNG capture target)', () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*id="artifact"[^>]*class="artifact"/);
  });

  it("wraps page in .page and stages #artifact inside .stage (capture-only sibling chrome)", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*class="page"/);
    expect(html).toMatch(/<div[^>]*class="stage"[^>]*>\s*<div[^>]*id="artifact"/);
    // chrome sibling lives inside .page, beside .stage — not inside #artifact
    expect(html).toMatch(/<\/div>\s*<div[^>]*class="chrome"/);
    const artifactInner = html.match(
      /<div[^>]*id="artifact"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/,
    )?.[1];
    expect(artifactInner).toBeTruthy();
    expect(artifactInner!).not.toContain('class="chrome"');
  });

  it("renders two action buttons (DOWNLOAD + COPY) with chevron prefix — no SHUFFLE", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<button[^>]*id="btn-download"[^>]*class="btn btn-primary"[\s\S]*?DOWNLOAD/);
    expect(html).toMatch(/<button[^>]*id="btn-copy"[^>]*class="btn"[\s\S]*?COPY/);
    expect(html).not.toMatch(/id="btn-shuffle"/);
    expect(html).not.toContain("SHUFFLE");
    const btnDownload = html.match(/<button[^>]*id="btn-download"[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(btnDownload).toContain('class="chev"');
  });

  it("renders #copy button with title tooltip", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<button[^>]*id="btn-copy"[^>]*title="copy image to clipboard"/);
  });

  it("renders empty toast slot below the action row", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*class="toast"[^>]*id="toast"[^>]*><\/div>/);
  });

  it("inlines html-to-image vendor (no external src)", () => {
    const html = renderHtml(input());
    expect(html).toContain("var htmlToImage");
    expect(html).not.toMatch(/<script[^>]+src=[^>]*html-to-image/);
  });

  it("no shuffle code remains (fisherYates / shuffleLayout dropped)", () => {
    const html = renderHtml(input());
    expect(html).not.toContain("fisherYates");
    expect(html).not.toContain("shuffleLayout");
  });

  it("boot wires download + copy handlers and html-to-image capture", () => {
    const html = renderHtml(input());
    expect(html).toContain("getElementById('btn-download')");
    expect(html).toContain("getElementById('btn-copy')");
    expect(html).toContain("htmlToImage.toBlob");
    expect(html).toContain("navigator.clipboard.write");
    expect(html).toContain("new ClipboardItem");
  });

  it("capture overrides transform to none so scaled display does not shrink output", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/style:\s*\{\s*transform:\s*'none'/);
    expect(html).toContain("pixelRatio: 2");
  });

  it("download filename pairs HTML timestamp", () => {
    const html = renderHtml(input({
      meta: {
        sessions: 1, messages: 1, tokensIn: 0, tokensOut: 0,
        dateRange: null, timestamp: "2026-05-16-1234",
      },
    }));
    expect(html).toContain("DATA.meta.timestamp");
    expect(html).toContain("'.png'");
  });

  it("toast helper resets text and re-arms a single fade timer", () => {
    const html = renderHtml(input());
    expect(html).toContain("showToast");
    expect(html).toContain("classList.add('visible')");
    expect(html).toContain("classList.remove('visible')");
  });

  it("responsive — no-scroll body + scale var + portrait media query", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/html,\s*body\s*\{[^}]*overflow:\s*hidden/);
    expect(html).toMatch(/transform:\s*scale\(var\(--s/);
    expect(html).toMatch(/@media\s*\(max-aspect-ratio:\s*1\/1\)/);
    expect(html).toContain("fitStage");
  });
});
