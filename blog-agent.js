// ============================================================
// UNDERTONE SKN — BLOG ENGINE (PostgreSQL)
// ============================================================

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:OYSKYoNCScLVMKivGWSHExrmwcydTxNl@postgres.railway.internal:5432/railway';

// ============================================================
// DATABASE CONNECTION
// ============================================================
async function getClient() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();
  return client;
}

// ============================================================
// INITIALIZE DATABASE — creates table if not exists
// ============================================================
async function initDB() {
  const client = await getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        meta_description TEXT,
        content TEXT,
        excerpt TEXT,
        topic TEXT,
        cluster VARCHAR(100),
        keywords TEXT[],
        image TEXT,
        date DATE DEFAULT CURRENT_DATE,
        published BOOLEAN DEFAULT true,
        enhanced BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[DB] ✅ Database initialized');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  } finally {
    await client.end();
  }
}

// ============================================================
// BLOG POST FUNCTIONS
// ============================================================
async function getAllPosts() {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT * FROM blog_posts WHERE published = true ORDER BY date DESC, created_at DESC'
    );
    return result.rows.map(row => ({
      slug: row.slug,
      title: row.title,
      metaDescription: row.meta_description,
      content: row.content,
      excerpt: row.excerpt,
      topic: row.topic,
      cluster: row.cluster,
      keywords: row.keywords,
      image: row.image,
      date: row.date ? row.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      published: row.published,
      enhanced: row.enhanced
    }));
  } catch (err) {
    console.error('[DB] getAllPosts error:', err.message);
    return [];
  } finally {
    await client.end();
  }
}

async function getPostBySlug(slug) {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT * FROM blog_posts WHERE slug = $1 AND published = true',
      [slug]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      slug: row.slug,
      title: row.title,
      metaDescription: row.meta_description,
      content: row.content,
      excerpt: row.excerpt,
      topic: row.topic,
      cluster: row.cluster,
      keywords: row.keywords,
      image: row.image,
      date: row.date ? row.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      published: row.published,
      enhanced: row.enhanced
    };
  } catch (err) {
    console.error('[DB] getPostBySlug error:', err.message);
    return null;
  } finally {
    await client.end();
  }
}

async function savePost(post) {
  const client = await getClient();
  try {
    await client.query(`
      INSERT INTO blog_posts (slug, title, meta_description, content, excerpt, topic, cluster, keywords, image, date, published, enhanced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        meta_description = EXCLUDED.meta_description,
        content = EXCLUDED.content,
        excerpt = EXCLUDED.excerpt,
        image = EXCLUDED.image
    `, [
      post.slug, post.title, post.metaDescription, post.content,
      post.excerpt, post.topic, post.cluster,
      post.keywords || [], post.image, post.date || new Date().toISOString().split('T')[0],
      post.published !== false, post.enhanced || false
    ]);
    console.log(`[DB] ✅ Saved post: ${post.title}`);
    return post;
  } catch (err) {
    console.error('[DB] savePost error:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

async function getNextTopic() {
  const posts = await getAllPosts();
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
// IMAGE POOL — fallback when AI generation fails
// ============================================================
const BLOG_IMAGES = {
  'jaw-tension': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/2.jpeg_vbx2mu.webp'],
  'nervous-system': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/3.jpeg_tgmryi.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428459/studio_photo_exyuoh.jpg'],
  'fascia': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/5.jpeg_ycnvzu.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp'],
  'stress-face': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428426/6.jpeg_hqpsvt.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/2.jpeg_vbx2mu.webp'],
  'functional-beauty': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428459/studio_photo_exyuoh.jpg'],
  'miami-local': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/3.jpeg_tgmryi.webp'],
  'symptoms': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428426/6.jpeg_hqpsvt.webp'],
  'buccal-modality': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/2.jpeg_vbx2mu.webp','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428425/5.jpeg_ycnvzu.webp'],
  'after-session': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428459/studio_photo_exyuoh.jpg','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg'],
  'wellness': ['https://res.cloudinary.com/dera3kj2v/image/upload/v1777428462/oval_photo_uhbc5i.jpg','https://res.cloudinary.com/dera3kj2v/image/upload/v1777428424/1.jpg_xvd3oj.webp']
};

function getPostImage(cluster) {
  const images = BLOG_IMAGES[cluster] || BLOG_IMAGES['wellness'];
  return images[Math.floor(Math.random() * images.length)];
}

// ============================================================
// TOPIC CLUSTERS — 107 topics = 35+ weeks of content
// ============================================================
const TOPIC_CLUSTERS = [

  // ── JAW TENSION (14)
  { topic: "Why your jaw holds tension even when you think you're relaxed", cluster: "jaw-tension", keywords: ["jaw tension Miami", "jaw clenching relief", "jaw tension release"] },
  { topic: "The connection between jaw tension and chronic headaches", cluster: "jaw-tension", keywords: ["jaw tension headaches Miami", "jaw clenching headaches"] },
  { topic: "Why grinding your teeth at night is a nervous system signal", cluster: "jaw-tension", keywords: ["bruxism nervous system", "teeth grinding jaw tension"] },
  { topic: "What happens to your face when you clench your jaw for years", cluster: "jaw-tension", keywords: ["jaw clenching face", "jaw tension facial changes"] },
  { topic: "Why your jaw clenches during sleep without you knowing", cluster: "jaw-tension", keywords: ["jaw clenching sleep", "nighttime jaw tension"] },
  { topic: "Why stress goes straight to your jaw before anywhere else", cluster: "jaw-tension", keywords: ["stress jaw tension", "jaw stress response"] },
  { topic: "What a tight masseter muscle actually feels like from the inside", cluster: "jaw-tension", keywords: ["masseter muscle tension", "tight masseter Miami"] },
  { topic: "Why jaw tension gets worse during work deadlines", cluster: "jaw-tension", keywords: ["jaw tension stress work", "clenching at work"] },
  { topic: "The difference between jaw clenching and jaw grinding", cluster: "jaw-tension", keywords: ["clenching vs grinding", "bruxism vs clenching"] },
  { topic: "Why women clench their jaws more than men", cluster: "jaw-tension", keywords: ["women jaw tension", "jaw clenching women Miami"] },
  { topic: "What your jaw tension is trying to tell you", cluster: "jaw-tension", keywords: ["jaw tension meaning", "jaw holding patterns"] },
  { topic: "Why releasing the jaw changes the whole face", cluster: "jaw-tension", keywords: ["jaw release facial change", "jaw tension facial sculpting"] },
  { topic: "Why one side of your jaw is tighter than the other", cluster: "jaw-tension", keywords: ["jaw asymmetry tension", "one side jaw tight"] },
  { topic: "What intraoral jaw work is and how it releases deep tension", cluster: "jaw-tension", keywords: ["intraoral jaw work Miami", "jaw tension release inside"] },

  // ── NERVOUS SYSTEM (14)
  { topic: "How stress lives in your face and what to do about it", cluster: "nervous-system", keywords: ["stress face nervous system", "facial tension stress Miami"] },
  { topic: "What nervous system regulation actually feels like in your body", cluster: "nervous-system", keywords: ["nervous system regulation", "somatic nervous system Miami"] },
  { topic: "Why your face feels tight when you're anxious", cluster: "nervous-system", keywords: ["anxiety facial tension", "face tight anxiety"] },
  { topic: "The vagus nerve and facial tension", cluster: "nervous-system", keywords: ["vagus nerve facial tension", "vagus nerve somatic work"] },
  { topic: "What happens to your face when you finally feel safe", cluster: "nervous-system", keywords: ["nervous system safety face", "face relaxation nervous system"] },
  { topic: "Why the nervous system holds tension in the face specifically", cluster: "nervous-system", keywords: ["nervous system face tension", "face nervous system signal"] },
  { topic: "The connection between shallow breathing and facial tension", cluster: "nervous-system", keywords: ["breathing facial tension", "shallow breath face tight"] },
  { topic: "Why screen time is making your face tighter", cluster: "nervous-system", keywords: ["screen time facial tension", "tech neck jaw tension Miami"] },
  { topic: "The link between poor sleep and facial holding patterns", cluster: "nervous-system", keywords: ["sleep facial tension", "poor sleep face Miami"] },
  { topic: "Why your face relaxes during vacation but tightens back up at home", cluster: "nervous-system", keywords: ["vacation face relax", "stress return face tension"] },
  { topic: "What happens neurologically when facial tension releases", cluster: "nervous-system", keywords: ["neuroscience facial release", "nervous system facial Miami"] },
  { topic: "Why some people hold tension in their forehead and others in their jaw", cluster: "nervous-system", keywords: ["forehead tension vs jaw tension", "where stress lives face"] },
  { topic: "Why deep breathing alone doesn't release facial tension", cluster: "nervous-system", keywords: ["breathing not enough facial tension", "somatic facial work Miami"] },
  { topic: "The fight or flight response and what it does to your face", cluster: "nervous-system", keywords: ["fight or flight face tension", "stress response facial holding"] },

  // ── FASCIA (11)
  { topic: "What is facial fascia and why does it get stuck", cluster: "fascia", keywords: ["facial fascia Miami", "fascia release face"] },
  { topic: "How fascia holds emotional stress in the face", cluster: "fascia", keywords: ["fascia emotional stress face", "somatic fascia Miami"] },
  { topic: "The science behind fascia release and visible facial changes", cluster: "fascia", keywords: ["fascia release facial sculpting", "fascia Miami"] },
  { topic: "Why facial fascia tightens with age and stress", cluster: "fascia", keywords: ["fascia aging face", "facial fascia tightening Miami"] },
  { topic: "The difference between tight skin and tight fascia", cluster: "fascia", keywords: ["tight skin vs tight fascia", "fascia vs skin face"] },
  { topic: "Why fascia release feels emotional sometimes", cluster: "fascia", keywords: ["emotional fascia release", "fascia emotional release Miami"] },
  { topic: "How fascia connects your jaw to your scalp", cluster: "fascia", keywords: ["jaw fascia scalp connection", "facial fascia network"] },
  { topic: "Why your face feels puffy when fascia is restricted", cluster: "fascia", keywords: ["facial puffiness fascia", "fascia restriction face Miami"] },
  { topic: "What fascia hydration actually means for the face", cluster: "fascia", keywords: ["fascia hydration face", "hydrated fascia facial Miami"] },
  { topic: "Why scar tissue in the face affects fascia everywhere", cluster: "fascia", keywords: ["scar tissue face fascia", "facial scar tissue release"] },
  { topic: "Myofascial release for the face — what the research says", cluster: "fascia", keywords: ["myofascial release face Miami", "facial myofascial release"] },

  // ── STRESS FACE (11)
  { topic: "Why high-achieving women hold stress in their faces", cluster: "stress-face", keywords: ["stress face women Miami", "facial tension high stress"] },
  { topic: "What chronic stress does to your facial structure over time", cluster: "stress-face", keywords: ["chronic stress face", "stress facial aging Miami"] },
  { topic: "Why your face looks tired even when you slept well", cluster: "stress-face", keywords: ["tired face not tired", "facial heaviness stress Miami"] },
  { topic: "Why your face holds the memory of every hard year", cluster: "stress-face", keywords: ["stress face aging", "face holds stress Miami"] },
  { topic: "Why ambitious people have tighter faces", cluster: "stress-face", keywords: ["ambitious women face tension", "high achiever jaw tension"] },
  { topic: "The face you make at your desk and what it costs you", cluster: "stress-face", keywords: ["desk face tension", "work facial tension Miami"] },
  { topic: "Why your face looks different in photos than in the mirror", cluster: "stress-face", keywords: ["face asymmetry photos", "face tension asymmetry"] },
  { topic: "What burnout looks like on the face", cluster: "stress-face", keywords: ["burnout face Miami", "burnout facial tension"] },
  { topic: "Why the face ages faster under chronic stress", cluster: "stress-face", keywords: ["stress facial aging Miami", "chronic stress face aging"] },
  { topic: "Why you look angry even when you're not", cluster: "stress-face", keywords: ["resting tension face", "angry face resting tension Miami"] },
  { topic: "What grief does to facial structure over time", cluster: "stress-face", keywords: ["grief face holding", "emotional stress facial structure"] },

  // ── FUNCTIONAL BEAUTY (11)
  { topic: "What is functional beauty and why it's different from skincare", cluster: "functional-beauty", keywords: ["functional beauty Miami", "somatic facial beauty"] },
  { topic: "Why visible lift happens when the nervous system releases", cluster: "functional-beauty", keywords: ["facial lift nervous system", "natural facial lift Miami"] },
  { topic: "Why your skin looks better when your face is less tense", cluster: "functional-beauty", keywords: ["skin tension release", "skin nervous system Miami"] },
  { topic: "Why Botox doesn't fix what tension created", cluster: "functional-beauty", keywords: ["Botox alternative Miami", "facial tension vs Botox"] },
  { topic: "The difference between looking rested and looking treated", cluster: "functional-beauty", keywords: ["natural facial results Miami", "rested vs treated face"] },
  { topic: "Why structural facial changes outlast any product", cluster: "functional-beauty", keywords: ["facial structure changes Miami", "lasting facial results"] },
  { topic: "What real facial lift looks like vs filler lift", cluster: "functional-beauty", keywords: ["natural facial lift vs filler Miami", "facial lift without filler"] },
  { topic: "The role of circulation in natural facial radiance", cluster: "functional-beauty", keywords: ["facial circulation radiance Miami", "natural facial glow"] },
  { topic: "Why your skincare stops working when you're stressed", cluster: "functional-beauty", keywords: ["skincare stress Miami", "stress skincare ineffective"] },
  { topic: "What happens to collagen when the face is chronically tense", cluster: "functional-beauty", keywords: ["collagen facial tension", "tension collagen face Miami"] },
  { topic: "Why functional beauty is the future of skincare", cluster: "functional-beauty", keywords: ["functional beauty future", "somatic skincare Miami"] },

  // ── MIAMI LOCAL (10)
  { topic: "Where to find jaw tension release in Edgewater Miami", cluster: "miami-local", keywords: ["jaw tension release Edgewater Miami", "somatic facial Edgewater"] },
  { topic: "The best somatic facial studio in Miami", cluster: "miami-local", keywords: ["somatic facial Miami", "best facial studio Miami"] },
  { topic: "Facial sculpting in Edgewater Miami — what to expect", cluster: "miami-local", keywords: ["facial sculpting Edgewater Miami", "facial sculpting Miami"] },
  { topic: "Jaw tension release near Brickell and Wynwood Miami", cluster: "miami-local", keywords: ["jaw tension release Brickell", "jaw tension release Wynwood Miami"] },
  { topic: "Why Miami women are choosing somatic facial work over Botox", cluster: "miami-local", keywords: ["Miami somatic facial Botox alternative", "Miami facial tension release"] },
  { topic: "What to expect at your first session at Undertone SKN", cluster: "miami-local", keywords: ["Undertone SKN first session", "jaw tension release Miami first time"] },
  { topic: "Why Brickell professionals are booking jaw tension release", cluster: "miami-local", keywords: ["Brickell jaw tension", "Miami professionals facial tension"] },
  { topic: "Somatic facial work in Miami — what makes it different", cluster: "miami-local", keywords: ["somatic facial Miami difference", "Miami facial sculpting unique"] },
  { topic: "Why Wynwood creatives are choosing nervous system facials", cluster: "miami-local", keywords: ["Wynwood facial Miami", "creative professionals jaw tension Miami"] },
  { topic: "The best facial for jaw tension in Miami in 2026", cluster: "miami-local", keywords: ["best jaw tension facial Miami 2026", "Miami facial 2026"] },

  // ── SYMPTOMS (10)
  { topic: "Why does my face feel heavy when I wake up", cluster: "symptoms", keywords: ["face feels heavy morning", "facial heaviness waking up Miami"] },
  { topic: "Why do I always look tired even when I'm not", cluster: "symptoms", keywords: ["always look tired face", "tired looking face Miami"] },
  { topic: "Why does my jaw hurt when I wake up", cluster: "symptoms", keywords: ["jaw hurts morning", "jaw pain waking up Miami"] },
  { topic: "Why does my face feel tight all the time", cluster: "symptoms", keywords: ["face feels tight all the time", "chronic facial tightness Miami"] },
  { topic: "Why does one side of my face look different than the other", cluster: "symptoms", keywords: ["face asymmetry", "one side face different Miami"] },
  { topic: "Why do I clench my jaw at night", cluster: "symptoms", keywords: ["jaw clenching night", "nocturnal jaw clenching Miami"] },
  { topic: "Why does my face feel puffy in the morning", cluster: "symptoms", keywords: ["morning face puffiness", "facial puffiness morning Miami"] },
  { topic: "Why do I feel pressure in my face and head", cluster: "symptoms", keywords: ["face head pressure", "facial pressure tension Miami"] },
  { topic: "Why does my jaw click or pop", cluster: "symptoms", keywords: ["jaw clicking popping", "jaw click release Miami"] },
  { topic: "Why do I get headaches that start in my jaw", cluster: "symptoms", keywords: ["jaw headaches", "headaches from jaw tension Miami"] },

  // ── BUCCAL & MODALITY KEYWORDS (11)
  { topic: "What is buccal massage and how does jaw tension release compare", cluster: "buccal-modality", keywords: ["buccal massage Miami", "buccal facial Miami", "buccal massage vs jaw release"] },
  { topic: "Buccal facial in Miami — what to know before you book", cluster: "buccal-modality", keywords: ["buccal facial Miami", "buccal massage Edgewater"] },
  { topic: "Why people searching for buccal massage end up choosing somatic work", cluster: "buccal-modality", keywords: ["buccal massage alternative Miami", "somatic vs buccal facial"] },
  { topic: "What is intraoral massage and who is it for", cluster: "buccal-modality", keywords: ["intraoral massage Miami", "intraoral facial work"] },
  { topic: "Gua sha for jaw tension — does it actually work", cluster: "buccal-modality", keywords: ["gua sha jaw tension", "gua sha facial Miami"] },
  { topic: "Face reflexology — what it is and what it misses", cluster: "buccal-modality", keywords: ["face reflexology Miami", "facial reflexology tension"] },
  { topic: "Lymphatic facial drainage in Miami — what to expect", cluster: "buccal-modality", keywords: ["lymphatic facial drainage Miami", "facial lymphatic massage Miami"] },
  { topic: "Why people seeking facial acupressure end up here", cluster: "buccal-modality", keywords: ["facial acupressure Miami", "acupressure jaw tension"] },
  { topic: "Natural alternatives to Botox for jaw tension in Miami", cluster: "buccal-modality", keywords: ["natural Botox alternative Miami", "Botox jaw tension alternative"] },
  { topic: "What TMJ natural relief actually looks like in practice", cluster: "buccal-modality", keywords: ["TMJ natural relief Miami", "TMJ without medication"] },
  { topic: "TMJ and face asymmetry — the facial tension connection", cluster: "buccal-modality", keywords: ["TMJ face asymmetry", "jaw tension facial asymmetry Miami"] },

  // ── AFTER THE SESSION (5)
  { topic: "What to expect after your first jaw tension release session", cluster: "after-session", keywords: ["after jaw tension release Miami", "first facial session results"] },
  { topic: "Why you might feel emotional after a somatic facial session", cluster: "after-session", keywords: ["emotional after facial Miami", "somatic release emotions"] },
  { topic: "Why your face looks different the day after a session", cluster: "after-session", keywords: ["face after session Miami", "facial results next day"] },
  { topic: "How often should you get jaw tension release work done", cluster: "after-session", keywords: ["jaw tension release frequency Miami", "how often facial session"] },
  { topic: "What to do between sessions to maintain results", cluster: "after-session", keywords: ["between sessions jaw tension", "maintain facial results Miami"] },

];


// ============================================================
// EXISTING POSTS TO ENHANCE
// ============================================================
const EXISTING_POSTS = [
  { title: "How Face Sculpting Transforms Your Skin: A Complete Guide", slug: "how-face-sculpting-transforms-your-skin", cluster: "functional-beauty" },
  { title: "Why Face Sculpting is the Ultimate Cheat Code for a Sculpted Look", slug: "why-face-sculpting-is-the-ultimate-cheat-code", cluster: "functional-beauty" },
  { title: "Who Needs Botox When You Have Face Sculpting?", slug: "who-needs-botox-when-you-have-face-sculpting", cluster: "functional-beauty" },
  { title: "Who Benefits Most from Buccal Massage?", slug: "who-benefits-most-from-buccal-massage", cluster: "jaw-tension" },
  { title: "Why You're Seriously Missing Out If You Haven't Tried Buccal Massage Yet", slug: "why-youre-missing-out-on-buccal-massage", cluster: "jaw-tension" },
  { title: "Unlock the Secret to a Natural Facelift with Buccal Massage", slug: "natural-facelift-buccal-massage", cluster: "functional-beauty" },
  { title: "Discover Miami's Finest Facial Experience at Undertone Skn", slug: "undertone-skn-miami-facial-sculpting-studio", cluster: "miami-local" },
  { title: "How a Professional Facial Can Remove Blackheads", slug: "how-do-facials-help-with-blackheads", cluster: "wellness" },
  { title: "Top 3 Benefits of DMK Enzyme Therapy for Acne Management", slug: "top-3-benefits-of-dmk-enzyme-therapy-for-acne-management", cluster: "wellness" },
  { title: "Why Facial Peels Are Safe?", slug: "why-facial-peels-are-safe", cluster: "wellness" },
  { title: "Overcoming Acne with Consistency and Targeted Treatments", slug: "overcoming-acne-with-consistency-and-targeted-treatments", cluster: "wellness" },
  { title: "My Journey Beyond Acne Treatments", slug: "my-journey-beyond-acne-treatments", cluster: "wellness" },
];

// ============================================================
// BLOG HTML RENDERERS
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
<meta property="og:image" content="${post.image || 'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg'}">
<meta property="og:url" content="https://www.undertoneskn.com/blog/${post.slug}">
<meta property="og:type" content="article">
<link rel="canonical" href="https://www.undertoneskn.com/blog/${post.slug}">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${post.title}","datePublished":"${post.date}","author":{"@type":"Person","name":"Zinthia Garcia"},"publisher":{"@type":"Organization","name":"Undertone SKN"},"description":"${post.metaDescription}","image":"${post.image || ''}"}</script>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Epilogue:wght@300;400;500&family=Syne+Mono&family=Syne:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--cream-1:#F6F3EC;--cream-2:#ECE4DA;--taupe:#B9A590;--brown-dark:#574C3F;--brown-darkest:#36302A;--text-primary:#36302A;--text-secondary:#574C3F;--text-light:#B9A590}
body{background:var(--cream-1);color:var(--text-primary);font-family:'Epilogue',sans-serif;font-size:17px;line-height:1.6}
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--cream-1);border-bottom:1px solid rgba(87,76,63,0.1);padding:0 40px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'Syne',sans-serif;font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--text-primary);text-decoration:none}
.nav-back{font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:1px;color:var(--text-secondary);text-decoration:none}
.post-hero{background:var(--brown-darkest);padding:100px 60px 60px;margin-top:56px}
${post.image ? `.post-hero{background-image:linear-gradient(rgba(54,48,42,0.85),rgba(54,48,42,0.95)),url('${post.image}');background-size:cover;background-position:center}` : ''}
.post-category{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--taupe);text-transform:uppercase;margin-bottom:16px}
.post-title{font-family:'Lato',sans-serif;font-size:clamp(28px,4vw,52px);font-weight:300;color:var(--cream-1);line-height:1.2;max-width:800px;margin-bottom:20px}
.post-meta{font-family:'Syne Mono',monospace;font-size:11px;color:var(--taupe);letter-spacing:1px}
.post-body{max-width:720px;margin:0 auto;padding:60px}
.post-body h2{font-family:'Lato',sans-serif;font-size:24px;font-weight:400;color:var(--text-primary);margin:40px 0 16px}
.post-body p{font-family:'Epilogue',sans-serif;font-size:16px;color:var(--text-secondary);line-height:1.9;margin-bottom:20px}
.post-body ul{margin:16px 0 20px 24px}
.post-body li{font-family:'Epilogue',sans-serif;font-size:15px;color:var(--text-secondary);line-height:1.8;margin-bottom:8px}
.post-cta{background:var(--cream-2);border-top:1px solid rgba(185,165,144,0.3);padding:48px 60px;text-align:center}
.post-cta p{font-family:'Lato',sans-serif;font-size:24px;font-weight:300;color:var(--text-primary);margin-bottom:24px}
.post-cta a{display:inline-block;font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--text-primary);border:1px solid var(--text-primary);padding:14px 32px;text-decoration:none}
.post-author{max-width:720px;margin:0 auto;padding:32px 60px;border-top:1px solid rgba(185,165,144,0.2)}
.author-info p{font-family:'Syne',sans-serif;font-size:13px;font-weight:500;color:var(--text-primary)}
.author-info span{font-family:'Epilogue',sans-serif;font-size:12px;color:var(--text-light)}
footer{background:var(--brown-darkest);padding:40px 60px;text-align:center}
footer p{font-family:'Epilogue',sans-serif;font-size:12px;color:var(--taupe)}
footer a{color:var(--cream-2);text-decoration:none;margin:0 12px}
@media(max-width:768px){.post-hero,.post-body,.post-cta,.post-author,footer{padding:48px 24px}nav{padding:0 24px}}
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
<div class="post-body">${post.content}</div>
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
  <p><a href="/">Home</a><a href="/blog">Journal</a><a href="/services">Services</a><a href="sms:3059650145">Text Us</a></p>
  <p style="margin-top:16px;">© 2026 Undertone SKN · 2915 Biscayne Blvd Suite 200-29, Edgewater Miami FL 33137</p>
</footer>
</body>
</html>`;
}

function renderBlogListHTML(posts) {
  const postCards = posts.map((post, i) => `
    <a href="/blog/${post.slug}" class="blog-card ${i === 0 ? 'blog-card-featured' : ''}">
      <div class="blog-card-img" style="background-image:url('${post.image || getPostImage(post.cluster)}');background-size:cover;background-position:center;">
        <div class="blog-card-overlay"></div>
        <div class="blog-card-content">
          <p class="blog-card-cat">${(post.cluster || 'wellness').replace(/-/g, ' ')}</p>
          <h3 class="blog-card-title">${post.title}</h3>
          <p class="blog-card-date">${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</p>
          <span class="blog-card-link">Read →</span>
        </div>
      </div>
    </a>
  `).join('');

  const emptyState = `
    <div style="grid-column:1/-1;text-align:center;padding:80px 24px;">
      <p style="font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:3px;color:#B9A590;text-transform:uppercase;margin-bottom:16px;">Coming Soon</p>
      <p style="font-family:'Lato',sans-serif;font-size:24px;font-weight:300;color:#F6F3EC;">Posts are being prepared.</p>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Journal | Undertone SKN Miami</title>
<meta name="description" content="Insights on jaw tension, nervous system regulation, and functional beauty from Undertone SKN in Edgewater Miami.">
<link rel="canonical" href="https://www.undertoneskn.com/blog">
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TTZ4VVK');</script>

<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Epilogue:wght@300;400;500&family=Syne+Mono&family=Syne:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--cream-1:#F6F3EC;--cream-2:#ECE4DA;--taupe:#B9A590;--brown-dark:#574C3F;--brown-darkest:#36302A;--text-primary:#36302A;--text-secondary:#574C3F;--text-light:#B9A590}
html{scroll-behavior:smooth}
body{background:var(--brown-darkest);color:var(--cream-1);font-family:'Epilogue',sans-serif}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--brown-darkest);border-bottom:1px solid rgba(185,165,144,0.1);padding:0 40px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'Syne',sans-serif;font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--cream-1);text-decoration:none}
.nav-links{display:flex;align-items:center;gap:28px;list-style:none}
.nav-links a{font-family:'Epilogue',sans-serif;font-size:13px;color:var(--taupe);text-decoration:none;transition:color 0.2s}
.nav-links a:hover{color:var(--cream-1)}
.nav-links a.active{color:var(--cream-1);text-decoration:underline;text-underline-offset:4px}
.nav-cta{font-family:'Syne Mono',monospace;font-size:12px;color:var(--cream-1)!important;letter-spacing:1px;border-bottom:1px solid var(--taupe);padding-bottom:2px}

/* HERO */
.blog-hero{background:var(--brown-darkest);padding:100px 60px 60px;margin-top:56px;border-bottom:1px solid rgba(185,165,144,0.1)}
.blog-hero-label{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--taupe);text-transform:uppercase;margin-bottom:16px}
.blog-hero h1{font-family:'Lato',sans-serif;font-size:clamp(48px,7vw,96px);font-weight:300;color:var(--cream-1);letter-spacing:6px;margin-bottom:16px;line-height:1}
.blog-hero p{font-family:'Epilogue',sans-serif;font-size:14px;color:var(--taupe);max-width:440px;line-height:1.8}

/* GRID */
.blog-grid{padding:48px 60px 80px;background:var(--brown-darkest)}
.blog-posts{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;max-width:1200px;margin:0 auto}

/* CARD */
.blog-card{text-decoration:none;display:block;position:relative;overflow:hidden}
.blog-card-img{height:320px;position:relative;overflow:hidden}
.blog-card:hover .blog-card-img img{transform:scale(1.04)}
.blog-card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(36,30,26,0.95) 0%,rgba(36,30,26,0.3) 60%,transparent 100%);transition:background 0.3s}
.blog-card:hover .blog-card-overlay{background:linear-gradient(to top,rgba(36,30,26,0.98) 0%,rgba(36,30,26,0.5) 60%,rgba(36,30,26,0.1) 100%)}
.blog-card-content{position:absolute;bottom:0;left:0;right:0;padding:24px}
.blog-card-cat{font-family:'Syne Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--taupe);text-transform:uppercase;margin-bottom:8px}
.blog-card-title{font-family:'Lato',sans-serif;font-size:17px;font-weight:300;color:var(--cream-1);line-height:1.3;margin-bottom:10px}
.blog-card-date{font-family:'Syne Mono',monospace;font-size:9px;color:rgba(185,165,144,0.6);letter-spacing:1px;margin-bottom:8px}
.blog-card-link{font-family:'Syne Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--taupe);text-transform:uppercase;opacity:0;transform:translateY(4px);transition:opacity 0.2s,transform 0.2s}
.blog-card:hover .blog-card-link{opacity:1;transform:translateY(0)}

/* FEATURED CARD */
.blog-card-featured .blog-card-img{height:480px}
.blog-card-featured .blog-card-title{font-size:22px}

/* FOOTER */
footer{background:var(--brown-darkest);border-top:1px solid rgba(185,165,144,0.1);padding:40px 60px;text-align:center}
footer p{font-family:'Epilogue',sans-serif;font-size:12px;color:var(--taupe)}
footer a{color:var(--taupe);text-decoration:none;margin:0 12px;transition:color 0.2s}
footer a:hover{color:var(--cream-1)}

/* FLOATING TEXT ME */
.floating-btn{position:fixed;bottom:28px;right:28px;z-index:999;display:flex;align-items:center;gap:10px;background:var(--brown-darkest);border:1px solid var(--taupe);padding:12px 20px;text-decoration:none;transition:background 0.2s;box-shadow:0 4px 24px rgba(0,0,0,0.3)}
.floating-btn span{font-family:'Syne Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--cream-1);text-transform:uppercase}
.floating-btn:hover{background:var(--brown-dark)}

@media(max-width:900px){.blog-posts{grid-template-columns:1fr 1fr}.blog-card-featured .blog-card-img{height:320px}}
@media(max-width:600px){.blog-posts{grid-template-columns:1fr}.blog-grid,.blog-hero{padding:48px 24px}nav{padding:0 24px}.nav-links{display:none}}
</style>
</head>
<body>

<!-- GTM noscript -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TTZ4VVK" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

<nav>
  <a href="/" class="nav-logo">UNDERTONE SKN</a>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/services">Services</a></li>
    <li><a href="/blog" class="active">Journal</a></li>
    <li><a href="sms:3059650145" class="nav-cta">TEXT ME</a></li>
  </ul>
</nav>

<div class="blog-hero">
  <p class="blog-hero-label">Undertone SKN · Edgewater Miami</p>
  <h1>JOURNAL</h1>
  <p>Insights on jaw tension, nervous system regulation, and functional beauty.</p>
</div>

<div class="blog-grid">
  <div class="blog-posts">
    ${posts.length > 0 ? postCards : emptyState}
  </div>
</div>

<footer>
  <p style="margin-bottom:16px;">
    <a href="/">Home</a>
    <a href="/services">Services</a>
    <a href="/blog">Journal</a>
    <a href="sms:3059650145">Text Us</a>
  </p>
  <p>© 2026 Undertone SKN · 2915 Biscayne Blvd Suite 200-29 · Edgewater Miami FL 33137</p>
</footer>

<a href="sms:3059650145" class="floating-btn">
  <span>💬</span><span>Text Me</span>
</a>

</body>
</html>`;
}

module.exports = {
  getAllPosts, getPostBySlug, savePost, getNextTopic,
  slugify, renderPostHTML, renderBlogListHTML, getPostImage,
  initDB, TOPIC_CLUSTERS, EXISTING_POSTS
};
