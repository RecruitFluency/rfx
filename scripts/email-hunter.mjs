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
// Generic mailboxes that belong to a department, not a person — never a coach's address.
const GENERIC_LOCAL = /^(rec-?sports|athletics|sports|compliance|tickets|marketing|media|sid|communications|ftp|support|help|contact|general|office|mailbox|feedback|hello|team|sports-?info|athleticcommunications)$/i;
const GENERIC_HINT = /(static|ftp|noreply|donotreply|mailer|newsletter)/i;

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

// Build a prioritized list of sub-pages likely to hold this team's coach
// emails. Modern athletics sites (Sidearm etc.) put emails on a per-sport
// "coaches" page and/or a site-wide staff directory — NOT the landing page
// itself. We try those directly, then same-sport discovered links, then
// generic ones. Same-sport pages come first so another sport's roster can't
// crowd them out.
function staffCandidates(html, landingUrl) {
  const out = [];
  const seen = new Set();
  const add = (u) => { try { const h = new URL(u, landingUrl).href; if (!seen.has(h)) { seen.add(h); out.push(h); } } catch { /* skip */ } };

  let origin = '', path = '';
  try { const u = new URL(landingUrl); origin = u.origin; path = u.pathname.replace(/\/$/, ''); } catch { /* ignore */ }

  // Direct guesses off the landing path (e.g. /sports/womens-soccer/coaches).
  if (path) {
    add(origin + path + '/coaches');
    add(origin + path + '/staff');
  }
  // The sport slug (e.g. "womens-soccer") for same-sport link matching.
  const sportSlug = (path.split('/').pop() || '').toLowerCase();

  const discovered = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/staff|coach|directory|personnel|contact/i.test(href)) discovered.push(href);
  }
  // Same-sport coach/staff links first.
  for (const href of discovered) {
    if (sportSlug && href.toLowerCase().includes(sportSlug)) add(href);
  }
  // Site-wide staff directory.
  add(origin + '/staff-directory');
  // Any remaining coach/staff/directory links.
  for (const href of discovered) add(href);

  return out.slice(0, 6);
}

// Pick the email most likely to belong to THIS coach. We only propose emails
// that genuinely match the coach's name — a lone generic department inbox is
// never proposed, because it's not the coach's address.
function pickEmail(emails, coach) {
  const last = (coach.last_name || '').toLowerCase().replace(/[^a-z]/g, '');
  const first = (coach.first_name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!emails.length || last.length < 3) return null;

  const candidates = emails.filter((e) => {
    const local = e.split('@')[0];
    const localAlpha = local.toLowerCase().replace(/[^a-z]/g, '');
    if (GENERIC_LOCAL.test(local) || GENERIC_HINT.test(local)) return false;
    return localAlpha.length >= 3;
  });

  // Strong: surname appears in the local-part, or a first-initial+surname
  // (or surname+first-initial) construction — the standard .edu formats.
  const fi = first[0] || '';
  const strong = candidates.find((e) => {
    const local = e.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
    return local.includes(last) || (fi && (local === fi + last || local === last + fi || local.startsWith(fi + last)));
  });
  if (strong) return { email: strong, confidence: 'strong' };

  // Medium: first name appears in the local-part (e.g. jamie.davies but we
  // only caught the first token). Still name-based, flagged for a quick check.
  if (first.length >= 3) {
    const medium = candidates.find((e) => e.split('@')[0].toLowerCase().replace(/[^a-z]/g, '').includes(first));
    if (medium) return { email: medium, confidence: 'weak' };
  }

  // No name-based match → propose nothing. (A lone generic email is not a lead.)
  return null;
}

async function huntOne(coach) {
  const firstHtml = await fetchPage(coach.landing_page);
  const candidates = firstHtml ? staffCandidates(firstHtml, coach.landing_page) : [];

  // Scan the landing page first, then each candidate, stopping as soon as we
  // get a name match (so we don't hammer six pages when the first one hits).
  const htmls = [{ url: coach.landing_page, html: firstHtml }];
  for (const url of candidates) {
    await sleep(DELAY);
    htmls.push({ url, html: await fetchPage(url) });
  }

  const emails = new Set();
  let sourceUrl = coach.landing_page;
  for (const { url, html } of htmls) {
    if (!html) continue;
    const before = emails.size;
    for (const e of findEmails(html)) emails.add(e);
    // Remember the page that first yielded a name-matching email.
    if (emails.size > before && pickEmail([...emails], coach)) { sourceUrl = url; break; }
  }

  const pick = pickEmail([...emails], coach);
  if (!pick) return null;
  return { email: pick.email, confidence: pick.confidence, source_url: sourceUrl };
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
