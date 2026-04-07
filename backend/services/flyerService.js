/**
 * flyerService.js — dall-e-2 Circular Image + HTML Template + Puppeteer Flyer Generator
 *
 * Pipeline:
 *   1. Call dall-e-2 via AiCredits → get product/scene image URL
 *   2. Download image → base64 data URL (embedded in HTML, no external fetch by Puppeteer)
 *   3. Build HTML template with circular image in center + brand text layers
 *   4. Puppeteer screenshots the HTML → PNG buffer
 *
 * generateFlyer(postData, brandKit) → { buffer, base64, mimeType, width, height, postType, format }
 */

'use strict';

const sharp      = require('sharp');
const puppeteer  = require('puppeteer');

const AICREDITS_URL  = 'https://api.aicredits.in/v1/images/generations';
const CHROME_PATH    = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

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

// ─── Business-type aliases ────────────────────────────────────────────────────

const BUSINESS_ALIASES = {
  hair_beauty_salon: 'salon', beauty_salon: 'salon', beauty: 'salon',
  fitness: 'gym', fitness_centre: 'gym',
  food: 'cafe', coffee: 'cafe',
  shop: 'retail', clothing: 'retail', saree_shop: 'retail', bike_shop: 'retail',
  health: 'doctor', clinic: 'doctor',
  tuition: 'coaching', school: 'coaching',
};

// ─── Circular product image prompts (product/scene photography style) ─────────

const CIRCULAR_IMAGE_PROMPTS = {
  salon:      'Hair scissors, pink roses, beauty tools arranged aesthetically, white background, product photography style, no text',
  gym:        'Dumbbells, protein shake, gym gloves arranged, dark background, dramatic lighting, no text',
  cafe:       'Coffee cup with latte art, pastry, wooden table, warm lighting, top view, no text',
  restaurant: 'Indian food spread, colorful spices, biryani, dal makhani, top view, no text',
  hotel:      'Luxury hotel room, white sheets, pillow arrangement, premium look, no text',
  retail:     'Neatly arranged products, colourful packaging, clean white surface, top view, no text',
  doctor:     'Stethoscope, medical herbs, clean white background, professional, no text',
  coaching:   'Open books, pencils, notebook, clean desk top view, bright lighting, no text',
  default:    'Elegant product arrangement on clean background, professional photography, soft bokeh, no text',
};

function getCircularPrompt(businessType) {
  const key = BUSINESS_ALIASES[businessType] || businessType || 'default';
  return CIRCULAR_IMAGE_PROMPTS[key] || CIRCULAR_IMAGE_PROMPTS.default;
}

// ─── Step 1: Generate circular image via dall-e-2 on AiCredits ───────────────

async function generateCircularImage(businessType) {
  const apiKey = process.env.AICREDITS_API_KEY;
  if (!apiKey) throw new Error('AICREDITS_API_KEY not set in environment');

  const prompt = getCircularPrompt(businessType);
  console.log(`[FlyerService] dall-e-2 circular image | business: ${businessType}`);

  const res = await fetch(AICREDITS_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'dall-e-2', prompt, n: 1, size: '1024x1024' }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AiCredits API ${res.status}: ${errText.substring(0, 300)}`);
  }

  const json     = await res.json();
  const imageUrl = json?.data?.[0]?.url;
  if (!imageUrl) throw new Error('AiCredits response missing image URL');

  console.log('[FlyerService] Downloading generated image...');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);

  const buf        = Buffer.from(await imgRes.arrayBuffer());
  const base64Data = buf.toString('base64');
  return `data:image/png;base64,${base64Data}`;
}

// ─── Fallback: gradient data URL (when dall-e-2 fails) ────────────────────────

async function buildGradientDataUrl(primaryColor, secondaryColor) {
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
    </defs>
    <circle cx="256" cy="256" r="256" fill="url(#g)" />
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// ─── Extract offer / CTA texts from postData ──────────────────────────────────

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
    offerText = firstChunk.length <= 40 ? firstChunk : firstChunk.substring(0, 37) + '…';
  }

  const sentences = (postData.caption || '')
    .split(/[!\n]/)
    .map(s => s.trim())
    .filter(Boolean);
  const rawCta  = sentences[sentences.length - 1] || '';
  const ctaText = rawCta.length <= 45 ? rawCta : 'DM us to book now!';

  return {
    businessName:   brandKit.businessName  || 'Your Business',
    offerText,
    ctaText,
    contact:        brandKit.contact || brandKit.website || '',
    primaryColor:   brandKit.primaryColor   || '#FF6B35',
    secondaryColor: brandKit.secondaryColor || '#FFD700',
  };
}

// ─── Step 2: Build HTML template ──────────────────────────────────────────────

function buildFlyerHTML(circularImageDataUrl, texts, width, height) {
  const { businessName, offerText, ctaText, contact, primaryColor, secondaryColor } = texts;

  // Scale factor for story format
  const circleSize = height > 1100 ? 480 : 380;
  const nameFontSz = height > 1100 ? 52  : 44;
  const offerFontSz = offerText.length > 10 ? (height > 1100 ? 82 : 70) : (height > 1100 ? 100 : 88);
  const ctaFontSz  = height > 1100 ? 34 : 28;
  const contactFontSz = height > 1100 ? 26 : 22;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
  }
  body {
    font-family: 'Arial Black', 'Arial', sans-serif;
    background: linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 55%, ${primaryColor}cc 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    padding: 55px 60px 48px;
  }

  /* Subtle radial glow overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse 70% 60% at 50% 42%,
                  rgba(255,255,255,0.13) 0%, transparent 70%);
    pointer-events: none;
  }

  .top-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
  .business-name {
    font-size: ${nameFontSz}px;
    font-weight: 900;
    color: #ffffff;
    text-align: center;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 3px 12px rgba(0,0,0,0.45);
    line-height: 1.1;
  }
  .accent-bar {
    width: 100px;
    height: 5px;
    background: rgba(255,255,255,0.80);
    border-radius: 4px;
  }

  .circle-wrap {
    position: relative;
    width: ${circleSize}px;
    height: ${circleSize}px;
    flex-shrink: 0;
  }
  /* Glow ring behind image */
  .circle-wrap::before {
    content: '';
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    filter: blur(14px);
  }
  .circular-img {
    width: ${circleSize}px;
    height: ${circleSize}px;
    border-radius: 50%;
    object-fit: cover;
    border: 8px solid rgba(255,255,255,0.90);
    box-shadow: 0 12px 45px rgba(0,0,0,0.40), 0 0 0 3px rgba(255,255,255,0.30);
    position: relative;
    z-index: 1;
    display: block;
  }

  .offer-text {
    font-size: ${offerFontSz}px;
    font-weight: 900;
    color: #ffffff;
    text-align: center;
    text-shadow: 0 4px 16px rgba(0,0,0,0.50);
    line-height: 1.1;
    letter-spacing: -1px;
    text-transform: uppercase;
    max-width: 100%;
    word-break: break-word;
  }

  .cta-btn {
    background: #ffffff;
    color: ${primaryColor};
    padding: 18px 56px;
    border-radius: 60px;
    font-size: ${ctaFontSz}px;
    font-weight: 900;
    text-align: center;
    box-shadow: 0 6px 24px rgba(0,0,0,0.30);
    letter-spacing: 0.5px;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .contact {
    font-size: ${contactFontSz}px;
    color: rgba(255,255,255,0.82);
    text-align: center;
    letter-spacing: 0.5px;
    font-family: Arial, sans-serif;
    text-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
</style>
</head>
<body>

  <div class="top-block">
    <div class="business-name">${escapeHtml(businessName)}</div>
    <div class="accent-bar"></div>
  </div>

  <div class="circle-wrap">
    <img class="circular-img" src="${circularImageDataUrl}" alt="" />
  </div>

  <div class="offer-text">${escapeHtml(offerText)}</div>

  <div class="cta-btn">${escapeHtml(ctaText)}</div>

  ${contact ? `<div class="contact">${escapeHtml(contact)}</div>` : ''}

</body>
</html>`;
}

// ─── Step 3: Puppeteer renders HTML → PNG buffer ──────────────────────────────

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
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pngBuffer = await page.screenshot({
      type:     'png',
      clip:     { x: 0, y: 0, width, height },
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
 * @param {object} brandKit  — { businessName, businessType, primaryColor, secondaryColor, logoUrl, contact }
 * @returns {{ buffer, base64, mimeType, width, height, postType, format }}
 */
async function generateFlyer(postData, brandKit) {
  const format   = postData.format || 'single';
  const postType = postData.detected_post_type || postData.postType || 'offer_discount';
  const { width, height } = getDimensions(format);
  const primary   = brandKit.primaryColor   || '#FF6B35';
  const secondary = brandKit.secondaryColor || '#FFD700';

  console.log(`[FlyerService] Start | type:${postType} | biz:${brandKit.businessType} | ${width}×${height}`);

  // ── Step 1: Generate circular product image ──
  let circularImageDataUrl;
  try {
    circularImageDataUrl = await generateCircularImage(brandKit.businessType || 'default');
    console.log('[FlyerService] Circular image ready');
  } catch (err) {
    console.warn('[FlyerService] dall-e-2 failed → gradient fallback:', err.message);
    circularImageDataUrl = await buildGradientDataUrl(primary, secondary);
  }

  // ── Step 2: Build HTML template ──
  const texts   = extractTexts(postData, { ...brandKit, primaryColor: primary, secondaryColor: secondary });
  const html    = buildFlyerHTML(circularImageDataUrl, texts, width, height);

  // ── Step 3: Render with Puppeteer ──
  const finalBuffer = await renderWithPuppeteer(html, width, height);

  console.log(`[FlyerService] Done | ${Math.round(finalBuffer.length / 1024)}KB`);

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

  (async () => {
    console.log('='.repeat(60));
    console.log('TEST — salon + offer_discount (combined pipeline)');
    console.log('='.repeat(60));

    try {
      const result = await generateFlyer(
        {
          caption:            'Sunday special 50% off on haircut! Book now — limited slots!',
          detected_post_type: 'offer_discount',
          format:             'single',
          key_details:        { offer_percentage: 50, day: 'Sunday' },
        },
        {
          businessName:   'Rajesh Salon',
          businessType:   'salon',
          primaryColor:   '#C0392B',
          secondaryColor: '#E91E8C',
          contact:        'Call: 98765 43210',
        },
      );

      const outPath = path.join(__dirname, '..', 'test-flyer-combined.png');
      fs.writeFileSync(outPath, result.buffer);
      console.log('Saved:', outPath);
      console.log('Size:', result.width, 'x', result.height, '|', Math.round(result.buffer.length / 1024) + 'KB');
    } catch (err) {
      console.error('FAILED:', err.message);
      process.exit(1);
    }
  })();
}
