# Vendor

Third-party browser libraries copied in-tree, inlined verbatim into the emitted
output HTML (`ok-claude-result-{YYYY-MM-DD-HHMM}.html`) at build time. No CDN
for JS, no network at view time — the emitted HTML is offline-safe for logic
(Google Fonts `<link>` is the one external dep; see GAP-015) and tamper-stable.

## Policy

- **Copy at repo time, not at install time.** Files live in this directory and
  are committed. Build step reads them as strings (`tsup` `loader: { ".js": "text" }`)
  and string-interpolates into `render.ts`'s template.
- **No npm runtime dep on the vendored library.** Reduces install graph for the
  CLI; the library only matters inside the emitted page.
- **Pin to a known version + record source URL + retain license.** Each vendored
  file has a header comment with source URL, version, retrieval origin. The
  upstream LICENSE is committed alongside (`LICENSE-<name>.txt`).
- **Refresh manually.** When upgrading, re-extract from the npm tarball or
  GitHub release, update header version + retrieval line, run smoke test, commit.

## Files

| File | Upstream | Version | License | Notes |
| --- | --- | --- | --- | --- |
| `wordcloud2.js` | https://github.com/timdream/wordcloud2.js (npm: `wordcloud`) | 1.2.3 | MIT | Unminified — the npm package ships no min build. ~37 KB; acceptable inline size. |
| `LICENSE-wordcloud2.txt` | npm `wordcloud@1.2.3` `LICENSE` | — | MIT | Verbatim copy. |
| `html-to-image.js` | https://github.com/bubkoo/html-to-image (npm: `html-to-image`) | 1.11.13 | MIT | IIFE bundle of `es/index.js` via `esbuild --bundle --format=iife --global-name=htmlToImage`. Exposes `window.htmlToImage.toBlob`. |
| `LICENSE-html-to-image.txt` | npm `html-to-image@1.11.13` `LICENSE` | — | MIT | Verbatim copy. |
