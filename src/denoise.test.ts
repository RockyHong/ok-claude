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

  it("normalizes 're clitic (we're → we)", () => {
    expect(denoiseMarkdown("we're going")).toBe("we going");
  });

  it("normalizes 's clitic (it's → it)", () => {
    expect(denoiseMarkdown("it's fine")).toBe("it fine");
  });

  it("normalizes n't clitic (don't → don)", () => {
    expect(denoiseMarkdown("don't worry")).toBe("don worry");
  });

  it("normalizes 'd / 'm / 've / 'll clitics", () => {
    expect(denoiseMarkdown("I'd I'm I've I'll")).toBe("I I I I");
  });

  it("normalizes curly apostrophe clitics (U+2019)", () => {
    expect(denoiseMarkdown("we’re don’t it’s")).toBe(
      "we don it",
    );
  });

  it("leaves bare apostrophes / quoted strings alone", () => {
    const out = denoiseMarkdown("she said 'hello' to me");
    expect(out).toContain("hello");
    expect(out).toContain("she said");
  });

  it("does not strip clitic-looking suffix without leading letter", () => {
    // "'re" with no preceding letter shouldn't be touched as clitic
    const out = denoiseMarkdown(" 're alone");
    expect(out).toContain("'re");
  });
});

describe("denoiseMarkdown — non-fenced paste denoise (GAP-009 D2)", () => {
  it("strips a Java/Unity stack-frame run (3+ lines starting `at `)", () => {
    const input = [
      "context line about the bug",
      "  at UnityEngine.GameObject.SendMessage (System.String methodName)",
      "  at Mono.Cecil.AssemblyDefinition.MainModule",
      "  at System.Reflection.MethodBase.Invoke",
      "tail prose continues",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("context line");
    expect(out).toContain("tail prose continues");
    expect(out).not.toContain("UnityEngine");
    expect(out).not.toContain("Mono");
    expect(out).not.toContain("Cecil");
  });

  it("strips a Python traceback block", () => {
    const input = [
      "I ran the script",
      'File "main.py", line 12, in <module>',
      'File "lib/helper.py", line 44, in run',
      'File "lib/helper.py", line 99, in process',
      "now what",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("I ran the script");
    expect(out).toContain("now what");
    expect(out).not.toContain("main.py");
    expect(out).not.toContain("helper.py");
  });

  it("strips a TS type-error block (3+ identifier-shape lines)", () => {
    const input = [
      "see this error",
      "Type 'string | undefined' is not assignable to type 'string'",
      "  Type 'undefined' is not assignable to type 'string'",
      "src/foo.ts(12,5): error TS2322: Type 'number' is not assignable",
      "what do you think",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("see this error");
    expect(out).toContain("what do you think");
    expect(out).not.toContain("TS2322");
    expect(out).not.toContain("undefined");
  });

  it("does NOT strip a short 1-2 line technical mention", () => {
    const input = "I saw error TS2322 once but it was fine";
    const out = denoiseMarkdown(input);
    expect(out).toContain("error TS2322 once");
  });

  it("does NOT strip plain prose that happens to start with `at`", () => {
    const input = "at noon we talked\nat the meeting we agreed\nand left";
    const out = denoiseMarkdown(input);
    expect(out).toContain("at noon");
    expect(out).toContain("at the meeting");
  });

  it("strips a Mono JIT native-frame run (0x... (Mono JIT Code) lines)", () => {
    const input = [
      "build crashed here",
      "0x000001ac9ba966b5 (Mono JIT Code) (wrapper managed-to-native) UnityEditor.AssetDatabase:ImportPackage",
      "0x000001ac9ba965db (Mono JIT Code) UnityEditor.AssetDatabase:ImportPackage (string,bool)",
      "0x000001ac9ba96543 (Mono JIT Code) Unity.Services.LevelPlay.Editor.IntegrationManagerDownloader",
      "let me know what happened",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("build crashed here");
    expect(out).toContain("let me know what happened");
    expect(out).not.toContain("Mono JIT Code");
    expect(out).not.toContain("UnityEditor");
  });

  it("strips a Gradle task-output run (> Task :... lines)", () => {
    const input = [
      "gradle build output",
      "> Task :unityLibrary:preBuild UP-TO-DATE",
      "> Task :launcher:preBuild UP-TO-DATE",
      "> Task :unityLibrary:generateReleaseResValues UP-TO-DATE",
      "done",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("gradle build output");
    expect(out).toContain("done");
    expect(out).not.toContain("unityLibrary");
    expect(out).not.toContain("UP-TO-DATE");
  });

  it("does NOT strip all-caps prose runs that look like build-error keywords (BUILD_WARNING false-positive guard)", () => {
    const input = [
      "ERROR in my understanding was that the auth flow used cookies",
      "WARNING the next step required a token refresh",
      "FAILURE was inevitable because we forgot to rotate keys",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("ERROR in my understanding");
    expect(out).toContain("WARNING the next step");
    expect(out).toContain("FAILURE was inevitable");
  });
});

describe("denoiseMarkdown — GAP-010 path & stack-frame strip", () => {
  it("strips a single-line stack frame embedded in prose", () => {
    const input =
      "we hit a render bug at View (src\\shims\\react-native-shim.js:62:10) and then crashed";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("react-native-shim");
    expect(out).not.toContain("shims");
    expect(out).toContain("we hit a render bug");
    expect(out).toContain("and then crashed");
  });

  it("strips a single-line stack frame with col-less location", () => {
    const input = "saw at Foo.bar (lib/util.ts:99) once";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("util");
    expect(out).toContain("saw");
    expect(out).toContain("once");
  });
});
