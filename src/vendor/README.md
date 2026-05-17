# Vendor

Third-party browser assets copied in-tree, inlined verbatim into the emitted
output HTML (`ok-claude-result-{YYYY-MM-DD-HHMM}.html`) at build time. No CDN,
no network at view time — the emitted HTML is fully self-contained and
tamper-stable.

## Policy

- **Copy at repo time, not at install time.** Files live in this directory and
  are committed. Build step reads them as strings / buffers and inlines them
  into `render.ts`'s template (JS via `${VENDOR_JS}`; woff2 via base64 in
  `@font-face`).
- **No npm runtime dep on the vendored library.** Reduces install graph for the
  CLI; the asset only matters inside the emitted page.
- **Pin to a known version + record source URL + retain license.** Each vendored
  file has a header comment (or upstream URL row in the table below) with
  source, version, retrieval origin. The upstream LICENSE is committed
  alongside (`LICENSE-<name>.txt`).
- **Refresh manually.** When upgrading, re-extract from the npm tarball /
  GitHub release / Google Fonts CSS endpoint, update header + table row, run
  smoke test, commit.

## Files

| File | Upstream | Version | License | Notes |
| --- | --- | --- | --- | --- |
| `wordcloud2.js` | https://github.com/timdream/wordcloud2.js (npm: `wordcloud`) | 1.2.3 | MIT | Unminified — the npm package ships no min build. ~37 KB; acceptable inline size. |
| `LICENSE-wordcloud2.txt` | npm `wordcloud@1.2.3` `LICENSE` | — | MIT | Verbatim copy. |
| `html-to-image.js` | https://github.com/bubkoo/html-to-image (npm: `html-to-image`) | 1.11.13 | MIT | IIFE bundle of `es/index.js` via `esbuild --bundle --format=iife --global-name=htmlToImage`. Exposes `window.htmlToImage.toBlob`. |
| `LICENSE-html-to-image.txt` | npm `html-to-image@1.11.13` `LICENSE` | — | MIT | Verbatim copy. |
| `fonts/anton-400.woff2` | Google Fonts CSS2 API, `anton` v27, latin subset | v27 | OFL-1.1 | Single-weight display face. 18.6 KB. |
| `fonts/archivo-narrow.woff2` | Google Fonts CSS2 API, `archivonarrow` v35, latin subset | v35 | OFL-1.1 | Variable font (wght axis covers 400/500/700). 18.7 KB. |
| `fonts/inter.woff2` | Google Fonts CSS2 API, `inter` v20, latin subset | v20 | OFL-1.1 | Variable font (wght axis covers 700/800 use). 48.3 KB. |
| `fonts/jetbrains-mono.woff2` | Google Fonts CSS2 API, `jetbrainsmono` v24, latin subset | v24 | OFL-1.1 | Variable font (wght axis covers 400/700 use). 31.4 KB. |
| `fonts/LICENSE-anton.txt` | google/fonts repo `ofl/anton/OFL.txt` | — | OFL-1.1 | Verbatim. |
| `fonts/LICENSE-archivo-narrow.txt` | google/fonts repo `ofl/archivonarrow/OFL.txt` | — | OFL-1.1 | Verbatim. |
| `fonts/LICENSE-inter.txt` | google/fonts repo `ofl/inter/OFL.txt` | — | OFL-1.1 | Verbatim. |
| `fonts/LICENSE-jetbrains-mono.txt` | google/fonts repo `ofl/jetbrainsmono/OFL.txt` | — | OFL-1.1 | Verbatim. |

## Font refresh

Re-run `node src/vendor/fonts/refresh.mjs` from repo root. Script fetches the
Google Fonts CSS2 endpoint with a modern Chrome UA (latin-subset selector),
extracts the latin-subset woff2 URL per family (one per family — variable
fonts collapse weight axis into a single file), downloads, and writes to
`src/vendor/fonts/`. Re-fetch licenses with `curl` from `google/fonts` repo
if copyright header drifted. Update the version columns above.

CJK / Cyrillic / Greek subsets intentionally excluded — see `docs/backlog.md`
§ GAP-016 for the CJK fallback story.
