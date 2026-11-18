/** Ethiopia's regions and chartered cities with ISO 3166-2 codes, as used for coverage. */
export interface Region {
  code: string;
  en: string;
  am: string;
}

export const ETHIOPIA_REGIONS: Region[] = [
  { code: 'ET-TI', en: 'Tigray', am: 'ትግራይ' },
  { code: 'ET-AF', en: 'Afar', am: 'አፋር' },
  { code: 'ET-AM', en: 'Amhara', am: 'አማራ' },
  { code: 'ET-BE', en: 'Benishangul-Gumuz', am: 'ቤኒሻንጉል ጉሙዝ' },
  { code: 'ET-DD', en: 'Dire Dawa', am: 'ድሬ ዳዋ' },
  { code: 'ET-HA', en: 'Harari', am: 'ሐረሪ' },
  { code: 'ET-GA', en: 'Gambela', am: 'ጋምቤላ' },
  { code: 'ET-AA', en: 'Addis Ababa', am: 'አዲስ አበባ' },
  { code: 'ET-OR', en: 'Oromia', am: 'ኦሮሚያ' },
  { code: 'ET-SO', en: 'Somali', am: 'ሶማሌ' },
  { code: 'ET-SW', en: 'South West Ethiopia', am: 'ደቡብ ምዕራብ ኢትዮጵያ' },
  { code: 'ET-CE', en: 'Central Ethiopia', am: 'ማዕከላዊ ኢትዮጵያ' },
  { code: 'ET-SI', en: 'Sidama', am: 'ሲዳማ' },
  { code: 'ET-SE', en: 'South Ethiopia', am: 'ደቡብ ኢትዮጵያ' },
];

export function regionName(code: string | null | undefined): Region | undefined {
  return ETHIOPIA_REGIONS.find((r) => r.code === code);
}
