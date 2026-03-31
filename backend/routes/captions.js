const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function generateSmartCaptions(brandData, postType, offer, platform) {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are Automo AI — India's smartest social media content creator for local businesses.
You deeply understand Indian culture, festivals, and the language of small business owners.
Always include relevant emojis, a clear call-to-action, and 3-5 hashtags per caption.
Return ONLY a valid JSON array — no markdown, no extra text, nothing before or after the array.`,
    messages: [{
      role: 'user',
      content: `Brand: ${brandData?.name || 'My Business'}
Business Type: ${brandData?.category || 'general'}
Platform: ${platform || 'instagram'}
Post Type: ${postType || 'offer'}
Offer/Info: ${offer}
Brand Vibe: ${brandData?.mood || 'professional and friendly'}

Generate exactly 5 captions:
- Caption 1 (urgency)      — Hinglish: FOMO / limited time / act now
- Caption 2 (story)        — Hinglish: emotional storytelling / customer journey
- Caption 3 (festival)     — Hinglish: tie to Indian festival, season, or trend
- Caption 4 (social_proof) — English: reviews / numbers / trust signals
- Caption 5 (education)    — English: tips / facts / expert positioning

Return this exact JSON array:
[
  { "style": "urgency",      "language": "hinglish", "text": "...", "hashtags": ["...", "...", "..."] },
  { "style": "story",        "language": "hinglish", "text": "...", "hashtags": ["...", "...", "..."] },
  { "style": "festival",     "language": "hinglish", "text": "...", "hashtags": ["...", "...", "..."] },
  { "style": "social_proof", "language": "english",  "text": "...", "hashtags": ["...", "...", "..."] },
  { "style": "education",    "language": "english",  "text": "...", "hashtags": ["...", "...", "..."] }
]`
    }]
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }
}

module.exports = { generateSmartCaptions };
