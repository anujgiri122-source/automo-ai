/**
 * canvaService.js — Flyer generation service
 *
 * TWO PATHS (auto-selected at runtime):
 *
 * PATH A — Canva Connect API (template-based)
 *   Requires env: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_TEMPLATE_<POSTTYPE>
 *   How it works: OAuth client_credentials → autofill template → async export → PNG URL
 *   NOTE: Canva's API cannot create designs from scratch. Each post type needs
 *         a pre-built Canva template with named autofill fields.
 *         Templates must be created manually in Canva, then their IDs added to .env.
 *
 * PATH B — HTML → PNG via Playwright (zero-config fallback)
 *   Works immediately with no external credentials.
 *   Generates a styled flyer HTML, screenshots it at exact pixel dimensions.
 *   This is the MVP path per CLAUDE.md.
 */

'use strict';

const axios   = require('axios');
const path    = require('path');
const POST_TYPES = require('../data/postTypes.json');

const CANVA_API    = 'https://api.canva.com/rest/v1';
const POLL_INTERVAL_MS  = 2000;
const POLL_MAX_ATTEMPTS = 15;

// ─── Format dimensions ────────────────────────────────────────────────────────
const FORMAT_DIMS = {
  single:      { width: 1080, height: 1080 },
  carousel:    { width: 1080, height: 1080 },
  story:       { width: 1080, height: 1920 },
  reel_cover:  { width: 1080, height: 1920 },
};

// ─── Canva template IDs per post type (set in .env) ──────────────────────────
// e.g. CANVA_TEMPLATE_OFFER_DISCOUNT=DAxxxxxxx
function getTemplateId(postType) {
  const key = `CANVA_TEMPLATE_${postType.toUpperCase()}`;
  return process.env[key] || null;
}

// ═════════════════════════════════════════════════════════════════════════════
// PATH A — Canva Connect API
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtain an OAuth access token via client_credentials grant.
 * Canva supports this for server-to-server flows on selected scopes.
 */
async function getAccessToken() {
  const clientId     = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('CANVA_CLIENT_ID or CANVA_CLIENT_SECRET not set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const { data } = await axios.post(
    'https://api.canva.com/rest/v1/oauth/token',
    new URLSearchParams({ grant_type: 'client_credentials', scope: 'design:content:write asset:read' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    }
  );

  return data.access_token;
}

/**
 * Submit an autofill job for a Canva template.
 * Fields map element names (as defined in the template) to values.
 *
 * @param {string} accessToken
 * @param {string} templateId  - Canva design ID of the pre-built template
 * @param {object} fields      - { caption, offerText, primaryColor, logoUrl }
 * @returns {string} autofill job ID
 */
async function submitAutofillJob(accessToken, templateId, fields) {
  const autofillData = {
    brand_template_id: templateId,
    data: {
      // These field names must match what is defined in the Canva template
      ...(fields.caption    && { caption:    { type: 'text',  text: fields.caption } }),
      ...(fields.offerText  && { offer_text: { type: 'text',  text: fields.offerText } }),
      ...(fields.brandName  && { brand_name: { type: 'text',  text: fields.brandName } }),
      ...(fields.logoUrl    && { logo:        { type: 'image', asset_url: fields.logoUrl } }),
    },
  };

  const { data } = await axios.post(
    `${CANVA_API}/autofills`,
    autofillData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  return data.job.id;
}

/**
 * Poll an autofill job until it completes.
 * @returns {string} the new design_id produced by the autofill
 */
async function pollAutofillJob(accessToken, jobId) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const { data } = await axios.get(
      `${CANVA_API}/autofills/${jobId}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
    );

    const { status, result } = data.job;
    if (status === 'success') return result.design.id;
    if (status === 'failed')  throw new Error(`Canva autofill job failed: ${JSON.stringify(data.job.error)}`);
    // status === 'in_progress' — keep polling
  }
  throw new Error('Canva autofill job timed out after polling');
}

/**
 * Submit an export job for a Canva design.
 * @returns {string} export job ID
 */
async function submitExportJob(accessToken, designId) {
  const { data } = await axios.post(
    `${CANVA_API}/exports`,
    { design_id: designId, format: 'png', export_quality: 'pro' },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  return data.job.id;
}

/**
 * Poll an export job until it completes.
 * @returns {string} public PNG URL
 */
async function pollExportJob(accessToken, jobId) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const { data } = await axios.get(
      `${CANVA_API}/exports/${jobId}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
    );

    const { status, urls } = data.job;
    if (status === 'success') return urls[0];
    if (status === 'failed')  throw new Error(`Canva export job failed: ${JSON.stringify(data.job.error)}`);
  }
  throw new Error('Canva export job timed out after polling');
}

/**
 * Full Canva path: autofill template → export → return PNG URL.
 */
async function generateFlyerViaCanva(postType, caption, brandKit, format) {
  const templateId = getTemplateId(postType);
  if (!templateId) {
    throw new Error(
      `No Canva template configured for post type "${postType}". ` +
      `Set CANVA_TEMPLATE_${postType.toUpperCase()} in .env with the Canva design ID.`
    );
  }

  console.log(`[canva] Using template ${templateId} for ${postType}`);

  const accessToken = await getAccessToken();

  const fields = {
    caption:    caption,
    offerText:  brandKit?.offerText  || '',
    brandName:  brandKit?.name       || '',
    logoUrl:    brandKit?.logoUrl    || null,
  };

  const jobId    = await submitAutofillJob(accessToken, templateId, fields);
  console.log(`[canva] Autofill job submitted: ${jobId}`);

  const designId = await pollAutofillJob(accessToken, jobId);
  console.log(`[canva] Autofill complete. Design ID: ${designId}`);

  const exportJobId  = await submitExportJob(accessToken, designId);
  console.log(`[canva] Export job submitted: ${exportJobId}`);

  const pngUrl = await pollExportJob(accessToken, exportJobId);
  console.log(`[canva] Export complete: ${pngUrl}`);

  return { url: pngUrl, source: 'canva', designId };
}

// ═════════════════════════════════════════════════════════════════════════════
// PATH B — HTML → PNG via Playwright
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build the HTML for a flyer based on post type + brand kit.
 * Each post type has its own visual structure.
 */
function buildFlyerHTML(postType, caption, brandKit, format) {
  const dims       = FORMAT_DIMS[format] || FORMAT_DIMS.single;
  const primary    = (brandKit?.primaryColor   || '#FF6B6B').replace(/[^#a-fA-F0-9]/g, '');
  const secondary  = (brandKit?.secondaryColor || '#FFFFFF').replace(/[^#a-fA-F0-9]/g, '');
  const brandName  = brandKit?.name || '';
  const logoUrl    = brandKit?.logoUrl || null;
  const offerText  = brandKit?.offerText || caption;
  const postData   = POST_TYPES.post_types[postType] || POST_TYPES.post_types.offer_discount;

  // Pick background style per category
  const bgStyles = {
    SALES:         `background: linear-gradient(135deg, ${primary} 0%, ${darkenHex(primary, 30)} 100%)`,
    URGENCY:       `background: linear-gradient(135deg, #1a1a2e 0%, ${primary} 100%)`,
    ENGAGEMENT:    `background: linear-gradient(135deg, ${primary} 0%, ${lightenHex(primary, 20)} 100%)`,
    SOCIAL_PROOF:  `background: linear-gradient(135deg, #2d3748 0%, ${primary} 100%)`,
    EDUCATIONAL:   `background: linear-gradient(135deg, ${primary} 0%, ${darkenHex(primary, 20)} 100%)`,
    ENTERTAINMENT: `background: linear-gradient(135deg, ${primary} 0%, #ff9f43 100%)`,
    LOCAL:         `background: linear-gradient(135deg, ${primary} 0%, ${darkenHex(primary, 25)} 100%)`,
    AWARENESS:     `background: linear-gradient(135deg, ${darkenHex(primary, 10)} 0%, ${primary} 100%)`,
    GROWTH:        `background: linear-gradient(135deg, ${primary} 0%, #6c5ce7 100%)`,
    TRUST:         `background: linear-gradient(135deg, #2c3e50 0%, ${primary} 100%)`,
  };

  const bg = bgStyles[postData.category] || bgStyles.SALES;

  // Accent badge text per category
  const badges = {
    SALES:      '🔥 SPECIAL OFFER',
    URGENCY:    '⚡ FLASH SALE',
    ENGAGEMENT: '✨ FESTIVAL',
    SOCIAL_PROOF: '⭐ CUSTOMER STORY',
    EDUCATIONAL: '💡 PRO TIPS',
    ENTERTAINMENT: '😂 RELATABLE',
    LOCAL:      '📍 LOCAL FAVORITE',
    AWARENESS:  '📢 ANNOUNCEMENT',
    GROWTH:     '🎁 GIVEAWAY',
    TRUST:      '👥 MEET THE TEAM',
  };

  const badge = badges[postData.category] || '✨ AUTOMO AI';

  // Truncate caption for display
  const displayCaption = caption.length > 120
    ? caption.substring(0, 117) + '...'
    : caption;

  // Logo element
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="logo" style="max-height:60px;max-width:180px;object-fit:contain;filter:brightness(0) invert(1);margin-bottom:12px;">`
    : `<div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:2px;margin-bottom:12px;opacity:0.9;">${brandName.toUpperCase()}</div>`;

  // Offer highlight — show short offer text prominently
  const offerDisplay = offerText && offerText !== caption
    ? `<div style="font-size:${dims.width >= 1080 ? '56' : '36'}px;font-weight:900;color:#ffffff;line-height:1;margin:16px 0;text-shadow:2px 2px 8px rgba(0,0,0,0.3);">${offerText}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${dims.width}px;
    height: ${dims.height}px;
    ${bg};
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Decorative circles */
  .circle-1 {
    position: absolute; top: -80px; right: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .circle-2 {
    position: absolute; bottom: -100px; left: -60px;
    width: 280px; height: 280px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .circle-3 {
    position: absolute; top: 40%; right: -40px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.05);
  }

  /* Content wrapper */
  .wrapper {
    position: relative;
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${dims.height > 1080 ? '80px 60px' : '60px 60px'};
    text-align: center;
    z-index: 1;
  }

  /* Badge */
  .badge {
    background: rgba(255,255,255,0.2);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 100px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  /* Offer text */
  .offer {
    font-size: ${dims.width >= 1080 ? '58' : '38'}px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.05;
    margin-bottom: 20px;
    text-shadow: 2px 4px 12px rgba(0,0,0,0.25);
  }

  /* Caption */
  .caption {
    font-size: ${dims.width >= 1080 ? '24' : '18'}px;
    font-weight: 500;
    color: rgba(255,255,255,0.92);
    line-height: 1.5;
    max-width: ${dims.width >= 1080 ? '820px' : '640px'};
    margin-bottom: 28px;
  }

  /* Divider */
  .divider {
    width: 60px; height: 3px;
    background: rgba(255,255,255,0.5);
    border-radius: 2px;
    margin: 16px auto;
  }

  /* Footer */
  .footer {
    position: absolute;
    bottom: ${dims.height > 1080 ? '60px' : '40px'};
    left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 60px;
  }
  .footer-inner {
    background: rgba(0,0,0,0.25);
    border-radius: 100px;
    padding: 10px 28px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .footer-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
  }
  .footer-text {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="circle-1"></div>
  <div class="circle-2"></div>
  <div class="circle-3"></div>

  <div class="wrapper">
    ${logoHtml}
    <div class="badge">${badge}</div>
    ${offerDisplay}
    <div class="caption">${displayCaption}</div>
    <div class="divider"></div>
  </div>

  <div class="footer">
    <div class="footer-inner">
      <div class="footer-dot"></div>
      <div class="footer-text">${brandName || 'Powered by Automo AI'}</div>
      <div class="footer-dot"></div>
    </div>
  </div>
</body>
</html>`;
}

/** Naive hex darkener — adds darkness by reducing each channel */
function darkenHex(hex, amount) {
  try {
    const h   = hex.replace('#', '');
    const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r   = Math.max(0, (num >> 16) - amount);
    const g   = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b   = Math.max(0, (num & 0xff) - amount);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  } catch { return hex; }
}

/** Naive hex lightener */
function lightenHex(hex, amount) {
  try {
    const h   = hex.replace('#', '');
    const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r   = Math.min(255, (num >> 16) + amount);
    const g   = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b   = Math.min(255, (num & 0xff) + amount);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  } catch { return hex; }
}

/**
 * Render HTML to a PNG buffer using Playwright (headless Chromium).
 * @returns {Buffer} PNG buffer
 */
async function renderHTMLtoPNG(html, format) {
  const { chromium } = require('playwright');
  const dims = FORMAT_DIMS[format] || FORMAT_DIMS.single;

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: dims.width, height: dims.height });
    await page.setContent(html, { waitUntil: 'networkidle' });

    const buffer = await page.screenshot({
      type:   'png',
      clip:   { x: 0, y: 0, width: dims.width, height: dims.height },
      fullPage: false,
    });
    return buffer;
  } finally {
    await browser.close();
  }
}

/**
 * Full HTML path: build HTML → Playwright screenshot → base64 data URL.
 */
async function generateFlyerViaHTML(postType, caption, brandKit, format) {
  const html   = buildFlyerHTML(postType, caption, brandKit, format);
  const buffer = await renderHTMLtoPNG(html, format);
  const base64 = buffer.toString('base64');

  return {
    url:    `data:image/png;base64,${base64}`,
    source: 'html_playwright',
    buffer,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate a flyer for a given post type, caption, and brand kit.
 *
 * Routes to Canva if CANVA_CLIENT_ID + CANVA_CLIENT_SECRET + CANVA_TEMPLATE_<POSTTYPE>
 * are all configured; otherwise falls back to HTML→Playwright.
 *
 * @param {string} postType    - e.g. 'offer_discount', 'educational_tips'
 * @param {string} caption     - Caption text to embed
 * @param {object} brandKit    - { name, primaryColor, secondaryColor, logoUrl, offerText }
 * @param {string} format      - 'single' | 'carousel' | 'story' | 'reel_cover'
 * @returns {Promise<{ url: string, source: 'canva'|'html_playwright', designId?: string, buffer?: Buffer }>}
 */
async function generateFlyer(postType = 'offer_discount', caption = '', brandKit = {}, format = 'single') {
  const hasCanvaCredentials = process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET;
  const hasTemplate         = !!getTemplateId(postType);

  if (hasCanvaCredentials && hasTemplate) {
    console.log(`[flyer] Using Canva path for ${postType}`);
    try {
      return await generateFlyerViaCanva(postType, caption, brandKit, format);
    } catch (err) {
      console.warn(`[flyer] Canva path failed (${err.message}), falling back to HTML`);
    }
  } else {
    const reason = !hasCanvaCredentials
      ? 'CANVA_CLIENT_ID/SECRET not set'
      : `CANVA_TEMPLATE_${postType.toUpperCase()} not set`;
    console.log(`[flyer] HTML path (${reason})`);
  }

  return await generateFlyerViaHTML(postType, caption, brandKit, format);
}

// ─── Self-test (run: node backend/services/canvaService.js) ──────────────────
async function runTest() {
  const fs = require('fs');

  console.log('\n=== Canva Service Test ===');
  console.log('Scenario: offer_discount | "Sunday 50% off!" | single | #FF6B6B\n');

  try {
    const result = await generateFlyer(
      'offer_discount',
      'Sunday 50% off! Sirf aaj ke liye — book kar lo abhi 🔥',
      { name: 'My Salon', primaryColor: '#FF6B6B', offerText: '50% OFF' },
      'single'
    );

    console.log('Source:', result.source);
    console.log('URL type:', result.url.startsWith('data:') ? 'base64 data URL' : 'remote URL');
    console.log('URL length:', result.url.length, 'chars');

    if (result.buffer) {
      const outPath = path.join(__dirname, '../test-flyer-output.png');
      fs.writeFileSync(outPath, result.buffer);
      console.log(`PNG saved → ${outPath}`);
    }

    console.log('\n✅ generateFlyer() test passed');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  runTest();
}

module.exports = { generateFlyer, buildFlyerHTML, getAccessToken };
