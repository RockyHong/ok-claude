const FENCED_BLOCK = /```[\s\S]*?```/g;
const UNTERMINATED_FENCE = /```[\s\S]*$/;
const INLINE_BACKTICK = /`[^`\n]*`/g;

export function denoiseMarkdown(text: string): string {
  if (!text) return text;

  let out = text.replace(FENCED_BLOCK, " ");
  out = out.replace(UNTERMINATED_FENCE, " ");
  out = stripIndentedBlocks(out);
  out = out.replace(INLINE_BACKTICK, " ");
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
