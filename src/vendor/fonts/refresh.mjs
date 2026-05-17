// Font vendor refresh tool. Re-fetches the latin-subset woff2 from Google Fonts CSS2 API
// and dedupes variable-font URLs (same URL across weights = variable font; one file per family).
// Run from repo root: `node src/vendor/fonts/refresh.mjs`
// Re-fetch OFL licenses manually with curl from google/fonts repo if copyright drifted.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@400;500;700&family=Inter:wght@700;800&family=JetBrains+Mono:wght@400;700&display=swap";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const OUT_DIR = join(process.cwd(), "src", "vendor", "fonts");

// Output filename per family. Anton is single-weight 400 (carries weight suffix);
// the others are variable fonts (one woff2 covers the wght axis used).
const FILENAME = {
  Anton: "anton-400.woff2",
  "Archivo Narrow": "archivo-narrow.woff2",
  Inter: "inter.woff2",
  "JetBrains Mono": "jetbrains-mono.woff2",
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

  // Block = `/* subset */ @font-face { ... }`.
  const blockRe = /\/\*\s*([^*]+?)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  const picks = new Map();
  let m;
  while ((m = blockRe.exec(css))) {
    if (m[1].trim() !== "latin") continue;
    const fam = /font-family:\s*'([^']+)'/.exec(m[2])?.[1];
    const url = /src:\s*url\(([^)]+)\)/.exec(m[2])?.[1];
    if (!fam || !url || !FILENAME[fam] || picks.has(fam)) continue;
    picks.set(fam, url);
  }

  for (const fam of Object.keys(FILENAME)) {
    if (!picks.has(fam)) {
      console.error(`MISSING latin block for ${fam}`);
      process.exit(1);
    }
  }

  for (const [fam, url] of picks) {
    const filename = FILENAME[fam];
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(join(OUT_DIR, filename), buf);
    console.log(`${filename}\t${buf.length} bytes\t${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
