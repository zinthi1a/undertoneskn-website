const express = require('express');
const path = require('path');
const { getAllPosts, getPostBySlug, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
const { runScheduledAgent, seedExistingPosts } = require('./blog-agent');

let getWeeklyGBPPost;
try { getWeeklyGBPPost = require('./gbp-agent').getWeeklyGBPPost; } catch(e) { console.log('[GBP] gbp-agent not loaded'); }

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

// GBP ADMIN PAGE
app.get('/admin/gbp', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).send('<h1>Unauthorized</h1>');
  if (!getWeeklyGBPPost) return res.status(500).send('<h1>GBP agent not available. Upload gbp-agent.js</h1>');
  try {
    const posts = await getAllPosts();
    if (posts.length === 0) return res.send('<h1>No blog posts yet</h1>');
    const latestPost = posts[0];
    const gbpPost = await getWeeklyGBPPost(latestPost);
    const jpegUrl = gbpPost.image ? gbpPost.image.replace('/upload/', '/upload/f_jpg,q_90/') : null;
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GBP Admin — Undertone SKN</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Syne+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#F6F3EC;font-family:'Lato',sans-serif;padding:40px 24px;min-height:100vh}
.container{max-width:680px;margin:0 auto}
.label{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:#B9A590;text-transform:uppercase;margin-bottom:8px}
h1{font-family:'Lato',sans-serif;font-size:32px;font-weight:300;color:#F6F3EC;margin-bottom:4px}
.sub{font-size:13px;color:#444;margin-bottom:40px}
.card{background:#111;border:1px solid #1e1e1e;padding:28px;margin-bottom:20px}
.card-label{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:3px;color:#B9A590;text-transform:uppercase;margin-bottom:12px}
.headline{font-size:20px;font-weight:400;color:#D4AF37}
.body-text{font-size:14px;line-height:1.8;color:#ECE4DA;white-space:pre-wrap}
.btn{display:block;width:100%;background:#B9A590;color:#0a0a0a;border:none;padding:13px;font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:12px;transition:background 0.2s;text-align:center;text-decoration:none}
.btn:hover{background:#D4AF37}
.btn.copied{background:#1e1e1e;color:#B9A590}
.btn-outline{background:transparent;color:#B9A590;border:1px solid #333;margin-top:8px}
.btn-outline:hover{border-color:#B9A590;color:#F6F3EC;background:transparent}
.img-preview{width:100%;height:200px;object-fit:cover;display:block;margin-bottom:12px}
.from-blog{font-size:11px;color:#333;margin-top:6px;font-family:'Syne Mono',monospace}
.gbp-open{display:block;text-align:center;font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;color:#B9A590;text-decoration:none;border:1px solid #1e1e1e;padding:14px;margin-top:8px;transition:border-color 0.2s}
.gbp-open:hover{border-color:#B9A590;color:#F6F3EC}
</style>
</head>
<body>
<div class="container">
  <p class="label">Admin · Weekly Content</p>
  <h1>Google Business Profile</h1>
  <p class="sub">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · From: ${gbpPost.blogTitle}</p>
  <div class="card">
    <p class="card-label">Headline</p>
    <p class="headline">${gbpPost.headline}</p>
    <p class="from-blog">${gbpPost.headline.length}/58 characters</p>
    <button class="btn" onclick="copyText('${gbpPost.headline.replace(/'/g,"\\'")}',this)">Copy Headline</button>
  </div>
  <div class="card">
    <p class="card-label">Post Body</p>
    <p class="body-text">${gbpPost.body}</p>
    <button class="btn" onclick="copyText(\`${gbpPost.body.replace(/`/g,'\\`')}\`,this)">Copy Post Body</button>
  </div>
  <div class="card">
    <p class="card-label">Button</p>
    <p style="font-size:13px;color:#B9A590;margin-bottom:6px;">Label: <span style="color:#F6F3EC;">${gbpPost.buttonLabel}</span></p>
    <p style="font-size:13px;color:#B9A590;">URL: <span style="color:#F6F3EC;word-break:break-all;">${gbpPost.buttonUrl}</span></p>
    <button class="btn" onclick="copyText('${gbpPost.buttonUrl}',this)" style="margin-top:12px;">Copy Button URL</button>
  </div>
  <div class="card">
    <p class="card-label">Image</p>
    ${gbpPost.image ? `<img src="${gbpPost.image}" class="img-preview" alt="Post image">` : '<p style="color:#444;font-size:13px;margin-bottom:12px;">No image available</p>'}
    ${jpegUrl ? `<a href="${jpegUrl}" download="undertone-skn-gbp.jpg" class="btn">⬇ Download as JPEG</a>` : ''}
    ${gbpPost.image ? `<button class="btn btn-outline" onclick="copyText('${gbpPost.image}',this)">Copy Image URL</button>` : ''}
  </div>
  <a href="https://business.google.com/dashboard" target="_blank" class="gbp-open">→ Open Google Business Profile</a>
  <a href="/admin/gbp?secret=${secret}" class="gbp-open">↻ Regenerate Post</a>
</div>
<script>
function copyText(text,btn){navigator.clipboard.writeText(text).then(()=>{const orig=btn.textContent;btn.textContent='✓ Copied';btn.classList.add('copied');setTimeout(()=>{btn.textContent=orig;btn.classList.remove('copied')},2000)});}
</script>
</body>
</html>`);
  } catch(error) { res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`); }
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
