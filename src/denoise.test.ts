import { describe, it, expect } from "vitest";
import { denoiseMarkdown } from "./denoise.js";

describe("denoiseMarkdown", () => {
  it("returns prose unchanged when no code is present", () => {
    expect(denoiseMarkdown("hello world")).toBe("hello world");
  });

  it("returns empty string unchanged", () => {
    expect(denoiseMarkdown("")).toBe("");
  });

  it("strips a fenced code block (triple backticks)", () => {
    const input = "before\n```\nconst x = 1;\n```\nafter";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("const");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("strips a fenced code block with a language tag", () => {
    const input = "intro\n```ts\nimport { foo } from './src/foo.ts';\n```\nend";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("src");
    expect(out).not.toContain("import");
    expect(out).toContain("intro");
    expect(out).toContain("end");
  });

  it("strips multiple fenced blocks in the same text", () => {
    const input =
      "a\n```\nblock1 noise\n```\nmiddle\n```py\nblock2 noise\n```\nz";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("block1");
    expect(out).not.toContain("block2");
    expect(out).toContain("a");
    expect(out).toContain("middle");
    expect(out).toContain("z");
  });

  it("strips an indented code block (4-space lead)", () => {
    const input = "paragraph\n\n    indented_code_here = 1\n    more_code = 2\n\ntail";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("indented_code_here");
    expect(out).not.toContain("more_code");
    expect(out).toContain("paragraph");
    expect(out).toContain("tail");
  });

  it("does not strip a single short indented line that is actually prose continuation", () => {
    // A lone 4-space indented line after prose without a blank line above
    // is typically a continuation, not a code block. Keep it.
    const input = "talking about something\n    still talking here";
    const out = denoiseMarkdown(input);
    expect(out).toContain("still talking here");
  });

  it("strips inline backtick spans", () => {
    const input = "use `npm install` to add deps";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("npm install");
    expect(out).toContain("use");
    expect(out).toContain("to add deps");
  });

  it("strips inline backticks but leaves surrounding prose intact", () => {
    const input = "the `id` field maps to the `name` column";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("`id`");
    expect(out).not.toContain("`name`");
    expect(out).toContain("the");
    expect(out).toContain("field maps to the");
    expect(out).toContain("column");
  });

  it("handles unterminated fence by stripping to end of text", () => {
    // Pasted code blob with opening ``` but no closing — strip rest.
    const input = "lead-in\n```\nruntime_code = forever\nmore_noise = here";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("runtime_code");
    expect(out).not.toContain("more_noise");
    expect(out).toContain("lead-in");
  });

  it("leaves CJK prose untouched", () => {
    const input = "今天天气很好 `code` 明天也是";
    const out = denoiseMarkdown(input);
    expect(out).toContain("今天天气很好");
    expect(out).toContain("明天也是");
    expect(out).not.toContain("`code`");
  });

  it("strips fenced block content even when block contains backticks inside", () => {
    const input = "x\n```\ndon't `confuse` me\n```\ny";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("confuse");
    expect(out).toContain("x");
    expect(out).toContain("y");
  });
});
