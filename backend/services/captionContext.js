// Caption Context Engine
// Merges platform + format + business type + post type + time into one config object
// that drives Claude caption generation.

const POST_TYPES = require('../data/postTypes.json');

// ─── Platform × Format → character limits ────────────────────────────────────
const PLATFORM_FORMAT_RULES = {
  instagram_feed:    { minChars: 138, maxChars: 150, hashtagCount: 5 },
  instagram_carousel:{ minChars: 138, maxChars: 150, hashtagCount: 5 },
  instagram_reel:    { minChars: 80,  maxChars: 100, hashtagCount: 4 },
  instagram_story:   { minChars: 50,  maxChars: 70,  hashtagCount: 2 },
  instagram_single:  { minChars: 138, maxChars: 150, hashtagCount: 5 },
  facebook:          { minChars: 200, maxChars: 300, hashtagCount: 3 },
  facebook_carousel: { minChars: 200, maxChars: 300, hashtagCount: 3 },
  facebook_single:   { minChars: 200, maxChars: 300, hashtagCount: 3 },
  facebook_story:    { minChars: 100, maxChars: 160, hashtagCount: 2 },
  whatsapp_status:   { minChars: 100, maxChars: 120, hashtagCount: 0 },
  whatsapp_story:    { minChars: 100, maxChars: 120, hashtagCount: 0 },
  whatsapp_single:   { minChars: 100, maxChars: 120, hashtagCount: 0 },
  twitter:           { minChars: 240, maxChars: 260, hashtagCount: 2 },
  twitter_x:         { minChars: 240, maxChars: 260, hashtagCount: 2 },
};

// ─── Business type → creative rules ──────────────────────────────────────────
const BUSINESS_RULES = {
  salon: {
    style: 'emotional_transformation',
    tone: 'warm_aspirational',
    mustInclude: ['before/after feel', 'sensory detail (touch/smell)', 'confidence outcome'],
    avoid: ['price first', 'generic beauty words'],
    ctaType: 'book_slot',
  },
  gym: {
    style: 'energy_motivation',
    tone: 'hype_friendly',
    mustInclude: ['physical challenge', 'community feel', 'result/goal'],
    avoid: ['medical claims', 'body shaming language'],
    ctaType: 'join_trial',
  },
  cafe: {
    style: 'sensory_food',
    tone: 'cozy_inviting',
    mustInclude: ['taste/aroma description', 'time-of-day scene', 'hangout vibe'],
    avoid: ['corporate language', 'vague "best" claims'],
    ctaType: 'visit_now',
  },
  hotel: {
    style: 'escape_luxury',
    tone: 'calm_aspirational',
    mustInclude: ['escape from routine', 'specific sensory scene', 'peace/rest outcome'],
    avoid: ['amenities list', 'generic "comfort" word'],
    ctaType: 'book_room',
  },
  retail: {
    style: 'offer_urgency',
    tone: 'excited_friendly',
    mustInclude: ['price anchor', 'scarcity signal', 'specific product detail'],
    avoid: ['vague discounts', 'filler superlatives'],
    ctaType: 'shop_now',
  },
  doctor: {
    style: 'trust_professional',
    tone: 'calm_authoritative',
    mustInclude: ['patient outcome', 'expertise signal', 'reassurance'],
    avoid: ['fear-based language', 'unverified claims'],
    ctaType: 'book_consultation',
  },
  coaching: {
    style: 'aspiration_result',
    tone: 'encouraging_relatable',
    mustInclude: ['student result/story', 'specific subject/skill', 'parent/student relief'],
    avoid: ['rank-shaming', 'pressure language'],
    ctaType: 'enroll_free_demo',
  },
  general: {
    style: 'offer_story',
    tone: 'friendly_hinglish',
    mustInclude: ['clear service description', 'one benefit', 'simple CTA'],
    avoid: ['jargon', 'overly formal language'],
    ctaType: 'contact_now',
  },
};

// Normalise business type string → BUSINESS_RULES key
const BUSINESS_ALIASES = {
  hair_beauty_salon: 'salon',
  beauty_salon:      'salon',
  fitness:           'gym',
  fitness_centre:    'gym',
  restaurant:        'cafe',
  food:              'cafe',
  homestay:          'hotel',
  shop:              'retail',
  saree_shop:        'retail',
  bike_shop:         'retail',
  clothing:          'retail',
  health:            'doctor',
  clinic:            'doctor',
  tuition:           'coaching',
  school:            'coaching',
};

// Fallback mapping for old postType keys → new postTypes.json keys
const POST_TYPE_ALIASES = {
  offer:       'offer_discount',
  discount:    'offer_discount',
  new_launch:  'product_launch',
  launch:      'product_launch',
  event:       'announcement',
  daily_post:  'behind_the_scenes',
  review:      'testimonial',
  motivation:  'educational_tips',
  tips:        'educational_tips',
  meme:        'meme_entertainment',
  bts:         'behind_the_scenes',
  collab:      'collaboration',
  referral:    'referral_program',
};

// ─── Time context ─────────────────────────────────────────────────────────────
function getTimeContext(now = new Date()) {
  const hour  = now.getHours();
  const day   = now.getDay();
  const month = now.getMonth();

  const timeOfDay = hour < 11 ? 'morning' : hour < 15 ? 'afternoon' : hour < 19 ? 'evening' : 'night';

  const dayContext = {
    0: { vibe: 'sunday_relaxed',   hint: 'Sunday laziness → fun treat, self-care energy' },
    1: { vibe: 'monday_hustle',    hint: 'Monday motivation → new week, fresh start, conquer energy' },
    2: { vibe: 'midweek_steady',   hint: 'Tuesday steady grind — relatable mid-week content' },
    3: { vibe: 'hump_day',         hint: 'Wednesday — halfway there, small reward energy' },
    4: { vibe: 'thursday_almost',  hint: 'Thursday anticipation — weekend is almost here' },
    5: { vibe: 'friday_vibe',      hint: 'Friday celebration — weekend plans, treat yourself energy' },
    6: { vibe: 'saturday_outing',  hint: 'Saturday outing — family plans, go out energy' },
  }[day];

  let festivalHint = null;
  if (month === 9  || month === 10) festivalHint = 'Navratri/Diwali season — festive warmth, gift/celebration angle';
  if (month === 2)                  festivalHint = 'Holi season — color, joy, celebration angle';
  if (month === 11 || month === 0)  festivalHint = 'New Year / Christmas season — resolution, new beginning angle';
  if (month === 7  || month === 8)  festivalHint = 'Independence Day / Raksha Bandhan season — patriotic or sibling love angle';

  const timeOfDayHint = {
    morning:   'Fresh start energy — chai, new day, productivity',
    afternoon: 'Midday slump — quick treat, energy boost',
    evening:   'Wind-down energy — relaxation, family time, unwind',
    night:     'Reflective mood — nostalgia, tomorrow planning, late-night cravings',
  }[timeOfDay];

  return { timeOfDay, dayContext, festivalHint, timeOfDayHint };
}

// ─── Key normalisers ──────────────────────────────────────────────────────────
function normaliseBusinessKey(raw) {
  if (!raw) return 'general';
  const key = raw.toLowerCase().replace(/[\s/&-]+/g, '_');
  return BUSINESS_ALIASES[key] || (BUSINESS_RULES[key] ? key : 'general');
}

function normalisePostTypeKey(raw) {
  if (!raw) return 'offer_discount';
  const key = raw.toLowerCase().replace(/[\s/-]+/g, '_');
  if (POST_TYPES.post_types[key]) return key;
  return POST_TYPE_ALIASES[key] || 'offer_discount';
}

function normalisePlatformKey(platform, format) {
  const p = (platform || 'instagram').toLowerCase();
  const f = (format   || 'single').toLowerCase();

  // Build compound key first, fall back to platform-only
  const compound = `${p}_${f}`;
  if (PLATFORM_FORMAT_RULES[compound]) return compound;
  if (PLATFORM_FORMAT_RULES[p])        return p;
  return 'instagram_feed';
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Returns the full optimal caption config for a given context.
 *
 * @param {string} platform     - 'instagram' | 'facebook' | 'whatsapp'
 * @param {string} businessType - 'salon' | 'gym' | 'cafe' | etc.
 * @param {string} postType     - key from postTypes.json, e.g. 'educational_tips'
 * @param {string} format       - 'single' | 'carousel' | 'story' | 'reel_cover'
 * @param {Date}   time         - defaults to now
 */
function getOptimalCaptionConfig(
  platform     = 'instagram',
  businessType = 'general',
  postType     = 'offer_discount',
  format       = 'single',
  time         = new Date()
) {
  const platformKey  = normalisePlatformKey(platform, format);
  const businessKey  = normaliseBusinessKey(businessType);
  const postTypeKey  = normalisePostTypeKey(postType);

  const platformRule  = PLATFORM_FORMAT_RULES[platformKey] || PLATFORM_FORMAT_RULES.instagram_feed;
  const businessRule  = BUSINESS_RULES[businessKey]        || BUSINESS_RULES.general;
  const postTypeData  = POST_TYPES.post_types[postTypeKey] || POST_TYPES.post_types.offer_discount;
  const captionRules  = postTypeData.caption_rules;
  const formatData    = POST_TYPES.formats[format]         || POST_TYPES.formats.single;
  const platformData  = POST_TYPES.platforms[platform.toLowerCase()] || POST_TYPES.platforms.instagram;
  const timeCtx       = getTimeContext(time);

  // Merge mustInclude / avoid from business + post type (deduplicated)
  const mustInclude = [...new Set([
    ...businessRule.mustInclude,
    ...(captionRules.must_include || []),
  ])];
  const avoid = [...new Set([
    ...businessRule.avoid,
    ...(captionRules.avoid || []),
  ])];

  // Combine tone hints
  const toneHints = [
    businessRule.tone,
    timeCtx.dayContext.hint,
    timeCtx.timeOfDayHint,
    timeCtx.festivalHint,
  ].filter(Boolean);

  return {
    // Character limits
    minChars:          platformRule.minChars,
    maxChars:          platformRule.maxChars,

    // Creative rules
    style:             businessRule.style,
    tone:              toneHints.join(' | '),
    emotionTrigger:    captionRules.hook,
    structureHint:     postTypeData.intent,
    mustInclude,
    avoid,
    ctaType:           captionRules.cta_type || businessRule.ctaType,

    // Post type metadata
    postTypeName:      postTypeData.name,
    postTypeCategory:  postTypeData.category,
    postTypeIntent:    postTypeData.intent,
    hinglishTriggers:  postTypeData.hinglish_triggers || [],
    carouselStructure: postTypeData.carousel_structure || null,

    // Format metadata
    format,
    formatDimensions:  formatData.dimensions,
    formatDesignTip:   formatData.design_tip,

    // Platform metadata
    hashtagCount:      platformRule.hashtagCount,
    optimalHashtags:   platformData.optimal_hashtags,
    bestPostTimes:     platformData.best_post_times,

    // Time context
    timeContext: {
      timeOfDay:    timeCtx.timeOfDay,
      dayVibe:      timeCtx.dayContext.vibe,
      festivalHint: timeCtx.festivalHint,
    },
  };
}

// ─── Self-test ────────────────────────────────────────────────────────────────
function runTests() {
  const MONDAY_MORNING = new Date('2026-04-06T10:00:00');

  const scenarios = [
    {
      label: 'Scenario 1 — Salon + Instagram + Carousel + Educational Tips',
      args:  ['instagram', 'salon', 'educational_tips', 'carousel', MONDAY_MORNING],
    },
    {
      label: 'Scenario 2 — Cafe + Facebook + Single + Offer Discount',
      args:  ['facebook', 'cafe', 'offer_discount', 'single', MONDAY_MORNING],
    },
    {
      label: 'Scenario 3 — Gym + WhatsApp + Single + Flash Sale',
      args:  ['whatsapp', 'gym', 'flash_sale', 'single', MONDAY_MORNING],
    },
  ];

  for (const { label, args } of scenarios) {
    console.log('\n' + '='.repeat(65));
    console.log(label);
    console.log('='.repeat(65));
    console.log(JSON.stringify(getOptimalCaptionConfig(...args), null, 2));
  }
}

if (require.main === module) runTests();

module.exports = { getOptimalCaptionConfig };
