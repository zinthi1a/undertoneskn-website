const express = require('express');
const path = require('path');
const { getAllPosts, getPostBySlug, updatePost, deletePost, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
const { runScheduledAgent, seedExistingPosts } = require('./blog-agent');

let getWeeklyGBPPost;
try { getWeeklyGBPPost = require('./gbp-agent').getWeeklyGBPPost; } catch(e) { console.log('[GBP] gbp-agent not loaded'); }

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
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
