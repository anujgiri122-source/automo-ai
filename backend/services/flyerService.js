/**
 * flyerService.js — AI Background + Sharp Compositing Flyer Generator
 *
 * generateFlyer(postData, brandKit) → { buffer, base64, width, height }
 *
 * postData   — output from postController.js
 * brandKit   — { businessName, primaryColor, secondaryColor, logoUrl, contact }
 */

'use strict';

const sharp = require('sharp');

const AICREDITS_URL = 'https://api.aicredits.in/v1/images/generations';

// ─── Utilities ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = (hex || '#FF6B35').replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function getDimensions(format) {
  if (format === 'story' || format === 'reel_cover') return { width: 1080, height: 1920 };
  return { width: 1080, height: 1080 };
}

// dall-e-2 only supports 256x256, 512x512, 1024x1024
function getApiSize() {
  return '1024x1024';
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxLen) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

// ─── Background prompts: businessType × postType matrix ──────────────────────

const NO_TEXT = 'NO text, NO words, NO letters, NO numbers, NO signs, NO watermarks, NO people';

const BACKGROUND_PROMPTS = {
  salon: {
    offer_discount:    `Luxury hair salon interior, soft pink and gold bokeh, scissors and hair accessories blurred background, premium beauty spa atmosphere, warm lighting, ${NO_TEXT}`,
    flash_sale:        `Dramatic beauty salon backdrop, bright spotlight on empty styling chair, rose gold and pink tones, high-energy sale atmosphere, ${NO_TEXT}`,
    festival_post:     `Indian festive decoration, marigold flowers, diyas, soft golden light, elegant beauty salon backdrop, rangoli patterns, ${NO_TEXT}`,
    seasonal_promo:    `Seasonal salon decoration, soft floral arrangement, pastel spring or warm autumn tones, premium beauty backdrop, ${NO_TEXT}`,
    product_launch:    `Luxury beauty products arrangement, marble surface, clean white background, premium hair care products blurred, rose gold accents, ${NO_TEXT}`,
    educational_tips:  `Clean white marble surface, hair care products arranged aesthetically, minimal modern salon, soft shadows, ${NO_TEXT}`,
    testimonial:       `Soft pink bokeh salon interior, five-star luxury beauty atmosphere, warm flattering light, elegant and trustworthy, ${NO_TEXT}`,
    before_after:      `Split beauty transformation background, left muted soft tones, right vibrant glamorous, premium salon aesthetic, ${NO_TEXT}`,
    behind_the_scenes: `Authentic Indian hair salon workspace, styling tools on counter, warm professional lighting, real salon atmosphere, ${NO_TEXT}`,
    team_spotlight:    `Modern salon interior, bright airy space, styling stations visible, professional beauty environment, ${NO_TEXT}`,
    announcement:      `Elegant salon reveal background, soft spotlight, pink and gold tones, premium beauty studio feel, ${NO_TEXT}`,
    brand_story:       `Warm nostalgic Indian salon, vintage beauty tools, soft heritage lighting, personal and emotional atmosphere, ${NO_TEXT}`,
    giveaway:          `Luxury beauty gift set arrangement, pink ribbon and gold confetti, premium salon products, celebration feel, ${NO_TEXT}`,
    referral_program:  `Elegant salon loyalty aesthetic, pink and gold tones, beauty community warmth, premium feel, ${NO_TEXT}`,
    poll_question:     `Playful salon interior, colorful hair swatches, fun beauty debate atmosphere, bright and inviting, ${NO_TEXT}`,
    restock_alert:     `Premium salon shelves with hair products, beautifully arranged, soft professional lighting, ${NO_TEXT}`,
    collaboration:     `Two elegant beauty brands merging, soft pink tones, flowers and beauty products, premium aesthetic, ${NO_TEXT}`,
    local_targeting:   `Warm Indian local salon street-facing, inviting entrance, community feel, soft neighborhood atmosphere, ${NO_TEXT}`,
    meme_entertainment:`Fun playful beauty salon, colorful hair dye swatches, lighthearted and relatable salon vibes, ${NO_TEXT}`,
    how_it_works:      `Clean minimal salon process background, soft step-by-step visual, white and pink tones, professional, ${NO_TEXT}`,
  },

  gym: {
    offer_discount:    `Modern gym equipment, dark dramatic lighting, energy and power, blurred weights and machines background, neon accent lights, ${NO_TEXT}`,
    flash_sale:        `Explosive gym energy, bright spotlight on barbell, electric blue and orange tones, maximum urgency and power, ${NO_TEXT}`,
    festival_post:     `Energetic colorful confetti, fitness motivation, dynamic bold background, vibrant celebration, ${NO_TEXT}`,
    seasonal_promo:    `Gym seasonal energy, bold dark tones, dynamic lighting, powerful athletic atmosphere, ${NO_TEXT}`,
    product_launch:    `Premium gym supplement or equipment on dark pedestal, spotlight reveal, bold dramatic reveal, ${NO_TEXT}`,
    educational_tips:  `Clean gym floor, training equipment arranged, professional athletic setting, crisp and motivational, ${NO_TEXT}`,
    testimonial:       `Strong gym atmosphere, dark motivational background, achievement and success energy, ${NO_TEXT}`,
    before_after:      `Gym transformation split background, left dim and soft, right powerful and vibrant, motivational energy, ${NO_TEXT}`,
    behind_the_scenes: `Real gym interior, equipment in use blurred, authentic workout atmosphere, raw and energetic, ${NO_TEXT}`,
    team_spotlight:    `Professional gym trainer background, bold sports setting, team and community energy, ${NO_TEXT}`,
    announcement:      `Bold gym announcement background, explosive energy, spotlight and power rays, athletic vibe, ${NO_TEXT}`,
    brand_story:       `Gym origin story background, gritty authentic training floor, passion and hard work, ${NO_TEXT}`,
    giveaway:          `Gym contest prize setup, bold colors, championship belt or trophy, winner energy, ${NO_TEXT}`,
    referral_program:  `Gym community energy, team workout atmosphere, friendship and fitness warmth, ${NO_TEXT}`,
    poll_question:     `Fun gym debate backdrop, dumbbells vs barbells, colorful athletic energy, ${NO_TEXT}`,
    restock_alert:     `Gym product shelf, supplements and equipment, clean professional display, ${NO_TEXT}`,
    collaboration:     `Two fitness brands synergy, bold energetic backdrop, power partnership, ${NO_TEXT}`,
    local_targeting:   `Local gym street view, community fitness center, welcoming neighborhood feel, ${NO_TEXT}`,
    meme_entertainment:`Funny gym scene, relatable workout humor, bold colorful background, ${NO_TEXT}`,
    how_it_works:      `Step-by-step gym process, clean bold layout, athletic and professional, ${NO_TEXT}`,
  },

  cafe: {
    offer_discount:    `Cozy cafe interior, coffee cup steam rising, warm brown and cream tones, bokeh fairy lights, wooden table surface, ${NO_TEXT}`,
    flash_sale:        `Urgent cafe deal energy, bright spotlight on coffee cup, warm amber tones, limited time feel, ${NO_TEXT}`,
    festival_post:     `Indian festival cafe decoration, warm atmosphere, diyas and marigold flowers, chai and sweets, cozy festive vibe, ${NO_TEXT}`,
    seasonal_promo:    `Seasonal cafe menu backdrop, warm spiced tones, autumn leaves or monsoon rain outside window, cozy, ${NO_TEXT}`,
    product_launch:    `New cafe item reveal, clean wooden surface, food photography style, premium presentation, ${NO_TEXT}`,
    educational_tips:  `Cafe knowledge aesthetic, coffee beans and brewing equipment, warm minimal, barista craft, ${NO_TEXT}`,
    testimonial:       `Happy cafe corner, cozy seating, warm light, five-star hospitality feel, ${NO_TEXT}`,
    before_after:      `Cafe transformation, old vs new interior, warm inviting upgrade, ${NO_TEXT}`,
    behind_the_scenes: `Real cafe kitchen or brewing station, authentic barista workspace, steam and craft, ${NO_TEXT}`,
    team_spotlight:    `Warm cafe counter, friendly service atmosphere, professional barista setting, ${NO_TEXT}`,
    announcement:      `Exciting cafe news backdrop, warm spotlight, coffee and celebration feel, ${NO_TEXT}`,
    brand_story:       `Original chai stall to modern cafe, nostalgic warm tones, Indian coffee culture journey, ${NO_TEXT}`,
    giveaway:          `Cafe prize arrangement, free coffee and snacks, warm cozy contest feel, ${NO_TEXT}`,
    referral_program:  `Cafe loyalty warmth, friends sharing coffee, community and chai, ${NO_TEXT}`,
    poll_question:     `Fun cafe debate, chai vs coffee, warm playful atmosphere, ${NO_TEXT}`,
    restock_alert:     `Cafe ingredient or product display, fresh and abundant, warm professional, ${NO_TEXT}`,
    collaboration:     `Two cafe brands or food collab, warm inviting backdrop, delicious synergy, ${NO_TEXT}`,
    local_targeting:   `Local neighborhood cafe, street-facing warm entrance, community gathering spot, ${NO_TEXT}`,
    meme_entertainment:`Relatable cafe humor, coffee addict vibes, warm funny background, ${NO_TEXT}`,
    how_it_works:      `Cafe ordering process, clean warm steps, professional and inviting, ${NO_TEXT}`,
  },

  restaurant: {
    offer_discount:    `Indian food spread, colorful spices and dishes, warm restaurant lighting, blurred background, appetizing atmosphere, ${NO_TEXT}`,
    flash_sale:        `Urgent restaurant deal, bright food close-up, warm red and gold tones, appetizing urgency, ${NO_TEXT}`,
    festival_post:     `Indian festival feast setup, traditional thali, diyas and flowers, warm golden celebration, ${NO_TEXT}`,
    seasonal_promo:    `Seasonal Indian restaurant special, seasonal ingredients displayed, warm culinary atmosphere, ${NO_TEXT}`,
    product_launch:    `New dish reveal on premium plate, dramatic food photography lighting, restaurant launch, ${NO_TEXT}`,
    educational_tips:  `Indian spices and ingredients arranged beautifully, culinary knowledge, clean backdrop, ${NO_TEXT}`,
    testimonial:       `Satisfied dining atmosphere, warm restaurant setting, five-star Indian hospitality, ${NO_TEXT}`,
    behind_the_scenes: `Indian restaurant kitchen, chefs working blurred, authentic culinary craft, ${NO_TEXT}`,
    announcement:      `Restaurant news backdrop, warm dining room spotlight, excitement and appetite, ${NO_TEXT}`,
    brand_story:       `Family restaurant heritage, traditional Indian cooking, warm nostalgic kitchen, ${NO_TEXT}`,
    giveaway:          `Restaurant free meal prize setup, beautifully plated food, celebration feel, ${NO_TEXT}`,
    local_targeting:   `Local Indian restaurant entrance, welcoming street-facing, community dining spot, ${NO_TEXT}`,
    default:           `Indian restaurant ambience, warm lighting, rich colors, appetizing atmosphere, ${NO_TEXT}`,
  },
  

  hotel: {
    offer_discount:    `Luxury hotel lobby, marble floors, elegant chandelier, premium hospitality feel, soft gold tones, ${NO_TEXT}`,
    flash_sale:        `Premium hotel room reveal, luxurious bedding, dramatic spotlight, exclusive deal energy, ${NO_TEXT}`,
    festival_post:     `Grand hotel festival decoration, marigold and lights, premium Indian hospitality, celebration, ${NO_TEXT}`,
    seasonal_promo:    `Luxury hotel seasonal offer, resort pool or mountain view, premium escape feel, ${NO_TEXT}`,
    product_launch:    `New hotel amenity or suite reveal, luxury spotlight, premium and exclusive, ${NO_TEXT}`,
    testimonial:       `Five-star hotel atmosphere, plush premium setting, world-class hospitality feel, ${NO_TEXT}`,
    brand_story:       `Heritage hotel origin, classic Indian architecture, timeless hospitality story, ${NO_TEXT}`,
    announcement:      `Grand hotel announcement, luxury spotlight, prestigious and elegant, ${NO_TEXT}`,
    local_targeting:   `Boutique hotel exterior, charming local landmark, premium neighborhood presence, ${NO_TEXT}`,
    default:           `Luxury hotel ambience, marble and gold, premium Indian hospitality, ${NO_TEXT}`,
  },

  retail: {
    offer_discount:    `Indian retail store product display, festive sale decoration, bright lights and color, shopping excitement, ${NO_TEXT}`,
    flash_sale:        `Flash sale retail energy, bold product spotlights, urgent shopping atmosphere, vibrant colors, ${NO_TEXT}`,
    festival_post:     `Indian festival shopping, Diwali or Navratri decoration, vibrant retail celebration, ${NO_TEXT}`,
    seasonal_promo:    `Seasonal retail display, well-arranged products, festive shopping atmosphere, ${NO_TEXT}`,
    product_launch:    `New product on clean retail display, spotlight reveal, premium retail presentation, ${NO_TEXT}`,
    restock_alert:     `Freshly stocked retail shelves, products neatly arranged, abundance and availability, ${NO_TEXT}`,
    testimonial:       `Happy retail shopping environment, bright store atmosphere, customer satisfaction feel, ${NO_TEXT}`,
    announcement:      `Retail store news backdrop, bright spotlight, exciting new arrival energy, ${NO_TEXT}`,
    local_targeting:   `Local Indian shop exterior, warm welcoming entrance, community retail charm, ${NO_TEXT}`,
    default:           `Clean Indian retail display, colorful product arrangement, professional shop atmosphere, ${NO_TEXT}`,
  },

  doctor: {
    offer_discount:    `Clean medical clinic interior, soft blue and white tones, professional healthcare atmosphere, ${NO_TEXT}`,
    festival_post:     `Healthcare wellness celebration, soft professional tones, health and happiness theme, ${NO_TEXT}`,
    educational_tips:  `Medical information backdrop, clean clinical aesthetic, trustworthy healthcare feel, ${NO_TEXT}`,
    testimonial:       `Warm patient-friendly clinic, soft professional lighting, trust and care atmosphere, ${NO_TEXT}`,
    announcement:      `Medical clinic news backdrop, clean professional setting, important healthcare feel, ${NO_TEXT}`,
    default:           `Professional medical clinic, clean white and blue, calm trustworthy atmosphere, ${NO_TEXT}`,
  },

  coaching: {
    offer_discount:    `Academic coaching backdrop, books and stationery, bright motivational atmosphere, ${NO_TEXT}`,
    festival_post:     `Educational celebration, student achievement, bright inspirational feel, ${NO_TEXT}`,
    educational_tips:  `Clean study desk setup, books and notes, focused learning environment, ${NO_TEXT}`,
    testimonial:       `Student success atmosphere, bright academic setting, achievement and pride feel, ${NO_TEXT}`,
    announcement:      `Academic announcement backdrop, bright educational energy, results and success, ${NO_TEXT}`,
    default:           `Educational coaching atmosphere, books and learning, bright inspirational background, ${NO_TEXT}`,
  },

  default: {
    offer_discount:    `Professional business sale background, brand colors gradient, clean modern design, subtle bokeh pattern, ${NO_TEXT}`,
    flash_sale:        `Bold urgent sale background, spotlight and energy, professional modern urgency, ${NO_TEXT}`,
    festival_post:     `Indian festival celebration, diyas and marigolds, warm golden festive atmosphere, ${NO_TEXT}`,
    seasonal_promo:    `Seasonal promotion background, warm inviting gradient, professional modern design, ${NO_TEXT}`,
    product_launch:    `Clean product reveal background, spotlight on pedestal, premium modern presentation, ${NO_TEXT}`,
    educational_tips:  `Clean minimal knowledge background, soft gradient, professional and calm, ${NO_TEXT}`,
    testimonial:       `Warm trust background, soft bokeh, five-star professional atmosphere, ${NO_TEXT}`,
    before_after:      `Transformation split background, left muted right vibrant, professional contrast, ${NO_TEXT}`,
    giveaway:          `Celebration prize background, confetti and gold, winner energy, ${NO_TEXT}`,
    meme_entertainment:`Fun playful background, bright colors, relatable and entertaining, ${NO_TEXT}`,
    local_targeting:   `Local Indian business background, community warmth, professional neighborhood feel, ${NO_TEXT}`,
    announcement:      `Bold announcement background, spotlight and energy, professional excitement, ${NO_TEXT}`,
    brand_story:       `Warm storytelling background, nostalgic lighting, authentic brand atmosphere, ${NO_TEXT}`,
    how_it_works:      `Clean process background, minimal steps motif, modern professional, ${NO_TEXT}`,
    behind_the_scenes: `Authentic workspace background, real and candid professional atmosphere, ${NO_TEXT}`,
    team_spotlight:    `Professional team backdrop, clean modern interior, welcoming atmosphere, ${NO_TEXT}`,
    poll_question:     `Interactive engaging background, colorful debate atmosphere, fun professional, ${NO_TEXT}`,
    restock_alert:     `Back-in-stock background, shelves with products, scarcity and excitement, ${NO_TEXT}`,
    collaboration:     `Partnership harmony background, two elements merging, professional synergy, ${NO_TEXT}`,
    referral_program:  `Community sharing background, network warmth, referral chain, ${NO_TEXT}`,
  },
};

// Normalise businessType → key in BACKGROUND_PROMPTS
const BUSINESS_ALIASES = {
  hair_beauty_salon: 'salon', beauty_salon: 'salon', beauty: 'salon',
  fitness: 'gym', fitness_centre: 'gym',
  food: 'cafe', coffee: 'cafe',
  shop: 'retail', clothing: 'retail', saree_shop: 'retail', bike_shop: 'retail',
  health: 'doctor', clinic: 'doctor',
  tuition: 'coaching', school: 'coaching',
};

function buildBgPrompt(postType, primaryColor, businessType) {
  const bKey   = BUSINESS_ALIASES[businessType] || businessType || 'default';
  const bMap   = BACKGROUND_PROMPTS[bKey] || BACKGROUND_PROMPTS.default;
  const prompt = bMap[postType] || bMap.default || BACKGROUND_PROMPTS.default[postType] || BACKGROUND_PROMPTS.default.offer_discount;
  // Append color hint at the end so it influences but doesn't override the scene
  return `${prompt}, color palette accented with ${primaryColor}`;
}

// ─── Fallback gradient (if AI image API fails) ────────────────────────────────

async function buildGradientFallback(width, height, primaryColor, secondaryColor) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── Step A: Generate background via dall-e-2 on AiCredits ───────────────────

const BUSINESS_SIMPLE_PROMPTS = {
  salon:   'Luxury hair salon interior, pink roses, gold scissors, soft bokeh lighting, NO text, NO words, NO people',
  gym:     'Modern gym equipment, dark dramatic lighting, weights blurred background, energy feel, NO text, NO words',
  cafe:    'Cozy Indian cafe interior, coffee steam, warm brown lighting, wooden table, bokeh fairy lights, NO text, NO words',
  hotel:   'Luxury hotel lobby, marble floors, chandelier, premium feel, NO text, NO words',
  default: 'Professional business background, gradient colors, clean modern, NO text',
};

function getSimplePrompt(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return BUSINESS_SIMPLE_PROMPTS[key] || BUSINESS_SIMPLE_PROMPTS.default;
}

async function generateAiBackground(postType, brandKit, format) {
  const apiKey = process.env.AICREDITS_API_KEY;
  if (!apiKey) throw new Error('AICREDITS_API_KEY not set in environment');

  // Use detailed matrix prompt when available, fall back to simple business prompt
  let prompt = buildBgPrompt(postType, brandKit.primaryColor, brandKit.businessType || 'default');
  // If the matrix returned the generic fallback, use the simple business prompt instead
  if (!prompt || prompt.trim().length < 10) {
    prompt = getSimplePrompt(brandKit.businessType);
  }

  const size = getApiSize();
  console.log('[FlyerService] AiCredits dall-e-2 request | size:', size);

  const res = await fetch(AICREDITS_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:  'dall-e-2',
      prompt,
      n:      1,
      size,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AiCredits API ${res.status}: ${errText.substring(0, 300)}`);
  }

  const json = await res.json();
  const imageUrl = json?.data?.[0]?.url;
  if (!imageUrl) throw new Error('AiCredits response missing image URL');

  console.log('[FlyerService] Downloading generated image from AiCredits URL');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);

  const arrayBuf = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ─── Step B: Download logo to buffer ─────────────────────────────────────────

async function fetchLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await sharp(buf)
      .resize(80, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

// ─── Step C: Build text SVG (layers 4–7) ─────────────────────────────────────

function buildTextSVG(width, height, { businessName, offerText, ctaText, contact, secondaryColor }) {
  const mid          = height / 2;
  const offerLines   = wrapText(offerText, width > 1100 ? 22 : 16);
  const offerFontSz  = offerLines.length === 1 ? 100 : offerLines.length === 2 ? 78 : 62;
  const offerSpacing = offerFontSz * 1.25;
  const offerStartY  = mid - ((offerLines.length - 1) * offerSpacing) / 2;

  const ctaW  = Math.min(Math.max(ctaText.length * 18, 260), width - 80);
  const ctaX  = (width - ctaW) / 2;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">

  <!-- Layer 4: Business name (top center) -->
  <text x="${width / 2}" y="92"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="40" font-weight="bold" fill="white"
    filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.7))"
  >${escapeXml(businessName)}</text>

  <!-- Accent line under business name -->
  <rect x="${width / 2 - 70}" y="108" width="140" height="5" rx="3" fill="${secondaryColor}" opacity="0.95"/>

  <!-- Layer 5: Main offer text (center, large) -->
  ${offerLines.map((line, i) => `
  <text x="${width / 2}" y="${offerStartY + i * offerSpacing}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${offerFontSz}" font-weight="bold" fill="white"
    stroke="rgba(0,0,0,0.3)" stroke-width="3" paint-order="stroke"
    filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.6))"
  >${escapeXml(line)}</text>`).join('')}

  <!-- Layer 6: CTA pill (bottom) -->
  <rect x="${ctaX}" y="${height - 185}" width="${ctaW}" height="72" rx="36"
    fill="${secondaryColor}" opacity="0.95"/>
  <text x="${width / 2}" y="${height - 136}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="30" font-weight="bold" fill="white"
    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.4))"
  >${escapeXml(ctaText)}</text>

  <!-- Layer 7: Contact / website (very bottom) -->
  <text x="${width / 2}" y="${height - 52}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22" fill="rgba(255,255,255,0.85)"
    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.5))"
  >${escapeXml(contact)}</text>

</svg>`;
}

// ─── Extract offer / CTA texts from postData ──────────────────────────────────

function extractTexts(postData, brandKit) {
  const kd = postData.key_details || {};

  // Offer text: prefer key_details > caption first line
  let offerText = '';
  if (kd.offer_percentage) {
    offerText = `${kd.offer_percentage}% OFF`;
  } else if (kd.service_name) {
    offerText = kd.service_name.toUpperCase();
  } else if (kd.discount) {
    offerText = String(kd.discount).toUpperCase();
  } else {
    const firstChunk = (postData.caption || '').split(/[!\n.]/)[0].trim();
    offerText = firstChunk.length <= 50 ? firstChunk : firstChunk.substring(0, 47) + '…';
  }

  // CTA text: last sentence of caption (≤ 40 chars) or default
  const sentences = (postData.caption || '')
    .split(/[!\n]/)
    .map(s => s.trim())
    .filter(Boolean);
  const rawCta    = sentences[sentences.length - 1] || '';
  const ctaText   = rawCta.length <= 45 ? rawCta : 'DM us to book now!';

  return {
    businessName:   brandKit.businessName  || 'Your Business',
    offerText,
    ctaText,
    contact:        brandKit.contact || brandKit.website || '',
    secondaryColor: brandKit.secondaryColor || '#FFD700',
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {object} postData  — from postController: { caption, detected_post_type, format, key_details }
 * @param {object} brandKit  — { businessName, businessType, primaryColor, secondaryColor, logoUrl, contact }
 * @returns {{ buffer, base64, mimeType, width, height, postType, format }}
 */
async function generateFlyer(postData, brandKit) {
  const format   = postData.format || 'single';
  const postType = postData.detected_post_type || postData.postType || 'offer_discount';
  const { width, height } = getDimensions(format);
  const primary   = brandKit.primaryColor   || '#FF6B35';
  const secondary = brandKit.secondaryColor || '#FFD700';
  const primaryRgb = hexToRgb(primary);

  console.log(`[FlyerService] Start | type:${postType} | format:${format} | ${width}x${height}`);

  // ── Step A: AI background (with gradient fallback) ──
  let bgBuffer;
  try {
    const rawBg = await generateAiBackground(postType, { ...brandKit, primaryColor: primary }, format);
    bgBuffer = await sharp(rawBg).resize(width, height, { fit: 'cover' }).png().toBuffer();
    console.log('[FlyerService] AI background ready');
  } catch (err) {
    console.warn('[FlyerService] AI background failed → gradient fallback:', err.message);
    bgBuffer = await buildGradientFallback(width, height, primary, secondary);
  }

  // ── Step B: Logo (optional) ──
  const logoBuf = await fetchLogoBuffer(brandKit.logoUrl);

  // ── Step C: Composite ──
  const composites = [];

  // Layer 2: Brand color overlay at 40% opacity
  const overlay = await sharp({
    create: { width, height, channels: 4, background: { ...primaryRgb, alpha: 0.40 } },
  }).png().toBuffer();
  composites.push({ input: overlay, blend: 'over' });

  // Layer 3: Logo top-left (if present)
  if (logoBuf) {
    composites.push({ input: logoBuf, top: 20, left: 20, blend: 'over' });
  }

  // Layers 4–7: Text SVG
  const texts    = extractTexts(postData, brandKit);
  const textSvg  = buildTextSVG(width, height, texts);
  composites.push({ input: Buffer.from(textSvg), blend: 'over' });

  // ── Step D: Final PNG export ──
  const finalBuffer = await sharp(bgBuffer)
    .composite(composites)
    .png()
    .toBuffer();

  console.log(`[FlyerService] Done | ${finalBuffer.length} bytes`);

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

// ─── Self-test ────────────────────────────────────────────────────────────────

if (require.main === module) {
  require('dotenv').config();
  const fs   = require('fs');
  const path = require('path');

  const tests = [
    {
      label:   'TEST 1 — salon + offer_discount',
      outFile: '../test-flyer-salon-offer.png',
      postData: {
        caption:            'Sunday special 50% off on haircut! Book now — limited slots!',
        detected_post_type: 'offer_discount',
        format:             'single',
        key_details:        { offer_percentage: 50, day: 'Sunday' },
      },
      brandKit: {
        businessName:   'Rajesh Salon',
        businessType:   'salon',
        primaryColor:   '#FF6B6B',
        secondaryColor: '#4ECDC4',
        contact:        'Call: 98765 43210',
      },
    },
    {
      label:   'TEST 2 — cafe + festival_post',
      outFile: '../test-flyer-cafe-festival.png',
      postData: {
        caption:            'Diwali mubarak! Aao milke celebrate karein — special chai aur mithai waiting!',
        detected_post_type: 'festival_post',
        format:             'single',
        key_details:        {},
      },
      brandKit: {
        businessName:   'Chai Corner',
        businessType:   'cafe',
        primaryColor:   '#E67E22',
        secondaryColor: '#F1C40F',
        contact:        'www.chaicorner.in',
      },
    },
  ];

  (async () => {
    for (const t of tests) {
      console.log('\n' + '='.repeat(60));
      console.log(t.label);
      console.log('='.repeat(60));
      try {
        const result  = await generateFlyer(t.postData, t.brandKit);
        const outPath = path.join(__dirname, t.outFile);
        fs.writeFileSync(outPath, result.buffer);
        console.log('Saved:', outPath);
        console.log('Size:', result.width, 'x', result.height, '|', Math.round(result.buffer.length / 1024) + 'KB');
      } catch (err) {
        console.error('FAILED:', err.message);
      }
    }
  })();
}
