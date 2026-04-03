/**
 * botEngine.js — Central message router
 * Reads session state → dispatches to the right flow
 */

const { getSession, resetSession, updateSession, isSessionExpired, STATES } = require('./stateMachine');
const supabase = require('../backend/supabase');
const { sendMessage } = require('../backend/services/aisensyService');
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

// ── Supabase helpers ───────────────────────────────────────────────────────────

async function getUserByPhone(phone) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, business_name, business_type')
    .eq('phone', phone)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[BE] getUserByPhone error:', error.message);
  return data || null;
}

async function getBrandKit(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[BE] getBrandKit error:', error.message);
  return data || null;
}

async function getOwner() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, business_name')
    .limit(1);
  if (error) { console.error('[BE] getOwner error:', error.message); return null; }
  return data?.[0] || null;
}

async function saveLead(ownerUserId, leadPhone, message, intent) {
  if (!supabase) { console.warn('[BE] Supabase null — lead NOT saved'); return; }
  const { error } = await supabase.from('leads').insert({
    user_id: ownerUserId,
    lead_number: leadPhone,
    message,
    intent,
    created_at: new Date().toISOString(),
  });
  if (error) console.error('[BE] Lead save error:', error.message);
  else console.log('[BE] Lead saved → owner:', ownerUserId, '| lead:', leadPhone);
}

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
  let session = await getSession(phone);
  console.log('[BE] SESSION:', session
    ? `state=${session.current_state} | ctx=${JSON.stringify(session.context)}`
    : 'null (new user)');

  // No session record — could be returning user (session expired/cleared) or brand new
  if (!session) {
    console.log('[BE] BRANCH: no session — checking users table for:', phone);
    const existingUser = await getUserByPhone(phone);

    if (existingUser) {
      // Registered user whose session expired — restore IDLE session with brand context
      console.log('[BE] Returning user found:', existingUser.business_name, '— restoring IDLE session');
      const brandKit = await getBrandKit(existingUser.id);
      console.log('[BE] Brand kit loaded:', brandKit ? 'yes (id=' + brandKit.id + ')' : 'none');
      session = await updateSession(phone, STATES.IDLE, {
        user_id: existingUser.id,
        business_name: existingUser.business_name,
        brand_kit: brandKit || {},
      });
      console.log('[BE] Session restored — falling through to IDLE routing');
      // Falls through to isSessionExpired check + normal IDLE routing below

    } else {
      // Unregistered number — check for lead keywords before starting onboarding
      const lower = text.toLowerCase();
      const PRICE_KW   = ['price', 'cost', 'kitna', 'rate', 'charge', 'fees'];
      const BOOKING_KW = ['book', 'slot', 'appointment', 'available'];
      const isPriceIntent   = PRICE_KW.some(kw => lower.includes(kw));
      const isBookingIntent = BOOKING_KW.some(kw => lower.includes(kw));

      if (isPriceIntent || isBookingIntent) {
        const intent = isPriceIntent ? 'PRICE' : 'BOOKING';
        console.log('[BE] BRANCH: unregistered + lead keyword → lead capture | intent:', intent);

        const owner = await getOwner();
        if (owner) {
          await saveLead(owner.id, phone, text, intent);
          const ownerNotif = `🔔 Naya Lead Aaya!\n\nNumber: ${phone}\nMessage: ${text}\nIntent: ${intent}\n\nAuto-reply bhej diya. ✅`;
          await sendMessage(owner.phone, ownerNotif);
          console.log('[BE] Owner notified:', owner.phone);
        } else {
          console.warn('[BE] No owner found in DB — lead not saved');
        }

        return isPriceIntent
          ? `Namaste! 😊 Abhi special offer chal raha hai.\nAapka naam aur preferred time batayein —\nhum aapko personally confirm karenge! 🙏`
          : `Bilkul! Aapka naam aur convenient time batayein 😊\nSlot confirm kar denge!`;
      }

      // Truly new number with no lead intent → start onboarding
      console.log('[BE] BRANCH: new unregistered number → onboarding');
      return handleOnboarding(phone, text, null, rawJid);
    }
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
