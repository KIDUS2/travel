/**
 * In-browser stand-in for the backend, used when VITE_DEMO_MODE is on, so the
 * UI can be tried without Postgres, Keycloak or MinIO. Data lives in memory only.
 */
import type { TeguwazApi } from './api';
import type { TripInvite, TripMember, TripMemory, BookOrder, DeliveryMethod, PrintQuote, PublicStats, AdminUser, Book, Privacy, BookPhoto, Channel, Me, Media, Memory, MemoryInput, Platform, PlatformInfo, Trip, YouTubeStats } from './types';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const northern = uid();
const danakil = uid();

const harar = 'trip-harar';
const trips: Trip[] = [
  { id: northern, name: 'Northern Historic Route', description: null, startDate: '2026-10-26', endDate: '2026-11-04', memoryCount: 0, role: 'OWNER', ownerName: 'Meron T.', memberCount: 1 },
  { id: danakil, name: 'Danakil expedition', description: null, startDate: '2026-10-10', endDate: '2026-10-13', memoryCount: 0, role: 'OWNER', ownerName: 'Meron T.', memberCount: 0 },
  { id: harar, name: 'Harar with the Bekele family', description: null, startDate: '2026-09-20', endDate: '2026-09-23', memoryCount: 0, role: 'EDITOR', ownerName: 'Selam B.', memberCount: 3 },
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
const PLATFORMS: PlatformInfo[] = [
  { id: 'youtube', name: 'YouTube', statsSupported: true, statsAvailable: true, publicStatsAvailable: true, setup: 'Create an OAuth client (Web application) in Google Cloud, enable the YouTube Data API v3 and YouTube Analytics API, then set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY on the backend.' },
  { id: 'tiktok', name: 'TikTok', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: 'Stats coming next: needs a TikTok for Developers app approved for the Display API.' },
  { id: 'instagram', name: 'Instagram', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: "Stats coming next: needs a Meta app with Instagram API access (Business or Creator accounts) and Meta's app review." },
  { id: 'facebook', name: 'Facebook', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: "Stats coming next: needs a Meta app with Pages access and Meta's app review." },
  { id: 'x', name: 'X (Twitter)', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: 'This channel is saved as a link. Stats are not available for it.' },
  { id: 'telegram', name: 'Telegram', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: 'This channel is saved as a link. Stats are not available for it.' },
  { id: 'website', name: 'Website or blog', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: 'This channel is saved as a link. Stats are not available for it.' },
  { id: 'other', name: 'Other', statsSupported: false, statsAvailable: false, publicStatsAvailable: false, setup: 'This channel is saved as a link. Stats are not available for it.' },
];
const platformInfo = (p: Platform) => PLATFORMS.find((x) => x.id === p)!;
let channels: Channel[] = [];
let me: Me = { id: 'demo', email: 'meron@example.com', displayName: 'Meron T.', preferredLanguage: 'en', role: 'ADMIN', status: 'ACTIVE', createdAt: now() };
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
let adminUsers: AdminUser[] = [
  { id: 'demo', email: 'meron@example.com', displayName: 'Meron T.', role: 'ADMIN', status: 'ACTIVE', createdAt: ago(40), lastSeenAt: ago(0), memories: 6, books: 0, channels: 0 },
  { id: uid(), email: 'abebe@example.com', displayName: 'Abebe K.', role: 'USER', status: 'ACTIVE', createdAt: ago(21), lastSeenAt: ago(1), memories: 23, books: 2, channels: 3 },
  { id: uid(), email: 'selam@example.com', displayName: 'Selam G.', role: 'USER', status: 'ACTIVE', createdAt: ago(15), lastSeenAt: ago(3), memories: 41, books: 1, channels: 2 },
  { id: uid(), email: 'dawit@example.com', displayName: 'Dawit M.', role: 'USER', status: 'SUSPENDED', createdAt: ago(9), lastSeenAt: ago(8), memories: 2, books: 0, channels: 1 },
  { id: uid(), email: 'hana@example.com', displayName: 'Hana T.', role: 'USER', status: 'ACTIVE', createdAt: ago(2), lastSeenAt: null, memories: 0, books: 0, channels: 0 },
];
function toChannel(id: string, platform: Platform, name: string, url: string): Channel {
  const info = platformInfo(platform);
  return { id, platform, name, url: url.match(/^https?:\/\//i) ? url.replace(/^http:/i, 'https:') : `https://${url}`,
    statsSupported: info.statsSupported, statsAvailable: info.statsAvailable, connected: false, accountName: null,
    connectedAt: null, lastSyncedAt: null, createdAt: now() };
}

/** A believable 28-day series so the dashboard can be tried in demo mode. */
function demoYouTube(): YouTubeStats {
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (28 - i) * 86400000);
    const base = 900 + Math.round(600 * Math.sin(i / 3) ** 2) + (i > 18 ? 1400 : 0) + ((i * 37) % 250);
    return { date: d.toISOString().slice(0, 10), views: base, likes: Math.round(base * 0.045), comments: Math.round(base * 0.008),
      shares: Math.round(base * 0.006), subscribersGained: Math.round(base / 160) };
  });
  const sum = (k: keyof (typeof days)[number]) => days.reduce((n, d) => n + (d[k] as number), 0);
  const views = sum('views');
  return {
    channelTitle: 'Meron Travels (demo)', subscribers: 4820, totalViews: 312400, videoCount: 46, periodDays: 28,
    periodViews: views, periodLikes: sum('likes'), periodComments: sum('comments'), periodShares: sum('shares'),
    subscribersGained: sum('subscribersGained'),
    engagementRate: Math.round(((sum('likes') + sum('comments') + sum('shares')) / views) * 1000) / 10,
    analyticsAvailable: true, note: null, days,
  };
}
const bookPhotos = new Map<string, BookPhoto[]>();

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

function find(id: string): Memory {
  const m = memories.find((x) => x.id === id);
  if (!m) throw new Error('Memory not found');
  return m;
}

let defaultPrivacy: Privacy = 'PRIVATE';
let orders: BookOrder[] = [];
// Shared-trip demo: memories other members added (they never appear in your own vault).
const othersMemories: TripMemory[] = [
  { memory: { ...seed(harar, 'Feeding the hyenas at night', 'Harar', 'ET-HA', 9.31, 42.13, '2026-09-20T18:30:00Z', 'FAMILY', 'Yusuf held the stick out with meat and the hyena came right up to him.') }, authorId: 'selam', authorName: 'Selam B.', mine: false },
  { memory: { ...seed(harar, 'Jugol walls, Shoa gate', 'Harar', 'ET-HA', 9.311, 42.12, '2026-09-21T09:00:00Z', 'PUBLIC', 'Painted houses and narrow lanes; we got lost on purpose.') }, authorId: 'dawit', authorName: 'Dawit B.', mine: false },
];
let members: Record<string, TripMember[]> = {
  [northern]: [
    { userId: 'demo', name: 'Meron T.', role: 'OWNER', you: true, joinedAt: '2026-10-01T00:00:00Z' },
    { userId: 'abebe', name: 'Abebe K.', role: 'EDITOR', you: false, joinedAt: '2026-10-20T00:00:00Z' },
  ],
  [danakil]: [{ userId: 'demo', name: 'Meron T.', role: 'OWNER', you: true, joinedAt: '2026-10-01T00:00:00Z' }],
  [harar]: [
    { userId: 'selam', name: 'Selam B.', role: 'OWNER', you: false, joinedAt: '2026-09-01T00:00:00Z' },
    { userId: 'dawit', name: 'Dawit B.', role: 'EDITOR', you: false, joinedAt: '2026-09-02T00:00:00Z' },
    { userId: 'demo', name: 'Meron T.', role: 'EDITOR', you: true, joinedAt: '2026-09-05T00:00:00Z' },
    { userId: 'hana', name: 'Hana B.', role: 'VIEWER', you: false, joinedAt: '2026-09-06T00:00:00Z' },
  ],
};
let invites: Record<string, TripInvite[]> = {};
const DEMO_PRICES = {
  base: { 'a4-landscape': 1800, 'a4-portrait': 1800, 'a5-portrait': 950, square: 1500 } as Record<string, number>,
  extra: { 'a4-landscape': 40, 'a4-portrait': 40, 'a5-portrait': 25, square: 35 } as Record<string, number>,
  finish: { hard: 600, soft: 0, lay: 900 } as Record<string, number>,
  delivery: { PICKUP: 0, ADDIS: 250, REGIONAL: 600 } as Record<DeliveryMethod, number>,
};
function demoQuote(book: Book, copies: number, delivery: DeliveryMethod): PrintQuote {
  const designed = Math.max(0, book.pages.length - 1);
  const printed = Math.max(20, designed + (designed % 2));
  const unit = DEMO_PRICES.base[book.settings.size] + DEMO_PRICES.finish[book.settings.finish] + DEMO_PRICES.extra[book.settings.size] * Math.max(0, printed - 20);
  return { designedPages: designed, printedPages: printed, copies, unitPrice: unit, deliveryFee: DEMO_PRICES.delivery[delivery], total: unit * copies + DEMO_PRICES.delivery[delivery], currency: 'ETB' };
}

export const demoApi: TeguwazApi = {
  me: () => delay(me),
  listTrips: () => delay(trips.map((t) => ({ ...t, memoryCount: memories.filter((m) => m.tripId === t.id).length + othersMemories.filter((o) => o.memory.tripId === t.id).length }))),
  createTrip: async (input) => {
    const t: Trip = { id: uid(), name: input.name, description: input.description ?? null, startDate: input.startDate ?? null,
      endDate: input.endDate ?? null, memoryCount: 0, role: 'OWNER', ownerName: me.displayName, memberCount: 0 };
    trips.unshift(t);
    members[t.id] = [{ userId: 'demo', name: me.displayName ?? 'You', role: 'OWNER', you: true, joinedAt: now() }];
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
  listBooks: async () => delay(books.map((b) => {
    const cover = b.pages[0] ?? null;
    const photoId = cover?.slots.p1;
    const url = photoId
      ? memories.flatMap((m) => m.media).find((x) => x.id === photoId)?.url
        ?? (bookPhotos.get(b.id) ?? []).find((x) => x.id === photoId)?.url
      : undefined;
    return {
      id: b.id, title: b.title, tripId: b.tripId, bookType: b.bookType, status: b.status,
      pageCount: b.pages.length, settings: b.settings, coverPage: cover, coverPhotoUrl: url ?? null, updatedAt: b.updatedAt,
    };
  })),
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
  updateMe: async (input) => {
    me = { ...me, ...input };
    return delay(me);
  },
  platforms: async () => delay(PLATFORMS),
  listChannels: async () => delay(channels),
  createChannel: async (input) => {
    const c = toChannel(uid(), input.platform, input.name.trim(), input.url.trim());
    channels = [...channels, c];
    return delay(c);
  },
  updateChannel: async (id, input) => {
    channels = channels.map((c) => (c.id === id ? { ...toChannel(id, input.platform, input.name.trim(), input.url.trim()), connected: c.connected, accountName: c.accountName, connectedAt: c.connectedAt, lastSyncedAt: c.lastSyncedAt, createdAt: c.createdAt } : c));
    return delay(channels.find((c) => c.id === id)!);
  },
  deleteChannel: async (id) => {
    channels = channels.filter((c) => c.id !== id);
    return delay(undefined);
  },
  connectChannel: async (id) => {
    // Demo: pretend the user approved on YouTube's page.
    channels = channels.map((c) => (c.id === id ? { ...c, connected: true, accountName: `${c.name} (demo)`, connectedAt: now(), lastSyncedAt: now() } : c));
    return delay({ authorizeUrl: `/creator?connected=${id}` });
  },
  disconnectChannel: async (id) => {
    channels = channels.map((c) => (c.id === id ? { ...c, connected: false, accountName: null, connectedAt: null, lastSyncedAt: null } : c));
    return delay(channels.find((c) => c.id === id)!);
  },
  channelPublicStats: async (id) => {
    const c = channels.find((x) => x.id === id);
    if (!c) throw new Error('Channel not found');
    // Demo mode has no backend, so these are SAMPLE numbers (the UI labels them as such).
    const titles = ['Lalibela at sunrise', 'Danakil: 45°C walk', 'Simien geladas up close', 'Addis street food', 'Gondar castles tour', 'Buna ceremony at home'];
    const stats: PublicStats = {
      channelId: 'UC-demo', title: c.name, handle: c.url.match(/@[\w.-]+/)?.[0] ?? null, thumbnailUrl: null,
      subscribers: 4820, subscribersHidden: false, totalViews: 312400, videoCount: 46, createdAt: '2023-03-01T00:00:00Z',
      latestVideos: titles.map((t, i) => ({ id: `v${i}`, title: t, publishedAt: new Date(Date.now() - (i * 6 + 2) * 86400000).toISOString(),
        thumbnailUrl: null, views: [12400, 30100, 8700, 5200, 9900, 3100][i], likes: [610, 1500, 420, 260, 470, 150][i], comments: [48, 120, 31, 22, 40, 9][i] })),
      fetchedAt: now(),
    };
    return delay(stats);
  },
  channelStats: async (id) => {
    const c = channels.find((x) => x.id === id);
    if (!c?.connected) throw new Error('Connect this channel first');
    return delay({ ...demoYouTube(), channelTitle: c.name });
  },
  adminSummary: async () => delay({
    users: adminUsers.length, activeLast7Days: adminUsers.filter((u) => u.lastSeenAt && Date.now() - Date.parse(u.lastSeenAt) < 7 * 86400000).length,
    admins: adminUsers.filter((u) => u.role === 'ADMIN').length, suspended: adminUsers.filter((u) => u.status === 'SUSPENDED').length,
    memories: adminUsers.reduce((n, u) => n + u.memories, 0), books: adminUsers.reduce((n, u) => n + u.books, 0),
    channels: adminUsers.reduce((n, u) => n + u.channels, 0),
  }),
  adminUsers: async ({ query, page = 0, size = 25 }) => {
    const q = query?.trim().toLowerCase();
    const all = q ? adminUsers.filter((u) => `${u.email} ${u.displayName}`.toLowerCase().includes(q)) : adminUsers;
    return delay({ items: all.slice(page * size, page * size + size), page, size, total: all.length });
  },
  adminUpdateUser: async (id, patch) => {
    if (id === me.id && (patch.role === 'USER' || patch.status === 'SUSPENDED')) throw new Error('You cannot remove your own admin role or suspend yourself');
    adminUsers = adminUsers.map((u) => (u.id === id ? { ...u, ...patch } : u));
    return delay(adminUsers.find((u) => u.id === id)!);
  },
  deleteBookPhoto: async (bookId, photoId) => {
    bookPhotos.set(bookId, (bookPhotos.get(bookId) ?? []).filter((p) => p.id !== photoId));
    return delay(undefined);
  },
  privacySettings: async () => delay({ defaultPrivacy }),
  updatePrivacySettings: async (input) => {
    defaultPrivacy = input.defaultPrivacy;
    return delay({ defaultPrivacy });
  },
  exportData: async () => delay({
    exportedAt: new Date().toISOString(),
    about: 'Demo mode: sample data only.',
    profile: me,
    trips,
    memories: memories.map(({ media, ...m }) => ({ ...m, files: media.map((x) => ({ kind: x.kind, contentType: x.contentType, sizeBytes: x.sizeBytes })) })),
  }),
  printingInfo: async () => delay({ paymentsAvailable: true, testMode: true, pickupAddress: 'Bole, Addis Ababa (demo pickup point)', minPages: 20, maxPages: 120, deliveryFees: DEMO_PRICES.delivery }),
  quote: async (bookId, copies, delivery) => {
    const book = await demoApi.getBook(bookId);
    return delay(demoQuote(book, copies, delivery));
  },
  createOrder: async (bookId, input) => {
    const book = await demoApi.getBook(bookId);
    const q = demoQuote(book, input.copies, input.delivery);
    if (q.designedPages < 1) throw new Error('Add at least one page after the cover before ordering');
    const id = uid();
    const order: BookOrder = {
      id, bookId, bookTitle: book.title, size: book.settings.size, finish: book.settings.finish, printedPages: q.printedPages, copies: q.copies,
      unitPrice: q.unitPrice, deliveryFee: q.deliveryFee, total: q.total, currency: 'ETB', deliveryMethod: input.delivery,
      recipientName: input.recipientName, phone: input.phone, city: input.city ?? null, address: input.address ?? null, notes: input.notes ?? null,
      status: 'PENDING_PAYMENT', paymentReference: null, paymentMethod: null, checkoutUrl: `/orders/${id}?demo=pay`, paidAt: null, adminNote: null, createdAt: now(),
    };
    orders = [order, ...orders];
    return delay({ order, checkoutUrl: order.checkoutUrl! });
  },
  listOrders: async () => delay(orders),
  getOrder: async (id) => {
    const o = orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    // Demo checkout: returning with ?demo=pay counts as a successful telebirr payment.
    if (o.status === 'PENDING_PAYMENT' && window.location.search.includes('demo=pay')) {
      Object.assign(o, { status: 'PAID', paidAt: now(), paymentMethod: 'telebirr', paymentReference: 'DEMO-' + id.slice(0, 6).toUpperCase(), checkoutUrl: null });
    }
    return delay({ ...o });
  },
  adminOrders: async (status) => delay(status ? orders.filter((o) => o.status === status) : orders),
  tripMembers: async (tripId) => delay(members[tripId] ?? []),
  changeMemberRole: async (tripId, userId, role) => {
    members[tripId] = (members[tripId] ?? []).map((m) => (m.userId === userId ? { ...m, role } : m));
    return delay(undefined);
  },
  removeMember: async (tripId, userId) => {
    members[tripId] = (members[tripId] ?? []).filter((m) => m.userId !== userId);
    const t = trips.find((x) => x.id === tripId);
    if (t) t.memberCount = Math.max(0, (members[tripId]?.length ?? 1) - 1);
    if (userId === 'demo') { const i = trips.findIndex((x) => x.id === tripId); if (i >= 0) trips.splice(i, 1); }
    return delay(undefined);
  },
  tripInvites: async (tripId) => delay(invites[tripId] ?? []),
  createInvite: async (tripId, role) => {
    const inv = { id: uid(), role, expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), uses: 0, createdAt: now() };
    invites[tripId] = [inv, ...(invites[tripId] ?? [])];
    return delay({ id: inv.id, token: `demo-${tripId}-${inv.id}`.slice(0, 40), role, expiresAt: inv.expiresAt });
  },
  revokeInvite: async (tripId, inviteId) => {
    invites[tripId] = (invites[tripId] ?? []).filter((i) => i.id !== inviteId);
    return delay(undefined);
  },
  tripFeed: async (tripId) => {
    const mine = memories.filter((m) => m.tripId === tripId).map((memory) => ({ memory, authorId: 'demo', authorName: 'Meron T.', mine: true }));
    const items = [...mine, ...othersMemories.filter((o) => o.memory.tripId === tripId)]
      .sort((a, b) => a.memory.happenedAt.localeCompare(b.memory.happenedAt));
    return delay({ items, total: items.length });
  },
  invitePreview: async () => delay({ tripId: harar, tripName: 'Harar with the Bekele family', ownerName: 'Selam B.', role: 'EDITOR', alreadyMember: true, expired: false }),
  acceptInvite: async () => delay({ tripId: harar }),
  adminOrderPrintFile: async (id) => {
    const o = orders.find((x) => x.id === id);
    if (!o?.bookId) throw new Error('Order not found');
    const book = await demoApi.getBook(o.bookId);
    const photoUrls: Record<string, string> = {};
    for (const m of memories) for (const x of m.media) photoUrls[x.id] = x.url;
    for (const p of bookPhotos.get(o.bookId) ?? []) photoUrls[p.id] = p.url;
    return delay({ title: book.title, settings: book.settings, pages: book.pages, photoUrls });
  },
  adminUpdateOrder: async (id, status, note) => {
    orders = orders.map((o) => (o.id === id ? { ...o, status, adminNote: note ?? o.adminNote } : o));
    return delay(orders.find((o) => o.id === id)!);
  },
  deleteAccount: async (confirm) => {
    if (confirm !== 'DELETE') throw new Error('Type DELETE to confirm');
    return delay({ filesDeleted: 0, signInDeleted: false });
  },
};
