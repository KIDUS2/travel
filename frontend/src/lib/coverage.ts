import type { Memory } from '../api/types';
import { ETHIOPIA_REGIONS } from './regions';

export interface Coverage {
  visited: Set<string>;
  placesByRegion: Map<string, number>;
  percent: number;
  regionCount: number;
  placeCount: number;
}

/** Coverage of Ethiopia from memories' region codes; places are distinct place names. */
export function computeCoverage(memories: Memory[]): Coverage {
  const placesByRegion = new Map<string, Set<string>>();
  for (const m of memories) {
    if (!m.regionCode || !ETHIOPIA_REGIONS.some((r) => r.code === m.regionCode)) continue;
    const set = placesByRegion.get(m.regionCode) ?? new Set<string>();
    set.add((m.placeName ?? m.title).trim().toLowerCase());
    placesByRegion.set(m.regionCode, set);
  }
  const visited = new Set(placesByRegion.keys());
  const counts = new Map([...placesByRegion].map(([k, v]) => [k, v.size]));
  const placeCount = [...counts.values()].reduce((a, b) => a + b, 0);
  return {
    visited,
    placesByRegion: counts,
    percent: Math.round((visited.size / ETHIOPIA_REGIONS.length) * 100),
    regionCount: visited.size,
    placeCount,
  };
}
