// ============================================================
// UNDERTONE SKN — BLOG AGENT
// Generates SEO blog posts via Claude API and publishes them
// Runs automatically 3x per week (Mon, Wed, Fri)
// ============================================================

const fetch = require('node-fetch');
const { getNextTopic, savePost, slugify, getAllPosts, EXISTING_POSTS, getPostImage } = require('./blog-engine');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD || 'dera3kj2v';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'blog_images';

// ============================================================
// GENERATE IMAGE VIA STABILITY AI
// Uses raw multipart/form-data — no external packages needed
// ============================================================
async function generateBlogImage(title, cluster) {

  const promptMap = {
    'jaw-tension': 'Abstract anatomical illustration of jaw and facial muscles, warm earth tones, dark background, editorial medical art style, minimalist, no people, no faces, conceptual wellness artwork',
    'nervous-system': 'Abstract illustration of nervous system pathways in face and neck, warm golden lines on dark background, editorial art style, minimalist conceptual, no people, no faces',
    'fascia': 'Abstract anatomical illustration of facial fascia tissue layers, warm earth tones, dark moody background, minimalist editorial art, conceptual wellness, no people, no faces',
    'stress-face': 'Abstract conceptual illustration of tension and release, flowing lines, warm amber tones on dark background, editorial minimalist art, wellness concept, no people, no faces',
    'functional-beauty': 'Abstract minimalist illustration of facial structure and beauty, geometric forms, warm gold tones on dark background, editorial art style, luxury wellness concept, no people',
    'miami-local': 'Abstract minimal illustration of tropical wellness spa, warm earth tones, dark moody background, editorial art style, luxury concept, architectural elements, no people',
    'wellness': 'Abstract anatomical illustration of skin and tissue layers, warm earth tones, dark background, minimalist editorial medical art style, conceptual wellness, no people, no faces'
  };

  const prompt = promptMap[cluster] || promptMap['wellness'];
  const negativePrompt = 'cartoon, illustration, text, watermark, logo, bright colors, white background, plastic skin, fake, AI looking, ugly, deformed';

  try {
    console.log(`[IMAGE GEN] Generating image for cluster: ${cluster}`);

    // Build multipart form data manually
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    const fields = {
      prompt,
      negative_prompt: negativePrompt,
      aspect_ratio: '16:9',
      output_format: 'webp'
    };

    let body = '';
    for (const [key, value] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${STABILITY_API_KEY}`,
        'accept': 'application/json',
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    const data = await response.json();

    if (data.image) {
      const imageUrl = await uploadToCloudinary(data.image);
      console.log(`[IMAGE GEN] ✅ Image generated and uploaded: ${imageUrl}`);
      return imageUrl;
    } else {
      console.error('[IMAGE GEN] No image in response:', JSON.stringify(data));
      return null;
    }
  } catch (error) {
    console.error('[IMAGE GEN] Error generating image:', error.message);
    return null;
  }
}

// ============================================================
// UPLOAD IMAGE TO CLOUDINARY
// ============================================================
async function uploadToCloudinary(base64Image) {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: `data:image/webp;base64,${base64Image}`,
          upload_preset: CLOUDINARY_UPLOAD_PRESET
        })
      }
    );
    const data = await response.json();
    if (data.error) {
      console.error('[CLOUDINARY] Upload error:', data.error.message);
      return null;
    }
    console.log('[CLOUDINARY] ✅ Uploaded:', data.secure_url);
    return data.secure_url || null;
  } catch (error) {
    console.error('[CLOUDINARY] Upload error:', error.message);
    return null;
  }
}

// ============================================================
// PUBMED CITATION SEARCH — finds real relevant studies
// Uses free NCBI E-utilities API — no key needed
// ============================================================
async function searchPubMedCitations(topic, count = 2) {
  try {
    console.log(`[PUBMED] Searching for citations on: ${topic}`);

    // Build search query from topic
    const query = encodeURIComponent(topic.replace(/['"]/g, ''));

    // Step 1 — Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=${count * 3}&retmode=json&sort=relevance`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) {
      console.log('[PUBMED] No results found');
      return [];
    }

    // Step 2 — Fetch article details
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.slice(0, count * 2).join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();

    const citations = [];
    const articles = summaryData.result || {};

    for (const id of ids.slice(0, count * 2)) {
      const article = articles[id];
      if (!article || !article.title) continue;

      const title = article.title.replace(/<[^>]*>/g, '').trim();
      const authors = article.authors?.slice(0, 2).map(a => a.name).join(', ') || 'et al';
      const year = article.pubdate?.split(' ')[0] || '';
      const journal = article.source || '';
      const pmcid = article.articleids?.find(a => a.idtype === 'pmc')?.value;
      const url = pmcid
        ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`
        : `https://pubmed.ncbi.nlm.nih.gov/${id}/`;

      citations.push({ title, authors, year, journal, url, pmid: id });

      if (citations.length >= count) break;
    }

    console.log(`[PUBMED] ✅ Found ${citations.length} citations`);
    return citations;

  } catch (error) {
    console.error('[PUBMED] Search error:', error.message);
    return [];
  }
}

// ============================================================
// GENERATE A NEW BLOG POST
// ============================================================
async function generateBlogPost(topicData) {
  console.log(`[BLOG AGENT] Generating post: ${topicData.topic}`);

  // Search for real PubMed citations first
  const citations = await searchPubMedCitations(topicData.topic, 2);

  const citationContext = citations.length > 0
    ? `Use these REAL citations in the post — link to these exact URLs:
${citations.map((c, i) => `${i + 1}. "${c.title}" by ${c.authors} (${c.year}), ${c.journal}. URL: ${c.url}`).join('\n')}`
    : 'No citations found — write without citations rather than fabricating them.';

  const prompt = `You are writing a blog post for Undertone SKN, a somatic facial studio in Edgewater Miami run by Zinthia Garcia. 

Zinthia's voice: warm, direct, science-informed, never generic. She treats the face as a signal of the nervous system — not a surface. She works on jaw tension release, fascia release, and nervous system regulation. Her brand is called "functional beauty."

Write a complete, SEO-optimized blog post on this topic: "${topicData.topic}"

Target keywords to include naturally: ${(topicData.keywords || []).join(', ')}

CITATION INSTRUCTIONS:
${citationContext}
NEVER fabricate or invent citation URLs. Only use the URLs provided above.

REQUIREMENTS:
- 800-1200 words
- Write in Zinthia's voice — first person where appropriate
- Structure with H2 headings
- Include a clear intro that hooks the reader immediately
- End with a soft CTA connecting to jaw tension release or booking
- Every post must link internally to: https://www.undertoneskn.com/services and https://www.undertoneskn.com
- Miami/Edgewater local references where natural
- Never use generic wellness language — always specific, always grounded in nervous system science

OUTPUT FORMAT — return valid JSON only, no markdown, no backticks:
{
  "title": "SEO-optimized title under 60 characters",
  "metaDescription": "Meta description under 155 characters with primary keyword",
  "content": "Full HTML content with <h2>, <p>, <ul>, <li> tags only. No divs. Citation links formatted as <a href='URL' target='_blank' rel='noopener'>Author et al, Year</a>",
  "excerpt": "2-3 sentence summary for blog listing"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();

  if (!data.content || !data.content[0]) {
    throw new Error('No content returned from Claude API');
  }

  const text = data.content[0].text;

  // Parse JSON response
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return parsed;
}

// ============================================================
// ENHANCE EXISTING SQUARESPACE POST
// ============================================================
async function enhanceExistingPost(existingPost) {
  console.log(`[BLOG AGENT] Enhancing existing post: ${existingPost.title}`);

  const prompt = `You are rewriting and enhancing an existing blog post for Undertone SKN, a somatic facial studio in Edgewater Miami run by Zinthia Garcia.

Original post title: "${existingPost.title}"

Zinthia's voice: warm, direct, science-informed. She treats the face as a signal of the nervous system. She works on jaw tension release, fascia release, nervous system regulation. Brand: "functional beauty."

Rewrite this post completely with:
- 800-1000 words in Zinthia's authentic voice
- At least 2 real PubMed or scientific citations
- H2 structure with clear sections
- Internal links to https://www.undertoneskn.com/services and https://www.undertoneskn.com
- Miami/Edgewater local references
- Strong hook opening
- Soft booking CTA at the end
- Remove any generic or weak language

OUTPUT FORMAT — return valid JSON only, no markdown, no backticks:
{
  "title": "Enhanced SEO title under 60 characters",
  "metaDescription": "Meta description under 155 characters",
  "content": "Full HTML content with <h2>, <p>, <ul>, <li> tags only",
  "excerpt": "2-3 sentence summary"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ============================================================
// PUBLISH A POST
// ============================================================
async function publishPost(topicData, isNew = true) {
  try {
    let generated;

    if (isNew) {
      generated = await generateBlogPost(topicData);
    } else {
      generated = await enhanceExistingPost(topicData);
    }

    const slug = slugify(generated.title);
    const cluster = topicData.cluster || 'wellness';

    // Try to generate AI image — fall back to Cloudinary pool if it fails
    let image = null;
    if (STABILITY_API_KEY) {
      image = await generateBlogImage(generated.title, cluster);
    }
    if (!image) {
      image = getPostImage(cluster);
      console.log('[IMAGE GEN] Using fallback Cloudinary image');
    }

    const post = {
      slug,
      title: generated.title,
      metaDescription: generated.metaDescription,
      content: generated.content,
      excerpt: generated.excerpt,
      topic: topicData.topic || topicData.title,
      cluster,
      keywords: topicData.keywords || [],
      image: image,
      date: new Date().toISOString().split('T')[0],
      published: true,
      enhanced: !isNew
    };

    savePost(post);
    console.log(`[BLOG AGENT] ✅ Published: ${post.title}`);
    return post;
  } catch (error) {
    console.error(`[BLOG AGENT] ❌ Error publishing post:`, error);
    throw error;
  }
}

// ============================================================
// SEED EXISTING POSTS (run once on startup if no posts exist)
// ============================================================
async function seedExistingPosts() {
  const existing = getAllPosts();
  if (existing.length > 0) {
    console.log(`[BLOG AGENT] ${existing.length} posts already exist. Skipping seed.`);
    return;
  }

  console.log('[BLOG AGENT] Seeding existing posts...');

  // Process one at a time to avoid rate limits
  for (const post of EXISTING_POSTS.slice(0, 3)) { // Start with first 3
    try {
      await publishPost(post, false);
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay between posts
    } catch (e) {
      console.error(`[BLOG AGENT] Failed to seed: ${post.title}`, e.message);
    }
  }
}

// ============================================================
// SCHEDULED AGENT — runs Mon, Wed, Fri
// ============================================================
function shouldRunToday() {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return [1, 3, 5].includes(day); // Monday, Wednesday, Friday
}

async function runScheduledAgent() {
  if (!shouldRunToday()) {
    console.log('[BLOG AGENT] Not a publishing day. Skipping.');
    return;
  }

  console.log('[BLOG AGENT] Publishing day — generating new post...');
  const topic = await getNextTopic();
  await publishPost(topic, true);
}

// ============================================================
// MANUAL TRIGGER — generate one post immediately
// ============================================================
async function generateNow(topicOverride = null) {
  const topic = topicOverride || await getNextTopic();
  return await publishPost(topic, true);
}

module.exports = { runScheduledAgent, generateNow, seedExistingPosts, publishPost };
