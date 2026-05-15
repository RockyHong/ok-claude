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

import type { Opener } from "./openers.js";

export type OpenerEntry = { display: string; count: number };
export type OpenerMap = Map<string, Map<string, number>>;

export function foldOpener(map: OpenerMap, op: Opener): void {
  let inner = map.get(op.key);
  if (!inner) {
    inner = new Map();
    map.set(op.key, inner);
  }
  inner.set(op.surface, (inner.get(op.surface) ?? 0) + 1);
}

export function topNOpeners(map: OpenerMap, n: number): OpenerEntry[] {
  const entries: OpenerEntry[] = [];
  for (const [, surfaceMap] of map) {
    let total = 0;
    let bestSurface = "";
    let bestCount = -1;
    for (const [surface, count] of surfaceMap) {
      total += count;
      if (
        count > bestCount ||
        (count === bestCount && surface < bestSurface)
      ) {
        bestCount = count;
        bestSurface = surface;
      }
    }
    entries.push({ display: bestSurface, count: total });
  }
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.display < b.display ? -1 : a.display > b.display ? 1 : 0;
  });
  return entries.slice(0, n);
}
