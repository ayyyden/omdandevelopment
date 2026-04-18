/**
 * scripts/publish-blog.js
 *
 * Weekly automated blog publisher for omdandevelopment.com
 *
 * Flow:
 *   1. Read content/blog-topic-library.json
 *   2. Read content/blog-posted-log.json
 *   3. Select next unposted topic (highest priority first)
 *   4. Call Claude API to generate article content (structured JSON)
 *   5. Write blog/SLUG/index.html
 *   6. Update blog/index.html  (new card + JSON-LD)
 *   7. Update sitemap.xml
 *   8. Append to content/blog-posted-log.json
 *
 * Manual run:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/publish-blog.js
 *
 * Triggered automatically by:
 *   .github/workflows/weekly-blog.yml  (every Monday 10:00 UTC)
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');

// ─── file helpers ─────────────────────────────────────────────────────────────

const abs      = p => path.join(ROOT, p);
const read     = p => fs.readFileSync(abs(p), 'utf8');
const write    = (p, s) => { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); fs.writeFileSync(abs(p), s, 'utf8'); };
const readJSON  = p => JSON.parse(read(p));
const writeJSON = (p, o) => write(p, JSON.stringify(o, null, 2) + '\n');

// ─── text helpers ─────────────────────────────────────────────────────────────

function slugify(t) {
  return t.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function isoDate(d) { return d.toISOString().split('T')[0]; }

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Escape for HTML text content
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape for HTML attribute values
function escA(s) {
  return String(s).replace(/"/g, '&quot;');
}

// ─── Claude API ───────────────────────────────────────────────────────────────

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) { reject(new Error('ANTHROPIC_API_KEY is not set')); return; }

    const body = Buffer.from(JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }));

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Length': body.length
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          if (parsed.error) {
            reject(new Error('API error: ' + JSON.stringify(parsed.error)));
            return;
          }
          resolve(parsed.content[0].text);
        } catch (e) {
          reject(new Error('Bad API response: ' + chunks.join('').slice(0, 400)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(topic) {
  return `You are a content writer for Omdan Development Inc, a licensed contractor in Southern California (License #1148568). They serve Palm Springs, Coachella Valley, Inland Empire, and surrounding areas. Services: pavers, artificial turf, concrete, gutters, handyman repairs, kitchen remodeling, bathroom remodeling, gravel/xeriscape, exterior painting, drywall repair, floor repair, tile work, countertop replacement, pool remodeling.

Write a full blog article for this topic:
Title: "${topic.title}"
Category: ${topic.category || 'General'}
${topic.city ? 'City focus: ' + topic.city : ''}
${topic.service ? 'Service focus: ' + topic.service : ''}

STRICT RULES — follow every one:
- Natural, readable prose written for real homeowners. No thin filler content.
- No fake customer testimonials or invented stories.
- No made-up statistics or specific numbers you cannot verify.
- No pricing.
- Write as a knowledgeable local contractor who knows Southern California.
- Include internal links where contextually natural. Available service pages:
  /pavers/, /artificial-turf/, /concrete/, /gutters/, /handyman/,
  /kitchen-remodeling/, /bathroom-remodeling/, /gravel/, /exterior-painting/,
  /drywall-repair/, /floor-repair/, /tile-work/, /countertop-replacement/, /pool-remodeling/
- Reference specific cities: Palm Springs, Coachella Valley, Palm Desert, Desert Hot Springs,
  Yucca Valley, Twentynine Palms, Moreno Valley, Menifee, Murrieta, Temecula, San Bernardino.
- 5 to 7 sections minimum.
- Each section "body" must be 2–4 paragraphs of HTML using ONLY these tags: <p>, <ul>, <li>, <strong>, <a href="...">.
- 4 to 5 FAQ entries.
- Total article body approximately 900–1,400 words.

Return ONLY a valid JSON object. No markdown. No code fences. No explanation. Exact schema:
{
  "meta_description": "140-160 chars, includes primary keyword naturally",
  "og_description": "130-150 chars for Open Graph",
  "lede": "1-2 sentence subtitle displayed under the article title in the header",
  "category_label": "Short badge label e.g. Pavers, Handyman, Gutters",
  "cta_icon": "feather icon name e.g. tool, sun, home, layers, cloud-rain, droplet, grid",
  "cta_heading": "Short compelling CTA headline inside the article",
  "cta_body": "1-2 sentence CTA body text inviting contact",
  "cta_link": "/most-relevant-service-page/",
  "cta_link_label": "Button label text",
  "keywords": ["5 to 8 keyword strings relevant to this article"],
  "article_section": "Same value as category_label",
  "sections": [
    {
      "h2": "Section heading text",
      "body": "<p>HTML paragraph content using only allowed tags.</p><p>More paragraphs.</p>"
    }
  ],
  "faqs": [
    {
      "question": "FAQ question text?",
      "answer": "Plain text answer, 2–4 sentences."
    }
  ]
}`;
}

// ─── build blog article HTML page ─────────────────────────────────────────────

function buildPage(art, topic, slug, today) {
  const url   = `https://omdandevelopment.com/blog/${slug}/`;
  const cat   = art.category_label || topic.category || 'General';
  const longD = longDate(today);
  const title = topic.title;

  const sectionsHtml = art.sections.map(s =>
    `      <h2>${esc(s.h2)}</h2>\n\n${s.body}\n`
  ).join('\n');

  const faqSchemaItems = art.faqs.map(f => `      {
        "@type": "Question",
        "name": ${JSON.stringify(f.question)},
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ${JSON.stringify(f.answer)}
        }
      }`).join(',\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>${esc(title)} | Omdan Development</title>
  <meta name="description" content="${escA(art.meta_description)}">
  <meta name="theme-color" content="#0f172a" />

  <!-- Open Graph -->
  <meta property="og:title" content="${escA(title)}">
  <meta property="og:description" content="${escA(art.og_description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://omdandevelopment.com/assets/15.webp">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="canonical" href="${url}">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="preconnect" href="https://cdn.tailwindcss.com">
  <link rel="preconnect" href="https://unpkg.com">

  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: {
            ink: '#0f172a',
            muted: '#334155',
            line: '#e2e8f0',
            brand: '#2563eb',
            brand2: '#16a34a'
          }
        }
      }
    }
  </script>

  <!-- Feather icons -->
  <script src="https://unpkg.com/feather-icons"></script>

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="/assets/favicon.ico">

  <style>
    .reveal { opacity: 0; transform: translateY(14px); transition: opacity .5s ease, transform .5s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .prose-article h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      line-height: 1.3;
    }
    .prose-article p {
      color: #334155;
      line-height: 1.8;
      margin-bottom: 1.25rem;
      font-size: 1.0625rem;
    }
    .prose-article ul {
      list-style: disc;
      padding-left: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .prose-article ul li {
      color: #334155;
      line-height: 1.8;
      margin-bottom: 0.4rem;
    }
    .prose-article strong {
      color: #0f172a;
      font-weight: 600;
    }
    .prose-article a {
      color: #2563eb;
      text-decoration: underline;
    }
    .prose-article a:hover {
      opacity: 0.8;
    }
  </style>

  <!-- Article schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(art.meta_description)},
    "url": "${url}",
    "datePublished": "${today}",
    "dateModified": "${today}",
    "author": {
      "@type": "Organization",
      "name": "Omdan Development Inc",
      "url": "https://omdandevelopment.com/"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Omdan Development Inc",
      "url": "https://omdandevelopment.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://omdandevelopment.com/assets/logo.webp"
      }
    },
    "image": "https://omdandevelopment.com/assets/15.webp",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${url}"
    },
    "keywords": ${JSON.stringify(art.keywords || [])},
    "articleSection": ${JSON.stringify(art.article_section || cat)}
  }
  </script>

  <!-- FAQ schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
${faqSchemaItems}
    ]
  }
  </script>
</head>

<body class="bg-white font-sans text-ink overflow-x-hidden">

  <!-- Top bar -->
  <div class="w-full bg-ink text-white text-sm">
    <div class="max-w-7xl mx-auto px-5 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="font-semibold">Omdan Development Inc</span>
        <span class="text-white/70 hidden sm:inline">•</span>
        <span class="text-white/85">Landscaping &amp; Outdoor Improvements</span>
      </div>
      <div class="flex flex-wrap items-center gap-3 justify-center sm:justify-end text-center">
        <a class="hover:underline" href="tel:9512920703">(951) 292-0703</a>
        <a class="hover:underline" href="mailto:omdandevelopment@gmail.com">omdandevelopment@gmail.com</a>
      </div>
    </div>
  </div>

  <!-- Nav -->
  <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-line" aria-label="Main navigation" role="banner">
    <div class="max-w-7xl mx-auto px-5 py-4 flex justify-between items-center">
      <a href="/" class="flex items-center gap-3 min-w-0" aria-label="Omdan Development home">
        <img src="/assets/logo.webp" alt="Omdan Development Inc logo" class="h-9 w-auto flex-shrink-0" loading="eager" />
        <span class="font-bold text-base sm:text-lg leading-tight truncate">Omdan Development</span>
      </a>
      <div class="hidden md:flex items-center gap-7">
        <a href="/#about" class="text-muted hover:text-ink font-medium transition">About</a>
        <a href="/#services" class="text-muted hover:text-ink font-medium transition">Services</a>
        <a href="/#service-areas" class="text-muted hover:text-ink font-medium transition">Service Areas</a>
        <a href="/#gallery" class="text-muted hover:text-ink font-medium transition">Work</a>
        <a href="/projects/" class="text-muted hover:text-ink font-medium transition">Projects</a>
        <a href="/blog/" class="text-brand font-semibold hover:text-ink transition">Blog</a>
        <a href="/#contact" class="text-muted hover:text-ink font-medium transition">Contact</a>
        <a href="/#contact" class="bg-brand text-white px-5 py-2 rounded-lg font-semibold hover:opacity-95 transition">
          Get a Free Consultation
        </a>
      </div>
      <button id="menu-toggle" class="md:hidden p-2 rounded hover:bg-slate-100" aria-label="Open menu" aria-expanded="false">
        <i data-feather="menu" class="w-6 h-6"></i>
      </button>
    </div>
    <div id="mobile-menu" class="md:hidden hidden border-t bg-white" role="dialog" aria-label="Mobile menu">
      <div class="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-4">
        <a href="/#about" class="text-muted hover:text-ink">About</a>
        <a href="/#services" class="text-muted hover:text-ink">Services</a>
        <a href="/#service-areas" class="text-muted hover:text-ink">Service Areas</a>
        <a href="/#gallery" class="text-muted hover:text-ink">Work</a>
        <a href="/projects/" class="text-muted hover:text-ink">Projects</a>
        <a href="/blog/" class="text-brand font-semibold hover:text-ink">Blog</a>
        <a href="/#contact" class="text-muted hover:text-ink">Contact</a>
        <a href="/#contact" class="bg-brand text-white px-5 py-2 rounded-lg text-center font-semibold hover:opacity-95">
          Get a Free Consultation
        </a>
      </div>
    </div>
  </nav>

  <!-- Article header -->
  <header class="bg-brand2/10 border-b border-line py-12 px-5">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-5 text-sm text-muted">
        <a href="/blog/" class="hover:text-brand flex items-center gap-1.5">
          <i data-feather="arrow-left" class="w-4 h-4"></i> Blog
        </a>
        <span>·</span>
        <span class="inline-block bg-brand2 text-white text-xs font-semibold px-3 py-1 rounded-full">${esc(cat)}</span>
        <span>·</span>
        <time datetime="${today}">${longD}</time>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-ink leading-tight">
        ${esc(title)}
      </h1>
      <p class="mt-4 text-lg text-muted leading-relaxed">
        ${esc(art.lede)}
      </p>
      <div class="mt-6 flex items-center gap-2 text-sm text-muted">
        <i data-feather="user" class="w-4 h-4"></i>
        <span>By <strong class="text-ink">Omdan Development Inc</strong> — Licensed Contractor, License #1148568</span>
      </div>
    </div>
  </header>

  <!-- Article body -->
  <main class="max-w-3xl mx-auto px-5 py-14">
    <article class="prose-article">

${sectionsHtml}

      <!-- CTA -->
      <div class="mt-10 bg-brand/5 border border-brand/20 rounded-2xl p-7 text-center not-prose">
        <i data-feather="${esc(art.cta_icon || 'tool')}" class="w-8 h-8 text-brand mx-auto mb-3"></i>
        <h3 class="text-xl font-bold text-ink mb-2">${esc(art.cta_heading)}</h3>
        <p class="text-muted text-sm mb-5 max-w-md mx-auto">${esc(art.cta_body)}</p>
        <a href="${escA(art.cta_link)}"
           style="display:inline-flex;align-items:center;justify-content:center;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;">
          ${esc(art.cta_link_label)}
        </a>
        <div class="mt-4 text-sm text-muted">
          Or call us directly: <a href="tel:9512920703" class="text-brand font-semibold hover:underline">(951) 292-0703</a>
        </div>
      </div>

    </article>

    <!-- Back to blog -->
    <div class="mt-12 pt-8 border-t border-line">
      <a href="/blog/" class="inline-flex items-center gap-2 text-muted hover:text-ink text-sm font-medium transition">
        <i data-feather="arrow-left" class="w-4 h-4"></i>
        Back to the Blog
      </a>
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-ink text-white py-10">
    <div class="max-w-7xl mx-auto px-5">
      <div class="grid md:grid-cols-5 gap-8">
        <div>
          <div class="flex items-center gap-3">
            <img src="/assets/logo.webp" alt="Omdan Development Inc logo" class="h-9 w-auto" loading="lazy" decoding="async" />
            <span class="text-lg font-bold">Omdan Development</span>
          </div>
          <p class="mt-3 text-white/75 text-sm">Landscaping &amp; outdoor improvements + handyman repairs across Los Angeles and nearby areas.</p>
        </div>
        <div>
          <h4 class="font-bold mb-3">Services</h4>
          <ul class="space-y-2 text-white/75 text-sm">
            <li><a class="hover:text-white" href="/pavers/">Pavers</a></li>
            <li><a class="hover:text-white" href="/artificial-turf/">Artificial Turf</a></li>
            <li><a class="hover:text-white" href="/concrete/">Concrete</a></li>
            <li><a class="hover:text-white" href="/gutters/">Gutters</a></li>
            <li><a class="hover:text-white" href="/handyman/">Handyman</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-3">Service Areas</h4>
          <ul class="space-y-2 text-white/75 text-sm">
            <li><a class="hover:text-white" href="/handyman/palm-springs/">Palm Springs</a></li>
            <li><a class="hover:text-white" href="/handyman/palm-desert/">Palm Desert</a></li>
            <li><a class="hover:text-white" href="/handyman/twentynine-palms/">Twentynine Palms</a></li>
            <li><a class="hover:text-white" href="/handyman/yucca-valley/">Yucca Valley</a></li>
            <li><a class="hover:text-white" href="/handyman/moreno-valley/">Moreno Valley</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-3">Quick Links</h4>
          <ul class="space-y-2 text-white/75 text-sm">
            <li><a class="hover:text-white" href="/#about">About</a></li>
            <li><a class="hover:text-white" href="/projects/">Projects</a></li>
            <li><a class="hover:text-white" href="/blog/">Blog</a></li>
            <li><a class="hover:text-white" href="/#contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-3">Contact</h4>
          <ul class="space-y-3 text-white/75 text-sm">
            <li class="flex items-center gap-2"><i data-feather="phone" class="w-4 h-4"></i><a class="hover:text-white" href="tel:9512920703">(951) 292-0703</a></li>
            <li class="flex items-center gap-2"><i data-feather="mail" class="w-4 h-4"></i><a class="hover:text-white" href="mailto:omdandevelopment@gmail.com">omdandevelopment@gmail.com</a></li>
          </ul>
          <div class="mt-4 flex items-center gap-3">
            <a class="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 transition" href="https://www.facebook.com/profile.php?id=61588335854030" target="_blank" rel="noopener" aria-label="Facebook">
              <i data-feather="facebook" class="w-4 h-4"></i><span class="text-sm">Facebook</span>
            </a>
            <a class="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 transition" href="https://www.instagram.com/omdan_development/" target="_blank" rel="noopener" aria-label="Instagram">
              <i data-feather="instagram" class="w-4 h-4"></i><span class="text-sm">Instagram</span>
            </a>
          </div>
        </div>
      </div>
      <div class="border-t border-white/10 mt-8 pt-5 flex flex-col sm:flex-row justify-between items-center text-xs text-white/60 gap-2">
        <p>© 2026 Omdan Development Inc. All rights reserved.</p>
        <a class="hover:text-white" href="/privacy/">Privacy Policy</a>
      </div>
    </div>
  </footer>

  <script>
    const toggleBtn = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    toggleBtn?.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      toggleBtn.setAttribute('aria-expanded', String(!isOpen));
    });
    function revealOnScroll() {
      const els = document.querySelectorAll('.reveal');
      const screen = window.innerHeight * 0.88;
      els.forEach(el => { if (el.getBoundingClientRect().top < screen) el.classList.add('visible'); });
    }
    window.addEventListener('scroll', revealOnScroll);
    window.addEventListener('load', revealOnScroll);
    feather.replace();
  </script>
</body>
</html>`;
}

// ─── build blog index card ────────────────────────────────────────────────────

function buildIndexCard(art, topic, slug, today) {
  const url   = `/blog/${slug}/`;
  const cat   = art.category_label || topic.category || 'General';
  const longD = longDate(today);
  const excerpt = art.lede.length > 160 ? art.lede.slice(0, 157) + '...' : art.lede;

  return `      <!-- Post card: ${esc(topic.title)} -->
      <article class="reveal bg-white border border-line rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition">
        <div class="bg-brand2/10 px-6 pt-6 pb-4">
          <span class="inline-block bg-brand2 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">${esc(cat)}</span>
          <h2 class="text-xl font-bold text-ink leading-snug">
            <a href="${escA(url)}" class="hover:text-brand transition">
              ${esc(topic.title)}
            </a>
          </h2>
        </div>
        <div class="px-6 py-4 flex-1 flex flex-col justify-between">
          <p class="text-muted text-sm leading-relaxed">
            ${esc(excerpt)}
          </p>
          <div class="mt-5 flex items-center justify-between">
            <time class="text-xs text-muted/70" datetime="${today}">${longD}</time>
            <a href="${escA(url)}"
               class="inline-flex items-center gap-1.5 text-brand font-semibold text-sm hover:underline">
              Read article <i data-feather="arrow-right" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </article>`;
}

// ─── update blog/index.html ───────────────────────────────────────────────────

function updateBlogIndex(art, topic, slug, today) {
  let html = read('blog/index.html');

  // Inject new card after the <!-- BLOG:CARDS --> marker (newest post first)
  const MARKER = '<!-- BLOG:CARDS -->';
  const card   = buildIndexCard(art, topic, slug, today);

  if (html.includes(MARKER)) {
    html = html.replace(MARKER, MARKER + '\n\n' + card + '\n');
  } else {
    // Fallback: inject before the first existing <article in the grid
    html = html.replace(
      /(<div class="grid[^"]*grid-cols-1[^>]*>\s*\n)/,
      `$1      ${MARKER}\n\n${card}\n\n`
    );
  }

  // Update JSON-LD Blog schema — add new blogPost entry to the array
  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (match, open, jsonStr, close) => {
      try {
        const schema = JSON.parse(jsonStr.trim());
        if (schema['@type'] === 'Blog' && Array.isArray(schema.blogPost)) {
          schema.blogPost.unshift({
            '@type': 'BlogPosting',
            'headline': topic.title,
            'url': `https://omdandevelopment.com/blog/${slug}/`,
            'datePublished': today,
            'author': { '@type': 'Organization', 'name': 'Omdan Development Inc' },
            'description': art.meta_description
          });
          return `${open}\n${JSON.stringify(schema, null, 2)}\n${close}`;
        }
      } catch (e) {
        console.warn('⚠️  Could not update blog JSON-LD:', e.message);
      }
      return match;
    }
  );

  write('blog/index.html', html);
}

// ─── update sitemap.xml ───────────────────────────────────────────────────────

function updateSitemap(slug, today) {
  const url = `https://omdandevelopment.com/blog/${slug}/`;
  let xml = read('sitemap.xml');

  // Idempotent — skip if already present
  if (xml.includes(`<loc>${url}</loc>`)) {
    console.log('ℹ️  Sitemap entry already exists, skipping.');
    return;
  }

  const entry = `
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

  xml = xml.replace('</urlset>', entry + '\n</urlset>');
  write('sitemap.xml', xml);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load library and log
  const library = readJSON('content/blog-topic-library.json');
  const posted  = readJSON('content/blog-posted-log.json');

  if (!library.length) {
    console.log('⚠️  blog-topic-library.json is empty. Add topics to enable publishing.');
    process.exit(0);
  }

  const postedSlugs = new Set(posted.map(p => p.slug));

  // Select next topic: unposted, sorted by priority descending
  const available = library
    .filter(t => !postedSlugs.has(t.slug || slugify(t.title)))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (!available.length) {
    console.log('✅ All topics have been published. Add more to blog-topic-library.json to continue.');
    process.exit(0);
  }

  const topic = available[0];
  const slug  = topic.slug || slugify(topic.title);
  const today = isoDate(new Date());

  console.log(`📝 Selected: "${topic.title}"`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Date: ${today}`);
  console.log('');
  console.log('🤖 Calling Claude API to generate article...');

  const rawResponse = await callClaude(buildPrompt(topic));

  // Parse JSON — strip markdown code fences if Claude wraps the response
  let article;
  try {
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    article = JSON.parse(fenceMatch ? fenceMatch[1] : rawResponse.trim());
  } catch (e) {
    console.error('❌ Could not parse JSON from Claude response.');
    console.error('   First 800 chars of response:', rawResponse.slice(0, 800));
    process.exit(1);
  }

  // Validate required fields
  const required = ['meta_description', 'lede', 'category_label', 'sections', 'faqs'];
  const missing  = required.filter(k => !article[k]);
  if (missing.length) {
    console.error('❌ Article JSON is missing required fields:', missing.join(', '));
    process.exit(1);
  }

  // Write article page
  const pageHtml = buildPage(article, topic, slug, today);
  write(`blog/${slug}/index.html`, pageHtml);
  console.log(`✅ blog/${slug}/index.html written`);

  // Update blog index
  updateBlogIndex(article, topic, slug, today);
  console.log('✅ blog/index.html updated');

  // Update sitemap
  updateSitemap(slug, today);
  console.log('✅ sitemap.xml updated');

  // Append to posted log
  posted.push({ title: topic.title, slug, date_posted: today });
  writeJSON('content/blog-posted-log.json', posted);
  console.log('✅ content/blog-posted-log.json updated');

  // Export for GitHub Actions commit step
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    fs.appendFileSync(gho, `blog_title=${topic.title}\n`);
    fs.appendFileSync(gho, `blog_slug=${slug}\n`);
  }

  console.log('');
  console.log(`🎉 Published successfully!`);
  console.log(`   Title: ${topic.title}`);
  console.log(`   URL:   https://omdandevelopment.com/blog/${slug}/`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
