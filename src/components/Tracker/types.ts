// Data model for the International % Tracker — athlete's-perspective program card.
// Mirrors the derived objects in docs/intl-percentage-tracker-spec.md (§5, §6, §8.6).

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Confidence = 'high' | 'medium' | 'low';

// Plain-language "worth-a-look" read for the athlete's position (§8.6).
// A signal, never a verdict.
export type LookSignal = 'worth-a-look' | 'mixed' | 'reach';

// Below this resolved-group size we show the count but suppress the % and trend
// and badge "small sample" (§6.5, §16 item 11).
export const SMALL_SAMPLE_GATE = 4;

export interface PositionStat {
  group: PositionGroup;
  intl: number; // international players in group (resolved)
  resolved: number; // denominator: intl + domestic (unknowns excluded)
  unknown: number; // unresolved nationality, shown separately, never in denominator
  prevIntlPct: number | null; // prior-season intl %; null if prior season below the gate
  upperclassmen: number; // Jr/Sr/Grad at this position -> projected-openings indicator (§5)
  depth: number; // total carried at this position group (roster spots)
  typicalDepth: number; // typical carried at this position group (for context)
}

// v1.1 — program-level scholarship context (§6.6). Program-level only, never an
// individual athlete's offer.
export interface ScholarshipContext {
  isEquivalencySport: boolean;
  equivalencyLimit: number; // public NCAA constant, e.g. 9.9 (men's D1), 14 (women's)
  fullyFunded: boolean | null; // null = unknown / no credible source
  confidence: Confidence;
  source: string;
  asOf: string;
}

// v1.1 — program-level competitiveness / level indicators (§6.6).
export interface Competitiveness {
  conference: string;
  record: string; // e.g. "14-3-2"
  nationalRank: number | null; // national poll rank, if a credible one exists
  rating: string | null; // e.g. "RPI #12"
  confidence: Confidence;
  source: string;
  asOf: string;
}

export interface Program {
  id: string;
  school: string;
  gender: 'Men' | 'Women';
  division: 'D1';
  rosterSize: number;
  rosterIntlPct: number; // roster-wide headline intl % (current season)
  rosterIntlPctPrev: number; // prior season, for the YoY headline trend
  positions: Record<PositionGroup, PositionStat>;
  scholarship: ScholarshipContext; // v1.1
  competitiveness: Competitiveness; // v1.1
  rosterAsOf: string; // "data as of" date for the roster scrape
  rosterSource: string; // provenance label
  methodologyVersion: string;
}

// ---- Derived helpers -------------------------------------------------------

export interface PositionRead {
  group: PositionGroup;
  domestic: number;
  domesticPct: number | null; // null when below the small-sample gate
  intlPct: number | null;
  belowGate: boolean;
  trendPp: number | null; // change in DOMESTIC pp vs prior season (+ = more domestic)
  openings: number; // upperclassmen indicator
  crowded: boolean; // depth at/above typical
  signal: LookSignal;
}

export function readPosition(stat: PositionStat): PositionRead {
  const belowGate = stat.resolved < SMALL_SAMPLE_GATE;
  const domestic = stat.resolved - stat.intl;
  const intlPct = belowGate ? null : (stat.intl / stat.resolved) * 100;
  const domesticPct = belowGate ? null : (domestic / stat.resolved) * 100;

  // Trend only when both seasons clear the gate (§6.5).
  const trendPp =
    belowGate || stat.prevIntlPct === null || intlPct === null
      ? null
      : // domestic pp move = -(intl pp move)
        -(intlPct - stat.prevIntlPct);

  const crowded = stat.depth >= stat.typicalDepth;

  const signal = computeSignal({ domesticPct, trendPp, openings: stat.upperclassmen, crowded });

  return {
    group: stat.group,
    domestic,
    domesticPct,
    intlPct,
    belowGate,
    trendPp,
    openings: stat.upperclassmen,
    crowded,
    signal,
  };
}

// Combines current domestic opportunity, trend direction, and roster churn for the
// athlete's position into a plain-language signal (§8.6). Intentionally simple and
// transparent — the underlying numbers are always shown alongside it.
function computeSignal(args: {
  domesticPct: number | null;
  trendPp: number | null;
  openings: number;
  crowded: boolean;
}): LookSignal {
  const { domesticPct, trendPp, openings, crowded } = args;
  if (domesticPct === null) return 'mixed'; // small sample -> never a confident verdict

  let score = 0;
  if (domesticPct >= 60) score += 2;
  else if (domesticPct >= 40) score += 1;
  else score -= 1;

  if (trendPp !== null) {
    if (trendPp >= 5) score += 1; // trending more domestic
    else if (trendPp <= -5) score -= 1; // trending more international
  }

  if (openings >= 3) score += 1;
  if (crowded) score -= 1;

  if (score >= 2) return 'worth-a-look';
  if (score <= -1) return 'reach';
  return 'mixed';
}
