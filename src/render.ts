import { readFileSync } from "node:fs";

const VENDOR_JS = readFileSync(
  new URL("./vendor/wordcloud2.js", import.meta.url),
  "utf8",
);

export type RenderInput = {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
  };
};

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function computeDays(range: [string, string] | null): number {
  if (!range) return 30;
  const start = new Date(range[0]).getTime();
  const end = new Date(range[1]).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 30;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

export function renderHtml(input: RenderInput): string {
  const dataJson = safeJson({
    topUser: input.topUser,
    topClaude: input.topClaude,
    meta: input.meta,
  });

  const burned = input.meta.tokensOut;
  const days = computeDays(input.meta.dateRange);
  const perDay = Math.round(burned / days);
  const burnedTxt = escapeHtml(`${fmtTokens(burned)} tokens`);
  const daysTxt = escapeHtml(`${days} days`);
  const perDayTxt = escapeHtml(`${fmtTokens(perDay)} tokens/day`);
  const msgCountTxt = escapeHtml(fmtTokens(input.meta.messages));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>OK Claude</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #1a1d22; color: #e7eaee; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  #stage { display: flex; justify-content: center; align-items: flex-start; padding: 32px 16px; min-height: 100vh; }
  #artifact {
    position: relative;
    background: #0b0d10;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 60px rgba(0,0,0,0.5), 0 0 0 1px #2a3242;
    display: flex;
    flex-direction: column;
    width: min(820px, 90vw);
    aspect-ratio: 1 / 1;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  #artifact header { flex-shrink: 0; z-index: 2; padding: 18px 22px 14px; border-bottom: 3px solid #2a3242; }
  #artifact .hl-top {
    display: inline-block;
    font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.01em; line-height: 1.1;
    color: #7a838c;
    white-space: nowrap;
  }
  #artifact .hl-bot {
    font-size: 0.95rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; line-height: 1.25;
    color: #7a838c; text-align: right;
    margin-top: 8px;
  }
  #artifact .hl-brand { color: #ffffff; font-weight: 900; }
  #artifact .hl-sep { color: #5b6168; margin: 0 10px; }
  #artifact .m-accent { color: #ffffff; font-weight: 900; }

  .halves { flex: 1 1 auto; display: flex; flex-direction: row; min-height: 0; min-width: 0; }
  .half { flex: 1 1 0; min-width: 0; min-height: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; }
  .canvas-wrap { flex: 1 1 auto; min-height: 0; min-width: 0; position: relative; }
  .canvas-wrap canvas { display: block; width: 100%; height: 100%; }

  .side-label { flex-shrink: 0; padding: 10px 18px 6px; font-size: 0.85rem; font-weight: 500; }
  .half.user .side-label { text-align: left; color: #ffffff; opacity: 0.7; }
  .half.claude .side-label { text-align: right; color: #d97757; opacity: 0.85; }

  .install-cta {
    flex-shrink: 0;
    padding: 10px 18px 12px;
    text-align: right;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
    font-size: 0.78rem;
    color: #5b6168;
    letter-spacing: 0.02em;
    border-top: 1px solid #1d2330;
  }
  .install-cta .cta-cmd { color: #d97757; font-weight: 700; }
  .install-cta .cta-comment { color: #5b6168; font-style: italic; opacity: 0.8; }
</style>
</head>
<body>
<div id="stage">
  <div id="artifact">
    <header id="header">
      <div class="hl-top"><span class="hl-brand">OK. CLAUDE</span><span class="hl-sep">—</span><span class="m-accent">${burnedTxt}</span> burned in <span class="m-accent">${daysTxt}</span>.</div>
      <div class="hl-bot">avg <span class="m-accent">${perDayTxt}</span>.</div>
    </header>
    <div class="halves">
      <section class="half user">
        <div class="side-label">This is what you dump across <span class="msg-count">${msgCountTxt}</span> messages:</div>
        <div class="canvas-wrap"><canvas id="canvas-user"></canvas></div>
      </section>
      <section class="half claude">
        <div class="side-label">And this is what claude response:</div>
        <div class="canvas-wrap"><canvas id="canvas-claude"></canvas></div>
      </section>
    </div>
    <div class="install-cta">&gt; <span class="cta-cmd">npx ok-claude</span>  <span class="cta-comment"># confess yours</span></div>
  </div>
</div>

<script>window.__DATA__ = ${dataJson};</script>
<script>
${VENDOR_JS}
</script>
<script>
(function boot() {
  var DATA = window.__DATA__ || { topUser: [], topClaude: [], meta: {} };
  var ACCENT = { user: '255, 255, 255', claude: '217, 119, 87' };
  var LOCKED = {
    origin: 'edge',
    curve: 'log',
    rotationUser: 0.25,
    rotationClaude: 0,
    fontMin: 6,
    fontMax: 500,
    gapRatio: 3,
  };

  var header = document.getElementById('header');
  var canvasUser = document.getElementById('canvas-user');
  var canvasClaude = document.getElementById('canvas-claude');

  function fitHeadlineWidth() {
    var el = header.querySelector('.hl-top');
    if (!el) return;
    var cs = getComputedStyle(header);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var avail = header.clientWidth - padL - padR;
    if (avail <= 0) return;
    el.style.fontSize = '16px';
    var natural = el.scrollWidth;
    if (natural <= 0) return;
    var target = 16 * (avail / natural);
    el.style.fontSize = target + 'px';
    natural = el.scrollWidth;
    if (natural > 0) {
      target = target * (avail / natural);
      el.style.fontSize = target + 'px';
    }
  }

  function sizeCanvas(canvas) {
    var wrap = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    var w = wrap.clientWidth, h = wrap.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    return { w: w, h: h, dpr: dpr };
  }

  function originPoint(canvas, side, mode) {
    var W = canvas.width, H = canvas.height;
    if (mode === 'edge') {
      if (side === 'user') return [W * 0.92, H / 2];
      if (side === 'claude') return [W * 0.08, H / 2];
    }
    return [W / 2, H / 2];
  }

  function drawHalf(canvas, words, side, opts) {
    var sized = sizeCanvas(canvas);
    var dpr = sized.dpr;
    if (!words || words.length === 0) return;
    var max = words[0][1];
    var fontMin = opts.fontMin * dpr;
    var fontMax = opts.fontMax * dpr;
    var list = words.map(function (pair) { return [pair[0], pair[1]]; });
    var fillColor = 'rgb(' + ACCENT[side] + ')';
    var origin = originPoint(canvas, side, opts.origin);
    var curve = opts.curve;
    function shape(r) {
      if (curve === 'log') return Math.log1p(r * (Math.E - 1));
      return r;
    }
    WordCloud(canvas, {
      list: list,
      gridSize: opts.gridSize,
      weightFactor: function (weight) {
        var ratio = weight / max;
        return fontMin + shape(ratio) * (fontMax - fontMin);
      },
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontWeight: '800',
      color: fillColor,
      backgroundColor: 'transparent',
      rotateRatio: opts.rotation,
      rotationSteps: 2,
      minRotation: -Math.PI / 8,
      maxRotation: Math.PI / 8,
      shrinkToFit: true,
      drawOutOfBound: false,
      origin: origin,
      shuffle: false,
    });
  }

  var renderToken = 0;
  function applyAll() {
    var gridSize = Math.max(2, Math.round(LOCKED.fontMin * LOCKED.gapRatio));
    var baseOpts = {
      gridSize: gridSize,
      origin: LOCKED.origin,
      fontMin: LOCKED.fontMin,
      fontMax: LOCKED.fontMax,
      curve: LOCKED.curve,
    };
    var myToken = ++renderToken;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (myToken !== renderToken) return;
        drawHalf(canvasUser, DATA.topUser || [], 'user', Object.assign({}, baseOpts, { rotation: LOCKED.rotationUser }));
        drawHalf(canvasClaude, DATA.topClaude || [], 'claude', Object.assign({}, baseOpts, { rotation: LOCKED.rotationClaude }));
      });
    });
  }

  window.addEventListener('resize', function () {
    applyAll();
    fitHeadlineWidth();
  });

  fitHeadlineWidth();
  window.addEventListener('load', function () {
    fitHeadlineWidth();
    requestAnimationFrame(function () { requestAnimationFrame(applyAll); });
  });
})();
</script>
</body>
</html>
`;
}
