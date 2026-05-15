const FENCED_BLOCK = /```[\s\S]*?```/g;
const UNTERMINATED_FENCE = /```[\s\S]*$/;
const INLINE_BACKTICK = /`[^`\n]*`/g;
// Single-line stack frame: "at Foo.Bar (path:line[:col])". Catches frames that
// appear inline below the 3-line paste-denoise threshold.
const STACK_FRAME_SINGLE = /\bat\s+[\w.<>$]+\s*\([^)]*[/\\][^)]*:\d+(?::\d+)?\)/g;
// Windows absolute path: drive-letter + colon + backslash + path chars.
// High precision — drive-letter form rare in natural prose.
const WIN_PATH = /[A-Za-z]:\\[\w\\.\-]+/g;
// URL with scheme: stop at whitespace or paired-enclosure punctuation so
// trailing `)`, `]`, `"`, `'`, `<`, `>` belonging to surrounding prose don't
// get eaten.
const URL_PATTERN = /\bhttps?:\/\/[^\s)\]"'<>]+/g;
// Path with file extension: any depth, last segment ends in `.alpha+`.
// Catches src/foo.ts, apps/backend/src/x.ts, dist\foo.js, including paths
// with intermediate dots like `wordMarker.prompts.ts`.
const PATH_WITH_EXT = /\b[\w.\-]+(?:[\\/][\w.\-]+)+\.[a-zA-Z]\w*\b/g;
// Deep path: 3+ segments (2+ separators), no extension required.
// Catches `apps/backend/src`, Unity `Library\Bee\Android\Prj`.
// Accepts date-like `2026/05/15` as known false-positive (plan §Notes).
// Excludes natural 2-segment slash prose like `and/or`, `he/she`, `read/write`.
const DEEP_PATH = /\b[\w.\-]{2,}[\\/][\w.\-]{2,}(?:[\\/][\w.\-]+){1,}/g;
// n't cluster: strips full `n` + apostrophe + `t` (don't → do, can't → ca).
// Runs BEFORE CLITIC so the trailing `n` doesn't survive as a fragment.
// Survivors `wo` (won't) / `ca` (can't) are dropped downstream via STOPWORDS.
const N_CLITIC = /(\p{L})n['’]t\b/giu;
// Clitic suffix: apostrophe (straight or curly) + s/d/m/re/ve/ll, preceded by a letter.
// `t` deliberately omitted — handled by N_CLITIC above.
const CLITIC = /(\p{L})['’](?:s|d|m|re|ve|ll)\b/giu;

export function denoiseMarkdown(text: string): string {
  if (!text) return text;

  let out = text.replace(FENCED_BLOCK, " ");
  out = out.replace(UNTERMINATED_FENCE, " ");
  out = stripIndentedBlocks(out);
  out = stripNonFencedPasteBlocks(out);
  out = out.replace(INLINE_BACKTICK, " ");
  out = out.replace(STACK_FRAME_SINGLE, " ");
  out = out.replace(URL_PATTERN, " ");
  out = out.replace(WIN_PATH, " ");
  out = out.replace(PATH_WITH_EXT, " ");
  out = out.replace(DEEP_PATH, " ");
  out = out.replace(N_CLITIC, "$1");
  out = out.replace(CLITIC, "$1");
  return out;
}

const STACK_FRAME_LINE = /^\s*(at\s+\S+\.|File\s+["'].+["'],\s*line\s+\d+)/;
const TS_TYPE_ERROR =
  /Type\s+'[^']+'\s+is\s+not\s+assignable|error\s+TS\d{4}:|NullReferenceException/;
// Matches lowercase.lowercase (JS/Java/Python pkg paths) OR PascalCase.PascalCase (Unity/C# namespaces)
const IDENT_DOT =
  /[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9]|[A-Z][a-zA-Z0-9]+\.[A-Z][a-zA-Z0-9]/;
const ERROR_CLASS = /[A-Z][a-zA-Z]+(Error|Exception)\b/;
// Engine-native frame: hex address + `(Mono…)` (Mono JIT Code) or Unity native modules.
const NATIVE_JIT_FRAME =
  /^0x[0-9a-fA-F]+\s+\((?:Mono|Unity|UnityEditor|UnityEngine|UnityPlayer)\b/;
// Gradle / Android build tool diagnostic line
// Requires colon after WARNING/ERROR/FAILURE to avoid matching prose like
// "ERROR in my understanding" — real Gradle output uses "WARNING:", "ERROR:".
const BUILD_WARNING =
  /^(?:WARNING:|ERROR:|FAILURE:|> (?:Task|Configure project)|BUILD FAILED)\b/;

function looksLikeStackOrError(line: string): boolean {
  if (STACK_FRAME_LINE.test(line)) return true;
  if (TS_TYPE_ERROR.test(line)) return true;
  if (NATIVE_JIT_FRAME.test(line)) return true;
  if (BUILD_WARNING.test(line)) return true;
  const tokens = line.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length < 3) return false;
  let hits = 0;
  for (const t of tokens) {
    if (IDENT_DOT.test(t) || ERROR_CLASS.test(t)) hits++;
  }
  return hits * 2 >= tokens.length;
}

function stripNonFencedPasteBlocks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let j = i;
    while (j < lines.length && looksLikeStackOrError(lines[j]!)) j++;
    if (j - i >= 3) {
      i = j;
      continue;
    }
    out.push(lines[i]!);
    i++;
  }
  return out.join("\n");
}

function stripIndentedBlocks(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let prevBlank = true;
  let inBlock = false;

  for (const line of lines) {
    const isIndented = /^(?: {4}|\t)/.test(line);
    const isBlank = line.trim() === "";

    if (inBlock) {
      if (isIndented || isBlank) {
        continue;
      }
      inBlock = false;
    }

    if (prevBlank && isIndented) {
      inBlock = true;
      continue;
    }

    kept.push(line);
    prevBlank = isBlank;
  }

  return kept.join("\n");
}
