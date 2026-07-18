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

const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

// Decode simple HTML entity / obfuscation so mailto and "name [at] school" show up.
function normalize(html) {
  return html
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.');
}

// Reduce HTML to readable text (mailto: targets preserved inline) so a coach's
// name and their adjacent email/phone end up near each other in the string.
function toText(html) {
  return normalize(html)
    .replace(/<a[^>]+href\s*=\s*["']mailto:([^"'?]+)[^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cleanEmail(e) {
  const v = e.toLowerCase().replace(/[.,;:)]+$/, '');
  if (JUNK.test(v) || v.length > 60) return null;
  const local = v.split('@')[0];
  if (GENERIC_LOCAL.test(local) || GENERIC_HINT.test(local)) return null;
  return v;
}

// The heart of it: find the coach's NAME in the page text, then take the email
// (and phone) sitting right next to it — how every staff directory is laid out.
// This is what stops us from grabbing a different "Lauren" from elsewhere on
// the page.
function extractForCoach(text, coach) {
  const first = (coach.first_name || '').trim();
  const last = (coach.last_name || '').trim();
  if (first.length < 2 || last.length < 2) return null;

  const patterns = [
    new RegExp(esc(first) + '\\s+' + esc(last), 'gi'), // First Last
    new RegExp(esc(last) + ',\\s*' + esc(first), 'gi'), // Last, First
  ];
  const positions = [];
  for (const re of patterns) for (const m of text.matchAll(re)) positions.push(m.index);
  if (!positions.length) return null;

  const firstAlpha = first.toLowerCase().replace(/[^a-z]/g, '');
  const lastAlpha = last.toLowerCase().replace(/[^a-z]/g, '');

  for (const pos of positions) {
    // Staff cards run: Name → Title → email/phone → (next card). Look forward
    // from the name (tiny lookback) so we never grab the PREVIOUS coach's data.
    const scope = text.slice(Math.max(0, pos - 12), pos + 340);
    const emails = (scope.match(EMAIL_RE) || []).map(cleanEmail).filter(Boolean);
    // Only accept an email whose local-part actually matches this coach's name
    // (first.last, jsmith, smithj, …). Positional-only guesses on a crowded
    // directory produce wrong people and fragments, so we skip them entirely —
    // opaque logins (lm2aj@) are left for a human rather than guessed at.
    const email = emails.find((e) => {
      const local = e.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
      return (lastAlpha.length > 2 && local.includes(lastAlpha)) ||
             (firstAlpha.length > 2 && local.includes(firstAlpha));
    }) || null;
    if (!email) continue;
    // A phone in the same card, next to a confirmed-name email, is safe to take.
    const phone = (scope.match(PHONE_RE) || [])[0]?.trim() || null;
    return { email, phone, confidence: 'strong' };
  }
  return null;
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

async function huntOne(coach) {
  const firstHtml = await fetchPage(coach.landing_page);
  const candidates = firstHtml ? staffCandidates(firstHtml, coach.landing_page) : [];

  // Scan the landing page, then each candidate page, stopping at the first that
  // has this coach's name with an adjacent email/phone.
  const pages = [{ url: coach.landing_page, html: firstHtml }];
  for (const url of candidates) {
    await sleep(DELAY);
    pages.push({ url, html: await fetchPage(url) });
  }

  for (const { url, html } of pages) {
    if (!html) continue;
    const hit = extractForCoach(toText(html), coach);
    if (hit && (hit.email || hit.phone)) {
      return { email: hit.email, phone: hit.phone, confidence: hit.confidence, source_url: url };
    }
  }
  return null;
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
        const proposals = [];
        if (hit.email) proposals.push({ field: 'email', value: hit.email });
        if (hit.phone) proposals.push({ field: 'phone', value: hit.phone });
        for (const p of proposals) {
          await db('proposed_changes', 'POST', {
            coach_id: coach.id,
            field: p.field,
            current_value: null,
            proposed_value: p.value,
            source_url: hit.source_url,
            source: `email_hunter:${hit.confidence}`,
          }, 'resolution=ignore-duplicates');
        }
        if (proposals.length) {
          found++;
          console.log(`  + ${coach.first_name} ${coach.last_name} (${coach.school}) -> ${proposals.map((p) => `${p.field}:${p.value}`).join(' ')} [${hit.confidence}]`);
        }
      }
    } catch (e) {
      console.log(`  ! ${coach.first_name} ${coach.last_name}: ${e.message}`);
    }
    if (checked % 25 === 0) console.log(`  …${checked}/${targets.length} checked, ${found} coaches with a proposal`);
    await sleep(DELAY);
  }

  console.log(`Done. Checked ${checked}, found contact info for ${found} coaches.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
