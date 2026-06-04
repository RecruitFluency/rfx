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
  domesticPct: number | null; // exact %, null when below the small-sample gate
  intlPct: number | null; // exact %
  domesticPctLabel: number | null; // rounded for display; pairs with intlPctLabel to sum to 100
  intlPctLabel: number | null; // rounded for display
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

  // Display rounding: round ONE side and derive the other so the two labels always
  // sum to exactly 100 and can never contradict the raw "X of N" count.
  const domesticPctLabel = domesticPct === null ? null : Math.round(domesticPct);
  const intlPctLabel = domesticPctLabel === null ? null : 100 - domesticPctLabel;

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
    domesticPctLabel,
    intlPctLabel,
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

// ---- Data integrity --------------------------------------------------------
// The numbers ARE the product. A wrong-but-plausible figure is worse than no
// figure, so every Program is checked against these invariants before it can be
// displayed. Anything that fails is surfaced as an error, never silently shown.

export function validateProgram(p: Program): string[] {
  const errors: string[] = [];
  const pct = (label: string, v: number) => {
    if (v < 0 || v > 100) errors.push(`${label} must be 0–100, got ${v}`);
  };
  const nonNeg = (label: string, v: number) => {
    if (!Number.isFinite(v) || v < 0) errors.push(`${label} must be a non-negative number, got ${v}`);
  };

  pct('rosterIntlPct', p.rosterIntlPct);
  pct('rosterIntlPctPrev', p.rosterIntlPctPrev);
  nonNeg('rosterSize', p.rosterSize);

  let sumResolved = 0;
  let sumUnknown = 0;
  (Object.keys(p.positions) as PositionGroup[]).forEach((g) => {
    const s = p.positions[g];
    nonNeg(`${g}.intl`, s.intl);
    nonNeg(`${g}.resolved`, s.resolved);
    nonNeg(`${g}.unknown`, s.unknown);
    nonNeg(`${g}.depth`, s.depth);
    nonNeg(`${g}.upperclassmen`, s.upperclassmen);

    // International players can never exceed the resolved denominator.
    if (s.intl > s.resolved) errors.push(`${g}: intl (${s.intl}) exceeds resolved (${s.resolved})`);
    // Depth must hold at least the players we counted (resolved + unknown).
    if (s.depth < s.resolved + s.unknown)
      errors.push(`${g}: depth (${s.depth}) is less than resolved+unknown (${s.resolved + s.unknown})`);
    // Upperclassmen can't outnumber the players at the position.
    if (s.upperclassmen > s.depth)
      errors.push(`${g}: upperclassmen (${s.upperclassmen}) exceeds depth (${s.depth})`);
    if (s.prevIntlPct !== null) pct(`${g}.prevIntlPct`, s.prevIntlPct);

    sumResolved += s.resolved;
    sumUnknown += s.unknown;
  });

  // Per-position players must reconcile with the roster total.
  if (sumResolved + sumUnknown > p.rosterSize)
    errors.push(
      `position counts (${sumResolved + sumUnknown}) exceed rosterSize (${p.rosterSize})`
    );

  // Scholarship / competitiveness sanity.
  nonNeg('scholarship.equivalencyLimit', p.scholarship.equivalencyLimit);
  if (p.competitiveness.nationalRank !== null) nonNeg('nationalRank', p.competitiveness.nationalRank);

  return errors;
}
