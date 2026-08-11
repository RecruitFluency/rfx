// ---------------------------------------------------------------------------
// syncmob — plain-English Program Match engine
//
// A club director types a natural-language description of a student-athlete
// (region, academics, position, physical assets, degree, campus feel) and this
// engine turns it into a plain-English briefing that names the college programs
// looking for that kind of player — never a naked percentage, always a sentence.
//
// It reasons over a built-in catalog of representative programs so the briefing
// is always useful, and (when the live database is connected) cross-references
// the real `programs` table to surface matching schools by region + division.
// ---------------------------------------------------------------------------

import { db, isConfigured } from './supabase';

// ---- Region vocabulary ----------------------------------------------------

const REGIONS: Record<string, { label: string; states: string[] }> = {
  eastern_seaboard: {
    label: 'the Eastern Seaboard',
    states: ['ME', 'NH', 'MA', 'RI', 'CT', 'NY', 'NJ', 'DE', 'MD', 'VA', 'NC', 'SC', 'GA', 'FL'],
  },
  northeast: {
    label: 'the Northeast',
    states: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
  },
  southeast: {
    label: 'the Southeast',
    states: ['VA', 'NC', 'SC', 'GA', 'FL', 'TN', 'AL', 'MS', 'KY'],
  },
  midwest: {
    label: 'the Midwest',
    states: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'ND', 'SD'],
  },
  west_coast: {
    label: 'the West Coast',
    states: ['CA', 'OR', 'WA'],
  },
  southwest: {
    label: 'the Southwest',
    states: ['TX', 'AZ', 'NM', 'OK', 'NV'],
  },
  mountain_west: {
    label: 'the Mountain West',
    states: ['CO', 'UT', 'ID', 'MT', 'WY'],
  },
};

const REGION_PATTERNS: [RegExp, string][] = [
  [/eastern seaboard|east coast|atlantic coast/, 'eastern_seaboard'],
  [/northeast|new england/, 'northeast'],
  [/southeast|deep south|the south\b/, 'southeast'],
  [/midwest|great lakes/, 'midwest'],
  [/west coast|pacific/, 'west_coast'],
  [/southwest/, 'southwest'],
  [/mountain west|rockies|rocky mountain/, 'mountain_west'],
];

// ---- Parsed criteria ------------------------------------------------------

export interface MatchCriteria {
  raw: string;
  region: { key: string; label: string; states: string[] } | null;
  states: string[];
  division: string | null;
  gpa: number | null;
  sat: number | null;
  act: number | null;
  sport: string;
  position: string | null;
  degree: string | null;
  campus: 'rural' | 'suburban' | 'urban' | null;
  height: string | null;
  foot: 'right' | 'left' | null;
}

const POSITIONS = [
  'right back', 'left back', 'fullback', 'center back', 'centre back', 'defender',
  'defensive midfielder', 'holding midfielder', 'central midfielder', 'attacking midfielder',
  'winger', 'right winger', 'left winger', 'striker', 'forward', 'goalkeeper', 'keeper',
];

const DEGREES = [
  'business', 'engineering', 'computer science', 'biology', 'pre-med', 'premed', 'nursing',
  'kinesiology', 'exercise science', 'economics', 'finance', 'marketing', 'communications',
  'psychology', 'education', 'political science', 'architecture', 'design', 'accounting',
];

export function parsePrompt(raw: string): MatchCriteria {
  const t = raw.toLowerCase();

  // Region
  let region: MatchCriteria['region'] = null;
  for (const [re, key] of REGION_PATTERNS) {
    if (re.test(t)) {
      region = { key, label: REGIONS[key].label, states: REGIONS[key].states };
      break;
    }
  }

  // Explicit state abbreviations (e.g. "in NC" / "TX")
  const stateHits = new Set<string>();
  const abbrevMatch = raw.match(/\b([A-Z]{2})\b/g);
  if (abbrevValid(abbrevMatch)) abbrevMatch!.forEach((s) => stateHits.add(s));
  const states = region ? region.states : [...stateHits];

  // Division
  let division: string | null = null;
  if (/\b(d\s?1|division\s?1|division\s?i|power\s?4|power\s?5)\b/.test(t)) division = 'D1';
  else if (/\b(d\s?2|division\s?2|division\s?ii)\b/.test(t)) division = 'D2';
  else if (/\b(d\s?3|division\s?3|division\s?iii)\b/.test(t)) division = 'D3';
  else if (/\bnaia\b/.test(t)) division = 'NAIA';
  else if (/\bjuco|junior college\b/.test(t)) division = 'JUCO';

  // Academics — GPA is a small decimal, SAT is ~400-1600, ACT is ~1-36
  const nums = (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  let gpa: number | null = null;
  let sat: number | null = null;
  let act: number | null = null;
  // Explicit labels first
  const gpaLabel = t.match(/([0-4](?:\.\d+)?)\s*gpa|gpa\s*(?:of\s*)?([0-4](?:\.\d+)?)/);
  if (gpaLabel) gpa = Number(gpaLabel[1] ?? gpaLabel[2]);
  const satLabel = t.match(/(\d{3,4})\s*(?:on the\s*)?sat|sat\s*(?:of\s*)?(\d{3,4})/);
  if (satLabel) sat = Number(satLabel[1] ?? satLabel[2]);
  const actLabel = t.match(/(\d{1,2})\s*(?:on the\s*)?act|act\s*(?:of\s*)?(\d{1,2})/);
  if (actLabel) act = Number(actLabel[1] ?? actLabel[2]);
  // Otherwise infer from magnitude
  for (const n of nums) {
    if (gpa === null && n > 0 && n <= 4.0 && !Number.isInteger(n)) gpa = n;
    else if (sat === null && n >= 400 && n <= 1600) sat = n;
    else if (act === null && n >= 10 && n <= 36) act = n;
  }

  // Sport (soccer-first product, but detect others)
  let sport = 'Soccer';
  const sportMatch = t.match(/\b(soccer|football|basketball|baseball|softball|lacrosse|volleyball|hockey|track|tennis|golf|swimming)\b/);
  if (sportMatch) sport = titleCase(sportMatch[1]);

  // Position
  const position = POSITIONS.find((p) => t.includes(p)) ?? null;

  // Degree / major
  const degree = DEGREES.find((d) => t.includes(d)) ?? null;

  // Campus setting
  let campus: MatchCriteria['campus'] = null;
  if (/rural|small town|college town/.test(t)) campus = 'rural';
  else if (/suburban|suburb/.test(t)) campus = 'suburban';
  else if (/urban|big city|metro|downtown/.test(t)) campus = 'urban';

  // Physical assets
  const heightMatch = raw.match(/(\d)\s*(?:'|ft|foot|-foot-|\s*foot\s*)\s*(\d{1,2})?/);
  const height = heightMatch ? `${heightMatch[1]}'${heightMatch[2] ?? '0'}"` : null;
  const foot = /right[- ]?footed/.test(t) ? 'right' : /left[- ]?footed/.test(t) ? 'left' : null;

  return {
    raw, region, states, division, gpa, sat, act, sport,
    position: position ? titleCase(position) : null,
    degree: degree ? titleCase(degree) : null,
    campus, height, foot,
  };
}

function abbrevValid(m: RegExpMatchArray | null): boolean {
  const valid = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
    'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
    'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  ]);
  return Boolean(m && m.some((s) => valid.has(s)));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Representative program catalog --------------------------------------
// A compact, illustrative set of college soccer programs so the plain-English
// briefing is always grounded — even before the live database is connected.

interface CatalogProgram {
  school: string;
  state: string;
  division: string;
  campus: 'rural' | 'suburban' | 'urban';
  gpaFloor: number;      // rough academic floor the program recruits to
  satMid: number;        // rough mid-50 SAT
  strongMajors: string[];
  needs: string[];       // positions the program is prioritizing this cycle
  style: string;         // one-line tactical identity
}

const CATALOG: CatalogProgram[] = [
  { school: 'Coastal Carolina', state: 'SC', division: 'D1', campus: 'suburban', gpaFloor: 3.0, satMid: 1120, strongMajors: ['Business', 'Marketing'], needs: ['Right Back', 'Winger'], style: 'high-line, overlapping fullbacks' },
  { school: 'Elon University', state: 'NC', division: 'D1', campus: 'suburban', gpaFloor: 3.4, satMid: 1250, strongMajors: ['Business', 'Communications'], needs: ['Right Back', 'Center Back'], style: 'possession-based, builds from the back' },
  { school: 'James Madison', state: 'VA', division: 'D1', campus: 'suburban', gpaFloor: 3.3, satMid: 1200, strongMajors: ['Business', 'Nursing'], needs: ['Right Back', 'Defensive Midfielder'], style: 'compact block, quick transitions' },
  { school: 'College of Charleston', state: 'SC', division: 'D1', campus: 'urban', gpaFloor: 3.2, satMid: 1180, strongMajors: ['Business', 'Marine Biology'], needs: ['Fullback', 'Striker'], style: 'wide attacking shape' },
  { school: 'Stetson University', state: 'FL', division: 'D1', campus: 'rural', gpaFloor: 3.2, satMid: 1190, strongMajors: ['Business', 'Finance'], needs: ['Right Back', 'Goalkeeper'], style: 'patient possession, rural campus' },
  { school: 'Bucknell University', state: 'PA', division: 'D1', campus: 'rural', gpaFloor: 3.6, satMid: 1340, strongMajors: ['Engineering', 'Business'], needs: ['Center Back', 'Winger'], style: 'academic-first, disciplined defensive line' },
  { school: 'Wake Forest', state: 'NC', division: 'D1', campus: 'suburban', gpaFloor: 3.7, satMid: 1400, strongMajors: ['Business', 'Pre-Med'], needs: ['Attacking Midfielder', 'Right Back'], style: 'elite possession, national contender' },
  { school: 'Messiah University', state: 'PA', division: 'D3', campus: 'rural', gpaFloor: 3.5, satMid: 1220, strongMajors: ['Nursing', 'Education'], needs: ['Right Back', 'Striker'], style: 'perennial D3 power, high pressing' },
  { school: 'Christopher Newport', state: 'VA', division: 'D3', campus: 'suburban', gpaFloor: 3.5, satMid: 1250, strongMajors: ['Business', 'Communications'], needs: ['Fullback', 'Center Back'], style: 'organized, set-piece driven' },
  { school: 'Tufts University', state: 'MA', division: 'D3', campus: 'suburban', gpaFloor: 3.8, satMid: 1470, strongMajors: ['Engineering', 'Economics'], needs: ['Winger', 'Right Back'], style: 'technical, academically elite' },
  { school: 'Rollins College', state: 'FL', division: 'D2', campus: 'suburban', gpaFloor: 3.3, satMid: 1210, strongMajors: ['Business', 'Marketing'], needs: ['Right Back', 'Central Midfielder'], style: 'possession-oriented D2 contender' },
  { school: 'Lynn University', state: 'FL', division: 'D2', campus: 'suburban', gpaFloor: 3.0, satMid: 1080, strongMajors: ['Business', 'Communications'], needs: ['Fullback', 'Forward'], style: 'international roster, direct play' },
  { school: 'Grand Canyon', state: 'AZ', division: 'D1', campus: 'urban', gpaFloor: 3.0, satMid: 1090, strongMajors: ['Business', 'Nursing'], needs: ['Right Back', 'Winger'], style: 'athletic, transition-heavy' },
  { school: 'Saint Louis University', state: 'MO', division: 'D1', campus: 'urban', gpaFloor: 3.4, satMid: 1290, strongMajors: ['Business', 'Aviation'], needs: ['Center Back', 'Right Back'], style: 'historic program, possession identity' },
  { school: 'Creighton University', state: 'NE', division: 'D1', campus: 'urban', gpaFloor: 3.5, satMid: 1300, strongMajors: ['Business', 'Pre-Med'], needs: ['Attacking Midfielder', 'Fullback'], style: 'attacking, packed home crowds' },
  { school: 'Denver University', state: 'CO', division: 'D1', campus: 'urban', gpaFloor: 3.4, satMid: 1280, strongMajors: ['Business', 'International Studies'], needs: ['Right Back', 'Defensive Midfielder'], style: 'altitude pressing, quick tempo' },
  { school: 'UC Santa Barbara', state: 'CA', division: 'D1', campus: 'suburban', gpaFloor: 3.4, satMid: 1270, strongMajors: ['Engineering', 'Environmental Science'], needs: ['Winger', 'Right Back'], style: 'expansive, beach-town campus' },
  { school: 'Seattle University', state: 'WA', division: 'D1', campus: 'urban', gpaFloor: 3.3, satMid: 1230, strongMajors: ['Computer Science', 'Business'], needs: ['Center Back', 'Fullback'], style: 'possession, tech-hub city' },
];

export interface ProgramMatch {
  school: string;
  state: string;
  division: string;
  fit: 'Strong fit' | 'Solid fit' | 'Worth a look';
  sentence: string;
  source: 'catalog' | 'database';
}

export interface MatchResult {
  criteria: MatchCriteria;
  headline: string;     // plain-English summary paragraph
  matches: ProgramMatch[];
  nextSteps: string[];
  databaseNote: string | null;
}

function scoreProgram(p: CatalogProgram, c: MatchCriteria): { score: number; reasons: string[]; concerns: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];

  // Region
  if (c.states.length) {
    if (c.states.includes(p.state)) { score += 3; reasons.push(`sits in ${c.region ? c.region.label : p.state}`); }
    else return { score: -1, reasons, concerns }; // region is a hard filter when specified
  }

  // Division
  if (c.division) {
    if (p.division === c.division) { score += 2; reasons.push(`is a ${p.division} program`); }
    else score -= 1;
  }

  // Position need
  if (c.position) {
    const need = p.needs.some((n) => n.toLowerCase() === c.position!.toLowerCase()
      || (c.position!.toLowerCase().includes('back') && n.toLowerCase().includes('back')));
    if (need) { score += 3; reasons.push(`has flagged an opening at ${c.position.toLowerCase()} this cycle`); }
  }

  // Academics — is the athlete comfortably eligible?
  if (c.gpa !== null) {
    if (c.gpa >= p.gpaFloor) { score += 2; reasons.push(`clears the academic profile (a ${c.gpa.toFixed(2)} GPA sits above their recruiting floor)`); }
    else { score -= 1; concerns.push(`the ${c.gpa.toFixed(2)} GPA is a touch under where they usually recruit`); }
  }
  if (c.sat !== null) {
    if (c.sat >= p.satMid - 60) { score += 1; reasons.push(`the ${c.sat} SAT lands in their admitted range`); }
    else concerns.push(`the ${c.sat} SAT is below their mid-50`);
  }

  // Degree
  if (c.degree) {
    if (p.strongMajors.some((m) => m.toLowerCase().includes(c.degree!.toLowerCase()) || c.degree!.toLowerCase().includes(m.toLowerCase()))) {
      score += 2; reasons.push(`offers a strong ${c.degree} track`);
    }
  }

  // Campus feel
  if (c.campus) {
    if (p.campus === c.campus) { score += 1; reasons.push(`is the ${c.campus} campus setting they want`); }
    else concerns.push(`it's a ${p.campus} campus, not ${c.campus}`);
  }

  return { score, reasons, concerns };
}

function buildSentence(p: CatalogProgram, reasons: string[], concerns: string[], c: MatchCriteria): string {
  const lead = reasons.length
    ? `${p.school} ${reasons.slice(0, 3).join(', ')}.`
    : `${p.school} lines up on the basics of your search.`;
  const style = ` Their style — ${p.style} — ${c.position ? `fits a ${c.position.toLowerCase()}` : 'suits a technically comfortable player'}.`;
  const caveat = concerns.length ? ` One thing to weigh: ${concerns[0]}.` : '';
  return lead + style + caveat;
}

export async function runMatch(prompt: string): Promise<MatchResult> {
  const criteria = parsePrompt(prompt);

  // Score the catalog
  const scored = CATALOG
    .map((p) => ({ p, ...scoreProgram(p, criteria) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 4);
  const maxScore = top[0]?.score ?? 0;

  const matches: ProgramMatch[] = top.map((r) => ({
    school: r.p.school,
    state: r.p.state,
    division: r.p.division,
    fit: r.score >= maxScore - 1 && r.score >= 6 ? 'Strong fit' : r.score >= 4 ? 'Solid fit' : 'Worth a look',
    sentence: buildSentence(r.p, r.reasons, r.concerns, criteria),
    source: 'catalog',
  }));

  // Plain-English headline
  const headline = writeHeadline(criteria, matches);
  const nextSteps = writeNextSteps(criteria, matches);

  // Cross-reference the live database for real region/division matches
  let databaseNote: string | null = null;
  if (isConfigured && (criteria.states.length || criteria.division)) {
    try {
      databaseNote = await liveDatabaseNote(criteria);
    } catch {
      databaseNote = null;
    }
  }

  return { criteria, headline, matches, nextSteps, databaseNote };
}

function writeHeadline(c: MatchCriteria, matches: ProgramMatch[]): string {
  const bits: string[] = [];
  if (c.position) bits.push(`an incoming ${c.position.toLowerCase()}`);
  if (c.height || c.foot) {
    const asset = [c.height, c.foot ? `${c.foot}-footed` : null].filter(Boolean).join(', ');
    bits.push(`(${asset})`);
  }
  if (c.gpa || c.sat || c.act) {
    const ac = [c.gpa ? `a ${c.gpa.toFixed(2)} GPA` : null, c.sat ? `${c.sat} SAT` : null, c.act ? `${c.act} ACT` : null]
      .filter(Boolean).join(' / ');
    bits.push(`carrying ${ac}`);
  }
  if (c.region) bits.push(`on ${c.region.label}`);
  else if (c.states.length) bits.push(`in ${c.states.join(', ')}`);
  if (c.degree) bits.push(`who wants to study ${c.degree}`);
  if (c.campus) bits.push(`on a ${c.campus} campus`);

  const profile = bits.length ? `a player who is ${bits.join(', ')}` : 'this player profile';

  if (matches.length === 0) {
    return `No programs in the catalog line up cleanly with ${profile}. Try widening the region or easing one requirement — the filters may be stacked tighter than the market allows.`;
  }

  const names = matches.map((m) => m.school);
  const nameList = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return `For ${profile}, ${nameList} are the programs actively recruiting that type. ${matches[0].school} is the closest match — ${lowerFirst(matches[0].sentence)}`;
}

function writeNextSteps(c: MatchCriteria, matches: ProgramMatch[]): string[] {
  const steps: string[] = [];
  if (matches.length === 0) {
    steps.push('Broaden the search region, or drop the campus-setting or division requirement to see more programs.');
    steps.push('If academics are the limiter, note that D3 and NAIA programs weigh GPA and fit over test scores.');
    return steps;
  }
  steps.push(`Start with ${matches[0].school} — send film tagged for ${c.position ? c.position.toLowerCase() + ' actions' : 'in-possession and defensive actions'} and reference their opening directly.`);
  if (matches.length > 1) steps.push(`Keep ${matches[1].school}${matches[2] ? ` and ${matches[2].school}` : ''} as parallel conversations so the athlete has real leverage and options.`);
  if (c.gpa && c.gpa >= 3.4) steps.push('The academic profile is strong — lead with it; it unlocks admission-driven money at the higher-academic programs on this list.');
  steps.push('Log each outreach in the coach profile so the whole staff can see where this athlete stands in the process.');
  return steps;
}

async function liveDatabaseNote(c: MatchCriteria): Promise<string | null> {
  let query = db().from('programs').select('school, state, division, sport').limit(200);
  if (c.states.length) query = query.in('state', c.states);
  if (c.division) query = query.eq('division', c.division);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;

  const soccer = data.filter((p: { sport?: string | null }) => !p.sport || /soccer/i.test(p.sport));
  const pool = soccer.length ? soccer : data;
  const schools = [...new Set(pool.map((p: { school: string }) => p.school))];
  if (schools.length === 0) return null;

  const shown = schools.slice(0, 6).join(', ');
  const region = c.region ? c.region.label : c.states.join(', ');
  return `From your live database, ${schools.length} program${schools.length === 1 ? '' : 's'} in ${region}${c.division ? ` at the ${c.division} level` : ''} match the region filter — including ${shown}${schools.length > 6 ? ', and more' : ''}. Open the Program Directory to pull staff contacts for these.`;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Prompt starters that teach a director how to describe an athlete in plain English.
export const PROMPT_STARTERS: { label: string; prompt: string }[] = [
  {
    label: 'Right back · Eastern Seaboard · business',
    prompt: "Find me a college program on the eastern seaboard with an opening for an incoming right back — 5'10\", right-footed — carrying a 3.2 GPA, 1200 SAT, 32 ACT, who wants a business degree on a rural campus.",
  },
  {
    label: 'Academic center back · D3 · engineering',
    prompt: 'Which D3 programs in the Northeast are recruiting a center back with a 3.8 GPA and 1450 SAT who wants to study engineering?',
  },
  {
    label: 'Attacking winger · West Coast',
    prompt: 'Find West Coast D1 programs looking for an attacking left winger, left-footed, 3.4 GPA, 1250 SAT, who wants a computer science major in an urban city.',
  },
  {
    label: 'Goalkeeper · Southeast · nursing',
    prompt: 'Which programs in the Southeast have an opening for a goalkeeper with a 3.5 GPA who wants to study nursing on a suburban campus?',
  },
];
