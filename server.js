const express = require('express');
const path = require('path');
const { getAllPosts, getPostBySlug, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
const { runScheduledAgent, seedExistingPosts } = require('./blog-agent');

const { getWeeklyGBPPost } = require('./gbp-agent');

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

// GBP ADMIN PAGE
app.get('/admin/gbp', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).send('<h1>Unauthorized</h1>');
  }

  try {
    const posts = await getAllPosts();
    if (posts.length === 0) {
      return res.send('<h1>No blog posts yet</h1>');
    }
    const latestPost = posts[0];
    const gbpPost = await getWeeklyGBPPost(latestPost);

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GBP Post — Undertone SKN</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Syne+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#050505;color:#F6F3EC;font-family:'Lato',sans-serif;padding:40px 24px;min-height:100vh}
.container{max-width:680px;margin:0 auto}
.header{margin-bottom:40px}
.label{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:#B9A590;text-transform:uppercase;margin-bottom:8px}
h1{font-family:'Lato',sans-serif;font-size:32px;font-weight:300;color:#F6F3EC;margin-bottom:4px}
.sub{font-size:13px;color:#574C3F;margin-bottom:40px}
.card{background:#111;border:1px solid #222;padding:28px;margin-bottom:24px;border-radius:2px}
.card-label{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:3px;color:#B9A590;text-transform:uppercase;margin-bottom:12px}
.headline{font-size:20px;font-weight:400;color:#D4AF37;margin-bottom:0}
.body-text{font-size:14px;line-height:1.8;color:#ECE4DA;white-space:pre-wrap}
.button-info{font-size:13px;color:#B9A590}
.button-info span{color:#F6F3EC}
.image-section{display:flex;gap:16px;align-items:flex-start}
.image-preview{width:200px;height:120px;object-fit:cover;border:1px solid #222;flex-shrink:0}
.image-note{font-size:13px;color:#B9A590;line-height:1.6}
.copy-btn{display:block;width:100%;background:#B9A590;color:#050505;border:none;padding:14px;font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:8px;transition:background 0.2s}
.copy-btn:hover{background:#D4AF37}
.copy-btn.copied{background:#36302A;color:#B9A590}
.gbp-link{display:block;text-align:center;font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:2px;color:#B9A590;text-decoration:none;border:1px solid #222;padding:14px;margin-top:24px;transition:border-color 0.2s}
.gbp-link:hover{border-color:#B9A590;color:#F6F3EC}
.from-blog{font-size:12px;color:#333;margin-top:4px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <p class="label">Admin · Weekly Content</p>
    <h1>Google Business Profile</h1>
    <p class="sub">Generated from latest blog post · ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
  </div>

  <div class="card">
    <p class="card-label">Headline (58 chars max)</p>
    <p class="headline">${gbpPost.headline}</p>
    <p class="from-blog">From blog: ${gbpPost.blogTitle}</p>
    <button class="copy-btn" onclick="copyText('${gbpPost.headline.replace(/'/g, "\\'")}', this)">Copy Headline</button>
  </div>

  <div class="card">
    <p class="card-label">Post Body</p>
    <p class="body-text">${gbpPost.body}</p>
    <button class="copy-btn" onclick="copyText(\`${gbpPost.body.replace(/`/g, '\\`')}\`, this)">Copy Post Body</button>
  </div>

  <div class="card">
    <p class="card-label">Button</p>
    <p class="button-info">Label: <span>${gbpPost.buttonLabel}</span></p>
    <p class="button-info" style="margin-top:6px;">URL: <span>${gbpPost.buttonUrl}</span></p>
    <button class="copy-btn" onclick="copyText('${gbpPost.buttonUrl}', this)" style="margin-top:12px;">Copy Button URL</button>
  </div>

  <div class="card">
    <p class="card-label">Image to Use</p>
    <div class="image-section">
      ${gbpPost.image ? `<img src="${gbpPost.image}" class="image-preview" alt="Post image">` : ''}
      <div>
        <p class="image-note">${gbpPost.imageNote}</p>
        ${gbpPost.image ? `<button class="copy-btn" onclick="copyText('${gbpPost.image}', this)" style="margin-top:12px;">Copy Image URL</button>` : ''}
      </div>
    </div>
  </div>

  <a href="https://business.google.com/dashboard" target="_blank" class="gbp-link">
    → Open Google Business Profile Dashboard
  </a>

  <a href="/admin/gbp?secret=${secret}" class="gbp-link" style="margin-top:8px;">
    ↻ Regenerate Post
  </a>
</div>

<script>
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  });
}
</script>
</body>
</html>`);
  } catch (error) {
    res.status(500).send(`<h1>Error generating post</h1><p>${error.message}</p>`);
  }
});

// THANK YOU PAGE — booking confirmation
app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, 'thank-you.html'));
});

// ROBOTS
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.undertoneskn.com/sitemap.xml`);
});

// BLOG ROUTES
app.get('/blog', async (req, res) => {
  const posts = await getAllPosts();
  res.send(renderBlogListHTML(posts));
});

app.get('/blog/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).send('<html><body style="font-family:sans-serif;padding:60px;"><h1>Post not found</h1><a href="/blog">← Back to Journal</a></body></html>');
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
  // Initialize database first
  await initDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Undertone SKN running on port ${PORT}`);

    // Scheduled agent — check every 6 hours, run at 8AM Mon/Wed/Fri
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
