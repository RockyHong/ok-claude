export function aggregate(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

export function topN(
  freq: Map<string, number>,
  n: number,
): Array<[string, number]> {
  const entries: Array<[string, number]> = [...freq.entries()];
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return entries.slice(0, n);
}
