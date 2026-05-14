import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createProgress } from "./progress.js";

describe("createProgress", () => {
  let writes: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let isTTYOriginal: unknown;

  beforeEach(() => {
    writes = [];
    isTTYOriginal = (process.stderr as unknown as { isTTY: unknown }).isTTY;
    writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(((chunk: unknown) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
  });

  afterEach(() => {
    writeSpy.mockRestore();
    (process.stderr as unknown as { isTTY: unknown }).isTTY = isTTYOriginal;
  });

  it("writes nothing when stderr is not a TTY", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = false;
    const p = createProgress(1000, 2);
    p.tick(500, 1);
    p.tick(1000, 2);
    p.done();
    expect(writes).toEqual([]);
  });

  it("renders bar + percent + file count + MB on TTY", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(2 * 1024 * 1024, 4); // 2 MB total
    p.tick(1024 * 1024, 2); // 1 MB done
    p.done();
    const all = writes.join("");
    expect(all).toMatch(/\[.*\]/);
    expect(all).toContain("50%");
    expect(all).toContain("2 / 4 files");
    expect(all).toMatch(/1\.0 \/ 2\.0 MB/);
  });

  it("throttles redraws to one per ~50 ms but always renders the last tick", async () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(100, 3);
    p.tick(10, 1); // first always renders
    p.tick(20, 2); // within throttle window — should NOT render
    await new Promise((r) => setTimeout(r, 60));
    p.tick(100, 3); // after throttle window — renders
    const renderCount = writes.length;
    p.done(); // always renders final clear + newline
    expect(renderCount).toBe(2);
    expect(writes.length).toBe(renderCount + 1);
  });

  it("done() clears the line and emits a newline", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(10, 1);
    p.tick(10, 1);
    p.done();
    const last = writes[writes.length - 1]!;
    expect(last).toContain("\r\x1b[K");
    expect(last.endsWith("\n")).toBe(true);
  });
});
