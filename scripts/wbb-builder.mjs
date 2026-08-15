#!/usr/bin/env node
// Women's Basketball roster builder — directory-driven.
//
// We have no purchased women's list, so we (1) scrape each school's women's
// basketball staff page for names/titles/published emails, and (2) where an
// email isn't published, INFER it from that school's email format, learned from
// the men's-basketball + soccer coaches already in the database. Everything
// lands in roster_candidates for human review; inferred emails are flagged.
//
// Usage: SUPABASE_ANON_KEY=... node scripts/wbb-builder.mjs [--from=N --to=N] [--division="NCAA D1"] [--dry]
//   School directory: /tmp/bb/wbb_schools.json  (from the men's basketball file)

import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://auclsmmqipjwrzcnzssl.supabase.co';
const KEY = process.env.SUPABASE_ANON_KEY;
if (!KEY) { console.error('SUPABASE_ANON_KEY is required.'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const UA = 'Mozilla/5.0 (RFX-CoachDatabase-WBB/1.0)';
const SPORT = "Women's Basketball";
const SLUGS = ['womens-basketball', 'wbball', 'w-basketball', 'wbkb'];
const DRY = process.argv.includes('--dry');
const arg = (k) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function db(path, method = 'GET', body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
async function get(url, timeout = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    if (r.ok) { const txt = await r.text(); if (txt) return txt; }
  } catch { /* curl fallback */ } finally { clearTimeout(t); }
  try {
    const { execFileSync } = await import('node:child_process');
    return execFileSync('curl', ['-sL', '--max-time', String(Math.ceil(timeout / 1000)), '-A', UA, url],
      { encoding: 'utf8', maxBuffer: 1 << 27 });
  } catch { return ''; }
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const alpha = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
function normalize(h) {
  return h.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCharCode(parseInt(x, 16))).replace(/&amp;/g, '&');
}
function splitName(raw) {
  const s = normalize(raw).replace(/<[^>]+>/g, ' ').replace(/,.*$/, '')
    .replace(/\b(head|assistant|associate|volunteer|graduate|interim|coach|coaches|coordinator|director|operations|recruiting|offensive|defensive|of|the)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const p = s.split(' ').filter(Boolean);
  return p.length < 2 ? null : { first: p[0], last: p[p.length - 1] };
}
function nameFromSlug(slug) {
  const p = slug.split('-').filter((x) => x.length > 1);
  return p.length < 2 ? null : { first: cap(p[0]), last: cap(p[p.length - 1]) };
}
const GENERIC = /(sports@|athletics@|info@|compliance@|tickets@|marketing@|media@|noreply|@sidearm|recsports?@|accessibility@|athletics\.director@|wbball@|wbb@|hoops@|basketball@|coaches@)/i;
const TITLE_RE = /(associate head coach|assistant coach|head coach|coordinator|director of (?:basketball )?operations|recruiting coordinator|player development)/i;
const PHONE_RE = /(?:\(\d{3}\)\s?\d{3}[-.]\d{4}|\d{3}[-.]\d{3}[-.]\d{4})/;
const COACH_POS = /(coach|coordinator|\boperations\b|recruiting|player development)/i;

function extractSidearm(html) {
  const norm = normalize(html);
  const re = /href=['"](?:https?:\/\/[^'"/]+)?\/sports\/[a-z-]+\/roster\/coaches\/([a-z0-9-]+)\/\d+['"][^>]*>([\s\S]{2,200}?)<\/a>/gi;
  const anchors = []; let m;
  while ((m = re.exec(norm))) anchors.push({ index: m.index, slug: m[1], text: m[2] });
  const bySlug = new Map(); const uniq = [];
  for (const a of anchors) {
    if (!bySlug.has(a.slug)) { const e = { slug: a.slug, index: a.index, name: null }; bySlug.set(a.slug, e); uniq.push(e); }
    const e = bySlug.get(a.slug); if (!e.name) e.name = splitName(a.text);
  }
  const out = [];
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i];
    const end = i + 1 < uniq.length ? uniq[i + 1].index : Math.min(norm.length, a.index + 1600);
    const row = norm.slice(a.index, end);
    const nm = a.name || nameFromSlug(a.slug); if (!nm) continue;
    let email = (row.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu)/i) || [null, null])[1];
    if (email && GENERIC.test(email.toLowerCase())) email = null;
    const rt = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const title = (rt.match(TITLE_RE) || [null])[0];
    const phone = (rt.match(PHONE_RE) || [null])[0];
    out.push({ first: nm.first, last: nm.last, title: title ? title.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Coach', email: email ? email.toLowerCase() : null, phone });
  }
  return out;
}
function extractNuxt(html) {
  const m = html.match(/id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return [];
  let arr; try { arr = JSON.parse(m[1]); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const str = (i) => { const v = Number.isInteger(i) && i >= 0 && i < arr.length ? arr[i] : null; return typeof v === 'string' ? v : null; };
  const out = []; const seen = new Set();
  for (const x of arr) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    if (!('first_name' in x) || !('last_name' in x) || !('position' in x)) continue;
    const first = str(x.first_name), last = str(x.last_name), pos = str(x.position);
    if (!first || !last || !pos || !COACH_POS.test(pos)) continue;
    let email = str(x.email);
    email = email && /@[\w.-]+\.\w+$/.test(email) && !GENERIC.test(email.toLowerCase()) ? email.toLowerCase() : null;
    const phone = str(x.phone) ? (str(x.phone).match(PHONE_RE) || [null])[0] : null;
    const key = `${first}|${last}|${email || ''}`.toLowerCase();
    if (seen.has(key)) continue; seen.add(key);
    out.push({ first: first.trim(), last: last.trim(), title: pos.replace(/\s+/g, ' ').trim().slice(0, 60), email, phone });
  }
  return out;
}
async function scrapeSchool(domain) {
  for (const slug of SLUGS) {
    for (const path of [`/sports/${slug}/coaches`, `/sports/${slug}/roster`]) {
      const html = await get(`https://${domain}${path}`);
      if (!html) { await sleep(150); continue; }
      let c = extractSidearm(html);
      if (!c.length) c = extractNuxt(html);
      if (c.length) return { coaches: c, slug };
      await sleep(150);
    }
  }
  return { coaches: [], slug: SLUGS[0] };
}

// --- email pattern inference (learned from DB coaches WITH emails, per school) --
const TEMPLATES = {
  'first.last': (f, l) => `${f}.${l}`, 'flast': (f, l) => `${f[0]}${l}`, 'firstlast': (f, l) => `${f}${l}`,
  'lastf': (f, l) => `${l}${f[0]}`, 'first_last': (f, l) => `${f}_${l}`, 'f.last': (f, l) => `${f[0]}.${l}`,
  'firstl': (f, l) => `${f}${l[0]}`, 'lastfirst': (f, l) => `${l}${f}`, 'f_last': (f, l) => `${f[0]}_${l}`,
};
function matchTemplates(first, last, local) {
  const f = alpha(first), l = alpha(last); if (!f || !l) return [];
  const lp = local.toLowerCase().replace(/[0-9]/g, '').replace(/[^a-z._]/g, ''); const nos = lp.replace(/[^a-z]/g, '');
  const hits = []; for (const [n, fn] of Object.entries(TEMPLATES)) { const t = fn(f, l); if (t === lp || t.replace(/[^a-z]/g, '') === nos) hits.push(n); } return hits;
}
async function buildPatternMap() {
  const bySchool = new Map();
  for (let off = 0; ; off += 1000) {
    const rows = await db(`coaches?select=first_name,last_name,email,school&email=not.is.null&limit=1000&offset=${off}`);
    for (const c of rows) { if (!c.school) continue; if (!bySchool.has(c.school)) bySchool.set(c.school, []); bySchool.get(c.school).push(c); }
    if (rows.length < 1000) break;
  }
  const pat = new Map();
  for (const [school, list] of bySchool) {
    if (list.length < 3) continue;
    const votes = new Map();
    for (const c of list) for (const t of matchTemplates(c.first_name, c.last_name, c.email.split('@')[0])) votes.set(t, (votes.get(t) || 0) + 1);
    if (!votes.size) continue;
    const [best, bv] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bv < 3 || bv / list.length < 0.6) continue;
    const dc = new Map(); for (const c of list) { const d = (/@(.+)$/.exec(c.email) || [])[1]; if (d) dc.set(d, (dc.get(d) || 0) + 1); }
    pat.set(school, { fn: TEMPLATES[best], domain: [...dc.entries()].sort((a, b) => b[1] - a[1])[0][0], template: best });
  }
  return pat;
}

async function main() {
  const dir = JSON.parse(readFileSync('/tmp/bb/wbb_schools.json', 'utf8'));
  let schools = dir;
  const div = arg('division'); if (div) schools = schools.filter((s) => s.division === div);
  const from = +(arg('from') || 0), to = +(arg('to') || schools.length);
  schools = schools.slice(from, to);
  console.log(`WBB builder — ${schools.length} schools${div ? ` (${div})` : ''}${DRY ? ' [DRY]' : ''}`);

  console.log('Learning per-school email patterns from existing coaches…');
  const pat = await buildPatternMap();
  console.log(`  patterns learned for ${pat.size} schools`);

  // Load existing keys once so the run is idempotent/resumable (re-runs skip done schools).
  const keyOf = (c) => `${c.school}|${c.sport}|${(c.email || `${c.first_name} ${c.last_name}`).toLowerCase()}`;
  const seen = new Set();
  if (!DRY) {
    for (let off = 0; ; off += 1000) {
      const page = await db(`roster_candidates?select=school,sport,email,first_name,last_name&sport=eq.${encodeURIComponent(SPORT)}&limit=1000&offset=${off}`);
      for (const r of page) seen.add(keyOf(r));
      if (!page || page.length < 1000) break;
    }
    console.log(`  ${seen.size} women's-basketball candidates already in the queue (will skip).`);
  }

  let scraped = 0, withEmail = 0, inferred = 0, noEmail = 0, written = 0;
  for (const s of schools) {
    const { coaches, slug } = await scrapeSchool(s.domain);
    if (coaches.length) scraped++;
    const rows = [];
    for (const c of coaches) {
      let email = c.email, source = 'wbb_builder';
      if (!email) {
        const p = pat.get(s.school);
        if (p) { const f = alpha(c.first), l = alpha(c.last); if (f && l) { email = `${p.fn(f, l)}@${p.domain}`; source = `pattern_inferred:${p.template}`; } }
      }
      if (c.email) withEmail++; else if (email) inferred++; else noEmail++;
      const row = {
        first_name: c.first, last_name: c.last, title: c.title, sport: SPORT,
        email: email || null, phone: c.phone, school: s.school, division: s.division,
        conference: s.conference, state: s.state,
        landing_page: `https://${s.domain}/sports/${slug}`,
        source_url: `https://${s.domain}/sports/${slug}/coaches`, source,
      };
      const k = keyOf(row);
      if (DRY) { rows.push(row); continue; }
      if (seen.has(k)) continue; seen.add(k); rows.push(row);
    }
    if (!DRY && rows.length) { await db('roster_candidates', 'POST', rows, 'resolution=ignore-duplicates'); written += rows.length; }
    if (coaches.length) console.log(`  ${s.school.slice(0, 34).padEnd(34)} ${coaches.length} found${DRY ? '' : `, +${rows.length}`}`);
    await sleep(250);
  }
  console.log(`\nScraped ${scraped}/${schools.length} schools ` +
    `(${withEmail} email on page, ${inferred} inferred, ${noEmail} none)${DRY ? '' : ` — wrote ${written}`}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
