const BAR_WIDTH = 20;
const THROTTLE_MS = 50;

export type Progress = {
  tick(bytesDone: number, fileIdx: number): void;
  done(): void;
};

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function renderBar(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

export function createProgress(totalBytes: number, fileCount: number): Progress {
  if (!process.stderr.isTTY) {
    return { tick: () => {}, done: () => {} };
  }

  let lastDraw = 0;

  function draw(bytesDone: number, fileIdx: number): void {
    const ratio = totalBytes === 0 ? 1 : bytesDone / totalBytes;
    const pct = Math.round(ratio * 100);
    const line =
      `\r[${renderBar(ratio)}] ${pct}%  ` +
      `${fileIdx} / ${fileCount} files  ·  ` +
      `${formatMB(bytesDone)} / ${formatMB(totalBytes)} MB`;
    process.stderr.write(line);
    lastDraw = Date.now();
  }

  return {
    tick(bytesDone, fileIdx) {
      const now = Date.now();
      if (lastDraw !== 0 && now - lastDraw < THROTTLE_MS) return;
      draw(bytesDone, fileIdx);
    },
    done() {
      process.stderr.write("\r\x1b[K\n");
    },
  };
}
