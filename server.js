const express = require('express');
const path = require('path');
const { getAllPosts, getPostBySlug, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
const { runScheduledAgent, seedExistingPosts } = require('./blog-agent');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); });
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

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.undertoneskn.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.undertoneskn.com/services</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.undertoneskn.com/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.undertoneskn.com/faq</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
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

// THANK YOU PAGE
app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, 'thank-you.html'));
});

// BLOG ROUTES
app.get('/blog', async (req, res) => {
  const posts = await getAllPosts();
  res.send(renderBlogListHTML(posts));
});

app.get('/blog/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).send('<html><body style="font-family:sans-serif;padding:60px;"><h1>Post not found</h1><a href="/blog">Back to Journal</a></body></html>');
  res.send(renderPostHTML(post));
});

// API
app.get('/api/posts', async (req, res) => {
  const posts = await getAllPosts();
  res.json(posts.map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, date: p.date, cluster: p.cluster, image: p.image })));
});

app.post('/api/generate-post', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { generateNow } = require('./blog-agent');
    const post = await generateNow();
    res.json({ success: true, post: { slug: post.slug, title: post.title, image: post.image } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/seed-posts', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ success: true, message: 'Seeding started' });
  seedExistingPosts();
});

// ALL OTHER ROUTES
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// START
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Undertone SKN running on port ${PORT}`);
    setInterval(async () => {
      const hour = new Date().getHours();
      if (hour === 8) {
        try { await runScheduledAgent(); }
        catch (e) { console.error('[SCHEDULER] Error:', e.message); }
      }
    }, 6 * 60 * 60 * 1000);
    console.log('📝 Blog agent scheduled — Mon/Wed/Fri at 8AM');
  });
}

start().catch(console.error);
