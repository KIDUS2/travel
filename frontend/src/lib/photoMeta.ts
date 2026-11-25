import { distanceKm, locate, type Located } from './places';

export interface PhotoMeta {
  file: File;
  takenAt: Date | null;
  lat: number | null;
  lng: number | null;
  place: Located | null;
}

/** Reads when and where a photo was taken from its EXIF data. Files without EXIF return nulls. */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  const empty: PhotoMeta = { file, takenAt: null, lat: null, lng: null, place: null };
  if (!file.type.startsWith('image/')) return { ...empty, takenAt: file.lastModified ? new Date(file.lastModified) : null };
  try {
    const exifr = (await import('exifr')).default;
    const tags = await exifr.parse(file, { gps: true, exif: true, tiff: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] }) as
      { DateTimeOriginal?: Date; CreateDate?: Date; latitude?: number; longitude?: number } | undefined;
    const takenAt = tags?.DateTimeOriginal ?? tags?.CreateDate ?? null;
    const lat = Number.isFinite(tags?.latitude) ? tags!.latitude! : null;
    const lng = Number.isFinite(tags?.longitude) ? tags!.longitude! : null;
    const hasGps = lat != null && lng != null && !(lat === 0 && lng === 0);
    return {
      file,
      takenAt: takenAt instanceof Date && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
      lat: hasGps ? lat : null,
      lng: hasGps ? lng : null,
      place: hasGps ? locate(lat!, lng!) : null,
    };
  } catch {
    return empty;
  }
}

export interface PhotoGroup {
  key: string;
  day: string; // YYYY-MM-DD, local
  photos: PhotoMeta[];
  lat: number | null;
  lng: number | null;
  place: Located | null;
  start: Date | null;
}

const SAME_PLACE_KM = 8;

function dayKey(d: Date | null) {
  if (!d) return 'unknown';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Groups photos into suggested memories: one per day and place.
 * Photos without GPS join the day's first place, or a "no location" group for that day.
 */
export function groupPhotos(photos: PhotoMeta[]): PhotoGroup[] {
  const sorted = [...photos].sort((a, b) => (a.takenAt?.getTime() ?? Infinity) - (b.takenAt?.getTime() ?? Infinity));
  const groups: PhotoGroup[] = [];
  for (const p of sorted) {
    const day = dayKey(p.takenAt);
    const sameDay = groups.filter((g) => g.day === day);
    let target: PhotoGroup | undefined;
    if (p.lat != null && p.lng != null) {
      target = sameDay.find((g) => g.lat != null && g.lng != null && distanceKm(p.lat!, p.lng!, g.lat, g.lng) <= SAME_PLACE_KM)
        ?? sameDay.find((g) => g.lat == null);
      if (target && target.lat == null) {
        target.lat = p.lat; target.lng = p.lng; target.place = p.place;
      }
    } else {
      target = sameDay[0];
    }
    if (!target) {
      target = { key: `${day}-${groups.length}`, day, photos: [], lat: p.lat, lng: p.lng, place: p.place, start: p.takenAt };
      groups.push(target);
    }
    target.photos.push(p);
  }
  return groups;
}

export function suggestTitle(g: PhotoGroup): string {
  const where = g.place?.placeName;
  const when = g.start ? g.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;
  if (where && when) return `${where} · ${when}`;
  return where ?? (when ? `Photos from ${when}` : 'Photos');
}
