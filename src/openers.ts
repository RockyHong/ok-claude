export type Opener = { key: string; surface: string };

const TRAILING_PUNCT = /[.,!?;:。、！？]+$/u;
// DEBT-003 rule 1: list-marker strip — digit/letter + `.`/`)`/`:` + whitespace.
// Conservative: requires trailing whitespace so "1.fix" / "1.5" stay intact.
const LIST_MARKER = /^\s*(?:\d+|[A-Za-z])[.):]\s+/;
// DEBT-003 rule 2: role-label strip — known label words + `:` + whitespace.
const ROLE_LABEL = /^\s*(?:request|response|user|assistant|system|prompt|reply):\s+/i;
// DEBT-003 rule 3: short-Latin drop — drop single a-z unless in keep set.
// Mirrors tokenize.ts SHORT_LATIN_KEEP intent; digits preserved (e.g. "1 thing").
const SHORT_LATIN = /^[a-z]$/;
const SHORT_LATIN_KEEP = new Set(["y", "n", "k"]);

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function firstOpener(text: string): Opener | null {
  if (!text) return null;
  const cleaned = text.replace(LIST_MARKER, "").replace(ROLE_LABEL, "");
  for (const seg of segmenter.segment(cleaned)) {
    if (!seg.isWordLike) continue;
    const surface = seg.segment.replace(TRAILING_PUNCT, "");
    if (!surface) continue;
    const key = surface.toLocaleLowerCase().replace(TRAILING_PUNCT, "");
    if (!key) continue;
    if (SHORT_LATIN.test(key) && !SHORT_LATIN_KEEP.has(key)) continue;
    return { key, surface };
  }
  return null;
}
