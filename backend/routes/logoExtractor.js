const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('⚠️ ANTHROPIC_API_KEY not found in .env — Logo vision fallback unavailable');
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

/**
 * Extract logo from HTML methods with vision fallback
 * @param {string} htmlContent - Full HTML of website
 * @param {string} screenshotBase64 - Full-page screenshot as base64 PNG
 * @param {string} brandId - Brand ID for caching
 * @returns {Promise<{logoUrl: string, logoBase64: string, method: string, description: string}>}
 */
async function extractLogoWithFallback(
  htmlContent,
  screenshotBase64,
  brandId
) {
  console.log(`🔍 [Logo Extractor] Finding logo for brand: ${brandId}`);

  // Try cascade extraction first
  const cascadeResult = await tryCascadeExtraction(htmlContent);

  if (cascadeResult) {
    console.log(`✅ Logo found via cascade: ${cascadeResult.method}`);
    return {
      ...cascadeResult,
      viaFallback: false
    };
  }

  console.log(`⚠️  Cascade extraction failed, trying vision fallback...`);

  // Fallback: Use Anthropic Vision
  return await extractLogoViaVision(screenshotBase64, brandId);
}

/**
 * Try standard logo extraction methods
 * @param {string} htmlContent - Full HTML
 * @returns {Promise<{logoUrl: string, logoBase64: string, method: string} | null>}
 */
async function tryCascadeExtraction(htmlContent) {
  const methods = [
    { name: 'og_image', extractor: extractOpenGraphImage },
    { name: 'twitter_image', extractor: extractTwitterImage },
    { name: 'apple_touch_icon', extractor: extractAppleTouchIcon },
    { name: 'favicon', extractor: extractFavicon },
    { name: 'svg_logo', extractor: extractSVGLogo }
  ];

  for (const { name, extractor } of methods) {
    try {
      const result = await extractor(htmlContent);
      if (result) {
        return {
          logoUrl: result,
          logoBase64: null,  // Will be fetched if needed
          method: name,
          description: `Logo extracted via ${name}`
        };
      }
    } catch (err) {
      console.log(`⚠️  ${name} extraction failed: ${err.message}`);
    }
  }

  return null;
}

/**
 * Extract OpenGraph image from HTML meta tags
 */
function extractOpenGraphImage(html) {
  const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];
  return null;
}

/**
 * Extract Twitter card image from HTML meta tags
 */
function extractTwitterImage(html) {
  const match = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];
  return null;
}

/**
 * Extract Apple touch icon from HTML link tags
 */
function extractAppleTouchIcon(html) {
  const match = html.match(/<link\s+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];
  return null;
}

/**
 * Extract favicon from HTML link tags
 */
function extractFavicon(html) {
  const patterns = [
    /<link\s+rel=["']icon["'][^>]*href=["']([^"']+)["']/i,
    /<link\s+rel=["']shortcut icon["'][^>]*href=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Extract SVG logo from HTML img or svg tags with "logo" keyword
 */
function extractSVGLogo(html) {
  // Look for SVG tags with "logo" in class/id/alt
  const svgMatch = html.match(/<svg[^>]*(logo|brand)[^>]*>[\s\S]{0,500}<\/svg>/i);
  if (svgMatch) return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMatch[0])}`;

  // Look for img tags with "logo" in src/alt/class
  const imgMatch = html.match(/<img[^>]*(logo|brand)[^>]*src=["']([^"']+)["']/i);
  if (imgMatch?.[2]) return imgMatch[2];

  return null;
}

/**
 * Fallback: Use Anthropic Claude Vision to describe logo from screenshot
 * @param {string} screenshotBase64 - Full-page screenshot as base64
 * @param {string} brandId - Brand ID
 * @returns {Promise<{logoUrl: null, logoBase64: screenshotBase64, method: string, description: string}>}
 */
async function extractLogoViaVision(screenshotBase64, brandId) {
  console.log(`👁️  Using Anthropic Vision to identify logo...`);

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            },
            {
              type: 'text',
              text: `Analyze this website screenshot. Identify the brand logo or company mark.

Describe ONLY the logo/brand mark, focusing on:
1. Logo location (top-left, header, etc.)
2. Logo style (text, icon, wordmark, letter mark, etc.)
3. Colors used in the logo
4. Any distinctive design elements
5. What industry/business this appears to be

Return response in JSON format:
{
  "logo_found": true/false,
  "location": "top-left/header/center/etc",
  "style": "wordmark/icon/emblem/etc",
  "colors": ["#HEX1", "#HEX2"],
  "description": "Brief description for regeneration",
  "confidence": 0.0-1.0,
  "business_type": "detected business category"
}`
            }
          ]
        }
      ]
    });

    const visionText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse JSON response
    let visionData = {};
    try {
      const jsonMatch = visionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        visionData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn('⚠️  Could not parse vision response as JSON');
    }

    const description = visionData.description || visionText;
    const confidence = visionData.confidence || 0.7;

    console.log(`👁️  Vision analysis complete. Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      logoUrl: null,
      logoBase64: screenshotBase64,
      method: 'vision_fallback',
      description: description,
      visionData: visionData,
      confidence: confidence,
      viaFallback: true
    };
  } catch (error) {
    console.error(`❌ Vision fallback failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate logo using Ideogram from vision description
 * Called when logo extraction completely fails
 * @param {string} logoDescription - Description from vision
 * @param {string} brandName - Brand name
 * @param {Array<string>} brandColors - Brand colors as hex
 * @returns {Promise<{imageUrl: string, prompt: string}>}
 */
async function generateLogoFromVision(logoDescription, brandName, brandColors) {
  const axios = require('axios');
  const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;

  if (!IDEOGRAM_API_KEY) {
    throw new Error('IDEOGRAM_API_KEY not configured for logo generation');
  }

  const colorString = brandColors.length > 0 ? `Colors: ${brandColors.join(', ')}.` : '';

  const prompt = `Create a professional brand logo for: ${brandName}
Based on description: ${logoDescription}
${colorString}
Style: Modern, clean, scalable vector design.
Format: Transparent background, suitable for use across web and print.
No text, just the logo mark.`;

  console.log(`🎨 Generating logo via Ideogram from vision description...`);

  try {
    const response = await axios.post(
      'https://api.ideogram.ai/v1/generate',
      {
        image_request: {
          prompt: prompt,
          aspect_ratio: 'ASPECT_1_1',
          model: 'V_2',
          magic_prompt_option: 'ON'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${IDEOGRAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const designId = response.data.data[0].id;
    console.log(`✅ Logo design requested: ${designId}`);

    return {
      imageUrl: null,
      designId: designId,
      prompt: prompt,
      method: 'vision_to_ideogram_logo'
    };
  } catch (error) {
    console.error(`❌ Logo generation failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  extractLogoWithFallback,
  tryCascadeExtraction,
  extractLogoViaVision,
  generateLogoFromVision,
  // Export individual extractors for testing
  extractOpenGraphImage,
  extractTwitterImage,
  extractAppleTouchIcon,
  extractFavicon,
  extractSVGLogo
};
