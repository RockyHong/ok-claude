import { writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join, resolve } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";
import { streamEvents } from "./stream.js";
import { denoiseMarkdown } from "./denoise.js";
import { tokenize } from "./tokenize.js";
import { foldOpener, topNOpeners, type OpenerMap } from "./aggregate.js";
import { firstOpener } from "./openers.js";
import { renderHtml } from "./render.js";
import { createProgress } from "./progress.js";

const TOP_N = 100;

function buildStamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function outputFilename(stamp: string): string {
  return `ok-claude-result-${stamp}.html`;
}

function getUsername(): string {
  try {
    const name = userInfo().username;
    return name && name.length > 0 ? name : "you";
  } catch {
    return "you";
  }
}

function outputDir(): string {
  const downloads = join(homedir(), "Downloads");
  try {
    if (statSync(downloads).isDirectory()) return downloads;
  } catch {
    // Downloads missing — fall through to cwd
  }
  return process.cwd();
}

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

  // Body-token folds stay live per DEBT-006 (restore-bait for vocab-axis revival).
  // Output unused by F8 render; first-word folds drive both clouds.
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

  const topUser: Array<[string, number]> = topNOpeners(userOpeners, TOP_N).map(
    (e) => [e.display, e.count],
  );
  const topClaude: Array<[string, number]> = topNOpeners(
    claudeOpeners,
    TOP_N,
  ).map((e) => [e.display, e.count]);

  const stamp = buildStamp();

  const html = renderHtml({
    topUser,
    topClaude,
    meta: {
      sessions: files.length,
      messages,
      tokensIn,
      tokensOut,
      dateRange:
        minTs !== undefined && maxTs !== undefined ? [minTs, maxTs] : null,
      timestamp: stamp,
      username: getUsername(),
    },
  });

  const outPath = resolve(outputDir(), outputFilename(stamp));
  await writeFile(outPath, html, "utf8");
  return { outPath };
}
