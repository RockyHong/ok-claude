import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { run } from "./pipeline.js";

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

function extractData(html: string): {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  meta: { sessions: number; messages: number; dateRange: [string, string] | null };
} {
  const m = html.match(/window\.__DATA__ = ({[\s\S]*?});/);
  if (!m) throw new Error("__DATA__ payload not found in HTML");
  return JSON.parse(m[1]);
}

describe("pipeline.run — speaker split", () => {
  let homeDir: string;
  let outDir: string;
  let prevHome: string | undefined;
  let prevUserProfile: string | undefined;
  let prevCwd: string;

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
    if (process.platform === "win32") {
      prevUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = homeDir;
    }
    prevCwd = process.cwd();
    process.chdir(outDir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (process.platform === "win32") {
      if (prevUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = prevUserProfile;
    }
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("partitions tokens by speaker and reports the total message count", async () => {
    const result = await run();
    expect(result.outPath).toBeTruthy();
    const html = await readFile(result.outPath!, "utf8");

    const data = extractData(html);
    const userWords = data.topUser.map((p) => p[0]);
    const claudeWords = data.topClaude.map((p) => p[0]);

    // user-only tokens land in topUser, NOT topClaude
    expect(userWords).toContain("hello");
    expect(userWords).toContain("claude");
    expect(claudeWords).not.toContain("hello");
    expect(claudeWords).not.toContain("claude");

    // assistant-only tokens land in topClaude, NOT topUser
    expect(claudeWords).toContain("absolutely");
    expect(claudeWords).toContain("indeed");
    expect(userWords).not.toContain("absolutely");
    expect(userWords).not.toContain("indeed");

    // total message count surfaced in meta
    expect(data.meta.messages).toBe(3);
  });
});
