/**
 * indianDesignRules.js
 * Deep Indian market design intelligence — the creative brain of Automo
 * Encodes what a senior designer at a top Indian digital agency knows by instinct
 */

// ═══════════════════════════════════════════════════════════
// CATEGORY DESIGN PROFILES
// Each profile encodes years of Indian market design expertise
// ═══════════════════════════════════════════════════════════

const CATEGORY_PROFILES = {
  gym_fitness: {
    canvaQueryTemplate: 'dark intense Indian fitness gym {season} motivational flyer bold neon {accent} black powerful transformation energy',
    defaultPalette: { primary: '#00ff88', secondary: '#ff6600', bg: '#0d0d0d', text: '#ffffff' },
    moodKeywords: ['powerful', 'intense', 'transformation', 'beast mode', 'energy'],
    hinglishHeadlines: [
      'Ab Result Dikhega! 💪',
      'Apna Best Version Bano',
      'Sweat Today, Shine Tomorrow',
      '30 Din Mein Fark Dikhao',
      'Fit Raho, Happy Raho',
    ],
    designElements: ['lightning bolt', 'dark neon glow', 'dumbbell silhouette', 'bold typography'],
    cta: ['Free Trial Lelo', 'Join Now — Limited Seats!', 'Abhi Register Karo'],
    priceDisplay: 'bold-badge',
    whatsappTip: 'Use dark background — stands out in crowded WhatsApp groups',
  },

  salon_beauty: {
    canvaQueryTemplate: 'elegant Indian beauty salon {season} luxury feminine glow flyer rose gold pink minimal soft light',
    defaultPalette: { primary: '#b76e79', secondary: '#d4a574', bg: '#fff8f3', text: '#3d2b1f' },
    moodKeywords: ['elegant', 'glow', 'pamper', 'luxury', 'radiant', 'feminine'],
    hinglishHeadlines: [
      'Glow Up Time! ✨',
      'Beauty Wali Feeling Aaj Lo',
      'Apni Care Karo — Deserve Karti Ho',
      'Naya Look, Naya Attitude',
      'Slot Book Karo, Transformation Lo',
    ],
    designElements: ['soft gradient', 'flower petals', 'gold scissors', 'sparkle effect', 'marble texture'],
    cta: ['Book Appointment', 'Slot Reserve Karo', 'Call Now — Limited Slots'],
    priceDisplay: 'strikethrough-offer',
    whatsappTip: 'Light, clean backgrounds look premium and get saved more often',
  },

  cafe_restaurant: {
    canvaQueryTemplate: 'warm inviting Indian {style} food restaurant {season} brown cream cozy delicious poster vibrant appetite',
    defaultPalette: { primary: '#ff6b35', secondary: '#ffd700', bg: '#2c1810', text: '#fff8dc' },
    moodKeywords: ['warm', 'delicious', 'aromatic', 'homestyle', 'fresh', 'inviting'],
    hinglishHeadlines: [
      'Khao Piyo Khush Raho! 🍛',
      'Ghar Jaisi Flavour, Bahar Ka Maza',
      'Hungry? Yahan Aao!',
      'Swad Wahi, Style Naya',
      'Best Khana, Best Price',
    ],
    designElements: ['food photography', 'steam graphics', 'spice elements', 'warm bokeh'],
    cta: ['Order Now — Free Delivery!', 'Abhi Call Karo', 'Table Reserve Karo'],
    priceDisplay: 'price-tag',
    whatsappTip: 'Show food prominently — people share food posts more than text posts',
  },

  clothing_ethnic: {
    canvaQueryTemplate: 'vibrant Indian ethnic fashion {season} festive sale flyer jewel tones gold traditional elegant celebration',
    defaultPalette: { primary: '#ffd700', secondary: '#e91e63', bg: '#1a0a2e', text: '#fff8dc' },
    moodKeywords: ['festive', 'elegant', 'traditional', 'luxurious', 'vibrant', 'ethnic'],
    hinglishHeadlines: [
      'Parampara Ki Pehchaan — Is Season',
      'Festive Look? Sirf Yahan Milega',
      'Is Baar Kuch Khaas Pehno',
      'Sale Mein Style Mat Chodo',
      'Outfit Goals This Festive Season',
    ],
    designElements: ['paisley border', 'gold foil texture', 'fabric drape', 'ethnic motifs'],
    cta: ['Shop Now — Sale Chal Raha Hai!', 'Collection Dekho', 'WhatsApp Order Karo'],
    priceDisplay: 'sale-ribbon',
    whatsappTip: 'Show actual products — ethnic clothing buyers want to see fabric and design',
  },

  clothing_western: {
    canvaQueryTemplate: 'trendy modern Indian western fashion youth {season} sale flyer bold contemporary streetwear energetic',
    defaultPalette: { primary: '#ff6600', secondary: '#000000', bg: '#ffffff', text: '#1a1a1a' },
    moodKeywords: ['trendy', 'urban', 'bold', 'fresh', 'street style', 'modern'],
    hinglishHeadlines: [
      'Desi Drip Incoming! 🔥',
      'New Drop — Bata Dena Sab Ko',
      'Your Look, Your Rules',
      'Slay Every Day',
      'Style Upgrade Time',
    ],
    designElements: ['bold typography', 'high contrast', 'graphic overlay', 'minimal layout'],
    cta: ['Shop Now — Limited Stock!', 'Get Yours', 'Order Today'],
    priceDisplay: 'bold-price',
    whatsappTip: 'High contrast and bold text performs best for western fashion',
  },

  hotel_hospitality: {
    canvaQueryTemplate: 'luxury elegant Indian hotel resort {season} premium stay offer flyer gold navy minimal sophisticated exclusive',
    defaultPalette: { primary: '#c9a84c', secondary: '#1a2744', bg: '#0a0a14', text: '#f5f0e8' },
    moodKeywords: ['luxurious', 'serene', 'exclusive', 'peaceful', 'premium', 'elegant'],
    hinglishHeadlines: [
      'Ek Baar Aao, Baar Baar Aana Chahoge',
      'Sukoon Ka Thikana — Yahan Hai',
      'Chutti Ka Perfect Plan',
      'Luxury Stay, Affordable Price',
      'Weekend Getaway Plan Ready?',
    ],
    designElements: ['property photography', 'gold accent lines', 'star rating', 'minimal text'],
    cta: ['Book Now — Special Rate!', 'Check Availability', 'Direct Booking Discount'],
    priceDisplay: 'per-night-badge',
    whatsappTip: 'Show the property/room — people book what they can visualize',
  },

  coaching_education: {
    canvaQueryTemplate: 'professional Indian education coaching success achievement {season} motivational flyer blue gold academic result',
    defaultPalette: { primary: '#ffd700', secondary: '#00d4ff', bg: '#0f2044', text: '#ffffff' },
    moodKeywords: ['motivated', 'successful', 'trustworthy', 'achievement', 'focused'],
    hinglishHeadlines: [
      'Success Ki Guarantee! 🏆',
      'Top Rank Pakka — Yahan Se',
      'Apna Future Aaj Secure Karo',
      'Best Teachers, Best Results',
      'IIT/NEET Ka Sapna Poora Karega Kaun?',
    ],
    designElements: ['graduation cap', 'trophy graphic', 'star badge', 'upward trend arrow'],
    cta: ['Free Demo Class Lo!', 'Enroll Now — Seats Limited!', 'Batch Join Karo'],
    priceDisplay: 'emi-option',
    whatsappTip: 'Show result percentages and toppers — social proof is everything in education',
  },

  medical_pharmacy: {
    canvaQueryTemplate: 'clean professional Indian medical clinic pharmacy health {season} trustworthy blue white minimal caring flyer',
    defaultPalette: { primary: '#0066cc', secondary: '#00aa44', bg: '#f0f8ff', text: '#1a1a2e' },
    moodKeywords: ['trustworthy', 'professional', 'caring', 'reliable', 'health-focused'],
    hinglishHeadlines: [
      'Aapki Sehat, Hamari Zimmedaari',
      'Doctor Se Miliye — Aaj Hi',
      'Health First, Always',
      'Expert Care — Seedha Ghar Ke Paas',
      'Swasth Rahe, Khush Rahe',
    ],
    designElements: ['medical cross symbol', 'clean lines', 'trust badges', 'doctor illustration'],
    cta: ['Appointment Book Karo', 'Walk-in Welcome', 'Free Consultation Today'],
    priceDisplay: 'consultation-fee',
    whatsappTip: 'Include doctor name and qualification — builds immediate trust in medical',
  },

  jewellery: {
    canvaQueryTemplate: 'premium Indian jewellery {season} gold luxury elegant minimal precious ornament festive timeless flyer',
    defaultPalette: { primary: '#ffd700', secondary: '#dc143c', bg: '#0a0a0a', text: '#fff8dc' },
    moodKeywords: ['precious', 'timeless', 'pure', 'auspicious', 'elegant', 'traditional'],
    hinglishHeadlines: [
      'Pure Gold Ka Promise ✨',
      'BIS Hallmarked — 100% Guarantee',
      'Khushiyon Ko Sona Pehnaao',
      'Tradition Meets Modern Design',
      'Aaj Ki Kharidaari, Kal Ki Parampara',
    ],
    designElements: ['product close-up', 'gold texture', 'ornate border', 'sparkle highlights'],
    cta: ['Visit Store — Gold Rate Today', 'WhatsApp Pe Order Karo', 'Book Your Design'],
    priceDisplay: 'per-gram-rate',
    whatsappTip: 'Show actual jewelry with close-up — gold buyers want to see the craft',
  },

  dairy_food_products: {
    canvaQueryTemplate: 'vibrant Indian dairy food products {season} fresh healthy promotion flyer colorful appetizing Indian families',
    defaultPalette: { primary: '#e60611', secondary: '#007bff', bg: '#ffffff', text: '#1a1a1a' },
    moodKeywords: ['fresh', 'healthy', 'delicious', 'trusted', 'nutritious', 'Indian'],
    hinglishHeadlines: [
      'Taste of India — Ghar Ghar Mein',
      'Fresh Hai, Healthy Hai, Amul Hai!',
      'Garmi Mein Cool Down Karo',
      'Family Ka Favourite Since Years',
      'Har Meal Ka Perfect Saathi',
    ],
    designElements: ['product photography', 'fresh green accents', 'family imagery', 'red-white bold'],
    cta: ['Order Now — Free Delivery!', 'Nearest Store Dekho', 'Avail Offer Today'],
    priceDisplay: 'offer-badge',
    whatsappTip: 'Show the product clearly — familiar brands need product visibility not just logo',
  },

  general: {
    canvaQueryTemplate: 'vibrant professional Indian small business {season} promotional flyer colorful bold modern announcement local',
    defaultPalette: { primary: '#ff6600', secondary: '#1a1a1a', bg: '#ffffff', text: '#1a1a1a' },
    moodKeywords: ['professional', 'vibrant', 'trustworthy', 'modern', 'local'],
    hinglishHeadlines: [
      'Khaas Offer Sirf Aapke Liye! 🎁',
      'Mauka Mat Chuko!',
      'Aaj Ka Special Deal',
      'Limited Time — Abhi Avail Karo',
    ],
    designElements: ['bold typography', 'brand colors', 'clean layout', 'offer highlight'],
    cta: ['WhatsApp Karo Abhi', 'Call Now', 'Avail Offer Today'],
    priceDisplay: 'badge',
    whatsappTip: 'Keep it simple — one clear offer, one clear CTA, phone number visible',
  },
};

// ═══════════════════════════════════════════════════════════
// INDIAN FESTIVAL CALENDAR 2026
// Dates are accurate — use for auto festival tie-ins
// ═══════════════════════════════════════════════════════════

// ─── Complete Indian festival calendar — 2025 + 2026 ───────────────────────
// Each entry: name, slug (for manual override
// ), date, emoji, mood, shopRelevance,
//             durationDays (how many days the festival lasts)
const FESTIVALS_2026 = [
  // ── 2025 festivals still in the future window ──
  { name: 'New Year',          slug: 'new_year',         date: '2025-01-01', emoji: '🎆', mood: 'celebratory new-beginnings fresh-start',          shopRelevance: 'very-high', durationDays: 2 },
  { name: 'Lohri',             slug: 'lohri',            date: '2025-01-13', emoji: '🔥', mood: 'harvest bonfire North Indian joyful',               shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Makar Sankranti',   slug: 'makar_sankranti',  date: '2025-01-14', emoji: '🪁', mood: 'harvest kite-flying auspicious celebration',         shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Republic Day',      slug: 'republic_day',     date: '2025-01-26', emoji: '🇮🇳', mood: 'patriotic proud national unity',                   shopRelevance: 'medium',    durationDays: 1 },
  { name: "Valentine's Day",   slug: 'valentines',       date: '2025-02-14', emoji: '💕', mood: 'romantic love gifting premium couple',               shopRelevance: 'high',      durationDays: 1 },
  { name: 'Holi',              slug: 'holi',             date: '2025-03-14', emoji: '🎨', mood: 'colorful joyful playful festive',                    shopRelevance: 'high',      durationDays: 2 },
  { name: 'Eid al-Fitr',       slug: 'eid',              date: '2025-03-30', emoji: '🌙', mood: 'celebratory premium gifting festive',                shopRelevance: 'high',      durationDays: 3 },
  { name: 'Navratri',          slug: 'navratri',         date: '2025-04-02', emoji: '💃', mood: 'energetic garba colorful feminine festive',          shopRelevance: 'high',      durationDays: 9 },
  { name: 'Dussehra',          slug: 'dussehra',         date: '2025-10-02', emoji: '🏹', mood: 'victory celebration good over evil',                 shopRelevance: 'high',      durationDays: 1 },
  { name: 'Durga Puja',        slug: 'durga_puja',       date: '2025-10-02', emoji: '🙏', mood: 'devotional grand celebration Bengal festive',        shopRelevance: 'high',      durationDays: 5 },
  { name: 'Navratri',          slug: 'navratri',         date: '2025-10-02', emoji: '💃', mood: 'energetic garba colorful feminine festive',          shopRelevance: 'high',      durationDays: 9 },
  { name: 'Karva Chauth',      slug: 'karva_chauth',     date: '2025-10-20', emoji: '🌕', mood: 'romantic love couple traditional',                   shopRelevance: 'high',      durationDays: 1 },
  { name: 'Dhanteras',         slug: 'dhanteras',        date: '2025-10-20', emoji: '✨', mood: 'auspicious gold buying wealth',                      shopRelevance: 'very-high', durationDays: 1 },
  { name: 'Diwali',            slug: 'diwali',           date: '2025-10-20', emoji: '🪔', mood: 'grand premium gifting festive prosperity',           shopRelevance: 'very-high', durationDays: 5 },
  { name: 'Bhai Dooj',         slug: 'bhai_dooj',        date: '2025-10-26', emoji: '🫂', mood: 'family bonding gifting sibling celebration',         shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Christmas',         slug: 'christmas',        date: '2025-12-25', emoji: '🎄', mood: 'joyful gifting winter celebration',                  shopRelevance: 'high',      durationDays: 2 },

  // ── 2026 festivals ──
  { name: 'New Year',          slug: 'new_year',         date: '2026-01-01', emoji: '🎆', mood: 'celebratory new-beginnings fresh-start',            shopRelevance: 'very-high', durationDays: 2 },
  { name: 'Lohri',             slug: 'lohri',            date: '2026-01-13', emoji: '🔥', mood: 'harvest bonfire North Indian joyful',                shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Makar Sankranti',   slug: 'makar_sankranti',  date: '2026-01-14', emoji: '🪁', mood: 'harvest kite-flying auspicious celebration',          shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Republic Day',      slug: 'republic_day',     date: '2026-01-26', emoji: '🇮🇳', mood: 'patriotic proud national unity',                    shopRelevance: 'medium',    durationDays: 1 },
  { name: "Valentine's Day",   slug: 'valentines',       date: '2026-02-14', emoji: '💕', mood: 'romantic love gifting premium couple',                shopRelevance: 'high',      durationDays: 1 },
  { name: 'Holi',              slug: 'holi',             date: '2026-03-14', emoji: '🎨', mood: 'colorful joyful playful festive',                    shopRelevance: 'high',      durationDays: 2 },
  { name: 'Eid al-Fitr',       slug: 'eid',              date: '2026-03-31', emoji: '🌙', mood: 'celebratory premium gifting festive',                shopRelevance: 'high',      durationDays: 3 },
  { name: 'Ram Navami',        slug: 'ram_navami',       date: '2026-04-06', emoji: '🪔', mood: 'devotional auspicious',                              shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Baisakhi',          slug: 'baisakhi',         date: '2026-04-13', emoji: '🌾', mood: 'harvest joyful North Indian festive',                shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Akshaya Tritiya',   slug: 'akshaya_tritiya',  date: '2026-04-28', emoji: '🥇', mood: 'auspicious gold buying prosperity',                  shopRelevance: 'high',      durationDays: 1 },
  { name: 'Eid al-Adha',       slug: 'eid_adha',         date: '2026-06-07', emoji: '🐑', mood: 'communal celebratory gifting',                       shopRelevance: 'high',      durationDays: 3 },
  { name: 'Independence Day',  slug: 'independence_day', date: '2026-08-15', emoji: '🇮🇳', mood: 'patriotic proud national desh-bhakti',              shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Raksha Bandhan',    slug: 'raksha_bandhan',   date: '2026-08-09', emoji: '🎗️', mood: 'sibling love gifting traditional',                   shopRelevance: 'high',      durationDays: 1 },
  { name: 'Janmashtami',       slug: 'janmashtami',      date: '2026-08-16', emoji: '🦚', mood: 'devotional joyful Krishna festive',                  shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Ganesh Chaturthi',  slug: 'ganesh_chaturthi', date: '2026-08-28', emoji: '🐘', mood: 'auspicious new-beginnings festive',                  shopRelevance: 'high',      durationDays: 10 },
  { name: 'Navratri',          slug: 'navratri',         date: '2026-09-21', emoji: '💃', mood: 'energetic garba colorful feminine festive',           shopRelevance: 'high',      durationDays: 9 },
  { name: 'Durga Puja',        slug: 'durga_puja',       date: '2026-10-01', emoji: '🙏', mood: 'devotional grand celebration Bengal festive',         shopRelevance: 'high',      durationDays: 5 },
  { name: 'Dussehra',          slug: 'dussehra',         date: '2026-10-02', emoji: '🏹', mood: 'victory celebration good over evil',                  shopRelevance: 'high',      durationDays: 1 },
  { name: 'Karva Chauth',      slug: 'karva_chauth',     date: '2026-10-20', emoji: '🌕', mood: 'romantic love couple traditional',                    shopRelevance: 'high',      durationDays: 1 },
  { name: 'Dhanteras',         slug: 'dhanteras',        date: '2026-10-17', emoji: '✨', mood: 'auspicious gold buying wealth',                       shopRelevance: 'very-high', durationDays: 1 },
  { name: 'Diwali',            slug: 'diwali',           date: '2026-10-20', emoji: '🪔', mood: 'grand premium gifting festive prosperity',            shopRelevance: 'very-high', durationDays: 5 },
  { name: 'Bhai Dooj',         slug: 'bhai_dooj',        date: '2026-10-26', emoji: '🫂', mood: 'family bonding gifting sibling celebration',          shopRelevance: 'medium',    durationDays: 1 },
  { name: 'Christmas',         slug: 'christmas',        date: '2026-12-25', emoji: '🎄', mood: 'joyful gifting winter celebration',                   shopRelevance: 'high',      durationDays: 2 },
  { name: 'New Year',          slug: 'new_year',         date: '2026-12-31', emoji: '🎆', mood: 'celebratory new-beginnings fresh-start',             shopRelevance: 'very-high', durationDays: 2 },
];

// ═══════════════════════════════════════════════════════════
// SEASON DETECTION (India's 4 commercial seasons)
// ═══════════════════════════════════════════════════════════

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return { name: 'summer', design: 'cooling refreshing light breeze summer heat', colorMood: 'bright cool blues and whites' };
  if (m >= 6 && m <= 9) return { name: 'monsoon', design: 'cozy warm rainy season homely indoor', colorMood: 'earthy greens browns warm' };
  if (m >= 10 && m <= 11) return { name: 'festive', design: 'festive grand Diwali premium celebratory', colorMood: 'gold saffron deep jewel tones' };
  return { name: 'winter', design: 'warm cozy winter Christmas New Year celebration', colorMood: 'deep warm reds golds' };
}

// ═══════════════════════════════════════════════════════════
// NEAREST FESTIVAL (within 35 days)
// ═══════════════════════════════════════════════════════════

function getNearestFestival() {
  const today = new Date();
  const matches = FESTIVALS_2026
    .map(f => ({ ...f, daysUntil: Math.ceil((new Date(f.date) - today) / 86400000) }))
    .filter(f => f.daysUntil >= -1 && f.daysUntil <= 35)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return matches[0] || null;
}

// ═══════════════════════════════════════════════════════════
// SMART FESTIVAL AUTO-DETECTION
// Returns { status: 'active'|'upcoming'|'none', festival, daysUntil }
//   active   → festival is today / within its duration window
//   upcoming → festival is 1–7 days away
//   none     → no festival nearby
// ═══════════════════════════════════════════════════════════

function getFestivalStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = FESTIVALS_2026.map(f => {
    const festDate = new Date(f.date);
    festDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((festDate - today) / 86400000);
    return { ...f, daysUntil, festDate };
  });

  // Active: started within durationDays ago AND not more than 1 day in future
  const active = enriched
    .filter(f => f.daysUntil <= 1 && f.daysUntil >= -(f.durationDays - 1))
    .sort((a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil));

  if (active.length) {
    const f = active[0];
    return { status: 'active', festival: f, daysUntil: f.daysUntil };
  }

  // Upcoming: 2–7 days away
  const upcoming = enriched
    .filter(f => f.daysUntil > 1 && f.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length) {
    const f = upcoming[0];
    return { status: 'upcoming', festival: f, daysUntil: f.daysUntil };
  }

  return { status: 'none', festival: null, daysUntil: null };
}

// ═══════════════════════════════════════════════════════════
// MANUAL FESTIVAL LOOKUP — for user overrides like "diwali post banao"
// Accepts slug ('diwali', 'holi') or plain name ('Diwali', 'Navratri')
// ═══════════════════════════════════════════════════════════

function getFestivalByName(nameOrSlug) {
  if (!nameOrSlug || nameOrSlug === 'auto' || nameOrSlug === 'none') return null;
  const q = nameOrSlug.toLowerCase().replace(/[\s-]/g, '_');
  // Try slug match first (exact)
  let match = FESTIVALS_2026.find(f => f.slug === q);
  // Fallback: name contains match
  if (!match) match = FESTIVALS_2026.find(f => f.name.toLowerCase().includes(nameOrSlug.toLowerCase()));
  if (!match) return null;
  // Return with a synthetic daysUntil (find the closest future occurrence)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const allOccurrences = FESTIVALS_2026
    .filter(f => f.slug === match.slug || f.name === match.name)
    .map(f => ({ ...f, daysUntil: Math.ceil((new Date(f.date) - today) / 86400000) }))
    .sort((a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil));
  return allOccurrences[0] || { ...match, daysUntil: 0 };
}

// ═══════════════════════════════════════════════════════════
// CATEGORY DETECTION (from raw brand data)
// ═══════════════════════════════════════════════════════════

function detectCategory(brandData) {
  const raw = [
    brandData.title || '',
    brandData.description || '',
    brandData.siteName || '',
    brandData.businessIntelligence?.exactCategory || '',
    brandData.businessIntelligence?.usp || '',
  ].join(' ').toLowerCase();

  const rules = [
    { key: 'gym_fitness',       kw: ['gym', 'fitness', 'workout', 'yoga', 'crossfit', 'training', 'bodybuilding', 'zumba', 'pilates', 'health club', 'sports club'] },
    { key: 'salon_beauty',      kw: ['salon', 'beauty', 'hair', 'spa', 'parlour', 'nail', 'makeup', 'skin care', 'waxing', 'threading', 'facial', 'bridal'] },
    { key: 'cafe_restaurant',   kw: ['restaurant', 'cafe', 'dhaba', 'biryani', 'pizza', 'burger', 'chai', 'coffee', 'kitchen', 'eatery', 'dining', 'tiffin', 'catering', 'bakery', 'sweet shop', 'sweets', 'mithai'] },
    { key: 'clothing_ethnic',   kw: ['saree', 'salwar', 'ethnic', 'kurti', 'lehenga', 'traditional', 'handloom', 'silk', 'embroidery', 'indian wear', 'churidar', 'dupatta'] },
    { key: 'clothing_western',  kw: ['fashion', 'apparel', 'tshirt', 't-shirt', 'jeans', 'footwear', 'shoes', 'sneakers', 'western wear', 'streetwear', 'casual wear'] },
    { key: 'hotel_hospitality', kw: ['hotel', 'resort', 'stay', 'rooms', 'lodge', 'inn', 'hospitality', 'tourism', 'travel', 'holiday', 'accommodation'] },
    { key: 'coaching_education',kw: ['coaching', 'education', 'school', 'college', 'tuition', 'classes', 'institute', 'academy', 'iit', 'neet', 'upsc', 'learning', 'course', 'tutor'] },
    { key: 'medical_pharmacy',  kw: ['clinic', 'hospital', 'doctor', 'pharmacy', 'medical', 'medicine', 'dental', 'orthopedic', 'diagnostic', 'health care', 'nursing'] },
    { key: 'jewellery',         kw: ['jewellery', 'jewelry', 'gold', 'diamond', 'silver', 'gems', 'ornaments', 'bangles', 'necklace', 'ring', 'pendant', 'hallmark'] },
    { key: 'dairy_food_products', kw: ['dairy', 'milk', 'amul', 'butter', 'cheese', 'ghee', 'paneer', 'curd', 'ice cream', 'food products', 'fmcg', 'chocolate', 'beverage'] },
  ];

  for (const { key, kw } of rules) {
    if (kw.some(k => raw.includes(k))) return key;
  }
  return 'general';
}

// ═══════════════════════════════════════════════════════════
// SMART CANVA QUERY BUILDER
// Formula: [Aesthetic] + [Indian] + [Category] + [Season/Festival] + [Color mood] + [Platform]
// ═══════════════════════════════════════════════════════════

function buildCanvaQuery(category, brandName, primaryColor, _offer, isCarousel = false, slideTheme = '') {
  const profile = CATEGORY_PROFILES[category] || CATEGORY_PROFILES.general;
  const season = getCurrentSeason();
  const festival = getNearestFestival();

  let base = profile.canvaQueryTemplate
    .replace('{season}', season.design.split(' ').slice(0, 3).join(' '))
    .replace('{style}', category.includes('ethnic') ? 'traditional ornate' : 'modern clean')
    .replace('{accent}', primaryColor || 'vibrant orange');

  const festivalContext = festival
    ? `${festival.name} ${festival.mood.split(' ').slice(0, 2).join(' ')} ${festival.emoji}`
    : season.colorMood;

  const platformSpec = isCarousel
    ? `Instagram carousel ${slideTheme} consistent brand identity`
    : 'WhatsApp Instagram 1080x1080 square flyer';

  return `${base} ${festivalContext} ${platformSpec} ${brandName}`.replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════
// CAROUSEL STORYTELLING ARC (Desi Storytelling Method)
// The 5-slide arc that Indian audiences respond to
// ═══════════════════════════════════════════════════════════

const CAROUSEL_ARC = [
  {
    index: 0,
    purpose: 'hook',
    theme: 'bold attention-stopping hook',
    structure: 'Big bold claim or question that stops the scroll',
    toneGuide: 'Surprising, bold, makes them want to swipe',
    examples: ['Kya aap sach mein best deal miss kar rahe ho?', 'Yeh offer kal band ho jaayega!', 'Aaj ke baad yeh price nahi milega'],
  },
  {
    index: 1,
    purpose: 'problem',
    theme: 'pain point empathy',
    structure: 'Acknowledge the pain the customer feels — make them feel understood',
    toneGuide: 'Empathetic, relatable, "we get you" energy',
    examples: ['Mehnga ho raha hai sab?', 'Quality nahi milti sahi daam mein?', 'Har jagah se uthna-padhna padta hai?'],
  },
  {
    index: 2,
    purpose: 'solution',
    theme: 'our solution benefit',
    structure: 'How you solve the exact problem — focus on the transformation',
    toneGuide: 'Confident, warm, solution-focused',
    examples: ['Isliye hum laaye hain yeh...', 'Ab yeh problem khatam!', 'Humara solution — ekdum seedha!'],
  },
  {
    index: 3,
    purpose: 'offer',
    theme: 'the deal urgency',
    structure: 'The specific offer with price/discount, clearly visible, with urgency',
    toneGuide: 'Exciting, clear numbers, time-limited urgency',
    examples: ['Flat 40% OFF — Aaj Ke Liye!', 'Free Delivery + ₹200 Off Today Only!', 'Pehle 50 customers ko special rate!'],
  },
  {
    index: 4,
    purpose: 'cta',
    theme: 'call to action contact',
    structure: 'Single clear action + contact info prominently displayed',
    toneGuide: 'Direct, confident, make it easy to act now',
    examples: ['WhatsApp karo abhi: 98765 43210', 'Call now, reply fast!', 'DM karo ya seedha store aao'],
  },
];

// ═══════════════════════════════════════════════════════════
// 2026 DESIGN TREND PROFILES
// What's working in Indian digital right now
// ═══════════════════════════════════════════════════════════

const DESIGN_TRENDS_2026 = {
  luxury: 'glassmorphism dark background gold accent minimal text product hero',
  mass_market: 'vibrant dopamine colors bold typography offer badge phone number visible',
  youth: 'high contrast streetwear bold font meme energy viral-ready',
  family: 'warm earthy colors friendly typography clear product showcase',
  professional: 'clean white space blue accent typography-led trustworthy',
};

function getDesignTrend(brandPersonality) {
  const { pricePosition, tone, targetAge } = brandPersonality || {};
  if (pricePosition === 'luxury' || pricePosition === 'premium') return DESIGN_TRENDS_2026.luxury;
  if (targetAge === 'teen' || targetAge === 'young-adult') return DESIGN_TRENDS_2026.youth;
  if (tone === 'professional' || tone === 'formal') return DESIGN_TRENDS_2026.professional;
  if (targetAge === 'adult' || targetAge === 'senior') return DESIGN_TRENDS_2026.family;
  return DESIGN_TRENDS_2026.mass_market;
}

// ═══════════════════════════════════════════════════════════
// LEARNED BOOSTS (from qualityMemory.json)
// Returns the best-performing query for a category if it exists
// ═══════════════════════════════════════════════════════════

function getLearnedBoost(category, qualityMemory) {
  const profile = qualityMemory?.categoryProfiles?.[category];
  if (profile?.topQueries?.length > 0 && profile.avgScore >= 90) {
    return profile.topQueries[0];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// CONTENT FORMAT CONFIGS — per-format design requirements
// ═══════════════════════════════════════════════════════════

const CONTENT_CONFIGS = {
  whatsapp_flyer: {
    size: '1080x1080',
    maxTextElements: 4,
    mustHave: ['brand_name', 'offer', 'phone_number', 'cta'],
    style: 'bold, high contrast, mobile readable',
    groqFocus: 'direct response, urgency, local feel',
    canvaKeywords: 'Indian business flyer bold WhatsApp',
    totalDesigns: 1,
  },
  instagram_feed: {
    size: '1080x1080',
    maxTextElements: 3,
    mustHave: ['visual_hook', 'brand_logo', 'minimal_text'],
    style: 'aesthetic, scroll-stopping, on-brand',
    groqFocus: 'visual appeal, engagement, brand consistency',
    canvaKeywords: 'Instagram feed post aesthetic modern Indian',
    totalDesigns: 1,
  },
  instagram_story: {
    size: '1080x1920',
    maxTextElements: 3,
    mustHave: ['big_headline', 'cta', 'brand_element'],
    style: 'vertical, swipe-worthy, bold',
    groqFocus: 'FOMO, swipe up action, conversion',
    canvaKeywords: 'Instagram story vertical bold Indian modern',
    totalDesigns: 1,
  },
  instagram_carousel: {
    size: '1080x1080',
    slides: 5,
    slideStructure: {
      1: 'HOOK — bold claim or question',
      2: 'POINT 1 — with icon/visual',
      3: 'POINT 2 — with icon/visual',
      4: 'POINT 3 — with icon/visual',
      5: 'CTA — brand + action',
    },
    groqFocus: 'education, save-worthy, share-worthy',
    canvaKeywords: 'Indian carousel educational modern clean',
    totalDesigns: 5,
  },
  full_campaign: {
    generates: ['whatsapp_flyer', 'instagram_feed', 'instagram_story'],
    totalDesigns: 3,
    groqFocus: 'consistent brand message across all formats',
    note: 'Same message, different format optimization',
  },
};

// ═══════════════════════════════════════════════════════════
// CATEGORY DESIGN RULES — per-content-type creative rules
// ═══════════════════════════════════════════════════════════

const CATEGORY_DESIGN_RULES = {
  offer: {
    groqFocus: 'urgency + scarcity + value',
    mustHaveText: ['price/discount', 'deadline', 'cta'],
    indianElements: ['sale ribbon', 'price burst', 'timer'],
    headline_style: 'CAPS, max 5 words, Hindi preferred',
    example_headlines: [
      'SIRF AAJ 40% OFF!',
      'LAST CHANCE — GRAB KARO!',
      'MEGA SALE SHURU HO GAYI!',
    ],
  },
  festival: {
    groqFocus: 'emotion + celebration + community',
    mustHaveText: ['festival_name', 'warm_wish', 'brand'],
    indianElements: ['festival specific visuals', 'traditional colors'],
    headline_style: 'warm, celebratory, inclusive',
    example_headlines: [
      'HOLI KI DHERON SHUBHKAMNAYEIN!',
      'IS DIWALI ROSHAN KARO!',
      'EID MUBARAK DOSTO!',
    ],
  },
  tips: {
    groqFocus: 'value + expertise + save-worthy',
    mustHaveText: ['hook question', 'numbered tips', 'source'],
    indianElements: ['numbered list', 'icons', 'clean grid'],
    headline_style: 'question format, curiosity-driven',
    example_headlines: [
      'KYA AAPKO YEH 5 TIPS PATA HAIN?',
      'GALTI MAT KARO — YEH PADHLO!',
      'EXPERT KI SALAH — FREE MEIN!',
    ],
  },
  testimonial: {
    groqFocus: 'trust + authenticity + social proof',
    mustHaveText: ['quote', 'name', 'location', 'stars'],
    indianElements: ['5 stars', 'Indian name', 'city name'],
    headline_style: 'real quote, relatable',
    example_headlines: [
      'CUSTOMER NE KYA KAHA...',
      'INKI ZINDAGI BADAL GAYI!',
      'REAL RESULTS, REAL PEOPLE',
    ],
  },
  launch: {
    groqFocus: 'excitement + FOMO + newness',
    mustHaveText: ['product name', 'key benefit', 'launch offer'],
    indianElements: ['new badge', 'launch ribbon', 'excitement'],
    headline_style: 'announcement, drama, reveal',
    example_headlines: [
      'AA GAYI NAYI COLLECTION!',
      'INTRODUCING — GAME CHANGER!',
      'WAIT KHATAM — LAUNCH HO GAYI!',
    ],
  },
  motivation: {
    groqFocus: 'inspiration + shareability + emotional',
    mustHaveText: ['powerful quote', 'subtle brand'],
    indianElements: ['hindi quote', 'minimal design'],
    headline_style: 'short, punchy, sharable',
    example_headlines: [
      'HAAR NHI MANTE HAIN HUM!',
      'SAPNE WAHI SACH HOTE HAIN...',
      'KAL SE NAHI, AAJ SE!',
    ],
  },
  announcement: {
    groqFocus: 'clarity + importance + action',
    mustHaveText: ['what', 'when', 'where', 'action'],
    indianElements: ['attention grabber', 'bold headline'],
    headline_style: 'clear, direct, urgent',
    example_headlines: [
      'IMPORTANT ANNOUNCEMENT!',
      'DHYAN SE PADHEIN — ZAROORI HAI!',
      'BIG NEWS AAYA HAI!',
    ],
  },
  behind_scenes: {
    groqFocus: 'authenticity + connection + humanize brand',
    mustHaveText: ['what you show', 'team/process', 'brand'],
    indianElements: ['candid style', 'warm tones'],
    headline_style: 'casual, friendly, curious',
    example_headlines: [
      'YEH JAADU KAISE HOTA HAI?',
      'PARDE KE PEECHE KUCH AISA HAI!',
      'HAMARE KITCHEN MEIN AAO!',
    ],
  },
};

module.exports = {
  CATEGORY_PROFILES,
  FESTIVALS_2026,
  CAROUSEL_ARC,
  DESIGN_TRENDS_2026,
  CONTENT_CONFIGS,
  CATEGORY_DESIGN_RULES,
  getCurrentSeason,
  getNearestFestival,
  getFestivalStatus,
  getFestivalByName,
  detectCategory,
  buildCanvaQuery,
  getDesignTrend,
  getLearnedBoost,
};
