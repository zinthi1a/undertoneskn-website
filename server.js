const express = require('express');
const path = require('path');
const { getAllPosts, getPostBySlug, renderPostHTML, renderBlogListHTML, initDB } = require('./blog-engine');
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

// BLOG ADMIN — list all posts
app.get('/admin/blog', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).send('<h1>Unauthorized</h1>');
  const posts = await getAllPosts();
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog Admin — Undertone SKN</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Syne+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#F6F3EC;font-family:'Lato',sans-serif;padding:40px 24px;min-height:100vh}
.container{max-width:800px;margin:0 auto}
.label{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:#B9A590;text-transform:uppercase;margin-bottom:8px}
h1{font-family:'Lato',sans-serif;font-size:32px;font-weight:300;color:#F6F3EC;margin-bottom:32px}
.post-row{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #1a1a1a;gap:16px}
.post-row:hover{background:#111}
.post-title{font-size:14px;color:#ECE4DA;line-height:1.4;flex:1}
.post-date{font-family:'Syne Mono',monospace;font-size:10px;color:#444;white-space:nowrap}
.post-actions{display:flex;gap:8px;flex-shrink:0}
.btn-edit{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:2px;color:#B9A590;border:1px solid #333;padding:6px 14px;text-decoration:none;text-transform:uppercase;transition:border-color 0.2s}
.btn-edit:hover{border-color:#B9A590;color:#F6F3EC}
.btn-delete{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:2px;color:#444;border:1px solid #1a1a1a;padding:6px 14px;background:none;cursor:pointer;text-transform:uppercase;transition:color 0.2s,border-color 0.2s}
.btn-delete:hover{color:#ff4444;border-color:#ff4444}
.empty{padding:40px;text-align:center;color:#444;font-size:14px}
.nav-admin{display:flex;gap:16px;margin-bottom:32px}
.nav-admin a{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;color:#B9A590;text-decoration:none;border:1px solid #222;padding:8px 16px;transition:border-color 0.2s}
.nav-admin a:hover{border-color:#B9A590;color:#F6F3EC}
</style>
</head>
<body>
<div class="container">
  <p class="label">Admin · Content</p>
  <h1>Blog Posts (${posts.length})</h1>
  <div class="nav-admin">
    <a href="/admin/gbp?secret=${secret}">GBP Content</a>
    <a href="/blog" target="_blank">View Blog</a>
  </div>
  ${posts.length === 0 ? '<div class="empty">No posts yet.</div>' : posts.map(p => `
  <div class="post-row">
    <div>
      <p class="post-title">${p.title}</p>
      <p class="post-date">${p.cluster} · ${new Date(p.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
    </div>
    <div class="post-actions">
      <a href="/admin/blog/edit/${p.slug}?secret=${secret}" class="btn-edit">Edit</a>
      <button class="btn-delete" onclick="deletePost('${p.slug}','${secret}')">Delete</button>
    </div>
  </div>`).join('')}
</div>
<script>
async function deletePost(slug, secret) {
  if (!confirm('Delete this post?')) return;
  const res = await fetch('/api/delete-post', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,secret})});
  const data = await res.json();
  if (data.success) location.reload();
  else alert('Error: ' + data.error);
}
</script>
</body>
</html>`);
});

// BLOG ADMIN — edit single post
app.get('/admin/blog/edit/:slug', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).send('<h1>Unauthorized</h1>');
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).send('<h1>Post not found</h1>');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Edit Post — Undertone SKN</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Syne+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#F6F3EC;font-family:'Lato',sans-serif;padding:40px 24px;min-height:100vh}
.container{max-width:800px;margin:0 auto}
.label{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:#B9A590;text-transform:uppercase;margin-bottom:8px}
h1{font-family:'Lato',sans-serif;font-size:28px;font-weight:300;color:#F6F3EC;margin-bottom:32px}
.field{margin-bottom:24px}
.field label{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:3px;color:#B9A590;text-transform:uppercase;display:block;margin-bottom:8px}
.field input,.field textarea{width:100%;background:#111;border:1px solid #222;color:#F6F3EC;padding:12px 16px;font-family:'Lato',sans-serif;font-size:14px;line-height:1.6;outline:none;transition:border-color 0.2s}
.field input:focus,.field textarea:focus{border-color:#B9A590}
.field textarea{min-height:400px;resize:vertical;font-family:'Lato',monospace;font-size:13px}
.btn-save{background:#B9A590;color:#0a0a0a;border:none;padding:14px 32px;font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:background 0.2s;margin-right:12px}
.btn-save:hover{background:#D4AF37}
.btn-back{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;color:#B9A590;text-decoration:none;border:1px solid #333;padding:13px 24px;transition:border-color 0.2s}
.btn-back:hover{border-color:#B9A590;color:#F6F3EC}
.success{background:#1a2a1a;border:1px solid #2a4a2a;color:#4aaa4a;padding:12px 16px;font-family:'Syne Mono',monospace;font-size:11px;margin-bottom:24px;display:none}
.preview-link{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:1px;color:#444;text-decoration:none;margin-left:16px}
.preview-link:hover{color:#B9A590}
</style>
</head>
<body>
<div class="container">
  <p class="label">Admin · Edit Post</p>
  <h1>${post.title}</h1>
  <div class="success" id="successMsg">✓ Post saved successfully</div>
  <div class="field">
    <label>Title</label>
    <input type="text" id="title" value="${post.title.replace(/"/g,'&quot;')}">
  </div>
  <div class="field">
    <label>Meta Description</label>
    <input type="text" id="metaDescription" value="${(post.metaDescription||'').replace(/"/g,'&quot;')}">
  </div>
  <div class="field">
    <label>Content (HTML) — Remove fake links, edit text directly</label>
    <textarea id="content">${post.content||''}</textarea>
  </div>
  <div class="field">
    <label>Excerpt</label>
    <textarea id="excerpt" style="min-height:80px">${post.excerpt||''}</textarea>
  </div>
  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:8px" data-slug="${post.slug}" data-secret="${secret}">
    <button class="btn-save" onclick="savePost()">Save Changes</button>
    <a href="/admin/blog?secret=${secret}" class="btn-back">← Back</a>
    <a href="/blog/${post.slug}" target="_blank" class="preview-link">Preview →</a>
  </div>
</div>
<script>
async function savePost() {
  const btn = document.querySelector('.btn-save');
  const container = document.querySelector('[data-slug]');
  const slug = container.dataset.slug;
  const secret = container.dataset.secret;
  btn.textContent = 'Saving...';
  try {
    const res = await fetch('/api/update-post', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        slug,
        secret,
        title: document.getElementById('title').value,
        metaDescription: document.getElementById('metaDescription').value,
        content: document.getElementById('content').value,
        excerpt: document.getElementById('excerpt').value
      })
    });
    const data = await res.json();
    if (data.success) {
      btn.textContent = 'Save Changes';
      const msg = document.getElementById('successMsg');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 3000);
    } else {
      btn.textContent = 'Save Changes';
      alert('Error: ' + data.error);
    }
  } catch(e) {
    btn.textContent = 'Save Changes';
    alert('Network error — try again');
  }
}
</script>
</body>
</html>`);
});

// API — update post
app.post('/api/update-post', async (req, res) => {
  const { slug, secret, title, metaDescription, content, excerpt } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
    await client.connect();
    await client.query(
      'UPDATE blog_posts SET title=$1, meta_description=$2, content=$3, excerpt=$4 WHERE slug=$5',
      [title, metaDescription, content, excerpt, slug]
    );
    await client.end();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// API — delete post
app.post('/api/delete-post', async (req, res) => {
  const { slug, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
    await client.connect();
    await client.query('DELETE FROM blog_posts WHERE slug=$1', [slug]);
    await client.end();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GBP ADMIN PAGE — select post + generate content
app.get('/admin/gbp', async (req, res) => {
  const secret = req.query.secret;
  const selectedSlug = req.query.slug;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).send('<h1>Unauthorized</h1>');
  if (!getWeeklyGBPPost) return res.status(500).send('<h1>GBP agent not available</h1>');

  try {
    const posts = await getAllPosts();
    if (posts.length === 0) return res.send('<h1>No blog posts yet</h1>');

    // If no slug selected, show post picker
    if (!selectedSlug) {
      const postList = posts.map(p => `
        <a href="/admin/gbp?secret=${secret}&slug=${p.slug}" class="post-pick">
          <div class="post-pick-title">${p.title}</div>
          <div class="post-pick-meta">${(p.cluster||'wellness').replace(/-/g,' ')} · ${new Date(p.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
        </a>
      `).join('');

      return res.send(`<!DOCTYPE html>
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
.sub{font-size:13px;color:#444;margin-bottom:32px}
.post-pick{display:block;padding:16px 20px;border-bottom:1px solid #1a1a1a;text-decoration:none;transition:background 0.15s}
.post-pick:hover{background:#111}
.post-pick-title{font-size:14px;color:#ECE4DA;margin-bottom:4px}
.post-pick-meta{font-family:'Syne Mono',monospace;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px}
</style>
</head>
<body>
<div class="container">
  <p class="label">Admin · GBP Content</p>
  <h1>Pick a Blog Post</h1>
  <p class="sub">Select which post to generate Google Business Profile content from</p>
  ${postList}
</div>
</body>
</html>`);
    }

    // Generate GBP content for selected post
    const selectedPost = posts.find(p => p.slug === selectedSlug) || posts[0];
    const gbpPost = await getWeeklyGBPPost(selectedPost);

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
.sub{font-size:13px;color:#444;margin-bottom:32px}
.card{background:#111;border:1px solid #1e1e1e;padding:24px;margin-bottom:16px}
.card-label{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:3px;color:#B9A590;text-transform:uppercase;margin-bottom:12px}
.headline{font-size:20px;font-weight:400;color:#D4AF37;margin-bottom:6px}
.body-text{font-size:14px;line-height:1.8;color:#ECE4DA;white-space:pre-wrap;margin-bottom:12px}
.char-count{font-family:'Syne Mono',monospace;font-size:10px;color:#333;margin-bottom:12px}
.btn{display:block;width:100%;background:#B9A590;color:#0a0a0a;border:none;padding:12px;font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:8px;transition:background 0.2s;text-align:center;text-decoration:none}
.btn:hover{background:#D4AF37}
.btn-dl{display:block;width:100%;background:#222;color:#B9A590;border:1px solid #333;padding:12px;font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:8px;text-align:center;text-decoration:none;transition:border-color 0.2s}
.btn-dl:hover{border-color:#B9A590;color:#F6F3EC}
.img-preview{width:100%;height:200px;object-fit:cover;display:block;margin-bottom:12px}
.nav-links{display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap}
.nav-link{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;color:#B9A590;text-decoration:none;border:1px solid #222;padding:8px 16px;transition:border-color 0.2s}
.nav-link:hover{border-color:#B9A590;color:#F6F3EC}
textarea.copy-area{width:100%;background:#0a0a0a;border:1px solid #222;color:#B9A590;padding:10px;font-family:'Syne Mono',monospace;font-size:11px;resize:none;margin-top:8px;line-height:1.6}
</style>
</head>
<body>
<div class="container">
  <p class="label">Admin · GBP Content</p>
  <h1>Google Business Profile</h1>
  <p class="sub">From: ${gbpPost.blogTitle}</p>

  <div class="nav-links">
    <a href="/admin/gbp?secret=${secret}" class="nav-link">← Pick Different Post</a>
    <a href="/admin/gbp?secret=${secret}&slug=${selectedSlug}" class="nav-link">↻ Regenerate</a>
    <a href="https://business.google.com/dashboard" target="_blank" class="nav-link">→ Open GBP</a>
  </div>

  <div class="card">
    <p class="card-label">Headline</p>
    <p class="headline">${gbpPost.headline}</p>
    <p class="char-count">${gbpPost.headline.length}/58 characters</p>
    <textarea class="copy-area" rows="2" id="headlineText" readonly>${gbpPost.headline}</textarea>
    <button class="btn" onclick="copyField('headlineText',this)">Copy Headline</button>
  </div>

  <div class="card">
    <p class="card-label">Post Body</p>
    <p class="body-text">${gbpPost.body}</p>
    <textarea class="copy-area" rows="8" id="bodyText" readonly>${gbpPost.body}</textarea>
    <button class="btn" onclick="copyField('bodyText',this)">Copy Post Body</button>
  </div>

  <div class="card">
    <p class="card-label">Button</p>
    <p style="font-size:13px;color:#B9A590;margin-bottom:4px;">Label: <span style="color:#F6F3EC;">${gbpPost.buttonLabel}</span></p>
    <textarea class="copy-area" rows="2" id="buttonText" readonly>${gbpPost.buttonUrl}</textarea>
    <button class="btn" onclick="copyField('buttonText',this)">Copy Button URL</button>
  </div>

  ${gbpPost.image ? `
  <div class="card">
    <p class="card-label">Image</p>
    <img src="${gbpPost.image}" class="img-preview" alt="Post image">
    <button class="btn-dl" onclick="downloadImage('${gbpPost.image}')">⬇ Download Image</button>
  </div>` : ''}

</div>
<script>
function copyField(id, btn) {
  const el = document.getElementById(id);
  el.select();
  el.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.style.background = '#2a4a2a';
    btn.style.color = '#4aaa4a';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '#B9A590';
      btn.style.color = '#0a0a0a';
    }, 2000);
  } catch(e) {
    navigator.clipboard.writeText(el.value).catch(() => alert('Copy failed — select text manually'));
  }
}

async function downloadImage(url) {
  try {
    const jpegUrl = url.replace('/upload/', '/upload/f_jpg,q_90/');
    const response = await fetch(jpegUrl);
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'undertone-skn-gbp.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch(e) {
    alert('Download failed — try right-clicking the image and saving manually');
  }
}
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
  res.json(posts.map(p => ({ slug: p.slug, title: p.title, metaDescription: p.metaDescription, excerpt: p.excerpt, date: p.date, cluster: p.cluster, image: p.image })));
});

// API — get single post by slug (for CRM editor)
app.get('/api/post/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// GBP JSON endpoint — for CRM integration
app.get('/admin/gbp-json', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  if (!getWeeklyGBPPost) return res.status(500).json({ error: 'GBP agent not available' });
  try {
    const posts = await getAllPosts();
    if (posts.length === 0) return res.status(404).json({ error: 'No posts' });
    const gbpPost = await getWeeklyGBPPost(posts[0]);
    res.json(gbpPost);
  } catch(e) { res.status(500).json({ error: e.message }); }
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
