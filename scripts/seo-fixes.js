/* scripts/seo-fixes.js
   Baseline SEO fixes for a static HTML GitHub Pages site.
   Safe + idempotent: runs repeatedly without duplicating tags.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function write(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
}
function exists(p) {
  return fs.existsSync(p);
}

function findIndexHtml() {
  // Prefer root index.html, otherwise first index.html found (common for GH Pages).
  const rootIndex = path.join(ROOT, "index.html");
  if (exists(rootIndex)) return rootIndex;

  // Walk a bit, but don’t go crazy
  const candidates = [];
  const walk = (dir, depth = 0) => {
    if (depth > 4) return;
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules" || name === ".git") continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, depth + 1);
      else if (name.toLowerCase() === "index.html") candidates.push(full);
    }
  };
  walk(ROOT, 0);
  if (candidates.length === 0) throw new Error("No index.html found in repo.");
  return candidates.sort((a, b) => a.length - b.length)[0];
}

function upsertMeta(html, { name, property, content }) {
  const keyAttr = name ? `name="${name}"` : `property="${property}"`;
  const re = new RegExp(`<meta\\s+[^>]*${keyAttr}[^>]*>`, "i");

  const tag = name
    ? `<meta name="${name}" content="${content}">`
    : `<meta property="${property}" content="${content}">`;

  if (re.test(html)) return html.replace(re, tag);

  // Insert before </head>
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function upsertTitle(html, title) {
  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, `<title>${title}</title>`);
  }
  return html.replace(/<\/head>/i, `  <title>${title}</title>\n</head>`);
}

function upsertCanonical(html, url) {
  const re = /<link\s+rel="canonical"[^>]*>/i;
  const tag = `<link rel="canonical" href="${url}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function upsertJsonLd(html, jsonObj, id) {
  // Use an id marker so we can replace exactly our block
  const markerStart = `<!-- OPENCLAW_JSONLD:${id}:START -->`;
  const markerEnd = `<!-- OPENCLAW_JSONLD:${id}:END -->`;
  const block =
    `${markerStart}\n` +
    `<script type="application/ld+json">\n` +
    `${JSON.stringify(jsonObj, null, 2)}\n` +
    `</script>\n` +
    `${markerEnd}`;

  const re = new RegExp(
    `${markerStart}[\\s\\S]*?${markerEnd}`,
    "m"
  );

  if (re.test(html)) return html.replace(re, block);

  return html.replace(/<\/head>/i, `  ${block}\n</head>`);
}

function ensureRobotsTxt() {
  const p = path.join(ROOT, "robots.txt");
  if (exists(p)) return;

  write(
    p,
    `User-agent: *\nAllow: /\n\nSitemap: https://omdandevelopment.com/sitemap.xml\n`
  );
}

function ensureSitemapXml() {
  const p = path.join(ROOT, "sitemap.xml");
  if (exists(p)) return;

  // Minimal sitemap — we’ll expand later once we map all real pages.
  write(
    p,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n` +
      `    <loc>https://omdandevelopment.com/</loc>\n` +
      `  </url>\n` +
      `</urlset>\n`
  );
}

function main() {
  const indexPath = findIndexHtml();
  let html = read(indexPath);

  // Baseline geo signal: Palm Springs / Coachella Valley (service-area business)
  const TITLE = "Omdan Development Inc | Pavers, Turf & Handyman | Palm Springs & Coachella Valley";
  const DESC =
    "Pavers, artificial turf, and handyman services across Palm Springs and the Coachella Valley. Fast quotes, clean work, reliable scheduling. Call 951-292-0703.";
  const CANON = "https://omdandevelopment.com/";

  html = upsertTitle(html, TITLE);
  html = upsertMeta(html, { name: "description", content: DESC });
  html = upsertCanonical(html, CANON);

  // Open Graph basics
  html = upsertMeta(html, { property: "og:title", content: TITLE });
  html = upsertMeta(html, { property: "og:description", content: DESC });
  html = upsertMeta(html, { property: "og:url", content: CANON });

  // LocalBusiness JSON-LD (service area business; no street address required)
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Omdan Development Inc",
    "url": "https://omdandevelopment.com/",
    "telephone": "+1-951-292-0703",
    "areaServed": [
      { "@type": "City", "name": "Palm Springs" },
      { "@type": "AdministrativeArea", "name": "Coachella Valley" }
    ],
    "makesOffer": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Pavers Installation" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Artificial Turf Installation" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Handyman Services" } }
    ]
  };

  html = upsertJsonLd(html, localBusiness, "localbusiness");

  write(indexPath, html);

  ensureRobotsTxt();
  ensureSitemapXml();

  console.log("SEO fixes applied:");
  console.log("- Updated title/description/canonical + OG tags");
  console.log("- Added/updated LocalBusiness JSON-LD");
  console.log("- Ensured robots.txt + sitemap.xml exist");
  console.log(`Modified: ${path.relative(ROOT, indexPath)}`);
}

main();
