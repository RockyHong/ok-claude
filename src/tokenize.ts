const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "at",
  "for", "and", "or", "but", "i", "you", "it", "this", "that", "with", "as",
  "be", "by", "from", "if", "so", "not", "do", "does", "did", "have", "has",
  "had", "will", "would", "can", "could", "should", "just", "like", "get",
  "got",
  // Orphan clitic fragments (GAP-014): ICU keeps contractions whole, but a bare
  // suffix like "'re alone" tokenizes its 2-char tail as "re". 1-char tails
  // (s/d/m/t) caught by length-1 Latin filter below.
  "nt", "re", "ve", "ll",
]);

const CJK_SCRIPT =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u;

const SHORT_LATIN_KEEP = new Set(["y", "n", "k"]);

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function tokenize(text: string): string[] {
  if (!text) return [];

  const out: string[] = [];
  for (const seg of segmenter.segment(text)) {
    if (!seg.isWordLike) continue;

    const lower = seg.segment.toLocaleLowerCase();
    const isCjk = CJK_SCRIPT.test(lower);

    if (!isCjk && [...lower].length < 2 && !SHORT_LATIN_KEEP.has(lower))
      continue;
    if (/^\d+$/.test(lower)) continue;
    if (STOPWORDS.has(lower)) continue;

    out.push(lower);
  }
  return out;
}
