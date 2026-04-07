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

const POLLINATIONS_URL = 'https://image.pollinations.ai/prompt';

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

function getApiSize(format) {
  if (format === 'story' || format === 'reel_cover') return '1024x1536';
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

// ─── Background image prompts per post type ───────────────────────────────────

function buildBgPrompt(postType, primaryColor, businessType) {
  const colorHint = `dominant color palette ${primaryColor}`;
  const noText    = 'absolutely NO text, NO words, NO letters, NO numbers, NO signs, NO watermarks';
  const base      = `pure decorative background for social media post, ${noText}, professional photography style, ${colorHint}`;

  const businessBoost =
    businessType === 'salon'   ? 'Indian hair salon and beauty atmosphere, soft elegant styling, ' :
    businessType === 'cafe'    ? 'Indian cafe warm coffee and food atmosphere, ' :
    businessType === 'gym'     ? 'fitness and workout high-energy atmosphere, ' :
    businessType === 'retail'  ? 'Indian retail shopping festive atmosphere, ' : '';

  const map = {
    offer_discount:    `Vibrant festive sale background, confetti particles, bokeh celebration lights, Indian market energy, ${businessBoost}${base}`,
    flash_sale:        `Urgent bold electric background, lightning bolt effects, bright spotlight, high-energy flash sale, ${businessBoost}${base}`,
    festival_post:     `Traditional Indian festival background, diya oil lamps, marigold flower petals, rangoli patterns, warm golden glow, ${businessBoost}${base}`,
    seasonal_promo:    `Seasonal Indian promotion background, warm festive bokeh lights, floral decorations, ${businessBoost}${base}`,
    product_launch:    `Sleek modern product launch background, spotlight on empty pedestal, luxury reveal, premium gradient, ${businessBoost}${base}`,
    educational_tips:  `Clean minimal knowledge background, soft gradient, calm and professional, books and plants motif, ${businessBoost}${base}`,
    testimonial:       `Warm trust-building background, soft bokeh five-star motif, satisfied atmosphere, ${businessBoost}${base}`,
    before_after:      `Split transformation background, left muted right vibrant, beauty and wellness, ${businessBoost}${base}`,
    giveaway:          `Exciting prize celebration background, wrapped gift boxes, gold confetti, winner atmosphere, ${businessBoost}${base}`,
    meme_entertainment:`Fun playful bright cartoon background, entertainment and humor vibe, ${businessBoost}${base}`,
    local_targeting:   `Indian local neighborhood background, community market atmosphere, local street energy, ${businessBoost}${base}`,
    announcement:      `Bold announcement background, rays of light, spotlight, exciting news energy, ${businessBoost}${base}`,
    brand_story:       `Warm nostalgic storytelling background, soft heritage lighting, emotional atmosphere, ${businessBoost}${base}`,
    how_it_works:      `Clean process background, minimal arrows and steps motif, modern infographic style, ${businessBoost}${base}`,
    behind_the_scenes: `Authentic behind-the-scenes background, real workshop or salon interior atmosphere, ${businessBoost}${base}`,
    team_spotlight:    `Professional team background, bright clean modern interior, welcoming atmosphere, ${businessBoost}${base}`,
    poll_question:     `Interactive colorful debate background, question mark motifs, fun engagement vibe, ${businessBoost}${base}`,
    restock_alert:     `Back-in-stock excitement background, shelves with vibrant products, scarcity energy, ${businessBoost}${base}`,
    collaboration:     `Partnership harmony background, two complementary elements merging together, ${businessBoost}${base}`,
    referral_program:  `Community sharing background, network of friendly people, referral chain warmth, ${businessBoost}${base}`,
  };

  return map[postType] || map.offer_discount;
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

// ─── Step A: Generate background via Pollinations.AI (FLUX, no auth) ─────────

async function generateAiBackground(postType, brandKit, format) {
  const prompt = buildBgPrompt(postType, brandKit.primaryColor, brandKit.businessType || 'general');
  const { width: w, height: h } = getDimensions(format);
  // Pollinations supports up to 1024; use 1024x1024 for square, 768x1344 for portrait
  const [pw, ph] = (format === 'story' || format === 'reel_cover') ? [768, 1344] : [1024, 1024];

  const url = `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}?width=${pw}&height=${ph}&nologo=true&model=flux&seed=${Date.now() % 9999}`;
  console.log('[FlyerService] Pollinations FLUX request | size:', pw, 'x', ph);

  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pollinations API ${res.status}: ${errText.substring(0, 200)}`);
  }

  // Response is raw binary JPEG — read as ArrayBuffer
  const arrayBuf = await res.arrayBuffer();
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

  const postData = {
    caption:              'Sunday special 50% off on haircut! Book now — limited slots!',
    detected_post_type:   'offer_discount',
    format:               'single',
    key_details:          { offer_percentage: 50, day: 'Sunday' },
  };

  const brandKit = {
    businessName:   'Rajesh Salon',
    businessType:   'salon',
    primaryColor:   '#FF6B6B',
    secondaryColor: '#4ECDC4',
    contact:        'Call: 98765 43210',
  };

  (async () => {
    try {
      console.log('='.repeat(60));
      console.log('TEST: Generating flyer for Rajesh Salon...');
      console.log('='.repeat(60));
      const result = await generateFlyer(postData, brandKit);
      const outPath = path.join(__dirname, '../test-flyer-hf.png');
      fs.writeFileSync(outPath, result.buffer);
      console.log('\nFlyer saved to:', outPath);
      console.log('Size:', result.width, 'x', result.height);
      console.log('File size:', result.buffer.length, 'bytes');
      console.log('Base64 length:', result.base64.length, 'chars');
    } catch (err) {
      console.error('FAILED:', err.message);
      process.exit(1);
    }
  })();
}
