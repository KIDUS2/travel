/**
 * In-browser stand-in for the backend, used when VITE_DEMO_MODE is on, so the
 * UI can be tried without Postgres, Keycloak or MinIO. Data lives in memory only.
 */
import type { TeguwazApi } from './api';
import type { Book, BookPhoto, Media, Memory, MemoryInput, Trip } from './types';

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

/** Simple drawn landscapes so demo books have pictures to work with (not real photos). */
function demoPhoto(sky: string, land: string, sun: string, peaks: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#FDF3DC"/></linearGradient></defs><rect width="600" height="400" fill="url(#s)"/><circle cx="460" cy="110" r="46" fill="${sun}"/><path d="${peaks}" fill="${land}"/><path d="M0 330 Q150 300 300 325 T600 315 V400 H0Z" fill="${land}" opacity="0.75"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const PHOTO_SETS: Record<string, [string, string, string, string][]> = {
  Gondar: [['#9CC3D5', '#8A6A48', '#F6C453', 'M0 300 L120 210 L200 260 L320 170 L430 250 L600 200 V400 H0Z']],
  'Simien Mountains': [
    ['#A7C7DC', '#4F6B45', '#FFE29A', 'M0 290 L90 150 L170 230 L260 110 L360 220 L470 140 L600 240 V400 H0Z'],
    ['#C9DCE6', '#5D7A4E', '#FFF1C1', 'M0 310 L140 180 L230 250 L350 140 L480 230 L600 170 V400 H0Z'],
  ],
  Lalibela: [
    ['#F2B880', '#9C6B43', '#FBE3A1', 'M0 300 L160 240 L250 270 L380 220 L600 260 V400 H0Z'],
    ['#E8A87C', '#7E5434', '#FFD58A', 'M0 320 L120 260 L300 290 L420 240 L600 280 V400 H0Z'],
    ['#F5CBA7', '#A47148', '#FFE8B0', 'M0 310 L200 250 L330 280 L470 230 L600 270 V400 H0Z'],
  ],
  Axum: [['#B9D3E3', '#9C937A', '#F7D774', 'M0 320 L180 280 L300 300 L450 270 L600 300 V400 H0Z']],
  Dallol: [
    ['#F4D35E', '#E07A2E', '#FFF6C2', 'M0 330 L150 300 L280 320 L420 290 L600 315 V400 H0Z'],
    ['#EBD96B', '#5FA36E', '#FFF6C2', 'M0 320 L130 295 L260 315 L400 285 L600 305 V400 H0Z'],
  ],
};

memories.forEach((m) => {
  const set = PHOTO_SETS[m.placeName ?? ''] ?? [];
  m.media = set.map(([sky, land, sun, peaks], i) => ({
    id: uid(), kind: 'PHOTO', contentType: 'image/svg+xml', sizeBytes: 0, sortOrder: i, url: demoPhoto(sky, land, sun, peaks),
  }));
});

function recount() {
  trips.forEach((t) => (t.memoryCount = memories.filter((m) => m.tripId === t.id).length));
}
recount();

let books: Book[] = [];
const bookPhotos = new Map<string, BookPhoto[]>();

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
  listBooks: async () => delay(books.map((b) => ({
    id: b.id, title: b.title, tripId: b.tripId, bookType: b.bookType, status: b.status,
    pageCount: b.pages.length, settings: b.settings, updatedAt: b.updatedAt,
  }))),
  getBook: async (id) => {
    const b = books.find((x) => x.id === id);
    if (!b) throw new Error('Book not found');
    return delay(b);
  },
  createBook: async (input) => {
    const b: Book = { ...structuredClone(input), id: uid(), status: 'DRAFT', createdAt: now(), updatedAt: now() };
    books = [b, ...books];
    return delay(b);
  },
  saveBook: async (id, input) => {
    const i = books.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('Book not found');
    books[i] = { ...books[i], ...structuredClone(input), updatedAt: now() };
    return delay(books[i]);
  },
  deleteBook: async (id) => {
    books = books.filter((b) => b.id !== id);
    bookPhotos.delete(id);
    return delay(undefined);
  },
  listBookPhotos: async (bookId) => delay(bookPhotos.get(bookId) ?? []),
  uploadBookPhoto: async (bookId, file) => {
    // Object URLs keep the original photo in this browser tab (demo only; nothing is uploaded).
    const photo: BookPhoto = { id: uid(), contentType: file.type, sizeBytes: file.size, url: URL.createObjectURL(file) };
    bookPhotos.set(bookId, [...(bookPhotos.get(bookId) ?? []), photo]);
    return new Promise((r) => setTimeout(() => r(photo), 300));
  },
  deleteBookPhoto: async (bookId, photoId) => {
    bookPhotos.set(bookId, (bookPhotos.get(bookId) ?? []).filter((p) => p.id !== photoId));
    return delay(undefined);
  },
};
