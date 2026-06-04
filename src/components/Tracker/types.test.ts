import { describe, it, expect } from 'vitest';
import {
  readPosition,
  validateProgram,
  SMALL_SAMPLE_GATE,
  PositionStat,
  Program,
} from './types';
import { sampleProgram } from './mockData';

// The numbers ARE the product. These tests pin the derivation math so it can never
// silently drift. (docs/intl-percentage-tracker-spec.md §6)

const baseStat = (over: Partial<PositionStat> = {}): PositionStat => ({
  group: 'FWD',
  intl: 4,
  resolved: 5,
  unknown: 0,
  prevIntlPct: 60,
  upperclassmen: 1,
  depth: 5,
  typicalDepth: 6,
  ...over,
});

describe('readPosition — counts and percentages', () => {
  it('derives the domestic count as resolved - intl', () => {
    expect(readPosition(baseStat({ intl: 4, resolved: 5 })).domestic).toBe(1);
    expect(readPosition(baseStat({ intl: 3, resolved: 9 })).domestic).toBe(6);
  });

  it('rounds percentages so domestic% + intl% ALWAYS sum to exactly 100', () => {
    // Cases where naive independent rounding could sum to 99 or 101.
    const cases: Array<[number, number]> = [
      [3, 9], // 33.33 / 66.67
      [1, 7], // 14.28 / 85.71
      [5, 6], // 83.33 / 16.67
      [2, 6], // 33.33 / 66.67
      [3, 7], // 42.86 / 57.14
      [1, 6],
    ];
    for (const [intl, resolved] of cases) {
      const r = readPosition(baseStat({ intl, resolved }));
      expect(r.domesticPctLabel! + r.intlPctLabel!).toBe(100);
    }
  });

  it('keeps the rounded percentage consistent with the raw count', () => {
    const r = readPosition(baseStat({ intl: 3, resolved: 9 })); // 6 of 9 domestic
    expect(r.domesticPctLabel).toBe(67); // 66.67 -> 67
    expect(r.intlPctLabel).toBe(33);
  });
});

describe('readPosition — small-sample gate (§6.5)', () => {
  it('suppresses % and trend below the gate but still reports the count', () => {
    const r = readPosition(baseStat({ intl: 2, resolved: SMALL_SAMPLE_GATE - 1, prevIntlPct: 50 }));
    expect(r.belowGate).toBe(true);
    expect(r.domesticPct).toBeNull();
    expect(r.domesticPctLabel).toBeNull();
    expect(r.intlPctLabel).toBeNull();
    expect(r.trendPp).toBeNull();
    expect(r.domestic).toBe(1); // count is still exact
  });

  it('shows % exactly at the gate', () => {
    const r = readPosition(baseStat({ intl: 1, resolved: SMALL_SAMPLE_GATE }));
    expect(r.belowGate).toBe(false);
    expect(r.domesticPctLabel).toBe(75);
  });
});

describe('readPosition — trend direction (domestic pp)', () => {
  it('reports more-domestic as a positive pp move', () => {
    // intl 44% -> 33% means domestic 56% -> 67% = +11pp domestic
    const r = readPosition(baseStat({ intl: 3, resolved: 9, prevIntlPct: 44 }));
    expect(Math.round(r.trendPp!)).toBe(11);
  });

  it('reports more-international as a negative pp move', () => {
    // intl 60% -> 80% means domestic 40% -> 20% = -20pp domestic
    const r = readPosition(baseStat({ intl: 4, resolved: 5, prevIntlPct: 60 }));
    expect(Math.round(r.trendPp!)).toBe(-20);
  });

  it('returns null trend when the prior season is unavailable', () => {
    expect(readPosition(baseStat({ prevIntlPct: null })).trendPp).toBeNull();
  });
});

describe('readPosition — worth-a-look signal (§8.6)', () => {
  it('flags strong, opening, domestic positions as worth-a-look', () => {
    // 67% domestic, trending more domestic, 4 openings, not crowded
    const r = readPosition(
      baseStat({ intl: 3, resolved: 9, prevIntlPct: 44, upperclassmen: 4, depth: 8, typicalDepth: 9 })
    );
    expect(r.signal).toBe('worth-a-look');
  });

  it('flags scarce, internationalizing positions as a reach', () => {
    const r = readPosition(baseStat({ intl: 4, resolved: 5, prevIntlPct: 60 }));
    expect(r.signal).toBe('reach');
  });

  it('never returns a confident verdict on a small sample', () => {
    const r = readPosition(baseStat({ intl: 0, resolved: 3 }));
    expect(r.signal).toBe('mixed');
  });
});

describe('validateProgram — data integrity', () => {
  it('passes the sample program', () => {
    expect(validateProgram(sampleProgram)).toEqual([]);
  });

  const broken = (mutate: (p: Program) => void): Program => {
    const p: Program = JSON.parse(JSON.stringify(sampleProgram));
    mutate(p);
    return p;
  };

  it('rejects intl greater than the resolved denominator', () => {
    const errs = validateProgram(broken((p) => (p.positions.FWD.intl = 99)));
    expect(errs.some((e) => e.includes('exceeds resolved'))).toBe(true);
  });

  it('rejects depth smaller than resolved + unknown', () => {
    const errs = validateProgram(broken((p) => (p.positions.DEF.depth = 1)));
    expect(errs.some((e) => e.includes('less than resolved+unknown'))).toBe(true);
  });

  it('rejects upperclassmen exceeding depth', () => {
    const errs = validateProgram(broken((p) => (p.positions.MID.upperclassmen = 99)));
    expect(errs.some((e) => e.includes('exceeds depth'))).toBe(true);
  });

  it('rejects position counts exceeding roster size', () => {
    const errs = validateProgram(broken((p) => (p.rosterSize = 1)));
    expect(errs.some((e) => e.includes('exceed rosterSize'))).toBe(true);
  });

  it('rejects out-of-range percentages', () => {
    const errs = validateProgram(broken((p) => (p.rosterIntlPct = 150)));
    expect(errs.some((e) => e.includes('must be 0–100'))).toBe(true);
  });
});
