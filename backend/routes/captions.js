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
  urgency:        { label: 'Urgency',        description: 'FOMO / Scarcity' },
  transformation: { label: 'Transformation', description: 'Before/After Emotion' },
  price_anchor:   { label: 'Price Anchor',   description: 'Value + Savings' },
  social_proof:   { label: 'Social Proof',   description: 'Trust + Community' },
  curiosity:      { label: 'Curiosity',      description: 'Mystery + Exclusivity' },
};

const SYSTEM_PROMPT = `You are India's #1 conversion copywriter for small businesses. You write captions that make people STOP scrolling and TAKE ACTION immediately.

You know these psychological triggers work in India:
- Scarcity makes people 2-3x more likely to book
- Hinglish gets 79% higher engagement than English
- Specific offers convert 5x better than vague ones
- Pain points in first line = instant stop scroll
- WhatsApp CTA gets 4x more responses than 'link in bio'

STRICT CAPTION RULES:
1. First line = HOOK (pain point or curiosity)
   GOOD: 'Arre yaar, bad hair day phir se? 😤'
   BAD: 'Get 50% off at our salon'

2. Middle = VALUE (specific offer + social proof)
   GOOD: '500+ clients ki favorite keratin treatment, aaj sirf ₹999 mein!'
   BAD: 'We offer quality services at discount'

3. Last line = CTA (WhatsApp/DM trigger)
   GOOD: 'DM HAIR abhi — sirf 5 slots baaki!'
   BAD: 'Contact us for more info'

4. Language rules:
   - Mix Hindi + English naturally
   - Use: yaar, abhi, kar lo, arre, bhai, sirf, bahut, ekdum
   - Feel like best friend giving advice
   - NEVER sound like advertisement

5. Emotion triggers to use:
   - FOMO: 'Sirf aaj', 'Last 3 slots'
   - Social proof: '500+ happy clients'
   - Transformation: before/after story
   - Price anchor: 'Usually ₹2000, aaj ₹999'
   - Urgency: 'Offer ends tonight'

OUTPUT FORMAT — JSON only, no explanation:
[
  {
    "style": "urgency",
    "trigger": "FOMO + Scarcity",
    "hinglish_caption": "...",
    "english_caption": "...",
    "expected_action": "Will DM within 5 mins"
  },
  {
    "style": "transformation",
    "trigger": "Before/After Emotion",
    "hinglish_caption": "...",
    "english_caption": "...",
    "expected_action": "..."
  },
  {
    "style": "price_anchor",
    "trigger": "Value + Savings",
    "hinglish_caption": "...",
    "english_caption": "...",
    "expected_action": "..."
  },
  {
    "style": "social_proof",
    "trigger": "Trust + Community",
    "hinglish_caption": "...",
    "english_caption": "...",
    "expected_action": "..."
  },
  {
    "style": "curiosity",
    "trigger": "Mystery + Exclusivity",
    "hinglish_caption": "...",
    "english_caption": "...",
    "expected_action": "..."
  }
]`;

async function extractIntent(rawInput, axios, baseUrl, apiKey) {
  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Extract structured info from this message. The user is an Indian small business owner.

Message: "${rawInput}"

Return ONLY this JSON (no explanation, no markdown):
{
  "businessName": "extracted name or null",
  "businessType": "extracted type (e.g. hotel, salon, gym, cafe) or null",
  "offer": "the offer or discount or topic being promoted",
  "audience": "target audience if mentioned, else null",
  "instructions": "any special instructions or tone preferences, else null"
}`,
      }],
      temperature: 0.3,
    },
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` } }
  );

  const raw = response.data.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }
}

async function generateCaptionsForUI(businessType, topic) {
  const axios = require('axios');
  const baseUrl = process.env.AICREDITS_BASE_URL;
  const apiKey  = process.env.AICREDITS_API_KEY;

  if (!baseUrl || !apiKey) throw new Error('AICREDITS_BASE_URL or AICREDITS_API_KEY not set in .env');

  // Step 1 — extract intent from natural language input
  const rawInput = [businessType, topic].filter(Boolean).join(' — ');
  const intent = await extractIntent(rawInput, axios, baseUrl, apiKey);
  console.log('[captions] Extracted intent:', JSON.stringify(intent));

  // Step 2 — build caption prompt from extracted data
  const businessLine = [
    intent.businessName && `Business Name: ${intent.businessName}`,
    `Business Type: ${intent.businessType || businessType || 'general'}`,
    `Offer: ${intent.offer || topic}`,
    intent.audience && `Target Audience: ${intent.audience}`,
    intent.instructions && `Special Instructions: ${intent.instructions}`,
  ].filter(Boolean).join('\n');

  const userMessage = `Generate 5 captions for:\n${businessLine}`;

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.85,
    },
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

  // Remap to frontend shape: hinglish/english fields + label/description
  return parsed.map(cap => ({
    style:           cap.style,
    hinglish:        cap.hinglish_caption,
    english:         cap.english_caption,
    trigger:         cap.trigger,
    expected_action: cap.expected_action,
    label:           STYLE_META[cap.style]?.label       || cap.style,
    description:     STYLE_META[cap.style]?.description || cap.trigger || '',
  }));
}

module.exports = { generateSmartCaptions, generateCaptionsForUI };
