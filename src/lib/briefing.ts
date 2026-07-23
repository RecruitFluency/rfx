/**
 * AI Relational Briefing engine.
 *
 * This is the "communication layer" that sits on top of the platform's scores and
 * vectors and turns them into plain English — the thing a club director, college
 * coach, or pro coach actually reads. Every score on the dashboard (SyncScore,
 * tactical fit, AthleteDISC, MTQ48 resilience, development gaps) means nothing on
 * its own; `generateBriefing()` translates those numbers into: how spot-on a player
 * is for your program, where they are today, what they'd have to work on to get
 * there, whether that's feasible, and the recommended next move.
 *
 * `generateBriefing()` is deterministic and runs entirely client-side, so the
 * feature works today with no backend. `generateBriefingAI()` is the seam where the
 * real vector-database retrieval + LLM call plugs in later — same input, same output
 * shape, so the UI never changes.
 */

export type Lens = 'college' | 'club' | 'pro';
export type Feasibility = 'feasible' | 'stretch' | 'longshot';
export type FlightRisk = 'low' | 'moderate' | 'elevated';

/** A single thing standing between the player and your first-choice XI. */
export interface DevelopmentGap {
  area: string;
  current: string;
  target: string;
  feasibility: Feasibility;
  horizon: string;
}

/** Optional pro-pathway signals used by the "Pro" lens (finance / negotiation). */
export interface ProSignals {
  estValueUsd: number;
  contractStatus: string;
  wageExpectationUsd: number;
  /** 0-100 — how much leverage the buying side holds. Higher = better for you. */
  buyerLeverage: number;
}

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  gradYear: number;
  position: string;
  club: string;
  league: string;
  location: string;

  /** Overall 0-100 match score for the target context. */
  syncScore: number;

  // --- Tactical vector ---
  schemeFit: number; // % alignment with the target scheme
  avgCoverageKm: number;
  transitionTier: 'T-1' | 'T-2' | 'T-3';
  tacticalTags: string[];

  // --- Cultural vector (AthleteDISC) ---
  discProfile: string;
  coachStyleFit: number; // % fit with the coach's communication style
  selfRegulation: number; // 0-100

  // --- Resilience vector (MTQ48) ---
  mtqControl: number; // 0-100
  mtqCommitment: number; // 0-100
  flightRisk: FlightRisk;

  gaps: DevelopmentGap[];
  pro?: ProSignals;
}

/** The program/context the player is being read against. */
export interface TargetContext {
  program: string;
  scheme: string;
  coachStyle: string;
  level: string;
  need: string;
}

export interface BriefingSection {
  title: string;
  body: string;
}

export interface Briefing {
  matchBand: string;
  verdict: string;
  sections: BriefingSection[];
  gaps: DevelopmentGap[];
  nextSteps: string[];
  bottomLine: string;
}

// --- Phrase helpers: this is where a number becomes a word. ---

function band(score: number): string {
  if (score >= 90) return 'Elite fit';
  if (score >= 80) return 'Strong fit';
  if (score >= 70) return 'Developmental fit';
  if (score >= 60) return 'Situational fit';
  return 'Marginal fit';
}

function alignmentPhrase(pct: number): string {
  if (pct >= 88) return 'maps almost perfectly onto';
  if (pct >= 75) return 'aligns well with';
  if (pct >= 60) return 'is a workable fit for';
  return 'pulls against';
}

function coveragePhrase(km: number): string {
  if (km >= 12) return 'covers the ground a two-way role in this system demands';
  if (km >= 10.5) return 'brings the engine to hold down a single side of central midfield';
  return 'will need a partner to shoulder the running next to him';
}

function transitionPhrase(tier: Prospect['transitionTier']): string {
  switch (tier) {
    case 'T-1':
      return 'he wins the moment the ball turns over — first to react in both directions';
    case 'T-2':
      return 'he transitions cleanly, a beat behind the very quickest';
    default:
      return 'transition speed is a genuine question mark against quicker opponents';
  }
}

function feasibilityWord(f: Feasibility): string {
  return f === 'feasible' ? 'coachable' : f === 'stretch' ? 'a real stretch' : 'a long shot';
}

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function tacticalSection(p: Prospect, ctx: TargetContext): BriefingSection {
  const body =
    `Spatial tracking puts him at ${p.schemeFit}% alignment — he ${alignmentPhrase(p.schemeFit)} ` +
    `your ${ctx.scheme}. At ${p.avgCoverageKm} km a game he ${coveragePhrase(p.avgCoverageKm)}, and with a ` +
    `${p.transitionTier} transition rating, ${transitionPhrase(p.transitionTier)}. In short: ` +
    `${p.tacticalTags.join(', ').toLowerCase()} are already in his game, not projected onto it.`;
  return { title: 'Tactical vector', body };
}

function culturalSection(p: Prospect, ctx: TargetContext): BriefingSection {
  const reg =
    p.selfRegulation >= 80
      ? 'elite self-regulation — he owns mistakes and resets on his own, without a coach having to manage his head'
      : p.selfRegulation >= 65
        ? 'sound self-regulation, though he still leans on the group to reset after a bad spell'
        : 'thin self-regulation — expect to spend real touchpoints keeping him level after errors';
  const fit =
    p.coachStyleFit >= 80
      ? `His AthleteDISC read (${p.discProfile}) maps cleanly onto your ${ctx.coachStyle} style; direct feedback lands as intended`
      : p.coachStyleFit >= 65
        ? `His AthleteDISC read (${p.discProfile}) mostly fits your ${ctx.coachStyle} style, with some translation needed on hard feedback`
        : `His AthleteDISC read (${p.discProfile}) sits at odds with your ${ctx.coachStyle} style — the relationship will need deliberate managing`;
  return { title: 'Cultural vector (AthleteDISC)', body: `${fit}. He shows ${reg}.` };
}

function resilienceSection(p: Prospect): BriefingSection {
  const control =
    p.mtqControl >= 80
      ? 'keeps his emotional control when the game is getting away from his side'
      : p.mtqControl >= 65
        ? 'generally holds his composure, with the odd wobble under sustained pressure'
        : 'can be rattled once momentum turns against him';
  const risk =
    p.flightRisk === 'low'
      ? 'a low flight-risk who can absorb an intensive first-year load without burning out'
      : p.flightRisk === 'moderate'
        ? 'a moderate flight-risk — worth an honest conversation about role and minutes up front'
        : 'an elevated flight-risk; a slow start or a logjam at his position could see him look elsewhere';
  return {
    title: 'Resilience vector (MTQ48)',
    body: `MTQ48 says he ${control} (control ${p.mtqControl}, commitment ${p.mtqCommitment}). Projects as ${risk}.`,
  };
}

function proSection(p: Prospect): BriefingSection | null {
  if (!p.pro) return null;
  const lev =
    p.pro.buyerLeverage >= 70
      ? 'the leverage sits with you — his side has more reason to do a deal than you do'
      : p.pro.buyerLeverage >= 45
        ? 'leverage is roughly even; expect a genuine negotiation rather than a formality'
        : 'leverage sits with his camp — move early or expect to pay a premium';
  return {
    title: 'Financial & negotiation read',
    body:
      `Estimated value ${usd(p.pro.estValueUsd)} against a wage expectation of ${usd(p.pro.wageExpectationUsd)}/yr. ` +
      `He is ${p.pro.contractStatus.toLowerCase()}, so ${lev}. Recommended posture: ` +
      `${p.pro.buyerLeverage >= 60 ? 'open below value and hold — the numbers back you' : 'lead with your best realistic figure to avoid a bidding war you may lose'}.`,
  };
}

function verdictLine(p: Prospect, ctx: TargetContext): string {
  const b = band(p.syncScore);
  const map: Record<string, string> = {
    'Elite fit': `${p.firstName} is about as spot-on as this pipeline produces for your ${ctx.need} — a priority target, not a maybe.`,
    'Strong fit': `${p.firstName} is a strong, real fit for your ${ctx.need} and worth active pursuit.`,
    'Developmental fit': `${p.firstName} fits the profile but arrives as a project — right raw material, not a plug-and-play starter.`,
    'Situational fit': `${p.firstName} only makes sense if you specifically need a ${ctx.need}; otherwise there are cleaner fits.`,
    'Marginal fit': `${p.firstName} is a marginal fit for what you run — recruit only with eyes open.`,
  };
  return map[b];
}

function nextSteps(p: Prospect, lens: Lens): string[] {
  const b = band(p.syncScore);
  const steps: string[] = [];

  if (b === 'Elite fit' || b === 'Strong fit') {
    steps.push(
      lens === 'pro'
        ? 'Move now — open contact with his representation before his valuation moves.'
        : 'Move now — request full match film and open direct contact this week.',
    );
  } else {
    steps.push('Watch two more full matches before committing recruiting hours — confirm the profile holds live.');
  }

  const hardest = [...p.gaps].sort((a, c) => rank(c.feasibility) - rank(a.feasibility))[0];
  if (hardest) {
    steps.push(
      hardest.feasibility === 'feasible'
        ? `Build the pitch around development: ${hardest.area.toLowerCase()} is ${feasibilityWord(hardest.feasibility)} inside ${hardest.horizon}.`
        : `Pressure-test ${hardest.area.toLowerCase()} in person — it's ${feasibilityWord(hardest.feasibility)} and it's the swing factor on this recruitment.`,
    );
  }

  if (p.flightRisk !== 'low') {
    steps.push('Have the honest role-and-minutes conversation early — retention risk is the thing that sinks this one.');
  }

  if (lens === 'pro' && p.pro) {
    steps.push(`Anchor the first offer near ${usd(Math.round(p.pro.estValueUsd * 0.85))} and hold your walk-away.`);
  } else if (lens === 'club') {
    steps.push('Loop in the club director on fit vs. squad need before you commit a roster spot.');
  } else {
    steps.push('Cross-check academics and NCAA eligibility so a great fit on the pitch survives the paperwork.');
  }

  return steps;
}

function rank(f: Feasibility): number {
  return f === 'feasible' ? 0 : f === 'stretch' ? 1 : 2;
}

function bottomLine(p: Prospect): string {
  if (p.gaps.length === 0) {
    return `Nothing material stands between ${p.firstName} and your XI — this is a fit today, not a bet on later.`;
  }
  const worst = [...p.gaps].sort((a, c) => rank(c.feasibility) - rank(a.feasibility))[0];
  const longest = p.gaps.reduce((acc, g) => (g.horizon.length > acc.length ? g.horizon : acc), p.gaps[0].horizon);
  if (worst.feasibility === 'feasible') {
    return `Everything standing between ${p.firstName} and your first-choice XI is coachable inside ${longest}. This is a green light.`;
  }
  if (worst.feasibility === 'stretch') {
    return `Most of the gap is closable, but ${worst.area.toLowerCase()} is a real stretch — reach him only if you're set up to develop it over ${longest}.`;
  }
  return `Be honest about the ceiling: ${worst.area.toLowerCase()} is a long shot to fix, and it's load-bearing for your system. Recruit for what he is now, not what you hope he becomes.`;
}

/**
 * Turn a prospect's vectors into a plain-English briefing for a given audience.
 * Deterministic — no network, no model — so it renders instantly and identically.
 */
export function generateBriefing(p: Prospect, ctx: TargetContext, lens: Lens = 'college'): Briefing {
  const sections: BriefingSection[] = [
    tacticalSection(p, ctx),
    culturalSection(p, ctx),
    resilienceSection(p),
  ];
  const pro = proSection(p);
  if (lens === 'pro' && pro) sections.push(pro);

  return {
    matchBand: band(p.syncScore),
    verdict: verdictLine(p, ctx),
    sections,
    gaps: p.gaps,
    nextSteps: nextSteps(p, lens),
    bottomLine: bottomLine(p),
  };
}

/**
 * Async seam for the real "vector database AI communication layer".
 *
 * When the retrieval + LLM backend is ready, this is the only function that
 * changes: embed the target context, pull the player's nearest vectors from the
 * store, hand both to the model, and return the same `Briefing` shape. Until then
 * it resolves the deterministic briefing so the UI is already wired end-to-end.
 */
export async function generateBriefingAI(p: Prospect, ctx: TargetContext, lens: Lens = 'college'): Promise<Briefing> {
  // TODO(backend): const vectors = await vectorStore.query(embed(ctx), p.id)
  //                return llm.brief({ prospect: p, context: ctx, lens, vectors })
  return generateBriefing(p, ctx, lens);
}

// --- Demo data: lets the feature run live before any backend is connected. ---

export const DEMO_CONTEXT: TargetContext = {
  program: 'Your program',
  scheme: 'high-press 4-3-3',
  coachStyle: 'direct, authoritative',
  level: 'D1',
  need: 'box-to-box midfielder',
};

export const DEMO_PROSPECTS: Prospect[] = [
  {
    id: 'liam-jennings',
    firstName: 'Liam',
    lastName: 'Jennings',
    gradYear: 2027,
    position: 'Central Midfielder',
    club: 'Crossfire Premier',
    league: 'MLS Next',
    location: 'Seattle, WA',
    syncScore: 94,
    schemeFit: 91,
    avgCoverageKm: 12.4,
    transitionTier: 'T-1',
    tacticalTags: ['High press', 'Direct comm', 'Ball-winning'],
    discProfile: 'Dominant / Direct',
    coachStyleFit: 88,
    selfRegulation: 86,
    mtqControl: 84,
    mtqCommitment: 82,
    flightRisk: 'low',
    gaps: [
      {
        area: 'Aerial duels',
        current: 'wins 41% of aerials',
        target: '55%+ for a No. 6 in your press',
        feasibility: 'feasible',
        horizon: '1–2 seasons',
      },
      {
        area: 'Left-foot range',
        current: 'switches of play die on his weaker side',
        target: 'reliable 40-yard switch off either foot',
        feasibility: 'stretch',
        horizon: '2 seasons',
      },
    ],
  },
  {
    id: 'marcus-cole',
    firstName: 'Marcus',
    lastName: 'Cole',
    gradYear: 2027,
    position: 'Central Midfielder',
    club: 'Solar SC',
    league: 'MLS Next',
    location: 'Dallas, TX',
    syncScore: 88,
    schemeFit: 79,
    avgCoverageKm: 10.9,
    transitionTier: 'T-2',
    tacticalTags: ['Possession', 'Direct comm', 'Line-breaking'],
    discProfile: 'Steady / Influencing',
    coachStyleFit: 72,
    selfRegulation: 70,
    mtqControl: 68,
    mtqCommitment: 81,
    flightRisk: 'moderate',
    gaps: [
      {
        area: 'Defensive intensity',
        current: 'presses in bursts, not for 90',
        target: 'sustained counter-press in your system',
        feasibility: 'feasible',
        horizon: '1 season',
      },
      {
        area: 'Composure under pressure',
        current: 'rushes decisions when pressed high',
        target: 'settle and pick the right pass',
        feasibility: 'stretch',
        horizon: '2 seasons',
      },
    ],
  },
  {
    id: 'david-osei',
    firstName: 'David',
    lastName: 'Osei',
    gradYear: 2028,
    position: 'Central Midfielder',
    club: 'Philadelphia Union Academy',
    league: 'MLS Next',
    location: 'Philadelphia, PA',
    syncScore: 82,
    schemeFit: 74,
    avgCoverageKm: 11.6,
    transitionTier: 'T-2',
    tacticalTags: ['High press', 'Supportive comm', 'Box-crashing'],
    discProfile: 'Conscientious / Supportive',
    coachStyleFit: 63,
    selfRegulation: 64,
    mtqControl: 61,
    mtqCommitment: 77,
    flightRisk: 'elevated',
    gaps: [
      {
        area: 'Tempo control',
        current: 'plays at one speed — fast',
        target: 'change gears to manage a game',
        feasibility: 'feasible',
        horizon: '2 seasons',
      },
      {
        area: 'Reading your direct style',
        current: 'needs supportive framing to absorb hard feedback',
        target: 'take direct coaching without deflating',
        feasibility: 'longshot',
        horizon: '2–3 seasons',
      },
    ],
    pro: {
      estValueUsd: 900_000,
      contractStatus: 'Under academy terms through 2027',
      wageExpectationUsd: 240_000,
      buyerLeverage: 58,
    },
  },
];
