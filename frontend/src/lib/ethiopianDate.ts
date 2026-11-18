/**
 * Gregorian → Ethiopian calendar conversion (Amete Mihret era), via Julian Day Number.
 * Ethiopian years have 12 months of 30 days and a 13th month (Pagume) of 5 or 6 days.
 */

export const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];

export const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

const ETHIOPIC_EPOCH_OFFSET = 1723856;

export interface EthiopianDate {
  year: number;
  month: number; // 1..13
  day: number; // 1..30
}

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - ETHIOPIC_EPOCH_OFFSET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - ETHIOPIC_EPOCH_OFFSET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

/** e.g. "ኅዳር 9 ቀን 2019 ዓ.ም" */
export function formatEthiopianAm(date: Date): string {
  const e = toEthiopian(date);
  return `${ETHIOPIAN_MONTHS_AM[e.month - 1]} ${e.day} ቀን ${e.year} ዓ.ም`;
}

/** e.g. "ኅዳር 9" */
export function formatEthiopianShortAm(date: Date): string {
  const e = toEthiopian(date);
  return `${ETHIOPIAN_MONTHS_AM[e.month - 1]} ${e.day}`;
}

/** e.g. "Hidar 9, 2019 E.C." */
export function formatEthiopianEn(date: Date): string {
  const e = toEthiopian(date);
  return `${ETHIOPIAN_MONTHS_EN[e.month - 1]} ${e.day}, ${e.year} E.C.`;
}
