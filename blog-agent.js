// ============================================================
// UNDERTONE SKN — BLOG AGENT
// Generates SEO blog posts via Claude API and publishes them
// Runs automatically 3x per week (Mon, Wed, Fri)
// ============================================================

const fetch = require('node-fetch');
const { getNextTopic, savePost, slugify, getAllPosts, EXISTING_POSTS } = require('./blog-engine');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ============================================================
// GENERATE A NEW BLOG POST
// ============================================================
async function generateBlogPost(topicData) {
  console.log(`[BLOG AGENT] Generating post: ${topicData.topic}`);

  const prompt = `You are writing a blog post for Undertone SKN, a somatic facial studio in Edgewater Miami run by Zinthia Garcia. 

Zinthia's voice: warm, direct, science-informed, never generic. She treats the face as a signal of the nervous system — not a surface. She works on jaw tension release, fascia release, and nervous system regulation. Her brand is called "functional beauty."

Write a complete, SEO-optimized blog post on this topic: "${topicData.topic}"

Target keywords to include naturally: ${topicData.keywords.join(', ')}

REQUIREMENTS:
- 800-1200 words
- Write in Zinthia's voice — first person where appropriate
- Include at least 2 real citations from PubMed, scientific journals, or credible experts
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
  "content": "Full HTML content with <h2>, <p>, <ul>, <li> tags only. No divs. Include real citation links as <a href='URL' target='_blank' rel='noopener'>Author, Year</a>",
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
    const post = {
      slug,
      title: generated.title,
      metaDescription: generated.metaDescription,
      content: generated.content,
      excerpt: generated.excerpt,
      topic: topicData.topic || topicData.title,
      cluster: topicData.cluster || 'wellness',
      keywords: topicData.keywords || [],
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
  const topic = getNextTopic();
  await publishPost(topic, true);
}

// ============================================================
// MANUAL TRIGGER — generate one post immediately
// ============================================================
async function generateNow(topicOverride = null) {
  const topic = topicOverride || getNextTopic();
  return await publishPost(topic, true);
}

module.exports = { runScheduledAgent, generateNow, seedExistingPosts, publishPost };
