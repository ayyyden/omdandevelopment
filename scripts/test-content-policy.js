/**
 * scripts/test-content-policy.js
 *
 * Enforces the content policy (residential only, no pricing, company-held license).
 *   node scripts/test-content-policy.js
 * Exits 1 on any failure. Run before every deploy; also run by the weekly blog workflow
 * before the blog bot is allowed to push.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { checkText, checkArticle, pageText } = require('./content-policy');

const ROOT = path.resolve(__dirname, '..');
let failed = 0, passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message.split('\n').join('\n     ')}`); }
}
const rules = t => checkText(t).map(v => v.rule);

// ── 1. Rule unit tests ──────────────────────────────────────────────────────
const MUST_FLAG = [
  ['We handle residential and commercial projects.', 'residential-only'],
  ['Do you work on commercial spaces? Yes.', 'residential-only'],
  ['We service small warehouses and retail suites.', 'residential-only'],
  ['Commercial-grade fixtures rated for constant use.', 'residential-only'],
  ['We also handle commercial buildings.', 'residential-only'],
  ['Our crews serve commercial clients too.', 'residential-only'],
  ['We install artificial turf for homes and businesses across the valley.', 'residential-only'],
  ['Turf solutions for businesses in Indio.', 'residential-only'],
  ['A $150 tune-up prevents bigger repairs.', 'no-pricing'],
  ['Pavers run $15–$18 per square foot.', 'no-pricing'],
  ['Most patios cost between $4,000 and $9,000.', 'no-pricing'],
  ['Prevents tens of thousands of dollars in repairs.', 'no-pricing'],
  ['Estimated $ saved per year', 'no-pricing'],
  ['Our price range is wide.', 'no-pricing'],
  ['Turf installs starting at $8.', 'no-pricing'],
  ['"priceRange": "$$"', 'no-pricing'],
  ['He holds CSLB License #1148568.', 'license-attribution'],
  ['David holds CSLB License #1148568.', 'license-attribution'],
];
for (const [text, rule] of MUST_FLAG) {
  test(`flags [${rule}]: "${text}"`, () => assert.ok(rules(text).includes(rule), `not flagged (got: ${rules(text).join(', ') || 'nothing'})`));
}
const MUST_PASS = [
  'Paver installation cost in Palm Springs depends on size, base preparation, and paver type.',
  'Every home is different, so we provide personalized pricing after a free on-site estimate.',
  'The Landau area near Cathedral City\'s commercial corridor has modest single-family homes.',
  'Heat absorbed from roads, parking lots, commercial rooftops, and densely packed housing.',
  'TPO is the most widely used commercial and residential flat roofing material in the US.',
  'Omdan Development Inc. holds CSLB License #1148568.',
  'Uses an estimate of ~55 gallons per sq ft per year for grass irrigation.',
  'Yucca Valley receives more solar energy per square foot of wall.',
  'Weekday dispatch windows starting at 7 a.m.',
  'A routine tune-up can prevent a far more expensive compressor replacement.',
];
for (const text of MUST_PASS) {
  test(`allows: "${text.slice(0, 70)}"`, () => assert.deepStrictEqual(rules(text), [], `false positive: ${JSON.stringify(checkText(text))}`));
}

// ── 2. Blog bot article gate ────────────────────────────────────────────────
const goodArticle = {
  meta_description: 'What affects the cost of a paver patio in Palm Springs, from base prep to paver type.',
  og_description: 'Cost factors for paver patios in Palm Springs homes.', lede: 'Every patio is different.',
  category_label: 'Pavers', cta_heading: 'Planning a patio?',
  cta_body: 'Request a free on-site estimate for personalized pricing.', cta_link_label: 'Get a Free On-Site Estimate',
  keywords: ['paver installation cost Palm Springs'],
  sections: [{ h2: 'What affects the cost', body: '<p>Size, base preparation, and access all matter.</p>' }],
  faqs: [{ question: 'How much does a paver patio cost?', answer: 'It depends on size and materials. Schedule a free on-site estimate for personalized pricing.' }],
};
test('article gate accepts a compliant cost-topic article', () => assert.deepStrictEqual(checkArticle(goodArticle), []));
test('article gate rejects a price in an FAQ answer', () => {
  const bad = { ...goodArticle, faqs: [{ question: 'Cost?', answer: 'Usually $12–$20 per square foot.' }] };
  assert.ok(checkArticle(bad).some(v => v.rule === 'no-pricing'));
});
test('article gate rejects commercial work in a section', () => {
  const bad = { ...goodArticle, sections: [{ h2: 'Who we serve', body: '<p>We also do commercial properties.</p>' }] };
  assert.ok(checkArticle(bad).some(v => v.rule === 'residential-only'));
});
test('article gate is strict: even descriptive "commercial corridor" is rejected in blog posts', () => {
  const bad = { ...goodArticle, sections: [{ h2: 'Neighborhoods', body: '<p>Homes near the commercial corridor.</p>' }] };
  assert.ok(checkArticle(bad).some(v => v.rule === 'residential-only'));
});
test('article gate rejects "we also handle commercial buildings" (regression from bot simulation)', () => {
  const bad = { ...goodArticle, sections: [{ h2: 'Scope', body: '<p>We also handle commercial buildings.</p>' }] };
  assert.ok(checkArticle(bad).some(v => v.rule === 'residential-only'));
});
test('article gate rejects a CTA that is not a free on-site estimate', () => {
  assert.ok(checkArticle({ ...goodArticle, cta_link_label: 'Contact us' }).some(v => v.rule === 'lead-gen-cta'));
});
test('publish-blog.js wires the gate in', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/publish-blog.js'), 'utf8');
  assert.ok(src.includes("require('./content-policy')"), 'content-policy not required');
  assert.ok(src.includes('checkArticle(article)'), 'checkArticle not called');
  assert.ok(/RESIDENTIAL ONLY/.test(src) && /NO PRICING/.test(src), 'policy missing from prompt');
});

// ── 3. Topic library + editorial rules ──────────────────────────────────────
const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/blog-topic-library.json'), 'utf8'));
test(`topic library titles comply (${library.length} topics)`, () => {
  const bad = library.flatMap(t => checkText(t.title, t.slug));
  assert.deepStrictEqual(bad.map(v => `${v.where}: ${v.why}`), []);
});
test('blog-rules.md documents the content policy', () => {
  const md = fs.readFileSync(path.join(ROOT, 'content/blog-rules.md'), 'utf8');
  assert.ok(/## Content policy/.test(md) && /Residential only/i.test(md) && /free on-site estimate/i.test(md));
});

// ── 4. Whole live site ──────────────────────────────────────────────────────
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (['.git', '.claude', 'node_modules', 'preview-dist'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [p] : [];
  });
}
const pages = htmlFiles(ROOT);
test(`all ${pages.length} pages comply (visible text, titles, meta, schema)`, () => {
  const bad = pages.flatMap(p => checkText(pageText(fs.readFileSync(p, 'utf8')), path.relative(ROOT, p)));
  assert.deepStrictEqual(bad.map(v => `${v.where} [${v.rule}] ${v.why}: "${v.snippet}"`), []);
});
test('llms.txt complies', () => {
  const bad = checkText(fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8'), 'llms.txt');
  assert.deepStrictEqual(bad.map(v => `${v.why}: "${v.snippet}"`), []);
});

// ── 5. Genuine proof only (no unrelated companies, no fabricated reviews) ───
const VERIFIED_REVIEWERS = ['Ben E', 'John M', 'Simcha T', 'Giela T', 'Revital W', 'Sivan K', 'Rotem L'];
const FABRICATED = ['Desert Green Builders', 'L. Miller', 'P. Lee', 'A. Johnson', 'R. Bennett', 'T. Harper', 'S. Coleman',
  'Jenna R.', 'Marcus L.', 'Alicia M.', 'David S.', 'Morgan V.', 'Caleb R.'];
const html = pages.map(p => [path.relative(ROOT, p), fs.readFileSync(p, 'utf8')]);
test('no unrelated company or fabricated reviewer appears on any page', () => {
  const bad = html.flatMap(([f, t]) => FABRICATED.filter(n => t.includes(n)).map(n => `${f}: ${n}`));
  assert.deepStrictEqual(bad, []);
});
test('every "Google review" attribution is a verified reviewer', () => {
  const bad = html.flatMap(([f, t]) => [...t.matchAll(/—\s*([^<,]+),\s*Google review/g)]
    .map(m => m[1].trim()).filter(n => !VERIFIED_REVIEWERS.includes(n)).map(n => `${f}: ${n}`));
  assert.deepStrictEqual(bad, []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
