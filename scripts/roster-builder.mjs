#!/usr/bin/env node
// The Roster Builder.
//
// Builds coach rosters for a sport, one conference at a time, by reading each
// school's per-sport coaches page. It derives clean names from the coaches'
// emails (most schools use a name-based format) and fills division/conference/
// state from the conference config. Every record is written to the
// roster_candidates table for HUMAN REVIEW — nothing enters the master list
// automatically.
//
// Usage: SUPABASE_ANON_KEY=... node scripts/roster-builder.mjs <conference> <sport>
//   e.g. node scripts/roster-builder.mjs ivy lacrosse
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (required)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://auclsmmqipjwrzcnzssl.supabase.co';
const KEY = process.env.SUPABASE_ANON_KEY;
if (!KEY) { console.error('SUPABASE_ANON_KEY is required.'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const UA = 'RFX-CoachDatabase-RosterBuilder/1.0 (+rfx.soccer@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Conference configs -----------------------------------------------------
// Each school: [displayDomain, state]. School names are resolved against the
// existing database (by domain) so lacrosse coaches share the exact school
// string used elsewhere — keeping programs and email-pattern inference aligned.
const CONFERENCES = {
  ivy: {
    name: 'Ivy League', division: 'NCAA D1',
    schools: [
      ['brownbears.com', 'Rhode Island', 'Brown University'],
      ['gocolumbialions.com', 'New York', 'Columbia University'],
      ['cornellbigred.com', 'New York', 'Cornell University'],
      ['dartmouthsports.com', 'New Hampshire', 'Dartmouth College'],
      ['gocrimson.com', 'Massachusetts', 'Harvard University'],
      ['pennathletics.com', 'Pennsylvania', 'University of Pennsylvania'],
      ['goprincetontigers.com', 'New Jersey', 'Princeton University'],
      ['yalebulldogs.com', 'Connecticut', 'Yale University'],
    ],
  },
};

const SPORT_SLUGS = {
  lacrosse: [["Men's Lacrosse", 'mens-lacrosse'], ["Women's Lacrosse", 'womens-lacrosse']],
};

const GENERIC = /(sports@|athletics@|info@|compliance@|tickets@|marketing@|media@|noreply|@sidearm|recsports@|athletictickets@)/i;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

async function db(path, method = 'GET', body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function get(url, timeout = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    return r.ok ? await r.text() : '';
  } catch { return ''; } finally { clearTimeout(t); }
}

function normalize(h) {
  return h.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCharCode(parseInt(x, 16))).replace(/&amp;/g, '&');
}
function toText(h) {
  return normalize(h).replace(/<a[^>]+href\s*=\s*["']mailto:([^"'?]+)[^>]*>/gi, ' ✉$1✉ ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

// Clean name from a name-format email local-part (first.last, first_last,
// first.m.last). Returns null for opaque logins (mmadalon, rw3386).
function nameFromEmail(local) {
  const base = local.replace(/[0-9]+$/, '');
  if (/[._]/.test(base)) {
    const parts = base.split(/[._]/).filter((p) => p.length > 1);
    if (parts.length >= 2) return { first: cap(parts[0]), last: cap(parts[parts.length - 1]) };
  }
  return null;
}

const TITLE_RE = /(head coach|associate head coach|assistant coach|offensive coordinator|defensive coordinator|goalkeep\w*|coordinator|director of operations)/i;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

function extractCoaches(html, sport) {
  const text = toText(html);
  const out = [];
  const re = /✉([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu)✉/g;
  let m;
  while ((m = re.exec(text))) {
    const email = m[1].toLowerCase();
    if (GENERIC.test(email)) continue;
    const nm = nameFromEmail(email.split('@')[0]);
    const window = text.slice(Math.max(0, m.index - 160), m.index + 40);
    const title = (window.match(TITLE_RE) || [null])[0];
    const phone = (window.match(PHONE_RE) || [null])[0];
    out.push({
      first_name: nm ? nm.first : '',
      last_name: nm ? nm.last : '',
      title: title ? title.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Coach',
      email, phone, sport, derivedName: !!nm,
    });
  }
  // de-dupe by email
  const seen = new Set();
  return out.filter((r) => (seen.has(r.email) ? false : seen.add(r.email)));
}

async function main() {
  const conf = process.argv[2] || 'ivy';
  const sportKey = process.argv[3] || 'lacrosse';
  const cfg = CONFERENCES[conf];
  const slugs = SPORT_SLUGS[sportKey];
  if (!cfg || !slugs) { console.error(`Unknown conference/sport. Have: ${Object.keys(CONFERENCES)} / ${Object.keys(SPORT_SLUGS)}`); process.exit(1); }

  console.log(`Roster Builder — ${cfg.name}, ${sportKey}`);
  // Map athletics domain -> canonical school name from existing data.
  const known = await db('coaches?select=school,landing_page&landing_page=not.is.null&limit=10000');
  const domainToSchool = new Map();
  for (const r of known) { try { const o = new URL(r.landing_page).hostname.replace(/^www\./, ''); if (!domainToSchool.has(o)) domainToSchool.set(o, r.school); } catch { /* skip */ } }

  const candidates = [];
  let derived = 0, opaque = 0;
  for (const [domain, state, fallbackName] of cfg.schools) {
    const school = domainToSchool.get(domain) || fallbackName;
    for (const [sport, slug] of slugs) {
      let html = '';
      for (const path of [`/sports/${slug}/coaches`, `/sports/${slug}/roster`]) {
        html = await get(`https://${domain}${path}`);
        if (html && /coach/i.test(html)) break;
        await sleep(300);
      }
      if (!html) continue;
      const coaches = extractCoaches(html, sport);
      for (const c of coaches) {
        if (c.derivedName) derived++; else opaque++;
        candidates.push({
          first_name: c.first_name, last_name: c.last_name, title: c.title,
          sport, email: c.email, phone: c.phone,
          school, division: cfg.division, conference: cfg.name, state,
          landing_page: `https://${domain}/sports/${slug}`,
          source_url: `https://${domain}/sports/${slug}/coaches`, source: 'roster_builder',
        });
      }
      console.log(`  ${school} — ${sport}: ${coaches.length} coaches`);
      await sleep(400);
    }
  }

  console.log(`\nFound ${candidates.length} candidates (${derived} with clean names from email, ${opaque} opaque — need a name in review).`);
  for (let i = 0; i < candidates.length; i += 200) {
    await db('roster_candidates', 'POST', candidates.slice(i, i + 200), 'resolution=ignore-duplicates');
  }
  console.log(`Done. Candidates written to the Roster Candidates review queue.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
