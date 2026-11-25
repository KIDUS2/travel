import { describe, expect, it } from 'vitest';
import { groupPhotos, suggestTitle, type PhotoMeta } from './photoMeta';
import { locate } from './places';

describe('locate', () => {
  it('names a known Ethiopian site and its region', () => {
    expect(locate(12.031, 39.047)).toMatchObject({ placeName: 'Lalibela', regionCode: 'ET-AM', countryName: 'Ethiopia' });
    expect(locate(9.01, 38.76)).toMatchObject({ placeName: 'Addis Ababa', regionCode: 'ET-AA' });
  });
  it('guesses the region between towns without naming a place', () => {
    const r = locate(10.8, 39.0);
    expect(r.placeName).toBeNull();
    expect(r.regionCode).toMatch(/^ET-/);
  });
  it('names the country outside Ethiopia', () => {
    expect(locate(-1.29, 36.82)).toMatchObject({ placeName: 'Kenya', regionCode: null });
    expect(locate(48.86, 2.35).countryName).toBe('France');
  });
});

const photo = (iso: string | null, lat: number | null = null, lng: number | null = null): PhotoMeta => ({
  file: new File([], 'p.jpg'), takenAt: iso ? new Date(iso) : null, lat, lng, place: lat != null && lng != null ? locate(lat, lng) : null,
});

describe('groupPhotos', () => {
  it('makes one memory per day and place, and puts GPS-less photos with that day', () => {
    const groups = groupPhotos([
      photo('2026-11-17T07:10:00', 12.03, 39.04),
      photo('2026-11-17T07:40:00', 12.032, 39.045),
      photo('2026-11-17T09:00:00'),
      photo('2026-11-18T08:00:00', 12.61, 37.47),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].photos).toHaveLength(3);
    expect(suggestTitle(groups[0])).toBe('Lalibela · 17 Nov');
    expect(groups[1].place?.placeName).toBe('Gondar');
  });
});
