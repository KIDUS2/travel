export type Privacy = 'PRIVATE' | 'FAMILY' | 'PUBLIC';
export type MediaKind = 'PHOTO' | 'VIDEO' | 'AUDIO';

export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
  preferredLanguage: 'en' | 'am';
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
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
  /** First page, so lists can draw the real cover. */
  coverPage: BookPage | null;
  coverPhotoUrl: string | null;
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

/** A photo uploaded from the device straight into a book. */
export interface BookPhoto {
  id: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

// ---- Channels (Feature 4) ----

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x' | 'telegram' | 'website' | 'other';

export interface PlatformInfo {
  id: Platform;
  name: string;
  statsSupported: boolean;
  statsAvailable: boolean;
  /** Real public stats from the channel link (server has a YouTube API key). */
  publicStatsAvailable: boolean;
  setup: string;
}

export interface PublicVideo {
  id: string;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
}

export interface PublicStats {
  channelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  subscribers: number;
  subscribersHidden: boolean;
  totalViews: number;
  videoCount: number;
  createdAt: string | null;
  latestVideos: PublicVideo[];
  fetchedAt: string;
}

/** A channel the user added by name and link; YouTube ones can be connected for stats. */
export interface Channel {
  id: string;
  platform: Platform;
  name: string;
  url: string;
  statsSupported: boolean;
  statsAvailable: boolean;
  connected: boolean;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface ChannelInput {
  platform: Platform;
  name: string;
  url: string;
}

// ---- User management ----

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastSeenAt: string | null;
  memories: number;
  books: number;
  channels: number;
}

export interface AdminSummary {
  users: number;
  activeLast7Days: number;
  admins: number;
  suspended: number;
  memories: number;
  books: number;
  channels: number;
}

export interface YouTubeDay {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
}

export interface YouTubeStats {
  channelTitle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  periodDays: number;
  periodViews: number;
  periodLikes: number;
  periodComments: number;
  periodShares: number;
  subscribersGained: number;
  engagementRate: number;
  analyticsAvailable: boolean;
  note: string | null;
  days: YouTubeDay[];
}

export interface PrivacySettings {
  defaultPrivacy: Privacy;
}

export interface DeletionResult {
  filesDeleted: number;
  signInDeleted: boolean;
}
