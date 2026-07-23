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
  patriot: {
    name: 'Patriot League', division: 'NCAA D1',
    schools: [
      ['aueagles.com', 'District of Columbia', 'American University'],
      ['goarmywestpoint.com', 'New York', 'Army West Point'],
      ['goterriers.com', 'Massachusetts', 'Boston University'],
      ['bucknellbison.com', 'Pennsylvania', 'Bucknell University'],
      ['colgateathletics.com', 'New York', 'Colgate University'],
      ['goholycross.com', 'Massachusetts', 'College of the Holy Cross'],
      ['goleopards.com', 'Pennsylvania', 'Lafayette College'],
      ['lehighsports.com', 'Pennsylvania', 'Lehigh University'],
      ['loyolagreyhounds.com', 'Maryland', 'Loyola University Maryland'],
      ['navysports.com', 'Maryland', 'Navy'],
    ],
  },
  bigten: {
    name: 'Big Ten', division: 'NCAA D1',
    schools: [
      ['umterps.com', 'Maryland', 'University of Maryland'],
      ['hopkinssports.com', 'Maryland', 'Johns Hopkins University'],
      ['mgoblue.com', 'Michigan', 'University of Michigan'],
      ['ohiostatebuckeyes.com', 'Ohio', 'Ohio State University'],
      ['gopsusports.com', 'Pennsylvania', 'Penn State University'],
      ['scarletknights.com', 'New Jersey', 'Rutgers University'],
      ['nusports.com', 'Illinois', 'Northwestern University'],
    ],
  },
  acc: {
    name: 'ACC', division: 'NCAA D1',
    schools: [
      ['goduke.com', 'North Carolina', 'Duke University'],
      ['goheels.com', 'North Carolina', 'University of North Carolina'],
      ['und.com', 'Indiana', 'University of Notre Dame'],
      ['cuse.com', 'New York', 'Syracuse University'],
      ['virginiasports.com', 'Virginia', 'University of Virginia'],
      ['bceagles.com', 'Massachusetts', 'Boston College'],
      ['clemsontigers.com', 'South Carolina', 'Clemson University'],
      ['gocards.com', 'Kentucky', 'University of Louisville'],
      ['hokiesports.com', 'Virginia', 'Virginia Tech'],
      ['gostanford.com', 'California', 'Stanford University'],
      ['calbears.com', 'California', 'University of California'],
    ],
  },
  bigeast: {
    name: 'Big East', division: 'NCAA D1',
    schools: [
      ['denverpioneers.com', 'Colorado', 'University of Denver'],
      ['guhoyas.com', 'District of Columbia', 'Georgetown University'],
      ['villanova.com', 'Pennsylvania', 'Villanova University'],
      ['uconnhuskies.com', 'Connecticut', 'University of Connecticut'],
      ['gomarquette.com', 'Wisconsin', 'Marquette University'],
      ['redstormsports.com', 'New York', "St. John's University"],
      ['gobutler.com', 'Indiana', 'Butler University'],
      ['goxavier.com', 'Ohio', 'Xavier University'],
      ['providencefriars.com', 'Rhode Island', 'Providence College'],
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
  // Native fetch first. Some athletics hosts block the direct datacenter IP and
  // are only reachable through the outbound proxy, which fetch doesn't use — so
  // fall back to curl (which honors HTTPS_PROXY) on failure or empty body.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    if (r.ok) { const txt = await r.text(); if (txt) return txt; }
  } catch { /* fall through to curl */ } finally { clearTimeout(t); }
  try {
    const { execFileSync } = await import('node:child_process');
    return execFileSync('curl', ['-sL', '--max-time', String(Math.ceil(timeout / 1000)), '-A', UA, url],
      { encoding: 'utf8', maxBuffer: 1 << 27 });
  } catch { return ''; }
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
// Some sites prefix the link text with the role ("Head Coach John Tillman"),
// so strip any leading title/role words before splitting.
function splitName(raw) {
  const s = normalize(raw).replace(/<[^>]+>/g, ' ').replace(/,.*$/, '')
    .replace(/\b(head|assistant|associate|volunteer|graduate|interim|coach|coaches|coordinator|director|operations|recruiting|offensive|defensive|goalkeeping|of|the)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const parts = s.split(' ').filter(Boolean);
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

// Second strategy: the newer WMT/Vue platform (Virginia, Notre Dame, Clemson,
// Virginia Tech, Stanford, …) renders rosters client-side and ships the data in
// a <script id="__NUXT_DATA__"> array where objects reference their values by
// index (devalue format). We resolve the staff objects — cleaner than scraping,
// since names/titles/emails come straight from structured fields.
// Only true coaching-staff roles — excludes shared department staff that also
// appear on roster pages (Associate AD, Sports Nutrition, academic advisors).
const COACH_POS = /(coach|coordinator|\boperations\b|recruiting)/i;

function extractCoachesNuxt(html, sport) {
  const m = html.match(/id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return [];
  let arr;
  try { arr = JSON.parse(m[1]); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const val = (i) => (Number.isInteger(i) && i >= 0 && i < arr.length ? arr[i] : null);
  const str = (i) => { const v = val(i); return typeof v === 'string' ? v : null; };
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    if (!('first_name' in x) || !('last_name' in x) || !('position' in x)) continue;
    const first = str(x.first_name), last = str(x.last_name), position = str(x.position);
    if (!first || !last || !position) continue;
    if (!COACH_POS.test(position)) continue; // skip players
    let email = str(x.email);
    email = email && /@[\w.-]+\.\w+$/.test(email) && !GENERIC.test(email.toLowerCase()) ? email.toLowerCase() : null;
    const phoneRaw = str(x.phone);
    const phone = phoneRaw ? (phoneRaw.match(PHONE_RE) || [null])[0] : null;
    const key = `${first}|${last}|${email || ''}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      first_name: first.trim(),
      last_name: last.trim(),
      title: position.replace(/\s+/g, ' ').trim().slice(0, 60),
      email, phone, sport,
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
      // Try each page with both strategies: HTML profile links (Sidearm) first,
      // then the Nuxt payload (WMT/Vue). Stop as soon as one yields coaches.
      let coaches = [];
      for (const path of [`/sports/${slug}/coaches`, `/sports/${slug}/roster`]) {
        const html = await get(`https://${domain}${path}`);
        if (!html) { await sleep(300); continue; }
        coaches = extractCoaches(html, sport);
        if (!coaches.length) coaches = extractCoachesNuxt(html, sport);
        if (coaches.length) break;
        await sleep(300);
      }
      if (!coaches.length) continue;
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

  // Make the load idempotent: skip anything already present (so re-running a
  // conference to backfill newly-reachable schools doesn't collide). We dedupe
  // both within this batch and against existing rows in the DB, keyed by
  // (school, sport, email) — or (school, sport, name) when there's no email.
  const keyOf = (c) => `${c.school}|${c.sport}|${(c.email || `${c.first_name} ${c.last_name}`).toLowerCase()}`;
  const existing = new Set();
  for (const row of await db(`roster_candidates?select=school,sport,email,first_name,last_name&conference=eq.${encodeURIComponent(cfg.name)}`)) {
    existing.add(keyOf(row));
  }
  const seen = new Set();
  const unique = candidates.filter((c) => {
    const k = keyOf(c);
    if (existing.has(k) || seen.has(k)) return false;
    seen.add(k); return true;
  });
  const skipped = candidates.length - unique.length;
  if (skipped) console.log(`(skipped ${skipped} already-present / duplicate row(s))`);
  if (!unique.length) { console.log('Nothing new to add.'); return; }

  for (let i = 0; i < unique.length; i += 200) {
    await db('roster_candidates', 'POST', unique.slice(i, i + 200), 'resolution=ignore-duplicates');
  }
  console.log(`Done. Added ${unique.length} coach(es) to the Roster Candidates review queue.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
