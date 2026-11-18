import { describe, expect, it } from 'vitest';
import { formatEthiopianAm, toEthiopian } from './ethiopianDate';

describe('toEthiopian', () => {
  it('converts Ethiopian New Year (Meskerem 1)', () => {
    expect(toEthiopian(new Date(2023, 8, 12))).toEqual({ year: 2016, month: 1, day: 1 }); // before a Gregorian leap year
    expect(toEthiopian(new Date(2024, 8, 11))).toEqual({ year: 2017, month: 1, day: 1 });
    expect(toEthiopian(new Date(2026, 8, 11))).toEqual({ year: 2019, month: 1, day: 1 });
  });

  it('converts Genna (Ethiopian Christmas, Tahsas 29)', () => {
    expect(toEthiopian(new Date(2026, 0, 7))).toEqual({ year: 2018, month: 4, day: 29 });
  });

  it('handles Pagume, the 13th month', () => {
    expect(toEthiopian(new Date(2026, 8, 6))).toEqual({ year: 2018, month: 13, day: 1 });
    expect(toEthiopian(new Date(2026, 8, 10))).toEqual({ year: 2018, month: 13, day: 5 });
  });

  it('formats in Amharic', () => {
    expect(formatEthiopianAm(new Date(2026, 10, 18))).toBe('ኅዳር 9 ቀን 2019 ዓ.ም');
  });
});
