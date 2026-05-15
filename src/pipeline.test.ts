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
  openersUser: Array<{ display: string; count: number }>;
  openersClaude: Array<{ display: string; count: number }>;
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

  it("partitions tokens by speaker and reports counts + token sums + date range", async () => {
    const result = await run();
    expect(result.outPath).toBeTruthy();
    const html = await readFile(result.outPath!, "utf8");

    const data = extractData(html);
    const userWords = data.topUser.map((p) => p[0]);
    const claudeWords = data.topClaude.map((p) => p[0]);

    expect(userWords).toContain("hello");
    expect(userWords).toContain("claude");
    expect(claudeWords).not.toContain("hello");
    expect(claudeWords).toContain("absolutely");
    expect(claudeWords).toContain("indeed");
    expect(userWords).not.toContain("absolutely");

    expect(data.meta.messages).toBe(4);
    expect(data.meta.tokensIn).toBe(1500);
    expect(data.meta.tokensOut).toBe(250);
    expect(data.meta.dateRange).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-02T00:00:01Z",
    ]);
  });

  it("denoises pasted code blocks before tokenizing (GAP-002)", async () => {
    // Replace the seeded session with one where the user pasted a code blob.
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

    expect(userWords).not.toContain("src");
    expect(userWords).not.toContain("import");
    expect(userWords).not.toContain("paste");
    expect(userWords).toContain("happening");
    expect(userWords).toContain("ideas");
  });

  it("counts raw token occurrences across all messages (no per-message dedup)", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // msg1: foo×5, bar×1
        {
          message: { role: "user", content: "foo foo foo foo foo bar" },
          timestamp: "2026-01-01T00:00:00Z",
        },
        // msg2: foo×1, baz×1
        {
          message: { role: "user", content: "foo baz" },
          timestamp: "2026-01-01T00:00:01Z",
        },
        // msg3: baz×3
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

    expect(userPairs.get("foo")).toBe(6);
    expect(userPairs.get("bar")).toBe(1);
    expect(userPairs.get("baz")).toBe(4);
  });

  it("extracts top openers per role into __DATA__ (F4 opener-frequency)", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // user: WTH x2, OK x3, sorry x1
        { message: { role: "user", content: "WTH this broke" }, timestamp: "2026-01-01T00:00:00Z" },
        { message: { role: "user", content: "wth again" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "user", content: "OK got it" }, timestamp: "2026-01-01T00:00:02Z" },
        { message: { role: "user", content: "ok next" }, timestamp: "2026-01-01T00:00:03Z" },
        { message: { role: "user", content: "OK then" }, timestamp: "2026-01-01T00:00:04Z" },
        { message: { role: "user", content: "Sorry, my bad" }, timestamp: "2026-01-01T00:00:05Z" },
        // assistant: Looking x2, Sure x1
        { message: { role: "assistant", content: "Looking into this" }, timestamp: "2026-01-01T00:00:06Z" },
        { message: { role: "assistant", content: "looking deeper" }, timestamp: "2026-01-01T00:00:07Z" },
        { message: { role: "assistant", content: "Sure!" }, timestamp: "2026-01-01T00:00:08Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    // openersUser: ok=3 (display 'OK'), wth=2 (display 'WTH'), sorry=1 (display 'Sorry')
    expect(data.openersUser).toEqual([
      { display: "OK", count: 3 },
      { display: "WTH", count: 2 },
      { display: "Sorry", count: 1 },
    ]);

    // openersClaude: looking=2 (display 'Looking'), sure=1 (display 'Sure')
    expect(data.openersClaude).toEqual([
      { display: "Looking", count: 2 },
      { display: "Sure", count: 1 },
    ]);
  });

  it("skips opener fold for messages with no wordlike segment after denoise", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // Code-only message — denoise strips, opener should not fold.
        {
          message: {
            role: "user",
            content: "```ts\nimport { foo } from './foo.js';\n```",
          },
          timestamp: "2026-01-01T00:00:00Z",
        },
        // Real opener.
        { message: { role: "user", content: "what now" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "assistant", content: "ok" }, timestamp: "2026-01-01T00:00:02Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    // Only one user message produced an opener.
    const userTotal = data.openersUser.reduce((s, e) => s + e.count, 0);
    expect(userTotal).toBe(1);
    expect(data.openersUser[0]?.display).toBe("what");
  });

  it("does not buffer all events in memory (regression guard for memory shape)", () => {
    const source = readFileSync(
      new URL("./pipeline.ts", import.meta.url),
      "utf8",
    );
    // No accumulator array of LogEvents and no per-role string join allowed.
    expect(source).not.toMatch(/events:\s*LogEvent\[\]/);
    expect(source).not.toMatch(/events\.push\(/);
    expect(source).not.toMatch(/\.join\("\\n"\)/);
  });
});
