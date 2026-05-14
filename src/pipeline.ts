import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverLogs, logsRoot } from "./discover.js";
import { parseJsonl, type LogEvent } from "./parse.js";
import { tokenize } from "./tokenize.js";
import { aggregate, topN } from "./aggregate.js";
import { renderHtml } from "./render.js";

const OUTPUT_FILE = "ok-claude-output.html";
const TOP_N = 100;

export type RunResult =
  | { outPath: string; reason?: undefined }
  | { outPath: null; reason: string };

function dateRangeOf(events: LogEvent[]): [string, string] | null {
  let min: string | undefined;
  let max: string | undefined;
  for (const e of events) {
    if (!e.timestamp) continue;
    if (min === undefined || e.timestamp < min) min = e.timestamp;
    if (max === undefined || e.timestamp > max) max = e.timestamp;
  }
  if (min === undefined || max === undefined) return null;
  return [min, max];
}

export async function run(): Promise<RunResult> {
  const files = await discoverLogs();
  if (files.length === 0) {
    return {
      outPath: null,
      reason: `No Claude Code logs found at ${logsRoot()}`,
    };
  }

  const events: LogEvent[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const e of parseJsonl(content)) events.push(e);
  }

  const combinedText = events.map((e) => e.text).join("\n");
  const tokens = tokenize(combinedText);
  const freq = aggregate(tokens);
  const top = topN(freq, TOP_N);

  const html = renderHtml(top, {
    sessions: files.length,
    dateRange: dateRangeOf(events),
  });

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  await writeFile(outPath, html, "utf8");
  return { outPath };
}
