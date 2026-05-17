export type Opener = { key: string; surface: string };

const TRAILING_PUNCT = /[.,!?;:。、！？]+$/u;
// DEBT-003 rule 1: list-marker strip — digit/letter + `.`/`)`/`:` + whitespace.
// Conservative: requires trailing whitespace so "1.fix" / "1.5" stay intact.
const LIST_MARKER = /^\s*(?:\d+|[A-Za-z])[.):]\s+/;

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function firstOpener(text: string): Opener | null {
  if (!text) return null;
  const cleaned = text.replace(LIST_MARKER, "");
  for (const seg of segmenter.segment(cleaned)) {
    if (!seg.isWordLike) continue;
    const surface = seg.segment.replace(TRAILING_PUNCT, "");
    if (!surface) continue;
    const key = surface.toLocaleLowerCase().replace(TRAILING_PUNCT, "");
    if (!key) continue;
    return { key, surface };
  }
  return null;
}
