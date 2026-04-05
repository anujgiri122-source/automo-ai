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

const STYLE_META = {
  urgency:      { label: 'Urgency',      description: 'FOMO / Limited Time' },
  story:        { label: 'Story',        description: 'Emotional Storytelling' },
  festival:     { label: 'Festival',     description: 'Festival / Trend' },
  social_proof: { label: 'Social Proof', description: 'Reviews / Trust' },
  education:    { label: 'Education',    description: 'Tips / Expert' },
};

async function generateCaptionsForUI(businessType, topic) {
  const axios = require('axios');
  const baseUrl = process.env.AICREDITS_BASE_URL;
  const apiKey  = process.env.AICREDITS_API_KEY;

  if (!baseUrl || !apiKey) throw new Error('AICREDITS_BASE_URL or AICREDITS_API_KEY not set in .env');

  const prompt = `Business Type: ${businessType}
Topic / Post Idea: ${topic}

You are Automo AI — India's smartest social media content creator for local businesses.
Generate exactly 5 captions. For EACH caption provide BOTH a Hinglish version and an English version.
Include relevant emojis, a clear call-to-action, and 3-5 hashtags per caption.

Return ONLY this exact JSON array (no markdown, no extra text):
[
  {"style":"urgency","hinglish":"...","english":"...","hashtags":["#tag1","#tag2","#tag3"]},
  {"style":"story","hinglish":"...","english":"...","hashtags":["#tag1","#tag2","#tag3"]},
  {"style":"festival","hinglish":"...","english":"...","hashtags":["#tag1","#tag2","#tag3"]},
  {"style":"social_proof","hinglish":"...","english":"...","hashtags":["#tag1","#tag2","#tag3"]},
  {"style":"education","hinglish":"...","english":"...","hashtags":["#tag1","#tag2","#tag3"]}
]`;

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.8 },
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` } }
  );

  const raw = response.data.choices[0].message.content.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const clean = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  }

  return parsed.map(cap => ({
    ...cap,
    label:       STYLE_META[cap.style]?.label       || cap.style,
    description: STYLE_META[cap.style]?.description || '',
  }));
}

module.exports = { generateSmartCaptions, generateCaptionsForUI };
