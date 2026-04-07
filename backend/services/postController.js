/**
 * postController.js — Master Controller (Brain of Automo AI)
 *
 * Receives any owner message → detects intent → loads rules →
 * generates caption + image prompt → returns complete post package.
 *
 * Usage:
 *   const { processOwnerRequest } = require('./postController');
 *   const result = await processOwnerRequest(message, businessInfo);
 */

const POST_TYPES = require('../data/postTypes.json');
const { getOptimalCaptionConfig } = require('./captionContext');

const MODEL = 'gpt-4o-mini';

// ─── AiCredits API helper ─────────────────────────────────────────────────────

async function callAiCredits(messages, maxTokens = 512) {
  const url = process.env.AICREDITS_BASE_URL + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AICREDITS_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AiCredits API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ─── Step 1: Intent Detection ─────────────────────────────────────────────────

async function detectIntent(ownerMessage, businessInfo) {
  const prompt = `Analyze this message from an Indian small business owner and extract:

1. post_type: (from this list: offer_discount, flash_sale, festival_post, educational_tips,
   testimonial, before_after, product_launch, giveaway, meme_entertainment, local_targeting,
   announcement, brand_story, seasonal_promo, how_it_works, behind_the_scenes, team_spotlight,
   poll_question, restock_alert, collaboration, referral_program)

2. format: (single/carousel/story/reel_cover)

3. slide_count: (if carousel, how many slides; else null)

4. urgency_level: (high/medium/low)

5. language_preference: (hinglish/hindi/english)

6. key_details: (offer%, dates, prices, service names mentioned — as an object)

7. confidence: (0-100, how sure are you)

Message: "${ownerMessage}"
Business: "${businessInfo.businessType || 'general'}" — "${businessInfo.businessName || 'Business'}"

Return JSON only. No explanation. No markdown. Pure JSON object.`;

  const raw = await callAiCredits([{ role: 'user', content: prompt }], 512);
  // Strip markdown code fences if Claude adds them
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  let intent;
  try {
    intent = JSON.parse(jsonStr);
  } catch {
    // Fallback: parse what we can
    intent = {
      post_type: 'offer_discount',
      format: 'single',
      slide_count: null,
      urgency_level: 'medium',
      language_preference: 'hinglish',
      key_details: {},
      confidence: 50,
    };
  }

  // Validate post_type exists in our data
  if (!POST_TYPES.post_types[intent.post_type]) {
    intent.post_type = 'offer_discount';
  }

  return intent;
}

// ─── Step 3: Caption Generation ───────────────────────────────────────────────

async function generateCaption(ownerMessage, businessInfo, captionConfig, intent) {
  const triggers = captionConfig.hinglishTriggers.slice(0, 3).join(', ');
  const mustInclude = captionConfig.mustInclude.join('; ');
  const avoid = captionConfig.avoid.join('; ');
  const keyDetails = JSON.stringify(intent.key_details || {});

  const prompt = `You are an expert Indian social media copywriter.

Write ONE perfect caption for this post.

Business: ${businessInfo.businessName || 'Business'} (${businessInfo.businessType || 'general'})
Owner's message: "${ownerMessage}"
Post type: ${captionConfig.postTypeName}
Format: ${intent.format}
Language: ${intent.language_preference || 'hinglish'}

Rules:
- Characters: ${captionConfig.minChars}–${captionConfig.maxChars} chars
- Style: ${captionConfig.style}
- Tone: ${captionConfig.tone}
- Hook type: ${captionConfig.emotionTrigger}
- Must include: ${mustInclude}
- Avoid: ${avoid}
- CTA type: ${captionConfig.ctaType}
- Hinglish trigger phrases to draw from: ${triggers}
- Key details from owner: ${keyDetails}

Return only the caption text. No quotes. No explanation.`;

  return callAiCredits([{ role: 'user', content: prompt }], 400);
}

// ─── Step 4: Image Prompt Builder ─────────────────────────────────────────────

function buildImagePrompt(intent, postTypeRules, brandKit, captionConfig) {
  const primaryColor   = brandKit?.primary_color   || '#FF6B35';
  const secondaryColor = brandKit?.secondary_color || '#FFD700';
  const businessName   = brandKit?.business_name   || 'Business';
  const formatData     = POST_TYPES.formats[intent.format] || POST_TYPES.formats.single;

  const keyDetailsStr = Object.entries(intent.key_details || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ') || 'none specified';

  return [
    `Create a ${intent.format} social media image (${formatData.dimensions}, ${formatData.ratio} ratio).`,
    `Business: ${businessName} — ${postTypeRules.category} post, intent: ${postTypeRules.intent}.`,
    `Design mood: ${captionConfig.style}, tone: ${captionConfig.tone.split(' | ')[0]}.`,
    `Color palette: primary ${primaryColor}, secondary ${secondaryColor}. Use brand colors prominently.`,
    `Key details to show: ${keyDetailsStr}.`,
    `Design tip: ${formatData.design_tip}.`,
    `Post type visual style: ${postTypeRules.name} — emphasise ${postTypeRules.intent.replace(/_/g, ' ')}.`,
    `Text overlay: keep minimal. Max ${formatData.max_text_lines || 3} lines. High contrast, readable.`,
    `Urgency level: ${intent.urgency_level}. ${intent.urgency_level === 'high' ? 'Use bold typography and strong contrast.' : 'Clean and professional layout.'}`,
    `Target: Indian small business audience. Style: modern, vibrant, scroll-stopping.`,
  ].join(' ');
}

// ─── Carousel Slide Builder ───────────────────────────────────────────────────

function buildSlideContents(postTypeRules, intent) {
  const structure = postTypeRules.carousel_structure;
  if (!structure) return null;

  const slideCount = intent.slide_count || Object.keys(structure).length;
  const slides = [];
  const keys = Object.keys(structure);

  for (let i = 0; i < Math.min(slideCount, keys.length); i++) {
    const key = keys[i];
    slides.push({
      slide: i + 1,
      purpose: structure[key],
      key_details: i === 0
        ? intent.key_details
        : {},
    });
  }

  return slides;
}

// ─── Hashtag Generator ────────────────────────────────────────────────────────

function generateHashtags(intent, businessInfo, captionConfig) {
  const businessType = (businessInfo.businessType || 'general').toLowerCase();
  const postType     = intent.post_type.replace(/_/g, '');
  const businessName = (businessInfo.businessName || '').replace(/\s+/g, '').toLowerCase();

  const base = [
    `#${postType}`,
    `#${businessType}`,
    `#indianbusiness`,
    `#smallbusiness`,
    `#india`,
  ];

  const byType = {
    offer_discount:    ['#offer', '#discount', '#sale'],
    flash_sale:        ['#flashsale', '#limitedoffer', '#hurryup'],
    festival_post:     ['#festival', '#celebration', '#tyohaar'],
    educational_tips:  ['#tips', '#didyouknow', '#learn'],
    testimonial:       ['#review', '#customerreview', '#trustus'],
    before_after:      ['#transformation', '#beforeafter', '#results'],
    product_launch:    ['#newlaunch', '#newproduct', '#introducing'],
    giveaway:          ['#giveaway', '#contest', '#win'],
    meme_entertainment:['#meme', '#relatable', '#funnypost'],
    local_targeting:   ['#local', '#nearme', '#supportlocal'],
    announcement:      ['#announcement', '#news', '#exciting'],
    brand_story:       ['#ourstory', '#brandstory', '#whywestarted'],
    seasonal_promo:    ['#seasonal', '#specialoffer', '#limitedtime'],
    how_it_works:      ['#howitworks', '#explained', '#stepbystep'],
    behind_the_scenes: ['#bts', '#behindthescenes', '#reallife'],
    team_spotlight:    ['#team', '#meettheteam', '#ourpeople'],
    poll_question:     ['#poll', '#question', '#letusvote'],
    restock_alert:     ['#restock', '#backInstock', '#dontwait'],
    collaboration:     ['#collab', '#partnership', '#together'],
    referral_program:  ['#referral', '#referandearn', '#shareandearn'],
  };

  const specific = byType[intent.post_type] || [];
  const all = [...base, ...specific];

  if (businessName) all.push(`#${businessName}`);

  // Dedupe and limit to captionConfig.hashtagCount (or 5)
  const limit = captionConfig.hashtagCount || 5;
  return [...new Set(all)].slice(0, limit);
}

// ─── Main Export: processOwnerRequest ─────────────────────────────────────────

/**
 * @param {string} message      - Raw WhatsApp message from business owner
 * @param {object} businessInfo - { businessName, businessType, platform, brandKit }
 *   brandKit: { primary_color, secondary_color, business_name, ... }
 * @returns {object} Complete post package
 */
async function processOwnerRequest(message, businessInfo = {}) {
  console.log('[PostController] Processing:', message);

  // Step 1 — Detect intent
  const intent = await detectIntent(message, businessInfo);
  console.log('[PostController] Detected intent:', JSON.stringify(intent));

  // Step 2 — Load post type rules
  const postTypeRules = POST_TYPES.post_types[intent.post_type];

  // Determine best format: prefer intent's format, validate against postType best_formats
  const detectedFormat = intent.format || 'single';
  const format = postTypeRules.best_formats.includes(detectedFormat)
    ? detectedFormat
    : postTypeRules.best_formats[0];

  // Step 3 — Get caption config + generate caption
  const platform = businessInfo.platform || 'instagram';
  const captionConfig = getOptimalCaptionConfig(
    platform,
    businessInfo.businessType || 'general',
    intent.post_type,
    format,
  );

  const caption = await generateCaption(message, businessInfo, captionConfig, intent);
  console.log('[PostController] Caption generated, length:', caption.length);

  // Step 4 — Build image prompt
  const imagePrompt = buildImagePrompt(intent, postTypeRules, businessInfo.brandKit, captionConfig);

  // Carousel slides (if applicable)
  const slideContents = format === 'carousel'
    ? buildSlideContents(postTypeRules, intent)
    : null;

  // Best posting time from platform data
  const platformData   = POST_TYPES.platforms[platform] || POST_TYPES.platforms.instagram;
  const bestPostingTime = platformData.best_post_times[0];

  // Suggested hashtags
  const suggestedHashtags = generateHashtags(intent, businessInfo, captionConfig);

  return {
    detected_post_type:  intent.post_type,
    post_type_name:      postTypeRules.name,
    format,
    urgency_level:       intent.urgency_level,
    language_preference: intent.language_preference,
    confidence:          intent.confidence,
    key_details:         intent.key_details,
    caption,
    image_prompt:        imagePrompt,
    slide_contents:      slideContents,
    best_posting_time:   bestPostingTime,
    suggested_hashtags:  suggestedHashtags,
  };
}

module.exports = { processOwnerRequest };

// ─── Self-test ────────────────────────────────────────────────────────────────

if (require.main === module) {
  require('dotenv').config();
  const testBusinessInfo = {
    businessName: 'Style Studio',
    businessType: 'salon',
    platform: 'instagram',
    brandKit: {
      business_name:   'Style Studio',
      primary_color:   '#FF6B9D',
      secondary_color: '#FFD700',
    },
  };

  const testMessages = [
    'Aaj Sunday special 50% off on haircut',
    'Diwali ke liye post banana hai',
    'Hair care tips carousel chahiye',
    'New service launch - keratin treatment',
  ];

  (async () => {
    for (const msg of testMessages) {
      console.log('\n' + '═'.repeat(70));
      console.log('INPUT:', msg);
      console.log('═'.repeat(70));
      try {
        const result = await processOwnerRequest(msg, testBusinessInfo);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error('ERROR:', err.message);
      }
    }
  })();
}
