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

// Team inboxes and role accounts — the coach is still captured (named from the
// roster), but a shared inbox like womenslax@ / mlax@ isn't a personal email, so
// we drop it to null rather than pin it on several people.
const GENERIC = /(sports@|athletics@|info@|compliance@|tickets@|marketing@|media@|noreply|@sidearm|recsports?@|athletictickets@|accessibility@|athletics\.director@|lax@|lacrosse@|gocrimson@|coaches@)/i;
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

// Clean a name string ("Connor Buczek", "Mary Beth O'Neill") into first/last.
function splitName(raw) {
  const parts = normalize(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/,.*$/, '').split(' ').filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0], last: parts[parts.length - 1] };
}
// Fallback: name from the profile-link slug ("matt-madalon" -> Matt Madalon).
function nameFromSlug(slug) {
  const parts = slug.split('-').filter((p) => p.length > 1);
  if (parts.length < 2) return null;
  return { first: cap(parts[0]), last: cap(parts[parts.length - 1]) };
}

const TITLE_RE = /(associate head coach|assistant coach|head coach|offensive coordinator|defensive coordinator|goalkeep\w*|coordinator|director of (?:lacrosse )?operations|volunteer coach|graduate (?:assistant|manager))/i;
// Strict phone: parens-area or fully hyphen/dot delimited. Rejects the digit
// fragments that scraped markup produces (e.g. "930 573-8930").
const PHONE_RE = /(?:\(\d{3}\)\s?\d{3}[-.]\d{4}|\d{3}[-.]\d{3}[-.]\d{4})/;

// Anchor on each coach's Sidearm profile link — /sports/<sport>/roster/coaches/
// <name-slug>/<id> — which carries the coach's real name as link text (and in
// the slug). Pulling name from here, not from the email, works for schools that
// use opaque login-ID emails (cfb67@cornell.edu) and naturally excludes footer
// links, role inboxes, and stray faculty (none of which have a coach profile
// link). Email/title/phone are read from that coach's row (up to the next coach).
function extractCoaches(html, sport) {
  const norm = normalize(html);
  // Tolerate relative or absolute hrefs, and a name that is bare text (older
  // Sidearm) or wrapped in a <span> (newer template) — capture up to </a> and
  // strip tags. A coach may have two links (mug + name, same slug); we collapse
  // to one block per slug spanning from its first link to the next coach's.
  const linkRe = /href=['"](?:https?:\/\/[^'"/]+)?\/sports\/[a-z-]+\/roster\/coaches\/([a-z0-9-]+)\/\d+['"][^>]*>([\s\S]{2,200}?)<\/a>/gi;
  const anchors = [];
  let m;
  while ((m = linkRe.exec(norm))) {
    anchors.push({ index: m.index, slug: m[1], text: m[2] });
  }
  // Collapse to one entry per slug (first appearance), keeping the best name.
  const uniq = [];
  const bySlug = new Map();
  for (const a of anchors) {
    if (!bySlug.has(a.slug)) { const e = { slug: a.slug, index: a.index, name: null }; bySlug.set(a.slug, e); uniq.push(e); }
    const e = bySlug.get(a.slug);
    if (!e.name) e.name = splitName(a.text); // prefer a real 2-word link text
  }
  const out = [];
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i];
    const rowEnd = i + 1 < uniq.length ? uniq[i + 1].index : Math.min(norm.length, a.index + 1600);
    const row = norm.slice(a.index, rowEnd);
    const nm = a.name || nameFromSlug(a.slug);
    if (!nm) continue;
    let email = (row.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu)/i) || [null, null])[1];
    if (email && GENERIC.test(email.toLowerCase())) email = null; // shared inbox → keep coach, drop email
    const rowText = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const title = (rowText.match(TITLE_RE) || [null])[0];
    const phone = (rowText.match(PHONE_RE) || [null])[0];
    out.push({
      first_name: nm.first,
      last_name: nm.last,
      title: title ? title.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Coach',
      email: email ? email.toLowerCase() : null,
      phone, sport,
    });
  }
  return out;
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
  let withEmail = 0, noEmail = 0;
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
        if (c.email) withEmail++; else noEmail++;
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

  console.log(`\nFound ${candidates.length} coaches (${withEmail} with an email on the page, ${noEmail} without — all named from the roster).`);

  if (process.env.DRY === '1' || process.argv.includes('--dry')) {
    console.log('\n--- DRY RUN (nothing written) ---');
    for (const c of candidates) {
      const name = (c.first_name || c.last_name) ? `${c.first_name} ${c.last_name}`.trim() : '‹needs name›';
      console.log(`  [${c.school}/${c.sport}] ${name.padEnd(24)} ${c.title.padEnd(22)} ${c.email}${c.phone ? '  ' + c.phone : ''}`);
    }
    return;
  }

  for (let i = 0; i < candidates.length; i += 200) {
    await db('roster_candidates', 'POST', candidates.slice(i, i + 200), 'resolution=ignore-duplicates');
  }
  console.log(`Done. Candidates written to the Roster Candidates review queue.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
