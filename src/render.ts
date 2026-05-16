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
  const perDayTxt = escapeHtml(`${fmtTokens(perDay)} tokens`);
  const msgCountTxt = escapeHtml(input.meta.messages.toLocaleString("en-US"));
  const sessionsTxt = escapeHtml(input.meta.sessions.toLocaleString("en-US"));
  const daysFooterTxt = escapeHtml(String(days));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>OK Claude</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@400;500;700&family=Inter:wght@700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --paper: #0d0d0a;
    --ink-1: #f4f1ea;
    --ink-2: #8a857c;
    --ink-3: #3a3a35;
    --amber: #d97757;
    --rule: #f4f1ea;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #050505;
    font-family: 'Archivo Narrow', sans-serif;
    color: var(--ink-1);
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 40px;
  }
  .artifact {
    width: 1080px; height: 1080px;
    background:
      radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.025), transparent 50%),
      radial-gradient(ellipse at 80% 90%, rgba(255,255,255,0.03), transparent 50%),
      var(--paper);
    color: var(--ink-1);
    display: flex; flex-direction: column;
    padding: 52px 56px 44px;
    position: relative;
  }

  .hdr-top {
    text-align: left;
    font-family: 'Anton', sans-serif;
    font-size: 64px;
    line-height: 1.0;
    letter-spacing: -0.005em;
    text-transform: uppercase;
    color: var(--ink-1);
    white-space: nowrap;
  }
  .hdr-top .num  { color: var(--amber); }
  .hdr-top .dash { color: var(--ink-3); margin: 0 6px; }
  .hdr-bot {
    margin-top: 14px;
    text-align: right;
    font-family: 'Archivo Narrow', sans-serif;
    font-size: 22px;
    font-weight: 500;
    text-transform: lowercase;
    color: var(--ink-2);
    letter-spacing: 0.01em;
  }
  .hdr-bot .num {
    color: var(--ink-1);
    font-weight: 700;
    border-bottom: 2px solid var(--ink-1);
    padding-bottom: 1px;
  }
  .hdr-rule {
    margin-top: 24px;
    height: 4px; background: var(--ink-1);
    position: relative;
  }
  .hdr-rule::after {
    content: ''; position: absolute; top: 7px; left: 0; right: 0;
    height: 1px; background: var(--ink-1);
  }

  .labels {
    display: grid; grid-template-columns: 1fr 1fr;
    margin-top: 28px;
    font-family: 'Archivo Narrow', sans-serif;
    font-size: 17px;
    font-weight: 500;
    color: var(--ink-2);
    text-transform: lowercase;
    letter-spacing: 0.01em;
  }
  .labels .l { text-align: left; }
  .labels .r { text-align: right; color: var(--ink-1); }
  .labels .n { color: var(--amber); font-weight: 700; }

  .halves {
    flex: 1 1 auto;
    margin-top: 14px;
    display: grid; grid-template-columns: 1fr 1fr;
    position: relative;
    overflow: hidden;
  }
  .divider {
    position: absolute; left: 50%; top: 0; bottom: 0;
    width: 2px; background: var(--ink-1);
  }
  .half { position: relative; overflow: hidden; }
  .half.user   { padding-right: 28px; }
  .half.claude { padding-left: 28px; }
  .cv { width: 100%; height: 100%; display: block; }

  .footer {
    margin-top: 14px;
    display: flex; justify-content: space-between; align-items: baseline;
    font-family: 'Archivo Narrow', sans-serif;
    font-size: 14px;
    color: var(--ink-2);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-top: 1px solid var(--ink-1);
    padding-top: 12px;
  }
  .footer .cta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--ink-1);
    text-transform: none;
    letter-spacing: 0;
    font-weight: 700;
  }
  .footer .cta .chev { color: var(--amber); margin-right: 4px; }
</style>
</head>
<body>
  <div class="artifact">
    <div class="hdr-top">
      OK. CLAUDE <span class="dash">&mdash;</span>
      <span class="num">${burnedTxt}</span> burned in <span class="num">${daysTxt}</span>.
    </div>
    <div class="hdr-bot">avg <span class="num">${perDayTxt}</span>/day.</div>
    <div class="hdr-rule"></div>

    <div class="labels">
      <div class="l">this is what you dump across <span class="n">${msgCountTxt}</span> messages:</div>
      <div class="r">and this is what claude response:</div>
    </div>

    <div class="halves">
      <div class="divider"></div>
      <div class="half user"><canvas id="canvas-user" class="cv"></canvas></div>
      <div class="half claude"><canvas id="canvas-claude" class="cv"></canvas></div>
    </div>

    <div class="footer">
      <div>vol. you &middot; ed. ${daysFooterTxt}d &middot; ${sessionsTxt} sessions &middot; mechanical freq &middot; no llm</div>
      <div class="cta"><span class="chev">&#9656;</span>npx ok-claude</div>
    </div>
  </div>

<script>window.__DATA__ = ${dataJson};</script>
<script>
${VENDOR_JS}
</script>
<script>
(function boot() {
  var DATA = window.__DATA__ || { topUser: [], topClaude: [], meta: {} };

  function setupCanvas(canvas) {
    var wrap = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr));
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
  }

  function logScale(entries, fontMin, fontMax) {
    var max = entries[0][1];
    var min = entries[entries.length - 1][1];
    return function (count) {
      if (max === min) return (fontMin + fontMax) / 2;
      return fontMin + (fontMax - fontMin) * (Math.log(count) - Math.log(min)) / (Math.log(max) - Math.log(min));
    };
  }

  function drawHalf(canvasId, rawEntries, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    setupCanvas(canvas);
    if (!rawEntries || rawEntries.length === 0) return;
    var dpr = window.devicePixelRatio || 1;
    var entries = rawEntries.map(function (pair) {
      return [opts.caseFn ? opts.caseFn(pair[0]) : pair[0], pair[1]];
    });
    var cw = canvas.width, ch = canvas.height;
    var innerEdgePx = 24 * dpr;
    var origin = opts.side === 'user'
      ? [cw - innerEdgePx, ch / 2]
      : [innerEdgePx, ch / 2];
    WordCloud(canvas, {
      list: entries,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight || 'normal',
      color: opts.color,
      backgroundColor: 'rgba(0,0,0,0)',
      gridSize: 6,
      weightFactor: logScale(entries, opts.fontMin * dpr, opts.fontMax * dpr),
      rotateRatio: opts.rotateRatio,
      minRotation: -Math.PI / 9,
      maxRotation:  Math.PI / 9,
      rotationSteps: 0,
      shuffle: false,
      shrinkToFit: true,
      drawOutOfBound: false,
      origin: origin,
    });
  }

  function fitHeadline() {
    var el = document.querySelector('.hdr-top');
    if (!el) return;
    var size = 88;
    el.style.fontSize = size + 'px';
    var guard = 120;
    while (el.scrollWidth > el.clientWidth && size > 24 && guard-- > 0) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  }

  var INTER_STACK = '"Inter", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  function upper(s) { return s.toUpperCase(); }

  function renderAll() {
    fitHeadline();
    drawHalf('canvas-user', DATA.topUser || [], {
      side: 'user',
      fontFamily: INTER_STACK,
      fontWeight: '800',
      color: '#f4f1ea',
      fontMin: 16, fontMax: 240,
      rotateRatio: 0.35,
      caseFn: upper,
    });
    drawHalf('canvas-claude', DATA.topClaude || [], {
      side: 'claude',
      fontFamily: INTER_STACK,
      fontWeight: '800',
      color: '#d97757',
      fontMin: 16, fontMax: 200,
      rotateRatio: 0,
      caseFn: upper,
    });
  }

  function whenFontsReady(cb) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(cb);
    } else {
      cb();
    }
  }

  window.addEventListener('load', function () {
    whenFontsReady(function () {
      requestAnimationFrame(function () { requestAnimationFrame(renderAll); });
    });
  });
  window.addEventListener('resize', function () {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(renderAll, 120);
  });
})();
</script>
</body>
</html>
`;
}
