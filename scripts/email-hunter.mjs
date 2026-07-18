#!/usr/bin/env node
// The Email Hunter agent.
//
// Runs on a schedule in GitHub Actions (see .github/workflows/email-hunter.yml).
// For each active coach who is missing an email but has a program landing page,
// it visits the page (and its staff/roster sub-page), looks for an email that
// belongs to that coach, and writes a PROPOSAL to the proposed_changes table.
// It never edits the master list — a human approves each proposal in the app.
//
// Config via env:
//   SUPABASE_URL, SUPABASE_ANON_KEY  (required)
//   HUNT_LIMIT   coaches to process per run (default 300)
//   HUNT_DELAY   ms between page fetches   (default 1500 — be polite)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://auclsmmqipjwrzcnzssl.supabase.co';
const KEY = process.env.SUPABASE_ANON_KEY;
const LIMIT = Number(process.env.HUNT_LIMIT || 300);
const DELAY = Number(process.env.HUNT_DELAY || 1500);
const UA = 'RFX-CoachDatabase-EmailHunter/1.0 (+contact: rfx.soccer@gmail.com)';

if (!KEY) {
  console.error('SUPABASE_ANON_KEY is required.');
  process.exit(1);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function db(path, method = 'GET', body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function fetchPage(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JUNK = /(no-?reply|webmaster|postmaster|info@|admin@|example\.|sentry|godaddy|wixpress|@2x|\.png|\.jpg)/i;

// Decode simple HTML entity / obfuscation so mailto and "name [at] school" show up.
function normalize(html) {
  return html
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.');
}

function findEmails(html) {
  const norm = normalize(html);
  const found = new Set();
  // mailto: links first (most reliable)
  for (const m of norm.matchAll(/mailto:([^"'>?\s]+)/gi)) found.add(m[1].toLowerCase());
  for (const m of norm.matchAll(EMAIL_RE)) found.add(m[0].toLowerCase());
  return [...found].filter((e) => !JUNK.test(e) && e.length < 60);
}

// Find likely staff/roster sub-pages to also scan.
function staffLinks(html, baseUrl) {
  const links = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/staff|coach|directory|roster|personnel|contact/i.test(href)) {
      try {
        links.add(new URL(href, baseUrl).href);
      } catch {
        /* skip bad urls */
      }
    }
  }
  return [...links].slice(0, 4);
}

// Pick the email most likely to belong to this coach.
function pickEmail(emails, coach) {
  const last = (coach.last_name || '').toLowerCase().replace(/[^a-z]/g, '');
  const first = (coach.first_name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!emails.length) return null;
  // Strong: local-part contains the surname, or first-initial+surname.
  const strong = emails.find((e) => {
    const local = e.split('@')[0].replace(/[^a-z]/g, '');
    return last.length > 2 && (local.includes(last) || local === (first[0] || '') + last || local === last + (first[0] || ''));
  });
  if (strong) return { email: strong, confidence: 'strong' };
  // Weak: exactly one plausible email on the page — offer it, flagged.
  if (emails.length === 1) return { email: emails[0], confidence: 'weak' };
  return null;
}

async function huntOne(coach) {
  const pages = [coach.landing_page];
  const firstHtml = await fetchPage(coach.landing_page);
  if (firstHtml) {
    for (const l of staffLinks(firstHtml, coach.landing_page)) pages.push(l);
  }

  const emails = new Set();
  const htmls = [firstHtml];
  for (const p of pages.slice(1)) {
    await sleep(DELAY);
    htmls.push(await fetchPage(p));
  }
  for (const html of htmls) {
    if (!html) continue;
    for (const e of findEmails(html)) emails.add(e);
  }

  const pick = pickEmail([...emails], coach);
  if (!pick) return null;
  return { email: pick.email, confidence: pick.confidence, source_url: coach.landing_page };
}

async function main() {
  console.log(`Email Hunter starting — up to ${LIMIT} coaches.`);

  // Active coaches missing an email but with a landing page, that don't
  // already have a pending email proposal.
  const existing = await db('proposed_changes?select=coach_id&status=eq.pending&field=eq.email&limit=5000');
  const skip = new Set(existing.map((r) => r.coach_id));

  const coaches = await db(
    'coaches?select=id,first_name,last_name,school,landing_page' +
      '&status=eq.active&email=is.null&landing_page=not.is.null' +
      `&limit=${LIMIT + skip.size}`
  );
  const targets = coaches.filter((c) => !skip.has(c.id)).slice(0, LIMIT);
  console.log(`${targets.length} coaches to hunt (${skip.size} already have a pending proposal).`);

  let found = 0, checked = 0;
  for (const coach of targets) {
    checked++;
    try {
      const hit = await huntOne(coach);
      if (hit) {
        await db('proposed_changes', 'POST', {
          coach_id: coach.id,
          field: 'email',
          current_value: null,
          proposed_value: hit.email,
          source_url: hit.source_url,
          source: `email_hunter:${hit.confidence}`,
        }, 'resolution=ignore-duplicates');
        found++;
        console.log(`  + ${coach.first_name} ${coach.last_name} (${coach.school}) -> ${hit.email} [${hit.confidence}]`);
      }
    } catch (e) {
      console.log(`  ! ${coach.first_name} ${coach.last_name}: ${e.message}`);
    }
    if (checked % 25 === 0) console.log(`  …${checked}/${targets.length} checked, ${found} proposals`);
    await sleep(DELAY);
  }

  console.log(`Done. Checked ${checked}, proposed ${found} emails.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
