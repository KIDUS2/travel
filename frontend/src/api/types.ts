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
