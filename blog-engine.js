// ============================================================
// UNDERTONE SKN — BLOG ENGINE
// Handles: post storage, generation, serving, SEO
// ============================================================

const fs = require('fs');
const path = require('path');

// ============================================================
// IN-MEMORY BLOG STORE (upgrades to PostgreSQL later)
// Posts stored as JSON files in /blog-posts directory
// ============================================================

const POSTS_DIR = path.join(__dirname, 'blog-posts');

// Ensure blog posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// ============================================================
// BLOG POST IMAGE POOL — Cloudinary images by cluster
// ============================================================
const BLOG_IMAGES = {
  'jaw-tension': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/2.jpeg_vbx2mu.webp',
  ],
  'nervous-system': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/3.jpeg_tgmryi.webp',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428459/studio_photo_exyuoh.jpg',
  ],
  'fascia': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/5.jpeg_ycnvzu.webp',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp',
  ],
  'stress-face': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428426/6.jpeg_hqpsvt.webp',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/2.jpeg_vbx2mu.webp',
  ],
  'functional-beauty': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428459/studio_photo_exyuoh.jpg',
  ],
  'miami-local': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/3.jpeg_tgmryi.webp',
  ],
  'wellness': [
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428462/oval_photo_uhbc5i.jpg',
    'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp',
  ]
};

function getPostImage(cluster) {
  const images = BLOG_IMAGES[cluster] || BLOG_IMAGES['wellness'];
  return images[Math.floor(Math.random() * images.length)];
}

// ============================================================
// TOPIC CLUSTERS
// ============================================================
const TOPIC_CLUSTERS = [
  // Jaw Tension & TMJ
  { topic: "Why your jaw holds tension even when you think you're relaxed", cluster: "jaw-tension", keywords: ["jaw tension Miami", "TMJ relief", "jaw clenching"] },
  { topic: "The connection between TMJ and chronic headaches", cluster: "jaw-tension", keywords: ["TMJ headaches", "jaw tension headaches Miami"] },
  { topic: "Why grinding your teeth at night is a nervous system signal", cluster: "jaw-tension", keywords: ["bruxism nervous system", "teeth grinding jaw tension"] },
  { topic: "What happens to your face when you clench your jaw for years", cluster: "jaw-tension", keywords: ["jaw clenching face", "jaw tension facial changes"] },
  { topic: "The difference between jaw tension and TMJ disorder", cluster: "jaw-tension", keywords: ["jaw tension vs TMJ", "TMJ disorder Miami"] },

  // Nervous System
  { topic: "How stress lives in your face and what to do about it", cluster: "nervous-system", keywords: ["stress face nervous system", "facial tension stress Miami"] },
  { topic: "What nervous system regulation actually feels like in your body", cluster: "nervous-system", keywords: ["nervous system regulation", "somatic nervous system Miami"] },
  { topic: "Why your face feels tight when you're anxious", cluster: "nervous-system", keywords: ["anxiety facial tension", "face tight anxiety"] },
  { topic: "The vagus nerve and facial tension — what the research shows", cluster: "nervous-system", keywords: ["vagus nerve facial tension", "vagus nerve somatic work"] },
  { topic: "Why deep breathing doesn't always release facial tension", cluster: "nervous-system", keywords: ["facial tension release", "nervous system face"] },

  // Fascia & Facial Holding
  { topic: "What is facial fascia and why does it get stuck", cluster: "fascia", keywords: ["facial fascia Miami", "fascia release face"] },
  { topic: "How fascia holds emotional stress in the face", cluster: "fascia", keywords: ["fascia emotional stress face", "somatic fascia Miami"] },
  { topic: "The science behind fascia release and visible facial changes", cluster: "fascia", keywords: ["fascia release facial sculpting", "fascia Miami"] },
  { topic: "Why your face looks different after releasing facial fascia", cluster: "fascia", keywords: ["fascia release face Miami", "facial fascia sculpting"] },

  // Stress & The Face
  { topic: "Why high-achieving women hold stress in their faces", cluster: "stress-face", keywords: ["stress face women Miami", "facial tension high stress"] },
  { topic: "The face as a map of your nervous system", cluster: "stress-face", keywords: ["face nervous system map", "stress face Miami"] },
  { topic: "What chronic stress does to your facial structure over time", cluster: "stress-face", keywords: ["chronic stress face", "stress facial aging Miami"] },
  { topic: "Why your face looks tired even when you slept well", cluster: "stress-face", keywords: ["tired face not tired", "facial heaviness stress Miami"] },

  // Functional Beauty
  { topic: "What is functional beauty and why it's different from skincare", cluster: "functional-beauty", keywords: ["functional beauty Miami", "somatic facial beauty"] },
  { topic: "Why visible lift happens when the nervous system releases", cluster: "functional-beauty", keywords: ["facial lift nervous system", "natural facial lift Miami"] },
  { topic: "The difference between sculpting and relaxing the face", cluster: "functional-beauty", keywords: ["facial sculpting vs relaxing", "functional beauty Miami"] },
  { topic: "Why your skin looks better when your face is less tense", cluster: "functional-beauty", keywords: ["skin tension release", "skin nervous system Miami"] },

  // Miami Local
  { topic: "Where to find jaw tension release therapy in Edgewater Miami", cluster: "miami-local", keywords: ["jaw tension release Edgewater Miami", "somatic facial Edgewater"] },
  { topic: "The best somatic facial studio in Miami", cluster: "miami-local", keywords: ["somatic facial Miami", "best facial studio Miami"] },
  { topic: "Facial sculpting in Edgewater Miami — what to expect", cluster: "miami-local", keywords: ["facial sculpting Edgewater Miami", "facial sculpting Miami"] },
  { topic: "Why Miami professionals are choosing somatic facial work", cluster: "miami-local", keywords: ["somatic facial Miami professionals", "facial tension release Miami"] },
  { topic: "Jaw tension release near Brickell and Wynwood Miami", cluster: "miami-local", keywords: ["jaw tension release Brickell", "jaw tension release Wynwood Miami"] },
];

// ============================================================
// EXISTING SQUARESPACE POSTS TO ENHANCE
// ============================================================
const EXISTING_POSTS = [
  { title: "How Face Sculpting Transforms Your Skin: A Complete Guide", slug: "how-face-sculpting-transforms-your-skin", date: "2025-01-09" },
  { title: "Why Face Sculpting is the Ultimate Cheat Code for a Sculpted Look", slug: "why-face-sculpting-is-the-ultimate-cheat-code", date: "2025-01-09" },
  { title: "Who Needs Botox When You Have Face Sculpting?", slug: "who-needs-botox-when-you-have-face-sculpting", date: "2025-01-09" },
  { title: "Who Benefits Most from Buccal Massage?", slug: "who-benefits-most-from-buccal-massage", date: "2025-01-09" },
  { title: "Why You're Seriously Missing Out If You Haven't Tried Buccal Massage Yet", slug: "why-youre-missing-out-on-buccal-massage", date: "2025-01-09" },
  { title: "Unlock the Secret to a Natural Facelift with Buccal Massage", slug: "natural-facelift-buccal-massage", date: "2025-01-09" },
  { title: "Discover Miami's Finest Facial Experience at Undertone Skn", slug: "undertone-skn-miami-facial-sculpting-studio", date: "2025-01-09" },
  { title: "How a Professional Facial Can Remove Blackheads", slug: "how-do-facials-help-with-blackheads", date: "2024-04-25" },
  { title: "Top 3 Benefits of DMK Enzyme Therapy for Acne Management", slug: "top-3-benefits-of-dmk-enzyme-therapy-for-acne-management", date: "2024-04-18" },
  { title: "Why Facial Peels Are Safe?", slug: "why-facial-peels-are-safe", date: "2024-04-08" },
  { title: "Overcoming Acne with Consistency and Targeted Treatments", slug: "overcoming-acne-with-consistency-and-targeted-treatments", date: "2024-04-03" },
  { title: "My Journey Beyond Acne Treatments", slug: "my-journey-beyond-acne-treatments", date: "2024-03-06" },
];

// ============================================================
// BLOG POST FUNCTIONS
// ============================================================

function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
  const posts = files.map(file => {
    try {
      return JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
    } catch (e) { return null; }
  }).filter(Boolean);
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPostBySlug(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return null; }
}

function savePost(post) {
  const filePath = path.join(POSTS_DIR, `${post.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(post, null, 2));
  return post;
}

function getNextTopic() {
  const posts = getAllPosts();
  const usedTopics = posts.map(p => p.topic);
  const available = TOPIC_CLUSTERS.filter(t => !usedTopics.includes(t.topic));
  if (available.length === 0) return TOPIC_CLUSTERS[Math.floor(Math.random() * TOPIC_CLUSTERS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============================================================
// BLOG POST HTML TEMPLATE
// ============================================================
function renderPostHTML(post) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${post.title} | Undertone SKN Miami</title>
<meta name="description" content="${post.metaDescription}">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.metaDescription}">
<meta property="og:image" content="https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg">
<meta property="og:url" content="https://www.undertoneskn.com/blog/${post.slug}">
<meta property="og:type" content="article">
<link rel="canonical" href="https://www.undertoneskn.com/blog/${post.slug}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${post.title}",
  "datePublished": "${post.date}",
  "author": { "@type": "Person", "name": "Zinthia Garcia" },
  "publisher": { "@type": "Organization", "name": "Undertone SKN" },
  "description": "${post.metaDescription}"
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Epilogue:wght@300;400;500&family=Syne+Mono&family=Syne:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream-1: #F6F3EC; --cream-2: #ECE4DA; --taupe: #B9A590;
    --brown-dark: #574C3F; --brown-darkest: #36302A;
    --text-primary: #36302A; --text-secondary: #574C3F; --text-light: #B9A590;
  }
  body { background: var(--cream-1); color: var(--text-primary); font-family: 'Epilogue', sans-serif; font-size: 17px; line-height: 1.6; }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: var(--cream-1); border-bottom: 1px solid rgba(87,76,63,0.1); padding: 0 40px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
  .nav-logo { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--text-primary); text-decoration: none; }
  .nav-back { font-family: 'Syne Mono', monospace; font-size: 11px; letter-spacing: 1px; color: var(--text-secondary); text-decoration: none; }
  .post-hero { background: var(--brown-darkest); padding: 100px 60px 60px; margin-top: 56px; }
  .post-category { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 4px; color: var(--taupe); text-transform: uppercase; margin-bottom: 16px; }
  .post-title { font-family: 'Lato', sans-serif; font-size: clamp(28px, 4vw, 52px); font-weight: 300; color: var(--cream-1); line-height: 1.2; max-width: 800px; margin-bottom: 20px; }
  .post-meta { font-family: 'Syne Mono', monospace; font-size: 11px; color: var(--taupe); letter-spacing: 1px; }
  .post-body { max-width: 720px; margin: 0 auto; padding: 60px; }
  .post-body h2 { font-family: 'Lato', sans-serif; font-size: 24px; font-weight: 400; color: var(--text-primary); margin: 40px 0 16px; }
  .post-body p { font-family: 'Epilogue', sans-serif; font-size: 16px; color: var(--text-secondary); line-height: 1.9; margin-bottom: 20px; }
  .post-body ul { margin: 16px 0 20px 24px; }
  .post-body li { font-family: 'Epilogue', sans-serif; font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 8px; }
  .post-cta { background: var(--cream-2); border-top: 1px solid rgba(185,165,144,0.3); padding: 48px 60px; text-align: center; }
  .post-cta p { font-family: 'Lato', sans-serif; font-size: 24px; font-weight: 300; color: var(--text-primary); margin-bottom: 24px; }
  .post-cta a { display: inline-block; font-family: 'Syne Mono', monospace; font-size: 11px; letter-spacing: 2px; color: var(--text-primary); border: 1px solid var(--text-primary); padding: 14px 32px; text-decoration: none; }
  .post-cta a:hover { background: var(--text-primary); color: var(--cream-1); }
  .post-author { display: flex; align-items: center; gap: 16px; padding: 32px 60px; border-top: 1px solid rgba(185,165,144,0.2); background: var(--cream-1); max-width: 720px; margin: 0 auto; }
  .author-info p { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-primary); }
  .author-info span { font-family: 'Epilogue', sans-serif; font-size: 12px; color: var(--text-light); }
  footer { background: var(--brown-darkest); padding: 40px 60px; text-align: center; }
  footer p { font-family: 'Epilogue', sans-serif; font-size: 12px; color: var(--taupe); }
  footer a { color: var(--cream-2); text-decoration: none; margin: 0 12px; }
  @media (max-width: 768px) { .post-hero, .post-body, .post-cta, footer { padding: 48px 24px; } nav { padding: 0 24px; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">UNDERTONE SKN</a>
  <a href="/blog" class="nav-back">← Journal</a>
</nav>
<div class="post-hero">
  <p class="post-category">${post.cluster || 'Wellness'}</p>
  <h1 class="post-title">${post.title}</h1>
  <p class="post-meta">${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})} · By Zinthia Garcia · Undertone SKN, Edgewater Miami</p>
</div>
<div class="post-body">
  ${post.content}
</div>
<div class="post-author">
  <div class="author-info">
    <p>Zinthia Garcia</p>
    <span>Facial Sculptor · Undertone SKN · Edgewater Miami, FL</span>
  </div>
</div>
<div class="post-cta">
  <p>Ready to release what your face is holding?</p>
  <a href="https://undertoneskn.as.me/schedule/80fd8a11" target="_blank">Book a Session</a>
</div>
<footer>
  <p>
    <a href="/">Home</a>
    <a href="/blog">Journal</a>
    <a href="/services">Services</a>
    <a href="sms:3059650145">Text Us</a>
  </p>
  <p style="margin-top:16px;">© 2026 Undertone SKN · 2915 Biscayne Blvd Suite 200-29, Edgewater Miami FL 33137</p>
</footer>
</body>
</html>`;
}

// ============================================================
// BLOG LIST PAGE HTML
// ============================================================
function renderBlogListHTML(posts) {
  const postCards = posts.map(post => `
    <a href="/blog/${post.slug}" class="blog-card">
      <div class="blog-card-img" style="background-image:url('${post.image || getPostImage(post.cluster)}');background-size:cover;background-position:center;"></div>
      <div class="blog-card-body">
        <p class="blog-card-cat">${post.cluster || 'Wellness'}</p>
        <h3 class="blog-card-title">${post.title}</h3>
        <p class="blog-card-date">${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</p>
        <span class="blog-card-link">Read →</span>
      </div>
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Journal | Undertone SKN Miami</title>
<meta name="description" content="Insights on jaw tension, nervous system regulation, and functional beauty from Undertone SKN in Edgewater Miami.">
<link rel="canonical" href="https://www.undertoneskn.com/blog">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Epilogue:wght@300;400;500&family=Syne+Mono&family=Syne:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --cream-1: #F6F3EC; --cream-2: #ECE4DA; --taupe: #B9A590; --brown-dark: #574C3F; --brown-darkest: #36302A; --text-primary: #36302A; --text-secondary: #574C3F; --text-light: #B9A590; }
  body { background: var(--cream-1); color: var(--text-primary); font-family: 'Epilogue', sans-serif; }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: var(--cream-1); border-bottom: 1px solid rgba(87,76,63,0.1); padding: 0 40px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
  .nav-logo { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--text-primary); text-decoration: none; }
  .blog-hero { background: var(--brown-darkest); padding: 100px 60px 60px; margin-top: 56px; }
  .blog-hero h1 { font-family: 'Lato', sans-serif; font-size: clamp(40px, 6vw, 80px); font-weight: 300; color: var(--cream-1); letter-spacing: 4px; margin-bottom: 12px; }
  .blog-hero p { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--taupe); }
  .blog-grid { padding: 60px; background: var(--cream-1); }
  .blog-posts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1080px; margin: 0 auto; }
  .blog-card { text-decoration: none; background: var(--cream-2); transition: transform 0.2s; display: block; }
  .blog-card:hover { transform: translateY(-3px); }
  .blog-card-img { height: 200px; }
  .blog-card-body { padding: 20px; }
  .blog-card-cat { font-family: 'Syne Mono', monospace; font-size: 9px; letter-spacing: 3px; color: var(--taupe); text-transform: uppercase; margin-bottom: 8px; }
  .blog-card-title { font-family: 'Lato', sans-serif; font-size: 16px; font-weight: 400; color: var(--text-primary); line-height: 1.4; margin-bottom: 12px; }
  .blog-card-date { font-family: 'Syne Mono', monospace; font-size: 10px; color: var(--text-light); margin-bottom: 12px; }
  .blog-card-link { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 1px; color: var(--text-secondary); }
  footer { background: var(--brown-darkest); padding: 40px 60px; text-align: center; }
  footer p { font-family: 'Epilogue', sans-serif; font-size: 12px; color: var(--taupe); }
  footer a { color: var(--cream-2); text-decoration: none; margin: 0 12px; }
  @media (max-width: 900px) { .blog-posts { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .blog-posts { grid-template-columns: 1fr; } .blog-grid, .blog-hero { padding: 48px 24px; } nav { padding: 0 24px; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">UNDERTONE SKN</a>
</nav>
<div class="blog-hero">
  <h1>JOURNAL</h1>
  <p>Insights on jaw tension, nervous system regulation, and functional beauty.</p>
</div>
<div class="blog-grid">
  <div class="blog-posts">${postCards}</div>
</div>
<footer>
  <p><a href="/">Home</a><a href="/services">Services</a><a href="sms:3059650145">Text Us</a></p>
  <p style="margin-top:16px;">© 2026 Undertone SKN · Edgewater Miami FL</p>
</footer>
</body>
</html>`;
}

module.exports = {
  getAllPosts, getPostBySlug, savePost, getNextTopic,
  slugify, renderPostHTML, renderBlogListHTML, getPostImage,
  TOPIC_CLUSTERS, EXISTING_POSTS, POSTS_DIR
};
