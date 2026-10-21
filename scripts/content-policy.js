/**
 * scripts/content-policy.js
 *
 * Omdan Development content policy (see content/blog-rules.md → "Content policy"):
 *   1. Residential only — never offer or imply commercial work.
 *   2. No pricing — no prices, ranges, dollar amounts, or cost-per-square-foot figures.
 *      Cost TOPICS are fine; they are answered with cost factors, never numbers.
 *   3. CSLB #1148568 belongs to Omdan Development Inc. — never say David holds it.
 *
 * Used by scripts/publish-blog.js (gate before publishing) and
 * scripts/test-content-policy.js (site-wide test).
 */
'use strict';

// Mentions of "commercial" that only describe a place or building are allowed.
// Anything else needs a human decision — add it here only if it does NOT imply we do commercial work.
const ALLOWED_COMMERCIAL = [
  /commercial (corridor|core|district|zones?|noise)/i,
  /commercial and (residential|industrial) (density|development|buildings|core|heart)/i,
  /residential and commercial (development|density)/i,
  /(historic|agricultural and) commercial and residential (core|heart)/i,
  /commercial and residential (heart|core|flat roofing material)/i,
  /most widely used commercial and residential flat roofing/i,
  /homes and commercial buildings from the same era/i,
  /(pavement|parking lots), (and )?commercial (buildings|rooftops)/i,
  /commercial-adjacent residential/i,
];

const COMMERCIAL_TERMS = [
  /\bcommercial\b/i,
  /\b(warehouses?|storefronts?|tasting rooms?|tenant improvements?|office build-?outs?|retail (suites?|spaces?|stores?|leak))\b/i,
  /\b(homes?|homeowners|residences|residential)( and|,| &| or) (local )?businesses\b/i,
  /\bfor (local )?businesses\b/i,
];

const PRICE_PATTERNS = [
  { re: /\$\s?\d/, why: 'dollar amount' },
  { re: /\$\s?(saved|savings|per|off)\b/i, why: 'dollar savings figure' },
  { re: /\b\d[\d,.]*\s?(dollars|bucks|usd)\b/i, why: 'dollar amount' },
  { re: /\b(hundreds|thousands|tens of thousands) of dollars\b/i, why: 'dollar estimate' },
  { re: /\bmulti-thousand-dollar\b/i, why: 'dollar estimate' },
  { re: /\bprice ranges?\b|\bcost ranges?\b/i, why: 'price range' },
  { re: /\b(starting|starts) at \$|\bas low as\b/i, why: '"starting at" price' },
  { re: /\bcosts? (between|from|around|about|roughly|approximately) \$?\d/i, why: 'cost figure' },
  { re: /\d\s?(-|to|–)\s?\$?\d[\d,.]*\s?(per|\/)\s?(square|sq\.?)\s?(foot|feet|ft)/i, why: 'cost per square foot range' },
  { re: /\$\s?\d[\d,.]*\s?(per|\/)\s?(square|sq\.?)\s?(foot|feet|ft)/i, why: 'cost per square foot' },
  { re: /"priceRange"|"lowPrice"|"highPrice"/, why: 'price field in schema' },
];

const LICENSE_PATTERNS = [
  { re: /\b(he|david)\s+(holds|is licensed|has (a|the) (contractor'?s? )?licen[cs]e)/i, why: 'license attributed to David personally' },
  { re: /\bDavid,?\s+(a\s+)?licensed contractor\b/i, why: 'license attributed to David personally' },
];

function allowedCommercial(text, idx) {
  const window = text.slice(Math.max(0, idx - 60), idx + 80);
  return ALLOWED_COMMERCIAL.some(re => re.test(window));
}

/**
 * Return a list of policy violations found in plain text.
 * strict = true (blog articles): "commercial" is never allowed, even descriptively.
 */
function checkText(text, where = '', { strict = false } = {}) {
  const out = [];
  const t = String(text || '');
  for (const re of COMMERCIAL_TERMS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = g.exec(t))) {
      if (!strict && /^commercial$/i.test(m[0]) && allowedCommercial(t, m.index)) continue;
      out.push({ rule: 'residential-only', why: `commercial reference "${m[0]}"`, where, snippet: snip(t, m.index) });
    }
  }
  for (const { re, why } of PRICE_PATTERNS) {
    const m = re.exec(t);
    if (m) out.push({ rule: 'no-pricing', why, where, snippet: snip(t, m.index) });
  }
  for (const { re, why } of LICENSE_PATTERNS) {
    const m = re.exec(t);
    if (m) out.push({ rule: 'license-attribution', why, where, snippet: snip(t, m.index) });
  }
  return out;
}

function snip(t, i) { return t.slice(Math.max(0, i - 50), i + 70).replace(/\s+/g, ' ').trim(); }

/** Check a generated blog article object (the JSON returned by the model). */
function checkArticle(art) {
  const v = [];
  const S = { strict: true };
  const fields = ['meta_description', 'og_description', 'lede', 'category_label', 'cta_heading', 'cta_body', 'cta_link_label'];
  for (const f of fields) v.push(...checkText(art[f], f, S));
  (art.keywords || []).forEach((k, i) => v.push(...checkText(k, `keywords[${i}]`, S)));
  (art.sections || []).forEach((s, i) => { v.push(...checkText(s.h2, `sections[${i}].h2`, S)); v.push(...checkText(stripTags(s.body), `sections[${i}].body`, S)); });
  (art.faqs || []).forEach((q, i) => { v.push(...checkText(q.question, `faqs[${i}].question`, S)); v.push(...checkText(q.answer, `faqs[${i}].answer`, S)); });
  if (!/free on-site estimate/i.test(art.cta_link_label || '')) {
    v.push({ rule: 'lead-gen-cta', why: 'CTA button must offer a free on-site estimate', where: 'cta_link_label', snippet: art.cta_link_label || '(empty)' });
  }
  return v;
}

/** Extract the text a visitor or crawler sees: visible text, meta descriptions/titles, and JSON-LD. */
function pageText(html) {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:description|og:title|twitter:description|twitter:title)"[^>]*>/gi)]
    .map(m => (m[0].match(/content="([^"]*)"/) || [, ''])[1]).join('\n');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1];
  const visible = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '));
  return [title, metas, visible, ld].join('\n');
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');
}

module.exports = { checkText, checkArticle, pageText, stripTags };
