import { readFileSync } from "node:fs";

const VENDOR_JS = readFileSync(
  new URL("./vendor/wordcloud2.js", import.meta.url),
  "utf8",
);

const HTML_TO_IMAGE_JS = readFileSync(
  new URL("./vendor/html-to-image.js", import.meta.url),
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
    timestamp: string;
    username: string;
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
  const usernameTxt = escapeHtml(input.meta.username || "you");

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
    --s: 1;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body {
    background: #050505;
    font-family: 'Archivo Narrow', sans-serif;
    color: var(--ink-1);
  }
  .page {
    width: 100vw; height: 100vh;
    display: flex; flex-direction: row;
    align-items: center; justify-content: center;
    gap: 24px; padding: 24px;
  }
  .stage {
    width: calc(1080px * var(--s));
    height: calc(1080px * var(--s));
    flex: 0 0 auto;
  }
  .artifact {
    width: 1080px; height: 1080px;
    transform: scale(var(--s));
    transform-origin: top left;
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
    text-align: center;
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
  .hdr-bot .handle {
    font-family: 'JetBrains Mono', monospace;
    color: var(--ink-1);
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0;
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
  .labels .r { text-align: left; padding-left: 14px; color: var(--ink-1); }
  .labels .n { color: var(--amber); font-weight: 700; }

  .halves {
    flex: 1 1 auto;
    margin-top: 14px;
    display: grid; grid-template-columns: 1fr 1fr;
    column-gap: 32px;
    position: relative;
    overflow: hidden;
  }
  .divider {
    position: absolute; left: 50%; top: 0; bottom: 0;
    width: 2px; background: var(--ink-1);
    transform: translateX(-50%);
  }
  .half { position: relative; overflow: hidden; }
  .cv { width: 100%; height: 100%; display: block; }

  .footer {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: baseline;
    border-top: 1px solid var(--ink-1);
    padding-top: 12px;
  }
  .footer .cta {
    grid-column: 2;
    justify-self: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--ink-1);
    font-weight: 700;
  }
  .footer .cta .chev { color: var(--amber); margin-right: 4px; }
  .footer .cta .cmt { color: var(--ink-2); font-weight: 400; }
  .footer .byline {
    grid-column: 3;
    justify-self: end;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--ink-2);
    font-weight: 400;
    white-space: nowrap;
  }

  .chrome {
    flex: 0 0 auto;
    display: flex; flex-direction: column;
    align-items: stretch; gap: 14px;
    min-width: 160px;
  }
  .actions { display: flex; flex-direction: column; gap: 12px; }
  .btn {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-1);
    background: transparent;
    border: 1px solid var(--ink-1);
    padding: 10px 18px;
    cursor: pointer;
    transition: background 120ms ease;
    white-space: nowrap;
  }
  .btn:hover { background: rgba(244, 241, 234, 0.06); }
  .btn .chev { margin-right: 6px; color: var(--ink-1); }
  .btn-primary .chev { color: var(--amber); }
  .toast {
    font-family: 'Archivo Narrow', sans-serif;
    font-size: 14px;
    color: var(--ink-2);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    opacity: 0;
    transition: opacity 200ms ease;
    min-height: 1em;
    text-align: center;
  }
  .toast.visible { opacity: 1; }

  @media (max-aspect-ratio: 1/1) {
    .page { flex-direction: column; }
    .chrome { min-width: 0; align-items: center; }
    .actions { flex-direction: row; gap: 16px; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="stage">
      <div id="artifact" class="artifact">
        <div class="hdr-top">
          OK. CLAUDE <span class="dash">&mdash;</span>
          <span class="num">${burnedTxt}</span> burned in <span class="num">${daysTxt}</span>.
        </div>
        <div class="hdr-bot"><span class="handle">@${usernameTxt}</span> &middot; avg <span class="num">${perDayTxt}</span>/day.</div>
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
          <div class="cta"><span class="chev">&#9656;</span>npx ok-claude<span class="cmt"> # confess yours</span></div>
          <div class="byline">by rocky hong</div>
        </div>
      </div>
    </div>

    <div class="chrome">
      <div class="actions">
        <button type="button" id="btn-download" class="btn btn-primary">
          <span class="chev">&#9656;</span>DOWNLOAD
        </button>
        <button type="button" id="btn-copy" class="btn" title="copy image to clipboard">
          <span class="chev">&#9656;</span>COPY
        </button>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  </div>

<script>window.__DATA__ = ${dataJson};</script>
<script>
${VENDOR_JS}
</script>
<script>
${HTML_TO_IMAGE_JS}
</script>
<script>
(function boot() {
  var DATA = window.__DATA__ || { topUser: [], topClaude: [], meta: {} };
  var toastTimer = null;

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

  function fitStage() {
    var chrome = document.querySelector('.chrome');
    if (!chrome) return;
    var landscape = window.innerWidth > window.innerHeight;
    var padding = 24, gap = 24;
    var availW, availH;
    if (landscape) {
      availW = window.innerWidth - padding * 2 - gap - chrome.offsetWidth;
      availH = window.innerHeight - padding * 2;
    } else {
      availW = window.innerWidth - padding * 2;
      availH = window.innerHeight - padding * 2 - gap - chrome.offsetHeight;
    }
    var s = Math.max(0.05, Math.min(availW, availH) / 1080);
    document.documentElement.style.setProperty('--s', String(s));
  }

  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('visible');
    }, 2500);
  }

  function captureBlob() {
    var node = document.getElementById('artifact');
    return window.htmlToImage.toBlob(node, {
      pixelRatio: 2,
      backgroundColor: '#0d0d0a',
      cacheBust: true,
      style: { transform: 'none' },
    });
  }

  function downloadPng() {
    captureBlob().then(function (blob) {
      if (!blob) { showToast('download failed'); return; }
      var stamp = (DATA.meta && DATA.meta.timestamp) || 'unstamped';
      var name = 'ok-claude-result-' + stamp + '.png';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast('saved ' + name);
    }).catch(function () { showToast('download failed'); });
  }

  function copyPng() {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      showToast('copy not supported — try download instead');
      return;
    }
    captureBlob().then(function (blob) {
      if (!blob) {
        showToast('copy failed');
        return Promise.reject('capture_failed');
      }
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () {
      showToast('copied to clipboard');
    }).catch(function (reason) {
      if (reason !== 'capture_failed') {
        showToast('copy not supported — try download instead');
      }
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
    fitStage();
    whenFontsReady(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          renderAll();
        });
      });
    });
    var dl = document.getElementById('btn-download');
    var cp = document.getElementById('btn-copy');
    if (dl) dl.addEventListener('click', downloadPng);
    if (cp) cp.addEventListener('click', copyPng);
  });
  window.addEventListener('resize', function () {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(fitStage, 60);
  });
})();
</script>
</body>
</html>
`;
}
