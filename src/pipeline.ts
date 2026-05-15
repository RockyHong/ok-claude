import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";
import { streamEvents } from "./stream.js";
import { denoiseMarkdown } from "./denoise.js";
import { tokenize } from "./tokenize.js";
import { topN, foldOpener, topNOpeners, type OpenerMap } from "./aggregate.js";
import { firstOpener } from "./openers.js";
import { renderHtml } from "./render.js";
import { createProgress } from "./progress.js";

const OUTPUT_FILE = "ok-claude-output.html";
const TOP_N = 100;
const TOP_OPENERS = 10;

export type RunResult =
  | { outPath: string; reason?: undefined }
  | { outPath: null; reason: string };

export async function run(): Promise<RunResult> {
  const files = await discoverLogs();
  if (files.length === 0) {
    return {
      outPath: null,
      reason: `No Claude Code logs found at ${logsRoot()}`,
    };
  }

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const progress = createProgress(totalBytes, files.length);

  const userMap = new Map<string, number>();
  const claudeMap = new Map<string, number>();
  const userOpeners: OpenerMap = new Map();
  const claudeOpeners: OpenerMap = new Map();
  let messages = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let minTs: string | undefined;
  let maxTs: string | undefined;

  for await (const e of streamEvents(files, progress.tick)) {
    const denoised = denoiseMarkdown(e.text);
    const op = firstOpener(denoised);
    if (op) {
      foldOpener(e.role === "user" ? userOpeners : claudeOpeners, op);
    }
    const map = e.role === "user" ? userMap : claudeMap;
    for (const tok of tokenize(denoised)) {
      map.set(tok, (map.get(tok) ?? 0) + 1);
    }
    messages++;
    if (typeof e.tokensIn === "number") tokensIn += e.tokensIn;
    if (typeof e.tokensOut === "number") tokensOut += e.tokensOut;
    if (e.timestamp) {
      if (minTs === undefined || e.timestamp < minTs) minTs = e.timestamp;
      if (maxTs === undefined || e.timestamp > maxTs) maxTs = e.timestamp;
    }
  }
  progress.done();

  const topUser = topN(userMap, TOP_N);
  const topClaude = topN(claudeMap, TOP_N);
  const openersUser = topNOpeners(userOpeners, TOP_OPENERS);
  const openersClaude = topNOpeners(claudeOpeners, TOP_OPENERS);

  const html = renderHtml({
    topUser,
    topClaude,
    openersUser,
    openersClaude,
    meta: {
      sessions: files.length,
      messages,
      tokensIn,
      tokensOut,
      dateRange:
        minTs !== undefined && maxTs !== undefined ? [minTs, maxTs] : null,
    },
  });

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  await writeFile(outPath, html, "utf8");
  return { outPath };
}
