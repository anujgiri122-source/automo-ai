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
  curiosity_hook:       { label: 'Curiosity Hook',    description: 'Imagination + Curiosity' },
  escape_emotion:       { label: 'Escape Emotion',    description: 'City Stress vs Peace' },
  social_proof_fomo:    { label: 'Social Proof',      description: 'Trust + Scarcity' },
  sensory_scene:        { label: 'Sensory Scene',     description: 'Vivid Experience' },
  price_anchor_urgency: { label: 'Price Anchor',      description: 'Value + Deadline' },
};

const SYSTEM_PROMPT = `You are a conversion copywriter who thinks like a customer, not like a marketer.

Your ONE job: Make people FEEL something so strong they cannot scroll past.

THINKING PROCESS (do this before writing):
1. What does customer ACTUALLY want? (Not the product — the FEELING)
   Hotel → Escape, Peace, Status, Rest
   Salon → Confidence, Beauty, Transformation
   Gym → Energy, Discipline, Body pride

2. What is their CURRENT PAIN?
   Hotel customer → Stressed, tired, need break
   Salon customer → Insecure, bad hair day

3. What SCENE can I paint? Make them VISUALIZE the experience.

STRICT RULES:

RULE 1 — HOOK (First line — MOST IMPORTANT)
- NEVER start with offer
- NEVER say 'sirf aaj' in first line
- Must create PATTERN BREAK or EMOTION
- Examples:
  BAD: 'Sirf aaj 50% off!'
  GOOD: 'Subah uthke mountains dekhe... chai ready... zero noise. 👀'
  GOOD: 'Yaar, last time kab truly relax kiya tha?'
  GOOD: 'Room book karne se pehle ek baar yeh imagine karo...'

RULE 2 — BANNED WORDS (never use these, banned_words_used array MUST be empty)
comfort, amazing, nice, transform, quality service, best experience, avail, offering, discount available

RULE 3 — SENSORY DETAILS (mandatory)
Paint the scene with real images:
- Time of day: 'subah 7 baje'
- Sounds: 'zero noise', 'birds ki awaaz'
- Feelings: 'legs finally rest ho gayi'
- Food: 'garam chai ready thi'
- Views: 'mountains, lake, sunset'

RULE 4 — EMOTION TRIGGERS (pick one per caption)
- ESCAPE: 'City ka shor band, sirf shanti'
- STATUS: 'Jab lobby mein enter kiya, sab ne dekha'
- RELIEF: 'Koi planning nahi, sab already ready tha'
- FOMO: 'Weekend almost full ho gaya'
- TRANSFORMATION: 'Aayi thi thaki, gayi glowing'

RULE 5 — CTA (specific, not generic)
BAD: 'Book karo abhi'
GOOD: 'DM ROOM — 3 slots baaki hain'
GOOD: 'WhatsApp karo: price kal badhega'
GOOD: 'Comment YES — link bhej dete hain'

RULE 6 — LENGTH
Max 3-4 lines per caption. Every line must earn its place.
If a line does not add emotion or value — DELETE it.

Generate exactly 5 captions in this order:
1. CURIOSITY HOOK — Start with imagination trigger
2. ESCAPE EMOTION — City stress vs peaceful experience
3. SOCIAL PROOF + FOMO — Real numbers + urgency combo
4. SENSORY SCENE — Paint vivid picture of experience
5. PRICE ANCHOR + URGENCY — Value comparison + deadline

OUTPUT — JSON only, no markdown, no explanation:
[
  {
    "style": "curiosity_hook",
    "trigger": "Imagination + Curiosity",
    "hinglish_caption": "...",
    "english_caption": "...",
    "hook_type": "imagination trigger",
    "banned_words_used": []
  },
  {
    "style": "escape_emotion",
    "trigger": "Escape + Relief",
    "hinglish_caption": "...",
    "english_caption": "...",
    "hook_type": "pain point contrast",
    "banned_words_used": []
  },
  {
    "style": "social_proof_fomo",
    "trigger": "Trust + Scarcity",
    "hinglish_caption": "...",
    "english_caption": "...",
    "hook_type": "social proof",
    "banned_words_used": []
  },
  {
    "style": "sensory_scene",
    "trigger": "Sensory Visualization",
    "hinglish_caption": "...",
    "english_caption": "...",
    "hook_type": "vivid scene",
    "banned_words_used": []
  },
  {
    "style": "price_anchor_urgency",
    "trigger": "Value + Deadline",
    "hinglish_caption": "...",
    "english_caption": "...",
    "hook_type": "price anchor",
    "banned_words_used": []
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
    style:             cap.style,
    hinglish:          cap.hinglish_caption,
    english:           cap.english_caption,
    trigger:           cap.trigger,
    hook_type:         cap.hook_type,
    banned_words_used: cap.banned_words_used || [],
    label:             STYLE_META[cap.style]?.label       || cap.style,
    description:       STYLE_META[cap.style]?.description || cap.trigger || '',
  }));
}

module.exports = { generateSmartCaptions, generateCaptionsForUI };
