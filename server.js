const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllPosts, getPostBySlug, updatePost, deletePost, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
const { runScheduledAgent, seedExistingPosts } = require('./blog-agent');
const { renderServicesHTML, renderFaqHTML, fetchServicesFromCRM } = require('./pages');

let getWeeklyGBPPost;
try { getWeeklyGBPPost = require('./gbp-agent').getWeeklyGBPPost; } catch(e) { console.log('[GBP] gbp-agent not loaded'); }

const app = express();
const PORT = process.env.PORT || 8080;

// CORS — only the CRM origin needs cross-origin access (reads /api/posts, /api/post/:slug from the browser).
// All write endpoints are reached server-to-server via the CRM's proxy, which doesn't trigger CORS.
const ALLOWED_ORIGINS = ['https://undertone-crm-production.up.railway.app'];
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// SITEMAP — dynamic
app.get('/sitemap.xml', async (req, res) => {
  const posts = await getAllPosts();
  const postUrls = posts.map(post => `
  <url>
    <loc>https://www.undertoneskn.com/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  // lastmod for the hand-built static pages (services/faq/privacy/terms)
  const PAGES_LASTMOD = '2026-05-28';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.undertoneskn.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.undertoneskn.com/services</loc><lastmod>${PAGES_LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.undertoneskn.com/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.undertoneskn.com/faq</loc><lastmod>${PAGES_LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.undertoneskn.com/privacy</loc><lastmod>${PAGES_LASTMOD}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.undertoneskn.com/terms</loc><lastmod>${PAGES_LASTMOD}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  ${postUrls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
});

// ROBOTS
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.undertoneskn.com/sitemap.xml`);
});

// API — update post (called by CRM Blog editor)
app.post('/api/update-post', async (req, res) => {
  const { slug, secret, title, metaDescription, content, excerpt } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await updatePost(slug, { title, metaDescription, content, excerpt });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// API — delete post (called by CRM Blog editor)
app.post('/api/delete-post', async (req, res) => {
  const { slug, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await deletePost(slug);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// THANK YOU PAGE
app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, 'thank-you.html'));
});

// LEGAL PAGES — clean URLs without .html extension
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

// SERVICES — real server-rendered page (unique title/meta/canonical + Service schema).
// Pulls live services from the CRM server-side (SSR, so it's SEO-crawlable). If the CRM
// is unreachable/slow/empty, fetchServicesFromCRM returns null and we render from the
// hardcoded fallback inside renderServicesHTML — the page can never break.
app.get('/services', async (req, res) => {
  const services = await fetchServicesFromCRM();
  res.send(renderServicesHTML(services));
});

// FAQ — real server-rendered page (server-rendered Q&A + FAQPage schema)
app.get('/faq', (req, res) => {
  res.send(renderFaqHTML());
});

// BLOG ROUTES
app.get('/blog', async (req, res) => {
  const posts = await getAllPosts();
  res.send(renderBlogListHTML(posts));
});

app.get('/blog/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).send('<html><body style="font-family:sans-serif;padding:60px;"><h1>Post not found</h1><a href="/blog">Back to Journal</a></body></html>');
  const allPosts = await getAllPosts();
  res.send(renderPostHTML(post, allPosts));
});

// API — get all posts (called by CRM Blog tab + GBP picker)
app.get('/api/posts', async (req, res) => {
  const posts = await getAllPosts();
  res.json(posts.map(p => ({ slug: p.slug, title: p.title, metaDescription: p.metaDescription, excerpt: p.excerpt, date: p.date, cluster: p.cluster, image: p.image })));
});

// API — get single post by slug (called by CRM Blog editor)
app.get('/api/post/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// GBP JSON endpoint — called by CRM GBP tab
app.get('/admin/gbp-json', async (req, res) => {
  const secret = req.query.secret;
  const slug = req.query.slug;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  if (!getWeeklyGBPPost) return res.status(500).json({ error: 'GBP agent not available' });
  try {
    const posts = await getAllPosts();
    if (posts.length === 0) return res.status(404).json({ error: 'No posts' });
    const post = slug ? posts.find(p => p.slug === slug) || posts[0] : posts[0];
    const gbpPost = await getWeeklyGBPPost(post);
    res.json(gbpPost);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// API — manually trigger blog post generation
app.post('/api/generate-post', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { generateNow } = require('./blog-agent');
    const post = await generateNow();
    res.json({ success: true, post: { slug: post.slug, title: post.title, image: post.image } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// API — seed existing posts
app.post('/api/seed-posts', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ success: true, message: 'Seeding started' });
  seedExistingPosts();
});

// ALL OTHER ROUTES → home page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// START
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Undertone SKN running on port ${PORT}`);

    let lastPublishDate = '';
    setInterval(async () => {
      try {
        const now = new Date();
        const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hour = estTime.getHours();
        const day = estTime.getDay(); // 0=Sun, 1=Mon, 3=Wed, 5=Fri
        const dateStr = estTime.toDateString();
        const isPublishDay = [1, 3, 5].includes(day);
        const isPublishHour = hour === 8;
        const alreadyPublished = lastPublishDate === dateStr;

        if (isPublishDay && isPublishHour && !alreadyPublished) {
          console.log('[SCHEDULER] Publishing day — running blog agent...');
          lastPublishDate = dateStr;
          await runScheduledAgent();
        }
      } catch (e) { console.error('[SCHEDULER] Error:', e.message); }
    }, 30 * 60 * 1000); // Check every 30 minutes

    console.log('📝 Blog agent scheduled — Mon/Wed/Fri at 8AM EST');
  });
}

start().catch(console.error);
