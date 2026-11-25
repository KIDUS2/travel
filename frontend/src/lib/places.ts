import { geoContains, geoDistance } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world110 from 'world-atlas/countries-110m.json';

/**
 * Offline place lookup for photo GPS: no network, so it also works on the road.
 * Ethiopia uses a built-in list of towns and sites with their regions; elsewhere we name the country.
 */
export interface KnownPlace {
  name: string;
  am: string;
  region: string; // ISO 3166-2
  lat: number;
  lng: number;
}

export const ETHIOPIA_PLACES: KnownPlace[] = [
  { name: 'Addis Ababa', am: 'አዲስ አበባ', region: 'ET-AA', lat: 9.03, lng: 38.74 },
  { name: 'Lalibela', am: 'ላሊበላ', region: 'ET-AM', lat: 12.03, lng: 39.04 },
  { name: 'Gondar', am: 'ጎንደር', region: 'ET-AM', lat: 12.61, lng: 37.47 },
  { name: 'Bahir Dar', am: 'ባሕር ዳር', region: 'ET-AM', lat: 11.59, lng: 37.39 },
  { name: 'Blue Nile Falls', am: 'ጢስ ዓባይ', region: 'ET-AM', lat: 11.49, lng: 37.59 },
  { name: 'Debark', am: 'ደባርቅ', region: 'ET-AM', lat: 13.15, lng: 37.9 },
  { name: 'Simien Mountains', am: 'ስሜን ተራሮች', region: 'ET-AM', lat: 13.25, lng: 38.05 },
  { name: 'Debre Markos', am: 'ደብረ ማርቆስ', region: 'ET-AM', lat: 10.33, lng: 37.72 },
  { name: 'Dessie', am: 'ደሴ', region: 'ET-AM', lat: 11.13, lng: 39.63 },
  { name: 'Kombolcha', am: 'ኮምቦልቻ', region: 'ET-AM', lat: 11.08, lng: 39.74 },
  { name: 'Woldia', am: 'ወልዲያ', region: 'ET-AM', lat: 11.83, lng: 39.6 },
  { name: 'Debre Birhan', am: 'ደብረ ብርሃን', region: 'ET-AM', lat: 9.68, lng: 39.53 },
  { name: 'Axum', am: 'አክሱም', region: 'ET-TI', lat: 14.12, lng: 38.72 },
  { name: 'Mekelle', am: 'መቐለ', region: 'ET-TI', lat: 13.5, lng: 39.47 },
  { name: 'Adigrat', am: 'ዓዲግራት', region: 'ET-TI', lat: 14.28, lng: 39.46 },
  { name: 'Hawzen (Gheralta)', am: 'ሓውዜን', region: 'ET-TI', lat: 13.97, lng: 39.43 },
  { name: 'Yeha', am: 'የሐ', region: 'ET-TI', lat: 14.29, lng: 38.98 },
  { name: 'Debre Damo', am: 'ደብረ ዳሞ', region: 'ET-TI', lat: 14.37, lng: 39.29 },
  { name: 'Shire', am: 'ሽረ', region: 'ET-TI', lat: 14.1, lng: 38.28 },
  { name: 'Semera', am: 'ሰመራ', region: 'ET-AF', lat: 11.79, lng: 41.01 },
  { name: 'Dallol (Danakil)', am: 'ዳሎል', region: 'ET-AF', lat: 14.24, lng: 40.3 },
  { name: 'Erta Ale', am: 'ኤርታ አሌ', region: 'ET-AF', lat: 13.6, lng: 40.67 },
  { name: 'Afdera', am: 'አፍዴራ', region: 'ET-AF', lat: 13.2, lng: 40.88 },
  { name: 'Awash National Park', am: 'አዋሽ ብሔራዊ ፓርክ', region: 'ET-AF', lat: 8.85, lng: 40.0 },
  { name: 'Asosa', am: 'አሶሳ', region: 'ET-BE', lat: 10.07, lng: 34.53 },
  { name: 'Gambela', am: 'ጋምቤላ', region: 'ET-GA', lat: 8.25, lng: 34.59 },
  { name: 'Dire Dawa', am: 'ድሬ ዳዋ', region: 'ET-DD', lat: 9.6, lng: 41.85 },
  { name: 'Harar', am: 'ሐረር', region: 'ET-HA', lat: 9.31, lng: 42.12 },
  { name: 'Jijiga', am: 'ጅጅጋ', region: 'ET-SO', lat: 9.35, lng: 42.8 },
  { name: 'Gode', am: 'ጎዴ', region: 'ET-SO', lat: 5.95, lng: 43.55 },
  { name: 'Adama', am: 'አዳማ', region: 'ET-OR', lat: 8.54, lng: 39.27 },
  { name: 'Bishoftu', am: 'ቢሾፍቱ', region: 'ET-OR', lat: 8.75, lng: 38.98 },
  { name: 'Jimma', am: 'ጅማ', region: 'ET-OR', lat: 7.67, lng: 36.83 },
  { name: 'Nekemte', am: 'ነቀምቴ', region: 'ET-OR', lat: 9.09, lng: 36.55 },
  { name: 'Ambo', am: 'አምቦ', region: 'ET-OR', lat: 8.98, lng: 37.86 },
  { name: 'Wenchi Crater Lake', am: 'ወንጪ', region: 'ET-OR', lat: 8.78, lng: 37.88 },
  { name: 'Debre Libanos', am: 'ደብረ ሊባኖስ', region: 'ET-OR', lat: 9.71, lng: 38.85 },
  { name: 'Batu (Ziway)', am: 'ባቱ', region: 'ET-OR', lat: 7.93, lng: 38.71 },
  { name: 'Lake Langano', am: 'ላንጋኖ', region: 'ET-OR', lat: 7.6, lng: 38.75 },
  { name: 'Shashemene', am: 'ሻሸመኔ', region: 'ET-OR', lat: 7.2, lng: 38.59 },
  { name: 'Bale Mountains', am: 'ባሌ ተራሮች', region: 'ET-OR', lat: 7.1, lng: 39.78 },
  { name: 'Robe', am: 'ሮቤ', region: 'ET-OR', lat: 7.12, lng: 40.0 },
  { name: 'Sof Omar Caves', am: 'ሶፍ ዑመር', region: 'ET-OR', lat: 6.91, lng: 40.85 },
  { name: 'Hawassa', am: 'ሀዋሳ', region: 'ET-SI', lat: 7.06, lng: 38.48 },
  { name: 'Wondo Genet', am: 'ወንዶ ገነት', region: 'ET-SI', lat: 7.08, lng: 38.63 },
  { name: 'Arba Minch', am: 'አርባ ምንጭ', region: 'ET-SE', lat: 6.03, lng: 37.55 },
  { name: 'Wolaita Sodo', am: 'ወላይታ ሶዶ', region: 'ET-SE', lat: 6.86, lng: 37.76 },
  { name: 'Dilla', am: 'ዲላ', region: 'ET-SE', lat: 6.41, lng: 38.31 },
  { name: 'Konso', am: 'ኮንሶ', region: 'ET-SE', lat: 5.33, lng: 37.43 },
  { name: 'Jinka', am: 'ጂንካ', region: 'ET-SE', lat: 5.79, lng: 36.57 },
  { name: 'Turmi', am: 'ቱርሚ', region: 'ET-SE', lat: 4.97, lng: 36.49 },
  { name: 'Hosaena', am: 'ሆሳዕና', region: 'ET-CE', lat: 7.55, lng: 37.86 },
  { name: 'Butajira', am: 'ቡታጅራ', region: 'ET-CE', lat: 8.12, lng: 38.37 },
  { name: 'Tiya', am: 'ጢያ', region: 'ET-CE', lat: 8.43, lng: 38.61 },
  { name: 'Bonga', am: 'ቦንጋ', region: 'ET-SW', lat: 7.27, lng: 36.24 },
  { name: 'Mizan Teferi', am: 'ሚዛን ተፈሪ', region: 'ET-SW', lat: 6.99, lng: 35.58 },
  { name: 'Tepi', am: 'ቴፒ', region: 'ET-SW', lat: 7.2, lng: 35.45 },
];

export const ETHIOPIA_COUNTRY_ID = '231';
const EARTH_KM = 6371;
const NAMED_WITHIN_KM = 35; // close enough to call it by the place's name
const REGION_WITHIN_KM = 250; // close enough to guess the region from the nearest place

type CountryFeature = Feature<Geometry, { name: string }> & { id?: string | number };
const COUNTRIES: CountryFeature[] = (() => {
  const t = world110 as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  return (feature(t, t.objects.countries) as FeatureCollection<Geometry, { name: string }>).features as CountryFeature[];
})();

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  return geoDistance([aLng, aLat], [bLng, bLat]) * EARTH_KM;
}

export function countryAt(lat: number, lng: number): { id: string; name: string } | null {
  const c = COUNTRIES.find((f) => geoContains(f, [lng, lat]));
  return c ? { id: String(c.id), name: c.properties.name } : null;
}

export interface Located {
  placeName: string | null;
  regionCode: string | null;
  countryId: string | null;
  countryName: string | null;
}

/** Names a GPS point: an Ethiopian town or site with its region, or the country elsewhere. */
export function locate(lat: number, lng: number): Located {
  let nearest: KnownPlace | null = null;
  let best = Infinity;
  for (const p of ETHIOPIA_PLACES) {
    const d = distanceKm(lat, lng, p.lat, p.lng);
    if (d < best) { best = d; nearest = p; }
  }
  const country = countryAt(lat, lng);
  // The 110m world map is coarse at borders, so a point close to a known Ethiopian place counts as Ethiopia.
  const inEthiopia = country?.id === ETHIOPIA_COUNTRY_ID || (!country && best <= NAMED_WITHIN_KM);
  if (inEthiopia && nearest) {
    return {
      placeName: best <= NAMED_WITHIN_KM ? nearest.name : null,
      regionCode: best <= REGION_WITHIN_KM ? nearest.region : null,
      countryId: ETHIOPIA_COUNTRY_ID,
      countryName: 'Ethiopia',
    };
  }
  return { placeName: country?.name ?? null, regionCode: null, countryId: country?.id ?? null, countryName: country?.name ?? null };
}
