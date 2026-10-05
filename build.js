// Zero-dependency static news site builder.  Run: node build.js  ->  output in ./dist
const fs = require('fs'), path = require('path');
const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const OUT = 'dist', base = cfg.siteUrl.replace(/\/$/, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '');
const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
const href = (...p) => '/' + p.map(encodeURIComponent).join('/') + '/';

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const i = raw.indexOf('\n---');
  const head = i < 0 ? '' : raw.slice(0, i), body = (i < 0 ? raw : raw.slice(i + 4)).trim();
  const m = {};
  head.split('\n').forEach(l => { const k = l.indexOf(':'); if (k > 0) m[l.slice(0, k).trim().toLowerCase()] = l.slice(k + 1).trim(); });
  const slug = slugify(m.slug || m.title || path.basename(file, '.txt'));
  const first = body.split(/\n{2,}/).find(p => !p.startsWith('## ')) || '';
  return {
    title: m.title || slug, slug, category: m.category || 'News', labels: list(m.labels),
    keywords: m.keywords || list(m.labels).join(', '), image: m.image || '',
    date: m.date || fs.statSync(file).mtime.toISOString().slice(0, 10),
    body, desc: first.replace(/\s+/g, ' ').slice(0, 155)
  };
}

const stories = fs.readdirSync('stories').filter(f => f.endsWith('.txt'))
  .map(f => parse(path.join('stories', f))).sort((a, b) => b.date.localeCompare(a.date));
const cats = [...new Set(stories.map(s => s.category))];
const nav = cats.map(c => `<a href="${href('c', slugify(c))}">${esc(c)}</a>`).join('');

const adHead = cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.adsenseClient}" crossorigin="anonymous"></script>` : '';
const ad = cfg.adsenseClient && cfg.adSlot ? `<div class="ad"><ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.adsenseClient}" data-ad-slot="${cfg.adSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>` : '';

const page = ({ title, desc, url, body, keywords = '', image = '', head = '' }) => `<!doctype html>
<html lang="${cfg.lang || 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<link rel="canonical" href="${base}${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<link rel="stylesheet" href="/style.css">${adHead}${head}</head>
<body><header><a class="logo" href="/">${esc(cfg.siteName)}</a><nav>${nav}</nav></header><main>${body}</main>
<footer>&copy; ${new Date().getFullYear()} ${esc(cfg.siteName)}</footer></body></html>`;

const write = (p, html) => { const f = path.join(OUT, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const card = s => `<a class="card" href="${href(s.slug)}">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy">` : ''}<span class="chip">${esc(s.category)}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p><time>${s.date}</time></a>`;
const grid = (items, empty = 'No stories yet.') => items.length ? `<div class="grid">${items.map(card).join('')}</div>` : `<p>${empty}</p>`;

// Related = most shared labels first, newest breaks ties; fills with same-category stories.
function related(s) {
  const mine = new Set(s.labels.map(l => l.toLowerCase()));
  const scored = stories.filter(o => o !== s)
    .map(o => ({ o, n: o.labels.filter(l => mine.has(l.toLowerCase())).length })).filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || b.o.date.localeCompare(a.o.date)).map(x => x.o);
  const fill = stories.filter(o => o !== s && o.category === s.category && !scored.includes(o));
  return scored.concat(fill).slice(0, 4);
}

const render = (b) => b.split(/\n{2,}/).map((p, i) =>
  (p.startsWith('## ') ? `<h2>${esc(p.slice(3))}</h2>` : `<p>${esc(p).replace(/\n/g, '<br>')}</p>`) + (i === 1 ? ad : '')).join('\n');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync('style.css', path.join(OUT, 'style.css'));

// Home
write('', page({ title: `${cfg.siteName} - ${cfg.tagline}`, desc: cfg.tagline, url: '/', body: `<h1>Latest stories</h1>${grid(stories)}` }));

// Stories
stories.forEach(s => {
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: s.title, datePublished: s.date, keywords: s.keywords, image: s.image ? [s.image] : undefined, publisher: { '@type': 'Organization', name: cfg.siteName } };
  const labels = s.labels.map(l => `<a class="label" href="${href('label', slugify(l))}">${esc(l)}</a>`).join('');
  const rel = related(s);
  write(s.slug, page({
    title: s.title, desc: s.desc, url: href(s.slug), keywords: s.keywords, image: s.image,
    head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    body: `<article><a class="chip" href="${href('c', slugify(s.category))}">${esc(s.category)}</a><h1>${esc(s.title)}</h1><time>${s.date}</time>
${s.image ? `<img class="hero" src="${esc(s.image)}" alt="">` : ''}<div class="body" dir="auto">${render(s.body)}</div><div class="labels">${labels}</div></article>
${rel.length ? `<section><h2>Related stories</h2>${grid(rel)}</section>` : ''}`
  }));
});

// Category + label pages
cats.forEach(c => write(`c/${slugify(c)}`, page({ title: `${c} - ${cfg.siteName}`, desc: `Latest ${c} stories`, url: href('c', slugify(c)), body: `<h1>${esc(c)}</h1>${grid(stories.filter(s => s.category === c))}` })));
const labelMap = {};
stories.forEach(s => s.labels.forEach(l => (labelMap[slugify(l)] ||= { name: l, items: [] }).items.push(s)));
Object.entries(labelMap).forEach(([k, v]) => write(`label/${k}`, page({ title: `${v.name} - ${cfg.siteName}`, desc: `Stories labeled ${v.name}`, url: href('label', k), body: `<h1>${esc(v.name)}</h1>${grid(v.items)}` })));

// SEO + ads files
const urls = ['/', ...stories.map(s => href(s.slug)), ...cats.map(c => href('c', slugify(c))), ...Object.keys(labelMap).map(k => href('label', k))];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${base}${u}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
if (cfg.adsenseClient) fs.writeFileSync(path.join(OUT, 'ads.txt'), `google.com, ${cfg.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
console.log(`Built ${stories.length} stories, ${cats.length} categories, ${Object.keys(labelMap).length} labels -> ${OUT}/`);
