import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

import type { LogFile } from "./discover.js";
import { parseLine, type LogEvent } from "./parse.js";

export type ProgressCallback = (bytesDone: number, fileIdx: number) => void;

export async function* streamEvents(
  files: LogFile[],
  onProgress: ProgressCallback,
): AsyncIterable<LogEvent> {
  let bytesDone = 0;

  for (let i = 0; i < files.length; i++) {
    const entry = files[i]!;
    try {
      const rl = createInterface({
        input: createReadStream(entry.path, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const e = parseLine(line);
        if (e) yield e;
      }
    } catch (err) {
      process.stderr.write(
        `ok-claude: skipped ${entry.path}: ${(err as Error).message}\n`,
      );
    }

    bytesDone += entry.size;
    onProgress(bytesDone, i + 1);
  }
}
