import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";

describe("discoverLogs", () => {
  let homeDir: string;
  let prevHome: string | undefined;
  let prevUserProfile: string | undefined;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "okc-disc-"));
    prevHome = process.env.HOME;
    process.env.HOME = homeDir;
    if (process.platform === "win32") {
      prevUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = homeDir;
    }
  });

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (process.platform === "win32") {
      if (prevUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = prevUserProfile;
    }
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("returns [] when ~/.claude/projects does not exist", async () => {
    expect(await discoverLogs()).toEqual([]);
  });

  it("returns sorted entries with path and size", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    mkdirSync(projects, { recursive: true });
    writeFileSync(join(projects, "b.jsonl"), "second");
    writeFileSync(join(projects, "a.jsonl"), "first-line");

    const entries = await discoverLogs();
    expect(entries.map((e) => e.path)).toEqual([
      join(projects, "a.jsonl"),
      join(projects, "b.jsonl"),
    ]);
    expect(entries[0]?.size).toBe("first-line".length);
    expect(entries[1]?.size).toBe("second".length);
  });

  it("ignores non-.jsonl files", async () => {
    const projects = join(homeDir, ".claude", "projects");
    mkdirSync(projects, { recursive: true });
    writeFileSync(join(projects, "keep.jsonl"), "yes");
    writeFileSync(join(projects, "skip.txt"), "no");

    const entries = await discoverLogs();
    expect(entries.map((e) => e.path)).toEqual([join(projects, "keep.jsonl")]);
  });

  it("exposes logsRoot under the current home", () => {
    expect(logsRoot()).toContain(".claude");
    expect(logsRoot()).toContain("projects");
  });
});
