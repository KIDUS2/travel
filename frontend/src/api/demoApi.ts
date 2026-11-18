/**
 * In-browser stand-in for the backend, used when VITE_DEMO_MODE is on, so the
 * UI can be tried without Postgres, Keycloak or MinIO. Data lives in memory only.
 */
import type { TeguwazApi } from './api';
import type { Media, Memory, MemoryInput, Trip } from './types';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const northern = uid();
const danakil = uid();

const trips: Trip[] = [
  { id: northern, name: 'Northern Historic Route', description: null, startDate: '2026-10-26', endDate: '2026-11-04', memoryCount: 0 },
  { id: danakil, name: 'Danakil expedition', description: null, startDate: '2026-10-10', endDate: '2026-10-13', memoryCount: 0 },
];

function seed(tripId: string, title: string, placeName: string, regionCode: string, lat: number, lng: number,
  happenedAt: string, privacy: Memory['privacy'], story: string): Memory {
  return {
    id: uid(), clientId: null, tripId, title, story, placeName, regionCode, latitude: lat, longitude: lng,
    happenedAt, privacy, media: [], createdAt: now(), updatedAt: now(),
  };
}

let memories: Memory[] = [
  seed(northern, 'Fasil Ghebbi castles', 'Gondar', 'ET-AM', 12.607, 37.47, '2026-10-26T07:30:00Z', 'PRIVATE',
    'Walked the royal enclosure in the morning; the walls glow gold before the sun climbs.'),
  seed(northern, 'Geladas near Chenek camp', 'Simien Mountains', 'ET-AM', 13.25, 38.2, '2026-10-28T06:40:00Z', 'PUBLIC',
    'A troop of geladas grazed right beside the trail, completely unbothered by us.'),
  seed(northern, 'Bete Giyorgis at sunrise', 'Lalibela', 'ET-AM', 12.0317, 39.0411, '2026-11-02T03:12:00Z', 'PRIVATE',
    'We walked down before the morning chant began. The light reached the cross-shaped roof first, and for a few minutes it was only us and the sound of prayers rising from below.'),
  seed(northern, 'Buna ceremony with Abeba', 'Lalibela', 'ET-AM', 12.03, 39.04, '2026-11-02T14:00:00Z', 'FAMILY',
    'Three rounds of coffee: abol, tona, baraka. Popcorn and frankincense.'),
  seed(northern, 'The stelae field', 'Axum', 'ET-TI', 14.1317, 38.7192, '2026-11-04T09:00:00Z', 'PRIVATE',
    'Standing under the great stele, trying to imagine how it was raised.'),
  seed(danakil, 'Dallol colors, 45°C', 'Dallol', 'ET-AF', 14.2417, 40.3, '2026-10-12T05:30:00Z', 'FAMILY',
    'Yellow, green and orange pools: the strangest place I have ever stood.'),
];

function recount() {
  trips.forEach((t) => (t.memoryCount = memories.filter((m) => m.tripId === t.id).length));
}
recount();

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

function find(id: string): Memory {
  const m = memories.find((x) => x.id === id);
  if (!m) throw new Error('Memory not found');
  return m;
}

export const demoApi: TeguwazApi = {
  me: () => delay({ id: 'demo', email: 'meron@example.com', displayName: 'Meron T.', preferredLanguage: 'en', createdAt: now() }),
  listTrips: () => delay(trips),
  createTrip: async (input) => {
    const t: Trip = { id: uid(), name: input.name, description: input.description ?? null, startDate: input.startDate ?? null,
      endDate: input.endDate ?? null, memoryCount: 0 };
    trips.unshift(t);
    return delay(t);
  },
  listMemories: async ({ tripId, page = 0, size = 50 } = {}) => {
    const all = tripId
      ? memories.filter((m) => m.tripId === tripId).sort((a, b) => a.happenedAt.localeCompare(b.happenedAt))
      : [...memories].sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
    return delay({ items: all.slice(page * size, page * size + size), page, size, total: all.length });
  },
  getMemory: async (id) => delay(find(id)),
  createMemory: async (input: MemoryInput) => {
    const existing = input.clientId ? memories.find((m) => m.clientId === input.clientId) : undefined;
    if (existing) return delay(existing);
    const m: Memory = {
      id: uid(), clientId: input.clientId ?? null, tripId: input.tripId ?? null, title: input.title, story: input.story ?? null,
      placeName: input.placeName ?? null, regionCode: input.regionCode ?? null, latitude: input.latitude ?? null,
      longitude: input.longitude ?? null, happenedAt: input.happenedAt, privacy: input.privacy ?? 'PRIVATE', media: [],
      createdAt: now(), updatedAt: now(),
    };
    memories = [m, ...memories];
    recount();
    return delay(m);
  },
  updateMemory: async (id, input) => {
    const m = find(id);
    Object.assign(m, { ...input, privacy: input.privacy ?? m.privacy, updatedAt: now() });
    recount();
    return delay(m);
  },
  setPrivacy: async (id, privacy) => {
    const m = find(id);
    m.privacy = privacy;
    return delay(m);
  },
  deleteMemory: async (id) => {
    memories = memories.filter((m) => m.id !== id);
    recount();
    return delay(undefined);
  },
  uploadMedia: async (memoryId, file) => {
    const m = find(memoryId);
    const kind: Media['kind'] = file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : 'PHOTO';
    const media: Media = { id: uid(), kind, contentType: file.type, sizeBytes: file.size, sortOrder: m.media.length,
      url: URL.createObjectURL(file) };
    m.media.push(media);
    return delay(media);
  },
  deleteMedia: async (memoryId, mediaId) => {
    const m = find(memoryId);
    m.media = m.media.filter((x) => x.id !== mediaId);
    return delay(undefined);
  },
};
