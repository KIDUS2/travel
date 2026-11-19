import type { BookPage, BookSettings, BookSize, BookType, Memory, PageBackground, PageLayout, Trip } from '../../api/types';
import { computeCoverage } from '../../lib/coverage';
import { formatEthiopianAm } from '../../lib/ethiopianDate';
import { regionName } from '../../lib/regions';

export interface LayoutDef {
  id: PageLayout;
  label: string;
  am: string;
  photos: string[];
  texts: string[];
}

export const LAYOUTS: LayoutDef[] = [
  { id: 'cover', label: 'Cover', am: 'ሽፋን', photos: ['p1'], texts: ['kicker', 'title', 'subtitle'] },
  { id: 'title', label: 'Chapter title', am: 'ርዕስ', photos: [], texts: ['kicker', 'title', 'body'] },
  { id: 'full-photo', label: 'Full photo', am: 'ሙሉ ፎቶ', photos: ['p1'], texts: ['caption'] },
  { id: 'photo-text', label: 'Photo + story', am: 'ፎቶና ታሪክ', photos: ['p1'], texts: ['heading', 'meta', 'body'] },
  { id: 'two-photos', label: 'Two photos', am: 'ሁለት ፎቶ', photos: ['p1', 'p2'], texts: ['caption'] },
  { id: 'grid-3', label: 'Three photos', am: 'ሦስት ፎቶ', photos: ['p1', 'p2', 'p3'], texts: ['caption'] },
  { id: 'story', label: 'Story', am: 'ታሪክ', photos: [], texts: ['heading', 'body'] },
  { id: 'map', label: 'Coverage map', am: 'የጉዞ ካርታ', photos: [], texts: ['heading', 'body'] },
];

export const layoutDef = (id: PageLayout) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[3];

export const BACKGROUNDS: { id: PageBackground; label: string; swatch: string }[] = [
  { id: 'white', label: 'White', swatch: '#FFFFFF' },
  { id: 'cream', label: 'Cream', swatch: '#F8F1E1' },
  { id: 'green', label: 'Highland green', swatch: '#0B3D23' },
  { id: 'tibeb', label: 'Tibeb border', swatch: 'repeating-linear-gradient(90deg,#078930 0 6px,#FCDD09 6px 12px,#DA121A 12px 18px)' },
];

/** Page width / height for each book size. */
export const PAGE_RATIO: Record<BookSize, number> = {
  'a4-landscape': 297 / 210,
  'a4-portrait': 210 / 297,
  'a5-portrait': 148 / 210,
  square: 1,
};

export const PAGE_MM: Record<BookSize, [number, number]> = {
  'a4-landscape': [297, 210],
  'a4-portrait': [210, 297],
  'a5-portrait': [148, 210],
  square: [200, 200],
};

export const SIZE_LABEL: Record<BookSize, string> = {
  'a4-landscape': 'A4 landscape',
  'a4-portrait': 'A4 portrait',
  'a5-portrait': 'A5 portrait',
  square: '20 × 20 cm square',
};

export const BOOK_TYPES: { id: BookType; name: string; am: string; spec: string; size: BookSize; thumb: string; band: boolean; popular?: boolean }[] = [
  { id: 'classic', name: 'Classic photo book', am: 'የፎቶ መጽሐፍ', spec: 'A4 landscape · big photos, short captions', size: 'a4-landscape', thumb: '#C4A27A', band: true, popular: true },
  { id: 'journal', name: 'Travel journal', am: 'የጉዞ ማስታወሻ', spec: 'A5 portrait · your stories with photos', size: 'a5-portrait', thumb: '#7E9A72', band: false },
  { id: 'atlas', name: 'Coverage atlas', am: 'የጉዞ አትላስ', spec: 'A4 portrait · maps and a chapter per region', size: 'a4-portrait', thumb: '#0B3D23', band: true },
  { id: 'mini', name: 'Pocket mini', am: 'የኪስ መጽሐፍ', spec: '20 × 20 cm · one photo per page', size: 'square', thumb: '#D9B23F', band: false },
  { id: 'custom', name: 'Custom request', am: 'የራስዎ ምርጫ', spec: 'Describe it, we design it for you', size: 'a4-landscape', thumb: '#F0ECE0', band: false },
];

export const newId = () => crypto.randomUUID();

export function blankPage(layout: PageLayout, background: PageBackground = 'white'): BookPage {
  return { id: newId(), layout, background, slots: {} };
}

/** Switching layout keeps slots with the same name (photos and text carry over). */
export function changeLayout(page: BookPage, layout: PageLayout): BookPage {
  const def = layoutDef(layout);
  const keep = new Set([...def.photos, ...def.texts]);
  const slots = Object.fromEntries(Object.entries(page.slots).filter(([k]) => keep.has(k)));
  // Carry text across differently named slots where it makes sense.
  if (!slots.heading && page.slots.title && def.texts.includes('heading')) slots.heading = page.slots.title;
  if (!slots.title && page.slots.heading && def.texts.includes('title')) slots.title = page.slots.heading;
  if (!slots.caption && page.slots.heading && def.texts.includes('caption')) slots.caption = page.slots.heading;
  return { ...page, layout, slots };
}

export function memoryMeta(m: Memory, ethiopianDates: boolean): string {
  const region = regionName(m.regionCode);
  const d = new Date(m.happenedAt);
  const date = ethiopianDates
    ? `${formatEthiopianAm(d)} · ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return [m.placeName, region?.en, date].filter(Boolean).join(' · ');
}

/** Pages for one memory: a photo + story page, then extra photos two at a time. */
export function pagesForMemory(m: Memory, settings: BookSettings, background: PageBackground = 'white'): BookPage[] {
  const photos = m.media.filter((x) => x.kind === 'PHOTO');
  const pages: BookPage[] = [{
    id: newId(), layout: 'photo-text', background, memoryId: m.id,
    slots: {
      ...(photos[0] ? { p1: photos[0].id } : {}),
      heading: m.title,
      meta: memoryMeta(m, settings.ethiopianDates),
      body: m.story ?? '',
    },
  }];
  const rest = photos.slice(1);
  for (let i = 0; i < rest.length; i += 2) {
    const pair = rest.slice(i, i + 2);
    pages.push({
      id: newId(), layout: pair.length === 2 ? 'two-photos' : 'full-photo', background, memoryId: m.id,
      slots: { p1: pair[0].id, ...(pair[1] ? { p2: pair[1].id } : {}), caption: m.title },
    });
  }
  return pages;
}

export function mapPageText(memories: Memory[]) {
  const cov = computeCoverage(memories);
  return {
    heading: 'My Ethiopia · የእኔ ኢትዮጵያ',
    body: `${cov.percent}% explored · ${cov.regionCount} of 14 regions · ${cov.placeCount} places`,
  };
}

/** The "auto-create" button: a full first draft from a trip's memories. */
export function autoGenerate(opts: { title: string; travelerName: string; trip?: Trip; memories: Memory[]; settings: BookSettings }): BookPage[] {
  const { title, travelerName, trip, settings } = opts;
  const memories = [...opts.memories].sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
  const firstPhoto = memories.flatMap((m) => m.media).find((x) => x.kind === 'PHOTO');
  const coverBg: PageBackground = settings.cover === 'minimal' ? 'cream' : settings.cover === 'tibeb' ? 'green' : 'white';
  const first = memories[0] ? new Date(memories[0].happenedAt) : new Date();

  const pages: BookPage[] = [
    {
      id: newId(), layout: 'cover', background: coverBg,
      slots: { ...(firstPhoto ? { p1: firstPhoto.id } : {}), kicker: 'የጉዞ ትዝታዬ', title, subtitle: `${travelerName} · ${formatEthiopianAm(first)}` },
    },
    {
      id: newId(), layout: 'title', background: 'tibeb',
      slots: {
        kicker: trip?.startDate ? `${trip.startDate}${trip.endDate ? ` – ${trip.endDate}` : ''}` : 'A journey through Ethiopia',
        title: trip?.name ?? title,
        body: trip?.description ?? `${memories.length} memories from ${new Set(memories.map((m) => m.placeName).filter(Boolean)).size} places.`,
      },
    },
  ];
  for (const m of memories) pages.push(...pagesForMemory(m, settings));
  if (settings.includeMap) pages.push({ id: newId(), layout: 'map', background: 'cream', slots: mapPageText(memories) });
  pages.push({
    id: newId(), layout: 'story', background: 'tibeb',
    slots: { heading: 'Until the next journey · እስከሚቀጥለው ጉዞ', body: 'Write a closing note to yourself, or to whoever reads this book one day.' },
  });
  return pages;
}

/** Cover alone, then pages in pairs, like an open book. */
export function spreadsOf(pages: BookPage[]): number[][] {
  if (!pages.length) return [];
  const spreads: number[][] = [[0]];
  for (let i = 1; i < pages.length; i += 2) spreads.push(i + 1 < pages.length ? [i, i + 1] : [i]);
  return spreads;
}

export const DEFAULT_SETTINGS: BookSettings = {
  size: 'a4-landscape', cover: 'tibeb', finish: 'hard', language: 'both', includeMap: true, ethiopianDates: true,
};
