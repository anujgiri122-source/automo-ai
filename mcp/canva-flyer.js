/**
 * canva-flyer.js — Smart Canva query builder
 * Uses indianDesignRules.js for category-specific, season-aware, festival-tied queries
 * Actual Canva MCP calls are made by Claude Code (not Node.js directly)
 */

const {
  buildCanvaQuery,
  CAROUSEL_ARC,
  getDesignTrend,
  getLearnedBoost,
  getCurrentSeason,
} = require('./indianDesignRules');

// Text style presets — WhatsApp mobile optimised (bold, readable at small size)
const FLYER_TEXT_STYLES = {
  title:    { fontSize: 48, fontWeight: 'bold',     textAlign: 'center', letterSpacing: 'tight' },
  subtitle: { fontSize: 28, fontWeight: 'semibold', textAlign: 'center', letterSpacing: 'normal' },
  offer:    { fontSize: 40, fontWeight: 'extrabold', textAlign: 'center', letterSpacing: 'tight' },
  body:     { fontSize: 18, fontWeight: 'normal',   textAlign: 'center', letterSpacing: 'normal' },
  cta:      { fontSize: 24, fontWeight: 'bold',     textAlign: 'center', letterSpacing: 'wide' },
  contact:  { fontSize: 18, fontWeight: 'bold',     textAlign: 'center', letterSpacing: 'normal' },
  footer:   { fontSize: 14, fontWeight: 'normal',   textAlign: 'center', letterSpacing: 'normal' },
};

// ═══════════════════════════════════════════════════════════
// SINGLE FLYER QUERY
// ═══════════════════════════════════════════════════════════

function buildFlyerQuery(brandData, flyerData, qualityMemory = null) {
  const category = brandData.detectedCategory || 'general';
  const primaryColor = brandData.visualIdentity?.primaryColor || brandData.colors?.[0];
  const brandName = brandData.siteName || brandData.title || 'Brand';

  // Use learned best-performing query if available for this category
  const learnedBoost = getLearnedBoost(category, qualityMemory);
  const baseQuery = learnedBoost || buildCanvaQuery(
    category, brandName, primaryColor, flyerData?.flyer?.offerText || '', false
  );

  // Design trend overlay based on brand personality
  const trendLayer = getDesignTrend(brandData.brandPersonality || {});

  const colorInstruction = flyerData?.brand?.colors?.primary
    ? `primary color ${flyerData.brand.colors.primary}` : '';
  const offerContext = flyerData?.flyer?.offerText
    ? `featuring "${flyerData.flyer.offerText.substring(0, 40)}"` : '';

  return {
    design_type: 'flyer',
    query: `${baseQuery} ${trendLayer} ${colorInstruction} ${offerContext} professional stunning high quality`
      .replace(/\s+/g, ' ').trim(),
    _meta: { category, learnedBoost: !!learnedBoost, season: getCurrentSeason().name },
  };
}

// ═══════════════════════════════════════════════════════════
// CAROUSEL SLIDE QUERIES (5-slide desi storytelling arc)
// ═══════════════════════════════════════════════════════════

function buildCarouselQueries(brandData, carouselData, qualityMemory = null) {
  const category = brandData.detectedCategory || 'general';
  const primaryColor = brandData.visualIdentity?.primaryColor || brandData.colors?.[0];
  const brandName = brandData.siteName || brandData.title || 'Brand';
  const trendLayer = getDesignTrend(brandData.brandPersonality || {});
  // Use learned best query as base for carousel if available
  const learnedBase = getLearnedBoost(category, qualityMemory);

  return CAROUSEL_ARC.map((arc, i) => {
    const slideData = carouselData?.slides?.[i] || {};
    const slideQuery = learnedBase || buildCanvaQuery(
      category, brandName, primaryColor, '', true, `${arc.theme} ${arc.purpose}`
    );

    return {
      slideIndex: i,
      purpose: arc.purpose,
      theme: arc.theme,
      design_type: 'instagram_post',
      query: `${slideQuery} ${trendLayer} slide ${i + 1} of 5 consistent brand identity minimal`
        .replace(/\s+/g, ' ').trim(),
      slideContent: {
        title: slideData.title || '',
        subtitle: slideData.subtitle || '',
        bodyText: slideData.bodyText || '',
        cta: slideData.cta || '',
        primaryColor: carouselData?.brandConsistency?.primaryColor || primaryColor,
        accentColor: carouselData?.brandConsistency?.accentColor || '',
      },
    };
  });
}

// ═══════════════════════════════════════════════════════════
// PLATFORM RULES
// ═══════════════════════════════════════════════════════════

const PLATFORM_RULES = {
  whatsapp: {
    maxWords: 40,
    maxTextElements: 4,
    minFontSize: 20,
    requirePhoneNumber: true,
    tip: 'Offer visible in thumbnail, phone number at bottom always',
  },
  instagram: {
    maxWords: 30,
    maxTextElements: 3,
    minFontSize: 22,
    requirePhoneNumber: false,
    tip: 'Less text, more visual — editorial feel',
  },
};

module.exports = { buildFlyerQuery, buildCarouselQueries, FLYER_TEXT_STYLES, PLATFORM_RULES };
