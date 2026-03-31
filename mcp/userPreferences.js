/**
 * userPreferences.js — Smart 5-Question System for Automo
 * Captures user intent through a WhatsApp-style conversational flow
 * Returns structured preferences object consumed by the unified pipeline
 */

const fs = require('fs');
const path = require('path');

const PREFERENCES_PATH = path.join(__dirname, '..', 'userPreferences.json');

// ═══════════════════════════════════════════════════════════
// 5 SMART QUESTIONS — WhatsApp-style conversational flow
// ═══════════════════════════════════════════════════════════

const QUESTIONS = [
  {
    id: 'contentCategory',
    prompt: 'Kya banana hai aaj?',
    type: 'choice',
    options: [
      { emoji: '🎯', label: 'Offer/Sale',        value: 'offer' },
      { emoji: '🎉', label: 'Festival Post',      value: 'festival' },
      { emoji: '💡', label: 'Tips Carousel',      value: 'tips' },
      { emoji: '⭐', label: 'Customer Review',    value: 'testimonial' },
      { emoji: '🆕', label: 'Product Launch',     value: 'launch' },
      { emoji: '💪', label: 'Motivation Quote',   value: 'motivation' },
      { emoji: '📢', label: 'Announcement',       value: 'announcement' },
      { emoji: '📸', label: 'Behind Scenes',      value: 'behind_scenes' },
    ],
  },
  {
    id: 'format',
    prompt: 'Kahan post karna hai?',
    type: 'choice',
    options: [
      { emoji: '📱', label: 'WhatsApp Flyer only',      value: 'whatsapp_flyer' },
      { emoji: '📸', label: 'Instagram Feed only',       value: 'instagram_feed' },
      { emoji: '📖', label: 'Instagram Story only',      value: 'instagram_story' },
      { emoji: '🎠', label: 'Instagram Carousel',        value: 'instagram_carousel' },
      { emoji: '🚀', label: 'Full Campaign — sabhi',     value: 'full_campaign' },
    ],
  },
  {
    id: 'vibe',
    prompt: 'Post ka mood kya ho?',
    type: 'choice',
    options: [
      { emoji: '🔥', label: 'Bold & Aggressive',      value: 'bold' },
      { emoji: '🌸', label: 'Soft & Elegant',         value: 'elegant' },
      { emoji: '😄', label: 'Fun & Playful',          value: 'playful' },
      { emoji: '💼', label: 'Clean & Professional',   value: 'professional' },
      { emoji: '🎊', label: 'Festive & Celebratory',  value: 'festive' },
    ],
  },
  {
    id: 'language',
    prompt: 'Kis language mein?',
    type: 'choice',
    options: [
      { emoji: '🇮🇳', label: 'Hinglish — Best for India', value: 'hinglish' },
      { emoji: 'हिं',  label: 'Pure Hindi',                value: 'hindi' },
      { emoji: '🇬🇧', label: 'English',                    value: 'english' },
    ],
  },
  {
    id: 'offerText',
    prompt: 'Kya offer ya message hai?',
    type: 'text',
    placeholder: 'e.g. Free delivery aaj ke liye, Holi special 40% off, Naya product launch...',
  },
];

// ═══════════════════════════════════════════════════════════
// SAVE / LOAD PREFERENCES
// ═══════════════════════════════════════════════════════════

function savePreferences(prefs) {
  const data = { ...prefs, timestamp: new Date().toISOString() };
  try {
    fs.writeFileSync(PREFERENCES_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    // Non-fatal — memory-only is fine
  }
  return data;
}

function loadPreferences() {
  try {
    return JSON.parse(fs.readFileSync(PREFERENCES_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function buildDefaultPreferences() {
  return {
    contentCategory: 'offer',
    format: 'whatsapp_flyer',
    vibe: 'bold',
    language: 'hinglish',
    offerText: '',
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// VALIDATE PREFERENCES (call before pipeline)
// ═══════════════════════════════════════════════════════════

function validatePreferences(prefs) {
  const errors = [];
  if (!prefs.contentCategory) errors.push('contentCategory is required');
  if (!prefs.format)          errors.push('format is required');
  if (!prefs.vibe)            errors.push('vibe is required');
  if (!prefs.language)        errors.push('language is required');
  if (!prefs.offerText || prefs.offerText.trim().length < 3) {
    errors.push('offerText must be at least 3 characters');
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  QUESTIONS,
  savePreferences,
  loadPreferences,
  buildDefaultPreferences,
  validatePreferences,
};
