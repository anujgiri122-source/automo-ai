// Caption Context Engine
// Determines optimal caption settings based on platform, business type, post type, and time.

const PLATFORM_RULES = {
  instagram_feed:  { minChars: 138, maxChars: 150, hashtagCount: 5 },
  instagram_reel:  { minChars: 80,  maxChars: 100, hashtagCount: 4 },
  instagram_story: { minChars: 50,  maxChars: 70,  hashtagCount: 2 },
  facebook:        { minChars: 200, maxChars: 300, hashtagCount: 3 },
  whatsapp_status: { minChars: 100, maxChars: 120, hashtagCount: 0 },
  twitter:         { minChars: 240, maxChars: 260, hashtagCount: 2 },
  twitter_x:       { minChars: 240, maxChars: 260, hashtagCount: 2 },
};

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

// Normalise business type: map frontend keys to BUSINESS_RULES keys
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

const POST_TYPE_RULES = {
  offer: {
    emotionTrigger: 'FOMO + urgency',
    structureHint: 'lead with problem, reveal offer as relief, hard deadline in CTA',
    mustInclude: ['exact discount or price', 'expiry/scarcity signal'],
    avoid: ['vague "special offer"'],
  },
  new_launch: {
    emotionTrigger: 'curiosity + excitement',
    structureHint: 'tease before reveal, build anticipation, curiosity CTA',
    mustInclude: ['what is new', 'why it matters to reader'],
    avoid: ['listing features without benefit'],
  },
  event: {
    emotionTrigger: 'FOMO + date urgency',
    structureHint: 'paint the event scene, give exact date/time, "last X seats" pressure',
    mustInclude: ['specific date', 'what happens there'],
    avoid: ['vague "join us" with no date'],
  },
  daily_post: {
    emotionTrigger: 'story + engagement',
    structureHint: 'relatable moment → story → question to audience at end',
    mustInclude: ['engagement question or poll hook', 'relatable Indian daily life moment'],
    avoid: ['hard sell', 'urgency language'],
  },
  review: {
    emotionTrigger: 'social proof + trust',
    structureHint: 'quote or paraphrase the result, add specificity, invite others to experience',
    mustInclude: ['specific customer outcome', 'name/role if possible', 'trust signal'],
    avoid: ['generic "great service"', 'self-praise without evidence'],
  },
  motivation: {
    emotionTrigger: 'inspiration + action',
    structureHint: 'relatable pain → reframe → specific action step',
    mustInclude: ['one clear insight', 'personal tone'],
    avoid: ['clichéd quotes', 'preachy tone'],
  },
};

function getTimeContext(now = new Date()) {
  const hour  = now.getHours();
  const day   = now.getDay();   // 0=Sun, 1=Mon … 6=Sat
  const month = now.getMonth(); // 0-indexed

  const timeOfDay = hour < 11 ? 'morning' : hour < 15 ? 'afternoon' : hour < 19 ? 'evening' : 'night';

  const dayContext = {
    0: { vibe: 'sunday_relaxed',  hint: 'Sunday laziness → fun treat, self-care energy' },
    1: { vibe: 'monday_hustle',   hint: 'Monday motivation → new week, fresh start, conquer energy' },
    2: { vibe: 'midweek_steady',  hint: 'Tuesday steady grind — relatable mid-week content' },
    3: { vibe: 'hump_day',        hint: 'Wednesday — halfway there, small reward energy' },
    4: { vibe: 'thursday_almost', hint: 'Thursday anticipation — weekend is almost here' },
    5: { vibe: 'friday_vibe',     hint: 'Friday celebration — weekend plans, treat yourself energy' },
    6: { vibe: 'saturday_outing', hint: 'Saturday outing — family plans, go out energy' },
  }[day];

  // Rough Indian festival seasons
  let festivalHint = null;
  if (month === 9 || month === 10) festivalHint = 'Navratri/Diwali season — festive warmth, gift/celebration angle';
  if (month === 2)                 festivalHint = 'Holi season — color, joy, celebration angle';
  if (month === 11 || month === 0) festivalHint = 'New Year / Christmas season — resolution, new beginning angle';
  if (month === 7 || month === 8)  festivalHint = 'Independence Day / Raksha Bandhan season — patriotic or sibling love angle';

  const timeOfDayHint = {
    morning:   'Fresh start energy — chai, new day, productivity',
    afternoon: 'Midday slump — quick treat, energy boost',
    evening:   'Wind-down energy — relaxation, family time, unwind',
    night:     'Reflective mood — nostalgia, tomorrow planning, late-night cravings',
  }[timeOfDay];

  return { timeOfDay, dayContext, festivalHint, timeOfDayHint };
}

function normaliseKey(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[\s/&-]+/g, '_');
  return BUSINESS_ALIASES[key] || key;
}

/**
 * Returns the optimal caption config for a given context.
 *
 * @param {string} platform     - e.g. 'instagram_reel', 'facebook', 'whatsapp_status'
 * @param {string} businessType - e.g. 'salon', 'gym', 'cafe'
 * @param {string} postType     - e.g. 'offer', 'daily_post', 'motivation'
 * @param {Date}   time         - defaults to now
 * @returns {{
 *   minChars: number, maxChars: number,
 *   style: string, tone: string,
 *   emotionTrigger: string, structureHint: string,
 *   mustInclude: string[], avoid: string[],
 *   ctaType: string, hashtagCount: number,
 *   timeContext: { timeOfDay: string, dayVibe: string, festivalHint: string|null }
 * }}
 */
function getOptimalCaptionConfig(platform = 'instagram_feed', businessType = 'general', postType = 'offer', time = new Date()) {
  const platformKey = platform.toLowerCase().replace(/\s+/g, '_');
  const businessKey = normaliseKey(businessType);
  const postKey     = postType.toLowerCase().replace(/[\s-]+/g, '_');

  const platformRule = PLATFORM_RULES[platformKey]  || PLATFORM_RULES.instagram_feed;
  const businessRule = BUSINESS_RULES[businessKey]  || BUSINESS_RULES.general;
  const postTypeRule = POST_TYPE_RULES[postKey]      || POST_TYPE_RULES.daily_post;
  const timeCtx      = getTimeContext(time);

  // Merge mustInclude / avoid from business + post type (deduplicated)
  const mustInclude = [...new Set([...businessRule.mustInclude, ...postTypeRule.mustInclude])];
  const avoid       = [...new Set([...businessRule.avoid,       ...postTypeRule.avoid])];

  // Combine tone hints — filter nulls
  const toneHints = [
    businessRule.tone,
    timeCtx.dayContext.hint,
    timeCtx.timeOfDayHint,
    timeCtx.festivalHint,
  ].filter(Boolean);

  return {
    minChars:       platformRule.minChars,
    maxChars:       platformRule.maxChars,
    style:          businessRule.style,
    tone:           toneHints.join(' | '),
    emotionTrigger: postTypeRule.emotionTrigger,
    structureHint:  postTypeRule.structureHint,
    mustInclude,
    avoid,
    ctaType:        businessRule.ctaType,
    hashtagCount:   platformRule.hashtagCount,
    timeContext: {
      timeOfDay:    timeCtx.timeOfDay,
      dayVibe:      timeCtx.dayContext.vibe,
      festivalHint: timeCtx.festivalHint,
    },
  };
}

// --- Self-test (run: node backend/services/captionContext.js) ---
function runTests() {
  const MONDAY_MORNING = new Date('2026-04-06T10:00:00');

  const scenarios = [
    { label: 'Scenario 1 — Salon + Instagram Reel + Offer',       args: ['instagram_reel',  'salon', 'offer',      MONDAY_MORNING] },
    { label: 'Scenario 2 — Cafe + Facebook + Daily Post',          args: ['facebook',         'cafe',  'daily_post', MONDAY_MORNING] },
    { label: 'Scenario 3 — Gym + WhatsApp Status + Monday Motivation', args: ['whatsapp_status', 'gym',  'motivation', MONDAY_MORNING] },
  ];

  for (const { label, args } of scenarios) {
    console.log('\n' + '='.repeat(60));
    console.log(label);
    console.log('='.repeat(60));
    console.log(JSON.stringify(getOptimalCaptionConfig(...args), null, 2));
  }
}

if (require.main === module) runTests();

module.exports = { getOptimalCaptionConfig };
