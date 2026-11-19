export type Privacy = 'PRIVATE' | 'FAMILY' | 'PUBLIC';
export type MediaKind = 'PHOTO' | 'VIDEO' | 'AUDIO';

export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
  preferredLanguage: 'en' | 'am';
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  memoryCount: number;
}

export interface TripInput {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Media {
  id: string;
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  url: string;
}

export interface Memory {
  id: string;
  clientId: string | null;
  tripId: string | null;
  title: string;
  story: string | null;
  placeName: string | null;
  regionCode: string | null;
  latitude: number | null;
  longitude: number | null;
  happenedAt: string;
  privacy: Privacy;
  media: Media[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryInput {
  clientId?: string;
  tripId?: string | null;
  title: string;
  story?: string | null;
  placeName?: string | null;
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  happenedAt: string;
  privacy?: Privacy;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface ApiErrorBody {
  status: number;
  message: string;
  fields?: Record<string, string>;
}

// ---- Books (Feature 3) ----

export type BookType = 'classic' | 'journal' | 'atlas' | 'mini' | 'custom';
export type PageLayout = 'cover' | 'title' | 'full-photo' | 'photo-text' | 'two-photos' | 'grid-3' | 'story' | 'map';
export type PageBackground = 'white' | 'cream' | 'green' | 'tibeb';
export type BookSize = 'a4-landscape' | 'a4-portrait' | 'a5-portrait' | 'square';

/** One page. Photo slots hold a media id; text slots hold text. */
export interface BookPage {
  id: string;
  layout: PageLayout;
  background: PageBackground;
  slots: Record<string, string>;
  memoryId?: string;
}

export interface BookSettings {
  size: BookSize;
  cover: 'tibeb' | 'minimal' | 'photo';
  finish: 'hard' | 'soft' | 'lay';
  language: 'en' | 'am' | 'both';
  includeMap: boolean;
  ethiopianDates: boolean;
}

export interface BookSummary {
  id: string;
  title: string;
  tripId: string | null;
  bookType: BookType;
  status: 'DRAFT' | 'ORDERED';
  pageCount: number;
  settings: BookSettings;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  tripId: string | null;
  bookType: BookType;
  status: 'DRAFT' | 'ORDERED';
  settings: BookSettings;
  pages: BookPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BookInput {
  title: string;
  tripId: string | null;
  bookType: BookType;
  settings: BookSettings;
  pages: BookPage[];
}
