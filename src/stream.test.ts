import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, chmodSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { streamEvents } from "./stream.js";
import type { LogFile } from "./discover.js";

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

function writeFixture(dir: string, name: string, body: string): LogFile {
  const p = join(dir, name);
  writeFileSync(p, body);
  return { path: p, size: statSync(p).size };
}

describe("streamEvents", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "okc-stream-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("yields events in file-then-line order", async () => {
    const a = writeFixture(
      dir,
      "a.jsonl",
      jsonl(
        { message: { role: "user", content: "first" } },
        { message: { role: "assistant", content: "second" } },
      ),
    );
    const b = writeFixture(
      dir,
      "b.jsonl",
      jsonl({ message: { role: "user", content: "third" } }),
    );

    const events = [];
    for await (const e of streamEvents([a, b], () => {})) events.push(e);

    expect(events.map((e) => e.text)).toEqual(["first", "second", "third"]);
  });

  it("calls onProgress once per file with monotonic bytesDone and fileIdx", async () => {
    const a = writeFixture(
      dir,
      "a.jsonl",
      jsonl({ message: { role: "user", content: "x" } }),
    );
    const b = writeFixture(
      dir,
      "b.jsonl",
      jsonl({ message: { role: "user", content: "y" } }),
    );

    const calls: Array<[number, number]> = [];
    for await (const _ of streamEvents([a, b], (bytes, idx) =>
      calls.push([bytes, idx]),
    )) {
      void _;
    }

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([a.size, 1]);
    expect(calls[1]).toEqual([a.size + b.size, 2]);
  });

  it("skips files that fail to open and continues with the rest", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((() => true) as typeof process.stderr.write);

    const good = writeFixture(
      dir,
      "good.jsonl",
      jsonl({ message: { role: "user", content: "kept" } }),
    );
    const ghost: LogFile = { path: join(dir, "ghost.jsonl"), size: 999 };

    const events = [];
    for await (const e of streamEvents([ghost, good], () => {})) events.push(e);

    expect(events.map((e) => e.text)).toEqual(["kept"]);
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it("respects parseLine filters (isMeta, empty text)", async () => {
    const f = writeFixture(
      dir,
      "f.jsonl",
      jsonl(
        { isMeta: true, message: { role: "user", content: "drop" } },
        { message: { role: "user", content: "" } },
        { message: { role: "user", content: "real" } },
      ),
    );
    const events = [];
    for await (const e of streamEvents([f], () => {})) events.push(e);
    expect(events.map((e) => e.text)).toEqual(["real"]);
  });
});
