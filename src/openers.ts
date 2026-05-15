export type Opener = { key: string; surface: string };

const TRAILING_PUNCT = /[.,!?;:。、！？]+$/u;

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function firstOpener(text: string): Opener | null {
  if (!text) return null;
  for (const seg of segmenter.segment(text)) {
    if (!seg.isWordLike) continue;
    const surface = seg.segment.replace(TRAILING_PUNCT, "");
    if (!surface) continue;
    const key = surface.toLocaleLowerCase().replace(TRAILING_PUNCT, "");
    if (!key) continue;
    return { key, surface };
  }
  return null;
}
