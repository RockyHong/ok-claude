import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
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
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
  };
} {
  const m = html.match(/window\.__DATA__ = ({[\s\S]*?});/);
  if (!m) throw new Error("__DATA__ payload not found in HTML");
  return JSON.parse(m[1]!);
}

describe("pipeline.run — first-word cloud per role (F8)", () => {
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
        {
          message: { role: "user", content: "hello hello world" },
          timestamp: "2026-01-01T00:00:00Z",
        },
        {
          message: {
            role: "assistant",
            content: "absolutely absolutely indeed",
            usage: { input_tokens: 1000, output_tokens: 200 },
          },
          timestamp: "2026-01-01T00:00:01Z",
        },
        {
          message: { role: "user", content: "ok claude ok claude" },
          timestamp: "2026-01-02T00:00:00Z",
        },
        {
          message: {
            role: "assistant",
            content: "more",
            usage: { input_tokens: 500, output_tokens: 50 },
          },
          timestamp: "2026-01-02T00:00:01Z",
        },
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

  it("partitions first-words by speaker and reports counts + token sums + date range", async () => {
    const result = await run();
    expect(result.outPath).toBeTruthy();
    const html = await readFile(result.outPath!, "utf8");

    const data = extractData(html);
    const userWords = data.topUser.map((p) => p[0]);
    const claudeWords = data.topClaude.map((p) => p[0]);

    // user first-words: "hello", "ok"
    expect(userWords).toContain("hello");
    expect(userWords).toContain("ok");
    // claude first-words: "absolutely", "more"
    expect(claudeWords).toContain("absolutely");
    expect(claudeWords).toContain("more");
    // role-isolation
    expect(claudeWords).not.toContain("hello");
    expect(userWords).not.toContain("absolutely");

    expect(data.meta.messages).toBe(4);
    expect(data.meta.tokensIn).toBe(1500);
    expect(data.meta.tokensOut).toBe(250);
    expect(data.meta.dateRange).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-02T00:00:01Z",
    ]);
  });

  it("denoises pasted code blocks before extracting first-word (GAP-002)", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        {
          message: {
            role: "user",
            content:
              "what is happening here\n```ts\nimport { foo } from './src/foo.ts';\nconst paste = paste;\n```\nany ideas",
          },
          timestamp: "2026-01-01T00:00:00Z",
        },
        {
          message: {
            role: "assistant",
            content: "looking",
          },
          timestamp: "2026-01-01T00:00:01Z",
        },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);
    const userWords = data.topUser.map((p) => p[0]);

    expect(userWords).toContain("what");
    // first-word axis: code-only tokens that *would* leak via body-token tokenize
    // cannot appear because only one first-word is captured per message.
    expect(userWords).not.toContain("src");
    expect(userWords).not.toContain("import");
    expect(userWords).not.toContain("paste");
  });

  it("counts first-word occurrences per role across all messages", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // user first-words: foo, foo, baz
        {
          message: { role: "user", content: "foo foo foo foo foo bar" },
          timestamp: "2026-01-01T00:00:00Z",
        },
        {
          message: { role: "user", content: "foo baz" },
          timestamp: "2026-01-01T00:00:01Z",
        },
        {
          message: { role: "user", content: "baz baz baz" },
          timestamp: "2026-01-01T00:00:02Z",
        },
        {
          message: { role: "assistant", content: "ok" },
          timestamp: "2026-01-01T00:00:03Z",
        },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);
    const userPairs = new Map(data.topUser);

    expect(userPairs.get("foo")).toBe(2);
    expect(userPairs.get("baz")).toBe(1);
    // body-token tokens beyond the first word do not leak into the first-word cloud
    expect(userPairs.get("bar")).toBeUndefined();
  });

  it("uses display-case surface for first-word entries (case-folded by key)", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        { message: { role: "user", content: "WTH this broke" }, timestamp: "2026-01-01T00:00:00Z" },
        { message: { role: "user", content: "wth again" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "user", content: "OK got it" }, timestamp: "2026-01-01T00:00:02Z" },
        { message: { role: "user", content: "ok next" }, timestamp: "2026-01-01T00:00:03Z" },
        { message: { role: "user", content: "OK then" }, timestamp: "2026-01-01T00:00:04Z" },
        { message: { role: "user", content: "Sorry, my bad" }, timestamp: "2026-01-01T00:00:05Z" },
        { message: { role: "assistant", content: "Looking into this" }, timestamp: "2026-01-01T00:00:06Z" },
        { message: { role: "assistant", content: "looking deeper" }, timestamp: "2026-01-01T00:00:07Z" },
        { message: { role: "assistant", content: "Sure!" }, timestamp: "2026-01-01T00:00:08Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    expect(data.topUser).toEqual([
      ["OK", 3],
      ["WTH", 2],
      ["Sorry", 1],
    ]);
    expect(data.topClaude).toEqual([
      ["Looking", 2],
      ["Sure", 1],
    ]);
  });

  it("skips first-word extraction for messages with no wordlike segment after denoise", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        {
          message: {
            role: "user",
            content: "```ts\nimport { foo } from './foo.js';\n```",
          },
          timestamp: "2026-01-01T00:00:00Z",
        },
        { message: { role: "user", content: "what now" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "assistant", content: "ok" }, timestamp: "2026-01-01T00:00:02Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    const userTotal = data.topUser.reduce((s, e) => s + e[1], 0);
    expect(userTotal).toBe(1);
    expect(data.topUser[0]?.[0]).toBe("what");
  });

  it("does not buffer all events in memory (regression guard for memory shape)", () => {
    const source = readFileSync(
      new URL("./pipeline.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/events:\s*LogEvent\[\]/);
    expect(source).not.toMatch(/events\.push\(/);
    expect(source).not.toMatch(/\.join\("\\n"\)/);
  });
});
