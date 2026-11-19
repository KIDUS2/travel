import type { BookPhoto, Memory } from '../../api/types';
import { pinsFromMemories } from '../../components/EthiopiaMap';
import { computeCoverage } from '../../lib/coverage';
import type { PageContext } from './PageView';

/** What pages need to draw: photo URLs (memory or uploaded), map pins and visited regions. */
export function buildPageContext(memories: Memory[], bookPhotos: BookPhoto[], tripId: string | null): PageContext {
  const urls = new Map<string, string>();
  for (const m of memories) for (const x of m.media) if (x.kind === 'PHOTO') urls.set(x.id, x.url);
  for (const p of bookPhotos) urls.set(p.id, p.url);
  const bookMemories = tripId ? memories.filter((m) => m.tripId === tripId) : memories;
  return {
    photoUrl: (id) => (id ? urls.get(id) : undefined),
    mapPins: pinsFromMemories(bookMemories).map((p) => ({ lat: p.lat, lng: p.lng, label: p.label })),
    visitedRegions: computeCoverage(bookMemories).visited,
  };
}
