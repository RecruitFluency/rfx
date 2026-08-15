#!/usr/bin/env node
// Email pattern inference.
//
// Every school uses one consistent formula for staff emails (lastname+initial,
// first.last, …). This agent learns each school's formula from the coaches who
// already have emails, then proposes formula-based addresses for the coaches at
// that same school who are missing one. Proposals land in the Found Contacts
// queue flagged "pattern-inferred" — a human approves each; nothing is applied
// automatically.
//
// No web access — pure computation on the database you already own.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (required)
//      MIN_SAMPLES  min coaches-with-email a school needs to trust a pattern (default 3)
//      MIN_SHARE    min share of those that must agree on the pattern (default 0.6)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://auclsmmqipjwrzcnzssl.supabase.co';
const KEY = process.env.SUPABASE_ANON_KEY;
const MIN_SAMPLES = Number(process.env.MIN_SAMPLES || 3);
const MIN_SHARE = Number(process.env.MIN_SHARE || 0.6);

if (!KEY) { console.error('SUPABASE_ANON_KEY is required.'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function db(path, method = 'GET', body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const alpha = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

// The candidate formulas, each a function of (first, last) → local-part.
const TEMPLATES = {
  'first.last': (f, l) => `${f}.${l}`,
  'flast': (f, l) => `${f[0]}${l}`,
  'firstlast': (f, l) => `${f}${l}`,
  'lastf': (f, l) => `${l}${f[0]}`,
  'last.first': (f, l) => `${l}.${f}`,
  'first_last': (f, l) => `${f}_${l}`,
  'f.last': (f, l) => `${f[0]}.${l}`,
  'firstl': (f, l) => `${f}${l[0]}`,
  'lastfirst': (f, l) => `${l}${f}`,
  'last': (f, l) => l,
  'first': (f, l) => f,
};

// Which formulas could have produced this coach's actual local-part?
function matchingTemplates(first, last, localPart) {
  const f = alpha(first), l = alpha(last);
  if (!f || !l) return [];
  const lpAlpha = localPart.toLowerCase().replace(/[0-9]/g, '').replace(/[^a-z.]/g, '');
  const lpNoSep = lpAlpha.replace(/[^a-z]/g, '');
  const hits = [];
  for (const [name, fn] of Object.entries(TEMPLATES)) {
    const t = fn(f, l);
    if (t === lpAlpha || t.replace(/[^a-z]/g, '') === lpNoSep) hits.push(name);
  }
  return hits;
}

function domainOf(email) { const m = /@(.+)$/.exec(email || ''); return m ? m[1].toLowerCase() : null; }

async function fetchAllCoaches() {
  const all = [];
  for (let page = 0; ; page++) {
    const rows = await db(`coaches?select=id,first_name,last_name,email,school,status&limit=1000&offset=${page * 1000}`);
    all.push(...rows);
    if (rows.length < 1000) return all;
  }
}

async function main() {
  console.log('Loading coaches…');
  const coaches = await fetchAllCoaches();
  const bySchool = new Map();
  for (const c of coaches) {
    if (!c.school) continue;
    if (!bySchool.has(c.school)) bySchool.set(c.school, []);
    bySchool.get(c.school).push(c);
  }
  // Existing emails, to avoid proposing a duplicate of someone else's address.
  const takenEmails = new Set(coaches.filter((c) => c.email).map((c) => c.email.toLowerCase()));
  // Skip coaches who already have a pending email proposal.
  const pending = await db('proposed_changes?select=coach_id&status=eq.pending&field=eq.email&limit=10000');
  const hasProposal = new Set(pending.map((r) => r.coach_id));

  let schoolsLearned = 0, proposed = 0, skippedCollision = 0;
  const batch = [];

  for (const [school, list] of bySchool) {
    const withEmail = list.filter((c) => c.email);
    if (withEmail.length < MIN_SAMPLES) continue;

    // Vote for the dominant formula.
    const votes = new Map();
    for (const c of withEmail) {
      const local = c.email.split('@')[0];
      for (const t of matchingTemplates(c.first_name, c.last_name, local)) {
        votes.set(t, (votes.get(t) || 0) + 1);
      }
    }
    if (!votes.size) continue;
    const [bestTemplate, bestVotes] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bestVotes < MIN_SAMPLES || bestVotes / withEmail.length < MIN_SHARE) continue;

    // Most common domain among this school's known emails.
    const domCount = new Map();
    for (const c of withEmail) {
      const d = domainOf(c.email);
      if (d) domCount.set(d, (domCount.get(d) || 0) + 1);
    }
    const domain = [...domCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    schoolsLearned++;

    const fn = TEMPLATES[bestTemplate];
    for (const c of list) {
      if (c.email || c.status !== 'active' || hasProposal.has(c.id)) continue;
      const f = alpha(c.first_name), l = alpha(c.last_name);
      if (!f || !l) continue;
      const email = `${fn(f, l)}@${domain}`;
      if (takenEmails.has(email)) { skippedCollision++; continue; }
      takenEmails.add(email);
      batch.push({
        coach_id: c.id, field: 'email', current_value: null, proposed_value: email,
        source_url: null, source: `pattern:${bestTemplate}@${school.slice(0, 40)}`,
      });
      proposed++;
    }
  }

  console.log(`Learned a pattern for ${schoolsLearned} schools. Proposing ${proposed} emails (${skippedCollision} skipped as collisions).`);
  for (let i = 0; i < batch.length; i += 500) {
    await db('proposed_changes', 'POST', batch.slice(i, i + 500), 'resolution=ignore-duplicates');
    process.stdout.write(`  inserted ${Math.min(i + 500, batch.length)}/${batch.length}\r`);
  }
  console.log(`\nDone. ${proposed} pattern-inferred email proposals added to Found Contacts.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
