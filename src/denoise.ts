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
  out = out.replace(INLINE_BACKTICK, " ");
  out = out.replace(CLITIC, "$1");
  return out;
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
