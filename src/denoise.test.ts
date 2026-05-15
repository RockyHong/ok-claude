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

  it("normalizes n't clitic — strips full n't cluster (don't → do)", () => {
    expect(denoiseMarkdown("don't worry")).toBe("do worry");
  });

  it("normalizes n't clitic for won't (→ wo)", () => {
    expect(denoiseMarkdown("won't happen")).toBe("wo happen");
  });

  it("normalizes n't clitic for can't (→ ca)", () => {
    expect(denoiseMarkdown("can't tell")).toBe("ca tell");
  });

  it("normalizes n't clitic for isn't / wasn't / weren't / aren't (→ is/was/were/are)", () => {
    expect(denoiseMarkdown("isn't wasn't weren't aren't")).toBe(
      "is was were are",
    );
  });

  it("normalizes n't clitic for wouldn't / couldn't / shouldn't (→ would/could/should)", () => {
    expect(denoiseMarkdown("wouldn't couldn't shouldn't")).toBe(
      "would could should",
    );
  });

  it("normalizes n't clitic for didn't / doesn't (→ did/does)", () => {
    expect(denoiseMarkdown("didn't doesn't")).toBe("did does");
  });

  it("normalizes 'd / 'm / 've / 'll clitics", () => {
    expect(denoiseMarkdown("I'd I'm I've I'll")).toBe("I I I I");
  });

  it("normalizes curly apostrophe clitics (U+2019)", () => {
    expect(denoiseMarkdown("we’re don’t it’s")).toBe(
      "we do it",
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

  it("strips a 3-line JSON-chunk paste (GAP-013)", () => {
    const input = [
      "lead-in prose",
      '{"id":"chatcmpl-1776622205833662976","object":"chat.completion","created":1776622205,"choices":[{"index":0}]}',
      '{"id":"chatcmpl-1776622205833662977","object":"chat.completion","created":1776622206,"choices":[{"index":0}]}',
      '{"id":"chatcmpl-1776622205833662978","object":"chat.completion","created":1776622207,"choices":[{"index":0}]}',
      "tail prose",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("chatcmpl");
    expect(out).not.toContain("chat.completion");
    expect(out).toContain("lead-in prose");
    expect(out).toContain("tail prose");
  });

  it("strips a 3-line short-but-dense JSON triplet (GAP-013)", () => {
    const input = [
      "before",
      '{"stack":[null],"err":"timeout"}',
      '{"stack":[null],"err":"timeout"}',
      '{"stack":[null],"err":"timeout"}',
      "after",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("stack");
    expect(out).not.toContain("null");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("preserves a 2-line JSON paste (below 3+ streak threshold)", () => {
    const input = [
      "talking about config",
      '{"id":"abc","object":"chat.completion","created":123}',
      '{"id":"def","object":"chat.completion","created":456}',
      "back to talking",
    ].join("\n");
    const out = denoiseMarkdown(input);
    // 2 paste-lines is below the 3+ streak rule — block stays intact
    expect(out).toContain("chat.completion");
    expect(out).toContain("talking about config");
    expect(out).toContain("back to talking");
  });

  it("preserves a single dense-punctuation prose line", () => {
    const input = "the array is [a, b, c]: each is {name, age, role} and we need a, b, c, d.";
    const out = denoiseMarkdown(input);
    // Single line ≈ density 0.21 — below threshold AND would still need
    // the 3+ streak guard. Preserved either way.
    expect(out).toContain("the array is");
    expect(out).toContain("we need");
  });

  it("preserves three dense-prose lines just below the density threshold", () => {
    // Each line ≈ density 0.21 from the calibration table — below 0.22.
    // Three in a row still doesn't trip because the helper rejects each line.
    const input = [
      "the array is [a, b, c]: each is {name, age, role} and we need a, b, c.",
      "the array is [d, e, f]: each is {name, age, role} and we need d, e, f.",
      "the array is [g, h, i]: each is {name, age, role} and we need g, h, i.",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("the array");
    expect(out).toContain("we need");
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

  it("strips a Unity-native frame run (0x... (Unity) / (UnityEditor) / (UnityEngine) lines)", () => {
    const input = [
      "stack trace below",
      "0x00007ff7ccba9e7d (Unity) StackWalker::GetCurrentCallstack",
      "0x00007ff7ccba8b21 (UnityEditor) EditorApplication::Update",
      "0x00007ff7ccba7c43 (UnityEngine) GameObject::SendMessage",
      "what next",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("stack trace below");
    expect(out).toContain("what next");
    expect(out).not.toContain("StackWalker");
    expect(out).not.toContain("EditorApplication");
    expect(out).not.toContain("SendMessage");
  });

  it("strips a UnityPlayer-native frame run", () => {
    const input = [
      "player crashed",
      "0x00007ff7cc111111 (UnityPlayer) PlayerLoop::Update",
      "0x00007ff7cc222222 (UnityPlayer) PlayerLoop::Render",
      "0x00007ff7cc333333 (UnityPlayer) ScriptingInvocation::Invoke",
      "anything else",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("player crashed");
    expect(out).toContain("anything else");
    expect(out).not.toContain("PlayerLoop");
    expect(out).not.toContain("ScriptingInvocation");
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

  it("does NOT strip prose of shape `at Noun (phrase: number)` without a slash", () => {
    const input = "we met at Smith (contract: 5 pages) and signed";
    const out = denoiseMarkdown(input);
    expect(out).toContain("Smith");
    expect(out).toContain("contract");
    expect(out).toContain("signed");
  });

  it("strips a Windows absolute path embedded in prose", () => {
    const input =
      "check D:\\Git\\ChewLingo\\apps\\backend\\src\\prompts\\wordMarker.prompts.ts for the bug";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("ChewLingo");
    expect(out).not.toContain("wordMarker");
    expect(out).not.toContain("prompts.ts");
    expect(out).toContain("check");
    expect(out).toContain("for the bug");
  });

  it("strips a lowercase-drive Windows path", () => {
    const input = "saved at c:\\users\\rocky\\notes.md last week";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("rocky");
    expect(out).not.toContain("notes.md");
    expect(out).toContain("saved at");
    expect(out).toContain("last week");
  });

  it("strips a URL embedded in prose", () => {
    const input = "see https://github.com/foo/bar for context";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("github");
    expect(out).not.toContain("foo");
    expect(out).not.toContain("bar");
    expect(out).toContain("see");
    expect(out).toContain("for context");
  });

  it("strips a forward-slash path fragment embedded in prose", () => {
    const input = "check apps/backend/src/modules/srs/skewer.ts please";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("apps");
    expect(out).not.toContain("backend");
    expect(out).not.toContain("skewer");
    expect(out).toContain("check");
    expect(out).toContain("please");
  });

  it("strips a backslash path fragment (no drive letter)", () => {
    const input = "saw src\\shims\\react-native-shim.js earlier";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("shims");
    expect(out).not.toContain("react-native-shim");
    expect(out).toContain("saw");
    expect(out).toContain("earlier");
  });

  it("does NOT strip ordinary slashed prose like a/b", () => {
    const input = "we shipped a/b testing and called it done";
    const out = denoiseMarkdown(input);
    expect(out).toContain("testing");
    expect(out).toContain("done");
  });

  it("does NOT eat prose around a date like 2026/05/15", () => {
    const input = "the 2026/05/15 meeting went well";
    const out = denoiseMarkdown(input);
    expect(out).toContain("meeting went well");
  });

  it("does NOT strip common English slash idioms (and/or, he/she, read/write)", () => {
    const input = "we use and/or in specs and he/she pronouns and read/write locks";
    const out = denoiseMarkdown(input);
    expect(out).toContain("and/or");
    expect(out).toContain("he/she");
    expect(out).toContain("read/write");
  });

  it("does NOT eat closing paren when URL is in parentheses", () => {
    const input = "(see https://github.com/foo for context)";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("github");
    expect(out).toContain("(see");
    expect(out).toContain("for context)");
  });

  it("still strips 2-segment path with file extension", () => {
    const input = "edit src/foo.ts please";
    const out = denoiseMarkdown(input);
    expect(out).not.toContain("foo.ts");
    expect(out).toContain("edit");
    expect(out).toContain("please");
  });
});
