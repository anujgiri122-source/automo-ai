/**
 * flyerService.js — 3-Layer Premium Flyer Generator
 *
 * Layer 1: dall-e-2 FULL SCENE background (wide-angle, ultra-realistic per business type)
 * Layer 2: Transparent SVG icon overlays placed at corners (scissors, dumbbell, coffee cup, etc.)
 * Layer 3: Text — business name (glassmorphism card), offer band, CTA pill
 * Bonus:   Radial spotlight vignette — center bright → edges dark
 *
 * generateFlyer(postData, brandKit) → { buffer, base64, mimeType, width, height, postType, format }
 */

'use strict';

const puppeteer = require('puppeteer');

const AICREDITS_URL = 'https://api.aicredits.in/v1/images/generations';
const CHROME_PATH   = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

// ─── Utilities ────────────────────────────────────────────────────────────────

function getDimensions(format) {
  if (format === 'story' || format === 'reel_cover') return { width: 1080, height: 1920 };
  return { width: 1080, height: 1080 };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgToDataUrl(svgString) {
  const clean = svgString.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
}

// ─── Business-type aliases ────────────────────────────────────────────────────

const BUSINESS_ALIASES = {
  hair_beauty_salon: 'salon', beauty_salon: 'salon', beauty: 'salon',
  fitness: 'gym', fitness_centre: 'gym',
  food: 'cafe', coffee: 'cafe',
  shop: 'retail', clothing: 'retail', saree_shop: 'retail', bike_shop: 'retail',
  health: 'doctor', clinic: 'doctor',
  tuition: 'coaching', school: 'coaching',
};

// ─── Per-business color schemes ───────────────────────────────────────────────

const BUSINESS_COLOR_SCHEMES = {
  salon:      { bgDark: '#1a0a1a', bgLight: '#2d1b2d', accent: '#FF6B9D', accentGlow: 'rgba(255,107,157,0.55)' },
  gym:        { bgDark: '#0a0a0a', bgLight: '#1a1a1a', accent: '#FFD700', accentGlow: 'rgba(255,215,0,0.55)'   },
  cafe:       { bgDark: '#1a0a00', bgLight: '#2d1800', accent: '#D4A017', accentGlow: 'rgba(212,160,23,0.55)'  },
  restaurant: { bgDark: '#0a1a00', bgLight: '#1a2d00', accent: '#FF6B00', accentGlow: 'rgba(255,107,0,0.55)'   },
  hotel:      { bgDark: '#0a0a1a', bgLight: '#1a1a2d', accent: '#C0A060', accentGlow: 'rgba(192,160,96,0.55)'  },
  retail:     { bgDark: '#0a001a', bgLight: '#1a0033', accent: '#A855F7', accentGlow: 'rgba(168,85,247,0.55)'  },
  doctor:     { bgDark: '#00101a', bgLight: '#001a2d', accent: '#38BDF8', accentGlow: 'rgba(56,189,248,0.55)'  },
  coaching:   { bgDark: '#001a0a', bgLight: '#002d1a', accent: '#4ADE80', accentGlow: 'rgba(74,222,128,0.55)'  },
  default:    { bgDark: '#0a0a1a', bgLight: '#1a1a2d', accent: '#60A5FA', accentGlow: 'rgba(96,165,250,0.55)'  },
};

function getColorScheme(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return BUSINESS_COLOR_SCHEMES[key] || BUSINESS_COLOR_SCHEMES.default;
}

// ─── Human-readable taglines ──────────────────────────────────────────────────

const BUSINESS_TAGLINES = {
  salon:      'Hair & Beauty',
  gym:        'Fitness & Wellness',
  cafe:       'Coffee & Snacks',
  restaurant: 'Food & Dining',
  hotel:      'Hospitality & Luxury',
  retail:     'Shopping',
  doctor:     'Healthcare',
  coaching:   'Education',
  default:    'Professional Services',
};

function getTagline(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return BUSINESS_TAGLINES[key] || BUSINESS_TAGLINES.default;
}

// ─── Layer 1: Full-scene background prompts ───────────────────────────────────

const BACKGROUND_PROMPTS = {
  salon:      'Full luxury hair salon interior, pink and gold tones, professional photography, wide angle, dramatic lighting, bokeh background, ultra realistic, 8K quality, NO text, NO people',
  gym:        'Full modern gym interior, dark dramatic lighting, neon accents, equipment in background, wide angle, cinematic, ultra realistic, NO text, NO people',
  cafe:       'Full cozy Indian cafe interior, warm golden lighting, wooden furniture, coffee aroma feel, wide angle, ultra realistic, NO text, NO people',
  restaurant: 'Full Indian restaurant interior, colorful food spread visible, warm lighting, rich colors, wide angle, ultra realistic, NO text, NO people',
  hotel:      'Full luxury 5 star hotel lobby, marble floors, chandelier, premium feel, wide angle, cinematic, ultra realistic, NO text, NO people',
  retail:     'Full modern retail boutique interior, colorful products on shelves, bright lighting, wide angle, ultra realistic, NO text, NO people',
  doctor:     'Full modern medical clinic interior, clean white walls, professional equipment, bright lighting, wide angle, NO text, NO people',
  coaching:   'Full bright modern classroom or study room, books and whiteboards, inspiring environment, wide angle, ultra realistic, NO text, NO people',
  default:    'Full elegant modern business interior, clean professional space, wide angle, dramatic lighting, ultra realistic, NO text, NO people',
};

function getBackgroundPrompt(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return BACKGROUND_PROMPTS[key] || BACKGROUND_PROMPTS.default;
}

// ─── Layer 2: SVG icon definitions (transparent, white, corner overlays) ─────

const SVG_ICONS = {

  scissors: `<svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.88" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="40" cy="40" r="30"/>
      <circle cx="40" cy="118" r="30"/>
      <circle cx="40" cy="40" r="10" fill="white" opacity="0.55" stroke="none"/>
      <circle cx="40" cy="118" r="10" fill="white" opacity="0.55" stroke="none"/>
      <line x1="62" y1="57" x2="152" y2="20"/>
      <line x1="62" y1="101" x2="152" y2="138"/>
    </g>
  </svg>`,

  flower: `<svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.85">
      <ellipse cx="80" cy="28" rx="24" ry="40" fill="white"/>
      <ellipse cx="80" cy="132" rx="24" ry="40" fill="white"/>
      <ellipse cx="28" cy="80" rx="40" ry="24" fill="white"/>
      <ellipse cx="132" cy="80" rx="40" ry="24" fill="white"/>
      <ellipse cx="43" cy="43" rx="24" ry="40" fill="white" transform="rotate(45 43 43)"/>
      <ellipse cx="117" cy="43" rx="24" ry="40" fill="white" transform="rotate(-45 117 43)"/>
      <ellipse cx="43" cy="117" rx="24" ry="40" fill="white" transform="rotate(-45 43 117)"/>
      <ellipse cx="117" cy="117" rx="24" ry="40" fill="white" transform="rotate(45 117 117)"/>
      <circle cx="80" cy="80" r="26" fill="#FFB6C1"/>
      <circle cx="80" cy="80" r="13" fill="#FF69B4"/>
    </g>
  </svg>`,

  dumbbell: `<svg width="200" height="90" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90" fill="white">
      <rect x="72" y="36" width="56" height="18" rx="9"/>
      <rect x="4" y="16" width="26" height="58" rx="11"/>
      <rect x="28" y="24" width="44" height="42" rx="7"/>
      <rect x="128" y="24" width="44" height="42" rx="7"/>
      <rect x="170" y="16" width="26" height="58" rx="11"/>
    </g>
  </svg>`,

  fire: `<svg width="100" height="160" viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90">
      <path d="M50 155 Q8 118 16 75 Q26 32 50 10 Q44 46 62 52 Q54 24 84 6 Q96 52 78 80 Q90 68 90 88 Q90 124 50 155 Z" fill="white"/>
      <path d="M50 145 Q20 116 28 85 Q40 58 50 48 Q46 72 62 78 Q58 100 50 145 Z" fill="rgba(255,160,40,0.65)"/>
    </g>
  </svg>`,

  coffee_cup: `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90">
      <g fill="none" stroke="white" stroke-width="6" stroke-linecap="round">
        <path d="M30 24 Q38 12 30 2"/>
        <path d="M58 24 Q66 12 58 2"/>
        <path d="M86 24 Q94 12 86 2"/>
      </g>
      <path d="M12 34 L22 116 Q70 132 118 116 L128 34 Z" fill="white"/>
      <ellipse cx="70" cy="120" rx="62" ry="14" fill="white"/>
      <path d="M118 60 Q148 60 148 78 Q148 98 118 98" stroke="white" stroke-width="10" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`,

  steam: `<svg width="100" height="130" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.72" stroke="white" stroke-width="7" fill="none" stroke-linecap="round">
      <path d="M22 124 Q8 95 22 66 Q36 37 22 8"/>
      <path d="M50 124 Q36 95 50 66 Q64 37 50 8"/>
      <path d="M78 124 Q64 95 78 66 Q92 37 78 8"/>
    </g>
  </svg>`,

  spice: `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.88">
      <polygon points="70,5 84,50 132,50 95,77 110,122 70,96 30,122 45,77 8,50 56,50" fill="white"/>
    </g>
  </svg>`,

  leaf: `<svg width="130" height="140" viewBox="0 0 130 140" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90">
      <path d="M65 130 Q14 90 24 30 Q65 4 106 30 Q116 90 65 130 Z" fill="white"/>
      <line x1="65" y1="130" x2="65" y2="26" stroke="rgba(0,130,0,0.7)" stroke-width="4"/>
      <line x1="65" y1="88" x2="36" y2="66" stroke="rgba(0,130,0,0.6)" stroke-width="3"/>
      <line x1="65" y1="70" x2="94" y2="52" stroke="rgba(0,130,0,0.6)" stroke-width="3"/>
      <line x1="65" y1="52" x2="42" y2="40" stroke="rgba(0,130,0,0.5)" stroke-width="2"/>
    </g>
  </svg>`,

  diamond: `<svg width="140" height="130" viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90">
      <polygon points="70,4 128,44 106,122 34,122 12,44" fill="none" stroke="white" stroke-width="4"/>
      <polygon points="70,4 128,44 70,34" fill="white" opacity="0.95"/>
      <polygon points="128,44 106,122 70,58" fill="white" opacity="0.65"/>
      <polygon points="34,122 12,44 70,58" fill="white" opacity="0.75"/>
      <polygon points="106,122 34,122 70,58" fill="white" opacity="0.85"/>
      <line x1="12" y1="44" x2="128" y2="44" stroke="white" stroke-width="3"/>
    </g>
  </svg>`,

  crown: `<svg width="170" height="120" viewBox="0 0 170 120" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.90" fill="white">
      <polygon points="10,108 20,32 58,68 85,8 112,68 150,32 160,108"/>
      <rect x="10" y="97" width="150" height="18" rx="7"/>
      <circle cx="85" cy="10" r="9"/>
      <circle cx="20" cy="34" r="7"/>
      <circle cx="150" cy="34" r="7"/>
    </g>
  </svg>`,

  lightning: `<svg width="96" height="160" viewBox="0 0 96 160" xmlns="http://www.w3.org/2000/svg">
    <polygon points="56,4 10,86 46,86 40,156 86,66 50,66" fill="white" opacity="0.90"/>
  </svg>`,
};

// ─── Icon pair assignments per business type ──────────────────────────────────

const BUSINESS_ICONS = {
  salon:      ['scissors',    'flower'   ],
  gym:        ['dumbbell',    'fire'     ],
  cafe:       ['coffee_cup',  'steam'    ],
  restaurant: ['spice',       'leaf'     ],
  hotel:      ['diamond',     'crown'    ],
  retail:     ['diamond',     'lightning'],
  doctor:     ['leaf',        'flower'   ],
  coaching:   ['lightning',   'leaf'     ],
  default:    ['diamond',     'flower'   ],
};

function getBusinessIcons(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return BUSINESS_ICONS[key] || BUSINESS_ICONS.default;
}

// ─── Fallback background (SVG gradient, no API needed) ────────────────────────

function buildFallbackBgDataUrl(colors) {
  const { bgDark, bgLight, accent } = colors;
  const svg = `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="${bgLight}"/>
        <stop offset="55%" stop-color="${bgDark}"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="40%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#bg)"/>
    <rect width="1080" height="1080" fill="url(#glow)"/>
  </svg>`;
  return svgToDataUrl(svg);
}

// ─── Layer 1: Generate AI full-scene background via dall-e-2 ─────────────────

async function generateBackgroundImage(businessType) {
  const apiKey = process.env.AICREDITS_API_KEY;
  if (!apiKey) throw new Error('AICREDITS_API_KEY not set in environment');

  const prompt = getBackgroundPrompt(businessType);
  console.log(`[FlyerService] dall-e-2 background | business:${businessType}`);
  console.log(`[FlyerService] Prompt: ${prompt.substring(0, 80)}...`);

  const res = await fetch(AICREDITS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'dall-e-2', prompt, n: 1, size: '1024x1024' }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AiCredits API ${res.status}: ${errText.substring(0, 300)}`);
  }

  const json     = await res.json();
  const imageUrl = json?.data?.[0]?.url;
  if (!imageUrl) throw new Error('AiCredits response missing image URL');

  console.log('[FlyerService] Downloading background image...');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);

  const buf = Buffer.from(await imgRes.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// ─── Extract texts from postData + brandKit ───────────────────────────────────

function extractTexts(postData, brandKit) {
  const kd = postData.key_details || {};

  let offerText = '';
  if (kd.offer_percentage) {
    offerText = `${kd.offer_percentage}% OFF`;
  } else if (kd.service_name) {
    offerText = kd.service_name.toUpperCase();
  } else if (kd.discount) {
    offerText = String(kd.discount).toUpperCase();
  } else {
    const firstChunk = (postData.caption || '').split(/[!\n.]/)[0].trim();
    offerText = firstChunk.length <= 30
      ? firstChunk.toUpperCase()
      : firstChunk.substring(0, 27).toUpperCase() + '…';
  }

  const sentences = (postData.caption || '')
    .split(/[!\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  let subtitle = '';
  if (kd.day) {
    subtitle = `${kd.day} Special — All Services`;
  } else if (sentences.length >= 2) {
    const s = sentences[1];
    subtitle = s.length <= 60 ? s : s.substring(0, 57) + '…';
  } else {
    subtitle = 'Limited Time Offer';
  }

  const rawCta  = sentences[sentences.length - 1] || '';
  const ctaText = rawCta.length <= 45 ? rawCta : 'DM us to book now!';

  return {
    businessName: brandKit.businessName || 'Your Business',
    tagline:      brandKit.tagline      || getTagline(brandKit.businessType),
    offerText,
    subtitle,
    ctaText,
    contact:      brandKit.contact || brandKit.website || '',
  };
}

// ─── Build 3-layer HTML template ─────────────────────────────────────────────

function buildFlyerHTML(bgDataUrl, icon1DataUrl, icon2DataUrl, texts, colors, width, height) {
  const { businessName, tagline, offerText, subtitle, ctaText, contact } = texts;
  const { accent, accentGlow, bgDark } = colors;

  const isStory    = height > 1100;
  const nameFontSz = isStory ? 76  : 60;
  const offerFontSz = offerText.length > 10
    ? (isStory ? 82 : 68)
    : (isStory ? 112 : 92);
  const iconLarge  = isStory ? 180 : 148;
  const iconSmall  = isStory ? 136 : 110;
  const pad        = isStory ? 60  : 44;

  // Accent glow with reduced opacity for center radial (subtle color bloom)
  const accentBloom = accentGlow.replace(/[\d.]+\)$/, '0.14)');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }

body {
  width: ${width}px;
  height: ${height}px;
  position: relative;
  overflow: hidden;
  font-family: 'Montserrat', Arial, sans-serif;
}

/* ═══ Layer 1: AI Background ═══ */
.bg-layer {
  position: absolute;
  inset: 0;
  background-image: url('${bgDataUrl}');
  background-size: cover;
  background-position: center;
  z-index: 0;
}

/* ═══ Spotlight Vignette: center bright → edges dark ═══ */
.spotlight {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center,
    rgba(0,0,0,0.04) 0%,
    rgba(0,0,0,0.40) 50%,
    rgba(0,0,0,0.82) 100%
  );
  z-index: 1;
}

/* ═══ Accent color bloom from center ═══ */
.color-bloom {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center,
    ${accentBloom} 0%,
    transparent 58%
  );
  z-index: 2;
}

/* ═══ Layer 2: Corner icon overlays ═══ */
.corner-icon {
  position: absolute;
  z-index: 3;
}
.icon-tl {
  top: 16px; left: 16px;
  width: ${iconLarge}px;
  opacity: 0.72;
  transform: rotate(-12deg);
  filter: drop-shadow(0 0 16px ${accent});
}
.icon-tr {
  top: 16px; right: 16px;
  width: ${iconLarge}px;
  opacity: 0.72;
  transform: rotate(12deg) scaleX(-1);
  filter: drop-shadow(0 0 16px ${accent});
}
.icon-bl {
  bottom: 16px; left: 16px;
  width: ${iconSmall}px;
  opacity: 0.48;
  transform: rotate(8deg);
  filter: drop-shadow(0 0 10px ${accent});
}
.icon-br {
  bottom: 16px; right: 16px;
  width: ${iconSmall}px;
  opacity: 0.48;
  transform: rotate(-8deg) scaleX(-1);
  filter: drop-shadow(0 0 10px ${accent});
}

/* ═══ Layer 3: Text content ═══ */
.content {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: ${pad}px ${pad + 24}px;
}

/* Glassmorphism name card */
.name-card {
  background: rgba(0,0,0,0.60);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1.5px solid rgba(255,255,255,0.20);
  border-top: 3px solid ${accent}99;
  border-radius: 24px;
  padding: ${isStory ? 28 : 22}px ${isStory ? 52 : 44}px;
  text-align: center;
  width: 100%;
}
.business-name {
  font-size: ${nameFontSz}px;
  font-weight: 900;
  color: white;
  letter-spacing: 4px;
  text-transform: uppercase;
  line-height: 1.1;
  text-shadow: 0 2px 28px rgba(0,0,0,0.95);
}
.tagline {
  font-size: ${isStory ? 22 : 18}px;
  color: ${accent};
  letter-spacing: 7px;
  text-transform: uppercase;
  margin-top: 10px;
  text-shadow: 0 0 24px ${accent}bb;
}

/* Offer band */
.offer-band {
  background: ${accent};
  color: ${bgDark};
  font-size: ${offerFontSz}px;
  font-weight: 900;
  padding: 12px 52px;
  border-radius: 14px;
  letter-spacing: 4px;
  text-align: center;
  width: 100%;
  box-shadow: 0 0 52px ${accentGlow}, 0 8px 28px rgba(0,0,0,0.55);
}

.offer-subtitle {
  font-size: ${isStory ? 30 : 24}px;
  color: white;
  text-align: center;
  opacity: 0.96;
  letter-spacing: 1px;
  text-shadow: 0 1px 16px rgba(0,0,0,0.95);
}

/* CTA pill */
.cta-btn {
  background: white;
  color: #111;
  font-size: ${isStory ? 32 : 26}px;
  font-weight: 700;
  padding: ${isStory ? 22 : 18}px ${isStory ? 68 : 54}px;
  border-radius: 60px;
  letter-spacing: 1.5px;
  white-space: nowrap;
  box-shadow: 0 8px 36px rgba(0,0,0,0.60);
}

.contact {
  font-size: ${isStory ? 24 : 20}px;
  color: ${accent};
  letter-spacing: 2.5px;
  text-shadow: 0 0 18px rgba(0,0,0,0.95);
}
</style>
</head>
<body>

<!-- ═══ Layer 1: AI Background ═══ -->
<div class="bg-layer"></div>

<!-- Spotlight vignette (center bright → edges dark) -->
<div class="spotlight"></div>

<!-- Accent color bloom -->
<div class="color-bloom"></div>

<!-- ═══ Layer 2: Corner icon overlays ═══ -->
<img src="${icon1DataUrl}" class="corner-icon icon-tl" />
<img src="${icon2DataUrl}" class="corner-icon icon-tr" />
<img src="${icon2DataUrl}" class="corner-icon icon-bl" />
<img src="${icon1DataUrl}" class="corner-icon icon-br" />

<!-- ═══ Layer 3: Text ═══ -->
<div class="content">
  <div class="name-card">
    <div class="business-name">${escapeHtml(businessName)}</div>
    <div class="tagline">${escapeHtml(tagline)}</div>
  </div>
  <div class="offer-band">${escapeHtml(offerText)}</div>
  <div class="offer-subtitle">${escapeHtml(subtitle)}</div>
  <div class="cta-btn">${escapeHtml(ctaText)}</div>
  ${contact ? `<div class="contact">${escapeHtml(contact)}</div>` : ''}
</div>

</body>
</html>`;
}

// ─── Puppeteer renders HTML → PNG buffer ──────────────────────────────────────

async function renderWithPuppeteer(html, width, height) {
  console.log(`[FlyerService] Puppeteer render | ${width}×${height}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--enable-features=BackdropFilter',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pngBuffer = await page.screenshot({
      type:           'png',
      clip:           { x: 0, y: 0, width, height },
      omitBackground: false,
    });

    return Buffer.from(pngBuffer);
  } finally {
    await browser.close();
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {object} postData  — { caption, detected_post_type, format, key_details }
 * @param {object} brandKit  — { businessName, businessType, tagline?, contact? }
 * @returns {{ buffer, base64, mimeType, width, height, postType, format }}
 */
async function generateFlyer(postData, brandKit) {
  const format   = postData.format || 'single';
  const postType = postData.detected_post_type || postData.postType || 'offer_discount';
  const { width, height } = getDimensions(format);
  const bizType  = brandKit.businessType || 'default';
  const colors   = getColorScheme(bizType);
  const [iconKey1, iconKey2] = getBusinessIcons(bizType);

  console.log(`[FlyerService] ─── Start ───────────────────────────────────`);
  console.log(`[FlyerService] type:${postType} | biz:${bizType} | ${width}×${height}`);
  console.log(`[FlyerService] Icons: ${iconKey1} + ${iconKey2}`);

  // ── Layer 1: Generate AI full-scene background ──
  let bgDataUrl;
  try {
    bgDataUrl = await generateBackgroundImage(bizType);
    console.log('[FlyerService] AI background ready');
  } catch (err) {
    console.warn('[FlyerService] dall-e-2 failed → gradient fallback:', err.message);
    bgDataUrl = buildFallbackBgDataUrl(colors);
  }

  // ── Layer 2: Build icon data URLs (synchronous SVG → data URL) ──
  const icon1DataUrl = svgToDataUrl(SVG_ICONS[iconKey1] || SVG_ICONS.diamond);
  const icon2DataUrl = svgToDataUrl(SVG_ICONS[iconKey2] || SVG_ICONS.flower);
  console.log('[FlyerService] Icon overlays ready');

  // ── Layer 3 + Spotlight: Build HTML template ──
  const texts = extractTexts(postData, brandKit);
  const html  = buildFlyerHTML(bgDataUrl, icon1DataUrl, icon2DataUrl, texts, colors, width, height);

  // ── Render with Puppeteer ──
  const finalBuffer = await renderWithPuppeteer(html, width, height);

  console.log(`[FlyerService] Done | ${Math.round(finalBuffer.length / 1024)}KB`);
  console.log(`[FlyerService] ─── End ─────────────────────────────────────`);

  return {
    buffer:   finalBuffer,
    base64:   finalBuffer.toString('base64'),
    mimeType: 'image/png',
    width,
    height,
    postType,
    format,
  };
}

module.exports = { generateFlyer };

// ─── Self-test: all 5 business types ─────────────────────────────────────────

if (require.main === module) {
  require('dotenv').config();
  const fs   = require('fs');
  const path = require('path');

  const TEST_CASES = [
    {
      postData: {
        caption:            'Sunday special 50% off on haircut! Book now — limited slots!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { offer_percentage: 50, day: 'Sunday' },
      },
      brandKit: {
        businessName: 'RAJESH SALON',
        businessType: 'salon',
        tagline:      'Hair & Beauty',
        contact:      'Call: 98765 43210',
      },
    },
    {
      postData: {
        caption:            'New year new gains! 40% off on monthly membership! Join today — first 20 only!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { offer_percentage: 40 },
      },
      brandKit: {
        businessName: 'IRONCLAD FITNESS',
        businessType: 'gym',
        contact:      'DM to join now',
      },
    },
    {
      postData: {
        caption:            'Weekend brunch special — buy 2 get 1 free on all coffees! See you at Aroma Cafe!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { service_name: 'Buy 2 Get 1', day: 'Weekend' },
      },
      brandKit: {
        businessName: 'AROMA CAFE',
        businessType: 'cafe',
        contact:      'Visit us on MG Road',
      },
    },
    {
      postData: {
        caption:            'Grand Thali offer — full meal at just 149 rupees! Authentic Indian flavours! Book a table now!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { discount: '149 THALI' },
      },
      brandKit: {
        businessName: 'SPICE GARDEN',
        businessType: 'restaurant',
        contact:      'Reservations: 98765 12345',
      },
    },
    {
      postData: {
        caption:            'Luxury weekend stay — 30% off! Experience world-class hospitality this season!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { offer_percentage: 30 },
      },
      brandKit: {
        businessName: 'THE GRAND PALACE',
        businessType: 'hotel',
        contact:      'Book: reservations@grandpalace.in',
      },
    },
  ];

  (async () => {
    console.log('═'.repeat(66));
    console.log(' 3-LAYER FLYER TEST — salon | gym | cafe | restaurant | hotel');
    console.log('═'.repeat(66));

    let passed = 0;
    let failed = 0;

    for (const tc of TEST_CASES) {
      const bizType = tc.brandKit.businessType;
      console.log(`\n▶ Testing: ${tc.brandKit.businessName} (${bizType})`);
      try {
        const result  = await generateFlyer(tc.postData, tc.brandKit);
        const outPath = path.join(__dirname, '..', `test-flyer-${bizType}.png`);
        fs.writeFileSync(outPath, result.buffer);
        console.log(`  ✓ Saved  : ${outPath}`);
        console.log(`  ✓ Size   : ${result.width}×${result.height} | ${Math.round(result.buffer.length / 1024)}KB`);
        passed++;
      } catch (err) {
        console.error(`  ✗ FAILED : ${err.message}`);
        failed++;
      }
    }

    console.log('\n' + '═'.repeat(66));
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═'.repeat(66));
    if (failed > 0) process.exit(1);
  })();
}
