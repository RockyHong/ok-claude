const FENCED_BLOCK = /```[\s\S]*?```/g;
const UNTERMINATED_FENCE = /```[\s\S]*$/;
const INLINE_BACKTICK = /`[^`\n]*`/g;
// Clitic suffix: apostrophe (straight or curly) + s/t/d/m/re/ve/ll, preceded by a letter.
// "don't" matches as (n)'t → keeps "don", drops "'t" — same handling as 's/'re/'d.
const CLITIC = /(\p{L})['’](?:s|t|d|m|re|ve|ll)\b/giu;

export function denoiseMarkdown(text: string): string {
  if (!text) return text;

  let out = text.replace(FENCED_BLOCK, " ");
  out = out.replace(UNTERMINATED_FENCE, " ");
  out = stripIndentedBlocks(out);
  out = stripNonFencedPasteBlocks(out);
  out = out.replace(INLINE_BACKTICK, " ");
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
// Mono JIT native-code frame: hex address followed by "(Mono JIT Code)" or "(Mono)"
const MONO_JIT_FRAME = /^0x[0-9a-fA-F]+\s+\(Mono/;
// Gradle / Android build tool diagnostic line
const BUILD_WARNING =
  /^(?:WARNING|ERROR|FAILURE|> (?:Task|Configure project)|BUILD FAILED)\b/;

function looksLikeStackOrError(line: string): boolean {
  if (STACK_FRAME_LINE.test(line)) return true;
  if (TS_TYPE_ERROR.test(line)) return true;
  if (MONO_JIT_FRAME.test(line)) return true;
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
