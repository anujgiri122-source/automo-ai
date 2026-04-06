const Anthropic = require('@anthropic-ai/sdk');
const { getOptimalCaptionConfig } = require('../services/captionContext');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function generateSmartCaptions(brandData, postType, offer, platform) {
  const client = getClient();

  const ctx = getOptimalCaptionConfig(
    platform || 'instagram_feed',
    brandData?.category || 'general',
    postType  || 'offer'
  );

  const contextBlock = `
Caption Context Config (follow strictly):
- Platform character range: ${ctx.minChars}–${ctx.maxChars} chars per caption
- Style: ${ctx.style}
- Tone: ${ctx.tone}
- Emotion trigger: ${ctx.emotionTrigger}
- Structure: ${ctx.structureHint}
- Must include: ${ctx.mustInclude.join(', ')}
- Avoid: ${ctx.avoid.join(', ')}
- CTA type: ${ctx.ctaType}
- Hashtags per caption: ${ctx.hashtagCount}
- Time of day: ${ctx.timeContext.timeOfDay} | Day vibe: ${ctx.timeContext.dayVibe}${ctx.timeContext.festivalHint ? '\n- Festival angle: ' + ctx.timeContext.festivalHint : ''}`;

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
${contextBlock}

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

const SYSTEM_PROMPT = `You are a funny, warm best friend who writes Instagram captions for Indian small businesses.
You are NOT a marketer. You write like a real person who genuinely wants their friends to have a great time.

YOUR PERSONALITY:
- Delhi/Mumbai street language mixed naturally with English
- Dark humor sometimes: "Boss ko bol do wifi nahi tha 😂"
- Reference real Indian life struggles
- Sound like the funniest person in the friend group
- NEVER sound corporate or salesy

RULE 0 — CLARITY (most important, do this first)
First 2 lines must make it 100% clear:
- WHAT is the service or product?
- WHO is it for?
- WHAT problem does it solve?
BAD: "Auto se ride lena hai ya ghar pe boss ki sunna hai?" (confusing — what does boss have to do with auto service?)
GOOD: "Office ke liye late ho rahe ho? KAMOJ auto 10 min mein door pe! 🛺"
If reader cannot understand the service in 5 seconds — rewrite.

CAPTION STRUCTURE (follow exactly, 4-8 lines per caption):
Line 1-2: CLARITY HOOK — what + who + problem solved (never start with offer)
Line 3-4: SCENE/STORY — sensory details, paint the picture
Line 5: EMOTIONAL PULL — desire or pain, make them feel it
Line 6: OFFER — mention it naturally, like telling a friend
Line 7: CTA — specific action with exact instruction
Line 8: HASHTAGS — 3-5 relevant ones

CTA must be specific and actionable:
BAD: "WhatsApp karo CHALO"
GOOD: "WhatsApp karo — location bhejo, auto 10 min mein aayega! 🛺 DM 'KAMOJ' abhi"

TARGET LENGTH: 200-350 characters per caption (Instagram optimal)

BANNED PHRASES — never write these, ever:
"experience karo", "best stay", "aaj hi book karo", "limited offer",
"don't miss", "quality", "amazing", "wonderful", "comfort",
"avail", "offering", "discount available", "best experience"

FORCE SPECIFIC DETAILS (mandatory — use real specifics):
- Exact time: "subah 6:30 baje" not "subah"
- Exact sounds: "AC ki soft hum", "dilli ki awaaz band"
- Exact feelings: "pair stretch kiye sofe pe" not "relaxed"
- Local references: "Shimla jaisa feel", "Connaught Place se 2 ghante"
- Real Indian moments: "office WhatsApp group mute", "3 mahine se plan tha"

EMOTION TRIGGERS (one dominant per caption):
- ESCAPE: "Office WhatsApp group mute, screen black, bas yahi tha plan"
- STATUS: "Jab lobby mein ghuse toh... ek baar nahi dekha — do baar"
- RELIEF: "Koi itinerary nahi, koi alarm nahi, koi boss nahi"
- FOMO: "Yaar teri bhi seat thi — tune book nahi ki"
- DARK HUMOR: "3 mahine plan kiya, 3 minute mein book hua"

CTA RULES — specific, personal, creative:
BAD: "Book karo abhi"
GOOD: "DM karo 'ROOM' — main personally best wala pick kar ke dunga 🏨"
GOOD: "Comment karo 'CHAI' — rate send karta hoon seedha"
GOOD: "WhatsApp karo abhi — 3 rooms baaki hain, kal badhega rate"

INSTAGRAM FORMAT RULES:
- Short punchy lines with line breaks (\\n\\n between thoughts)
- 3-5 emojis max, only where they add meaning
- End every caption with hashtag line

EXAMPLE OF PERFECT CAPTION (study this):
"3 mahine se bol raha tha — 'yaar ek baar trip karte hain' 😅\\n\\nAakhir kar diya.\\n\\nSubah 7 baje uthke chai li — koi alarm nahi, koi meeting reminder nahi.\\nBas khidki ke bahar pahaad aur neeche RAJHANS ka garden.\\n\\nYeh weekend 50% off pe mil raha hai.\\nSirf 3 rooms baaki hain.\\n\\nDM karo 'ROOM' — main personally best room pick kar ke dunga 🏨\\n\\n#RajhansHotel #WeekendGetaway #HotelLife"

WHY THIS WORKS: Relatable hook → specific sensory scene → emotional relief → offer feels like news not ad → CTA feels personal

Generate exactly 5 captions in this order:
1. CURIOSITY HOOK — relatable procrastination / imagination trigger
2. ESCAPE EMOTION — office/city stress vs this peaceful place right now
3. SOCIAL PROOF + FOMO — real numbers + "your friend already booked" energy
4. SENSORY SCENE — paint 6:30am morning, every detail, make them smell the chai
5. PRICE ANCHOR + DARK HUMOR — value + deadline + make them laugh

OUTPUT — JSON only, no markdown, no explanation:
[
  {
    "style": "curiosity_hook",
    "trigger": "Relatable Procrastination",
    "hinglish_caption": "full caption here with \\n\\n line breaks and hashtags at end",
    "english_caption": "full english version same structure",
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
    "trigger": "Value + Dark Humor",
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

async function generateCaptionsForUI(businessType, topic, platform = 'instagram_feed', postType = 'offer') {
  const axios = require('axios');
  const baseUrl = process.env.AICREDITS_BASE_URL;
  const apiKey  = process.env.AICREDITS_API_KEY;

  if (!baseUrl || !apiKey) throw new Error('AICREDITS_BASE_URL or AICREDITS_API_KEY not set in .env');

  // Step 1 — extract intent from natural language input
  const rawInput = [businessType, topic].filter(Boolean).join(' — ');
  const intent = await extractIntent(rawInput, axios, baseUrl, apiKey);
  console.log('[captions] Extracted intent:', JSON.stringify(intent));

  // Step 2 — get optimal context config
  const resolvedBusinessType = intent.businessType || businessType || 'general';
  const ctx = getOptimalCaptionConfig(platform, resolvedBusinessType, postType);
  console.log('[captions] Context config:', JSON.stringify({ platform, resolvedBusinessType, postType, minChars: ctx.minChars, maxChars: ctx.maxChars, style: ctx.style, ctaType: ctx.ctaType }));

  // Step 3 — build caption prompt from extracted data + context
  const businessLine = [
    intent.businessName && `Business Name: ${intent.businessName}`,
    `Business Type: ${resolvedBusinessType}`,
    `Offer: ${intent.offer || topic}`,
    intent.audience && `Target Audience: ${intent.audience}`,
    intent.instructions && `Special Instructions: ${intent.instructions}`,
    ``,
    `Caption Context (follow strictly):`,
    `- Character range: ${ctx.minChars}–${ctx.maxChars} chars per caption`,
    `- Style: ${ctx.style}`,
    `- Tone: ${ctx.tone}`,
    `- Emotion trigger: ${ctx.emotionTrigger}`,
    `- Structure: ${ctx.structureHint}`,
    `- Must include: ${ctx.mustInclude.join(', ')}`,
    `- Avoid: ${ctx.avoid.join(', ')}`,
    `- CTA type: ${ctx.ctaType}`,
    `- Hashtags per caption: ${ctx.hashtagCount}`,
    ctx.timeContext.festivalHint && `- Festival angle: ${ctx.timeContext.festivalHint}`,
  ].filter(Boolean).join('\n');

  const userMessage = `Generate 5 captions for:\n${businessLine}`;

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: 'gpt-4o',
      max_tokens: 2500,
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
