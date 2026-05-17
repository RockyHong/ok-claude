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
