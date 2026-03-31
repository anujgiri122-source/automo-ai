/**
 * designArchitect.js — Design Prompt Builder
 * Builds detailed Canva MCP prompts from brand kit + user request
 * Injects brand identity, business-type defaults, and season/festival context
 */

const { buildCanvaQuery, getCurrentSeason } = require('../../mcp/indianDesignRules');

// Mood + palette defaults per business type
const BUSINESS_TYPE_DEFAULTS = {
  gym:      { mood: 'bold, dark, powerful, high-energy', palette: 'dark background with neon accents', typography: 'heavy bold fonts' },
  fitness:  { mood: 'bold, dark, powerful, high-energy', palette: 'dark background with neon accents', typography: 'heavy bold fonts' },
  salon:    { mood: 'elegant, soft, luxurious, feminine', palette: 'pastel, rose gold, cream',          typography: 'script + clean sans-serif' },
  beauty:   { mood: 'elegant, soft, luxurious, feminine', palette: 'pastel, rose gold, cream',          typography: 'script + clean sans-serif' },
  cafe:     { mood: 'warm, cozy, inviting, delicious',    palette: 'warm browns, cream, orange',        typography: 'friendly rounded fonts' },
  restaurant: { mood: 'vibrant, appetising, welcoming',   palette: 'rich reds, warm yellows, cream',    typography: 'bold display + clean body' },
  hotel:    { mood: 'premium, professional, welcoming',   palette: 'navy or gold, white, neutral',      typography: 'serif + elegant' },
  coaching: { mood: 'inspirational, trustworthy, academic', palette: 'blue, orange, white',             typography: 'professional sans-serif' },
  general:  { mood: 'clean, professional, vibrant',       palette: 'brand primary colors',              typography: 'modern sans-serif' },
};

/**
 * createDesignPrompt(userMessage, brandKit, format)
 * @param {string} userMessage  — What the user asked for ("diwali offer poster banao")
 * @param {object} brandKit     — Row from brand_kits Supabase table
 * @param {string} format       — 'instagram_post' | 'flyer' | 'carousel'
 * @returns {{ prompt, canvaParams, brandSnapshot }}
 */
function createDesignPrompt(userMessage, brandKit, format = 'instagram_post') {
  console.log('[DA] createDesignPrompt | format:', format, '| user msg:', userMessage);

  const businessType = (brandKit?.business_type || 'general').toLowerCase();
  const defaults = BUSINESS_TYPE_DEFAULTS[businessType] || BUSINESS_TYPE_DEFAULTS.general;

  const brandName      = brandKit?.business_name   || 'Your Business';
  const primaryColor   = brandKit?.primary_color   || '#FF6B35';
  const secondaryColor = brandKit?.secondary_color || '#FFD700';
  const tagline        = brandKit?.tagline         || '';
  const phone          = brandKit?.phone           || '';
  const address        = brandKit?.address         || '';
  const logoAssetId    = brandKit?.canva_logo_asset_id || null;

  const season = getCurrentSeason();
  const formatLabel = format === 'instagram_post' ? 'Instagram post (1080×1080 px)'
                    : format === 'carousel'        ? 'Instagram carousel slide (1080×1080 px)'
                    :                                'promotional flyer (A4/portrait)';

  // Build the detailed prompt paragraph — injecting all brand context
  const parts = [
    `Create a stunning ${formatLabel} for "${brandName}".`,
    `Business type: ${businessType}. Design mood: ${defaults.mood}.`,
    `Brand colors: primary ${primaryColor}, secondary ${secondaryColor}.`,
    `Color palette: ${defaults.palette}.`,
    `Typography style: ${defaults.typography}.`,
    tagline   ? `Brand tagline: "${tagline}".`   : '',
    phone     ? `Contact number: ${phone}.`       : '',
    address   ? `Location: ${address}.`           : '',
    logoAssetId ? `Use uploaded brand logo (Canva asset_id: ${logoAssetId}).` : '',
    `Season context: ${season.name}.`,
    `User request: "${userMessage}".`,
    `Style guide: Professional, high-quality, optimised for Indian SMB social media.`,
    `Keep text minimal and readable on mobile screens.`,
    `Make it visually striking — ${defaults.palette} as the dominant visual theme.`,
  ].filter(Boolean).join(' ');

  console.log('[DA] Prompt built (first 100 chars):', parts.substring(0, 100));

  // Canva MCP params — ready to pass to generate-design
  const canvaParams = {
    query:     buildCanvaQuery(businessType, brandName, primaryColor, userMessage, false),
    asset_ids: logoAssetId ? [logoAssetId] : [],
    format,
  };

  const brandSnapshot = { name: brandName, primaryColor, secondaryColor, businessType };

  return { prompt: parts, canvaParams, brandSnapshot };
}

module.exports = { createDesignPrompt };
