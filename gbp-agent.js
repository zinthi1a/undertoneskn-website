// ============================================================
// UNDERTONE SKN — GOOGLE BUSINESS PROFILE AGENT
// Generates weekly GBP post content from latest blog post
// Semi-automated — content ready to copy-paste in 30 seconds
// ============================================================

const fetch = require('node-fetch');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ============================================================
// GENERATE GBP POST FROM BLOG POST
// ============================================================
async function generateGBPPost(blogPost) {
  console.log(`[GBP AGENT] Generating Google Business Profile post for: ${blogPost.title}`);

  const prompt = `You are writing a Google Business Profile post for Undertone SKN, a somatic facial studio in Edgewater Miami run by Zinthia Garcia.

The latest blog post is titled: "${blogPost.title}"
Blog post excerpt: "${blogPost.excerpt}"
Blog post URL: "https://www.undertoneskn.com/blog/${blogPost.slug}"

Write a Google Business Profile post that:
- Is 150-250 words max
- Starts with a strong hook — a question or bold statement that stops the scroll
- Written in Zinthia's warm, direct voice
- Educates briefly on the topic from the blog post
- Ends with a soft CTA to book or read the full article
- Feels personal, not corporate
- Includes relevant local Miami/Edgewater reference naturally
- NO hashtags — Google Business Profile doesn't use them effectively

Also generate:
- A short "What's new" headline (max 58 characters)
- A button label (choose one: "Book" / "Learn more" / "Sign up")
- Button URL (use booking URL if CTA is Book, blog URL if Learn more)

OUTPUT FORMAT — return valid JSON only, no markdown, no backticks:
{
  "headline": "Short headline under 58 characters",
  "body": "Full post text 150-250 words",
  "buttonLabel": "Book" or "Learn more",
  "buttonUrl": "https://undertoneskn.as.me/schedule/80fd8a11 or blog URL",
  "imageNote": "Which image to use — AI generated from blog or specific studio photo"
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
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ============================================================
// GET THIS WEEK'S GBP POST
// ============================================================
async function getWeeklyGBPPost(latestPost) {
  try {
    const gbpContent = await generateGBPPost(latestPost);
    return {
      ...gbpContent,
      image: latestPost.image,
      blogTitle: latestPost.title,
      blogUrl: `https://www.undertoneskn.com/blog/${latestPost.slug}`,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[GBP AGENT] Error generating post:', error.message);
    throw error;
  }
}

module.exports = { getWeeklyGBPPost };
