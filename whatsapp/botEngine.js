/**
 * botEngine.js — Central message router
 * Reads session state → dispatches to the right flow
 */

const { getSession, resetSession, isSessionExpired, STATES } = require('./stateMachine');
const { handleOnboarding }      = require('./flows/onboardingFlow');
const { getHelpMessage }        = require('./flows/helpFlow');
const { handleCaptionRequest, isCaptionRequest } = require('./flows/captionFlow');
const { handleFlyerRequest,   isFlyerRequest   } = require('./flows/flyerFlow');
const { handlePostingRequest }  = require('./flows/postingFlow');

// ── Keyword helpers ────────────────────────────────────────────────────────────

const POST_NOW_KEYWORDS = ['abhi post', 'post now', 'post karo', 'instagram pe', 'share karo', 'publish'];
function isPostNowRequest(text) {
  const lower = text.toLowerCase();
  return POST_NOW_KEYWORDS.some(kw => lower.includes(kw));
}

const BRAND_KEYWORDS = ['brand setup', 'setup brand', 'logo bhejo', 'brand kit', 'set up brand', 'brand colour', 'brand color'];
function isBrandRequest(text) {
  const lower = text.toLowerCase();
  return BRAND_KEYWORDS.some(kw => lower.includes(kw));
}

const PRICING_KEYWORDS = ['pricing', 'price', 'plan', 'kitna', 'upgrade', 'paid', 'cost', 'charges', 'fee', 'subscription'];
function isPricingRequest(text) {
  const lower = text.toLowerCase();
  return PRICING_KEYWORDS.some(kw => lower.includes(kw));
}

const PRICING_MSG = `📊 *Automo AI Plans*

🆓 *Free:* 10 captions + 3 flyers + 5 posts/month
⭐ *Starter ₹199/mo:* 50 captions + 15 flyers + 30 posts
💎 *Pro ₹499/mo:* Unlimited captions + 50 flyers + unlimited posts

Upgrade karna hai? *upgrade* likho! 🚀`;

// ── Main router ────────────────────────────────────────────────────────────────

async function processMessage(phone, messageText, rawJid) {
  console.log('=== BOT ENGINE ===', phone, rawJid, '| msg:', messageText);
  const text = messageText.trim();

  // ── Global commands (work from ANY state) ───────────────────────────────────
  if (text.toLowerCase() === 'help') {
    console.log('[BE] BRANCH: global help command');
    return getHelpMessage();
  }

  if (isPricingRequest(text)) {
    console.log('[BE] BRANCH: global pricing request');
    return PRICING_MSG;
  }

  // ── Load session ────────────────────────────────────────────────────────────
  const session = await getSession(phone);
  console.log('[BE] SESSION:', session
    ? `state=${session.current_state} | ctx=${JSON.stringify(session.context)}`
    : 'null (new user)');

  // New user — no session record at all
  if (!session) {
    console.log('[BE] BRANCH: no session → new user → onboarding');
    return handleOnboarding(phone, text, null, rawJid);
  }

  // Session expired (30 min idle) → reset and greet
  if (isSessionExpired(session)) {
    console.log('[BE] BRANCH: session expired → reset to IDLE');
    await resetSession(phone);
    return 'Wapas aaye! 👋 Kya help chahiye?\n\n*help* likho features dekhne ke liye';
  }

  const state = session.current_state;
  console.log(`[BE] Active session | state=${state} | text="${text}"`);

  // ── Onboarding states ───────────────────────────────────────────────────────
  if (state.startsWith('onboarding_')) {
    console.log('[BE] → routing to onboardingFlow');
    return handleOnboarding(phone, text, session, rawJid);
  }

  // ── Caption states ──────────────────────────────────────────────────────────
  if (state === STATES.CAPTION_REQUESTED || state === STATES.CAPTION_SELECTED) {
    console.log('[BE] → routing to captionFlow (mid-flow)');
    return handleCaptionRequest(phone, text, session, rawJid);
  }

  // ── Post / Schedule states ──────────────────────────────────────────────────
  if (state === STATES.POST_CONFIRM || state === STATES.SCHEDULE_TIME) {
    console.log('[BE] → routing to postingFlow (mid-flow)');
    return handlePostingRequest(phone, text, session, rawJid);
  }

  // ── FLYER_REQUESTED (mid-flow) ──────────────────────────────────────────────
  if (state === STATES.FLYER_REQUESTED) {
    console.log('[BE] → routing to flyerFlow (mid-flow)');
    return handleFlyerRequest(phone, text, session, rawJid);
  }

  // ── IDLE: keyword-based intent detection ────────────────────────────────────
  if (state === STATES.IDLE) {

    // 1. Flyer — check before caption (more specific)
    if (isFlyerRequest(text)) {
      console.log('[BE] BRANCH: idle → flyer keywords → flyerFlow');
      return handleFlyerRequest(phone, text, session, rawJid);
    }

    // 2. Caption
    if (isCaptionRequest(text)) {
      console.log('[BE] BRANCH: idle → caption keywords → captionFlow');
      return handleCaptionRequest(phone, text, session, rawJid);
    }

    // 3. Direct post attempt
    if (isPostNowRequest(text)) {
      console.log('[BE] BRANCH: idle → post-now keywords → postingFlow');
      return handlePostingRequest(phone, text, session, rawJid);
    }

    // 4. Brand setup
    if (isBrandRequest(text)) {
      console.log('[BE] BRANCH: idle → brand keywords → brand nudge');
      return `Brand kit setup hoga jab Apify MCP credits aayenge! 🎨\n\nAbhi ke liye:\n📝 *Caption:* koi bhi topic likh do\n🖼️ *Poster:* "poster banao [topic]" likho\n\n*help* likho full features ke liye`;
    }

    // 5. Upgrade
    if (text.toLowerCase() === 'upgrade') {
      return `Upgrade karne ke liye abhi contact karo:\n📞 *WhatsApp:* Yahi pe reply karo\n💳 Razorpay payment integration coming soon!\n\n${PRICING_MSG}`;
    }

    // 6. Unknown
    console.log('[BE] BRANCH: idle → unknown intent → fallback');
    return `Samajh nahi aaya 😅 Kuch aisa try karo:

📝 *"monday motivation caption"*
🖼️ *"diwali poster banao"*
💬 *"help"* — sab options dekhne ke liye`;
  }

  // ── Unrecognised state (safety net) ─────────────────────────────────────────
  console.warn(`[BE] Unrecognised state "${state}" → resetting + fallback`);
  await resetSession(phone);
  return 'Kuch gadbad ho gayi 😅 Fresh start karte hain!\n\n*help* likho options ke liye.';
}

module.exports = { processMessage };
