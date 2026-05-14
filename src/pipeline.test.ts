import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { run } from "./pipeline.js";

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

describe("pipeline.run — speaker split", () => {
  let homeDir: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  let outDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "okc-home-"));
    outDir = mkdtempSync(join(tmpdir(), "okc-out-"));
    const projects = join(homeDir, ".claude", "projects", "sample");
    mkdirSync(projects, { recursive: true });
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        { message: { role: "user", content: "hello hello world" }, timestamp: "2026-01-01T00:00:00Z" },
        { message: { role: "assistant", content: "absolutely absolutely indeed" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "user", content: "ok claude ok claude" }, timestamp: "2026-01-02T00:00:00Z" },
      ),
    );
    prevHome = process.env.HOME;
    process.env.HOME = homeDir;
    if (process.platform === "win32") process.env.USERPROFILE = homeDir;
    prevCwd = process.cwd();
    process.chdir(outDir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("emits per-speaker topN arrays and a message count into the rendered HTML", async () => {
    const result = await run();
    expect(result.outPath).toBeTruthy();
    const html = await readFile(result.outPath!, "utf8");

    // both arrays present under __DATA__
    expect(html).toContain("topUser");
    expect(html).toContain("topClaude");

    // user-only tokens in topUser (not in topClaude)
    expect(html).toMatch(/"topUser"\s*:\s*\[[\s\S]*?"hello"/);
    expect(html).toMatch(/"topUser"\s*:\s*\[[\s\S]*?"claude"/);
    // assistant-only tokens in topClaude (not in topUser)
    expect(html).toMatch(/"topClaude"\s*:\s*\[[\s\S]*?"absolutely"/);

    // total message count surfaced in __DATA__ meta
    expect(html).toMatch(/"messages"\s*:\s*3/);
  });
});
