/**
 * captionFlow.js — Caption Request & Selection
 * Handles: IDLE + caption keywords → CAPTION_REQUESTED → POST_CONFIRM
 */

const { STATES, updateSession } = require('../stateMachine');

// Words that signal a caption request
const CAPTION_KEYWORDS = [
  'caption', 'content', 'likh', 'likhdo', 'likho', 'post banao', 'post chahiye',
  'write', 'generate', 'motivation', 'motivational', 'offer', 'diwali', 'holi',
  'eid', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'sale', 'discount', 'announce', 'launch', 'new', 'update',
];

function isCaptionRequest(text) {
  const lower = text.toLowerCase();
  return CAPTION_KEYWORDS.some(kw => lower.includes(kw));
}

async function handleCaptionRequest(phone, message, session, rawJid) {
  console.log('=== CAPTION FLOW ===', phone, rawJid, '| state:', session?.current_state || 'null', '| msg:', message);
  const text = message.trim();
  const state = session?.current_state || STATES.IDLE;

  try {
    // ── IDLE + caption keyword → save prompt, show placeholder captions ──────
    if (state === STATES.IDLE) {
      console.log('[CF] BRANCH: idle + caption keyword → saving prompt, state → CAPTION_REQUESTED');

      await updateSession(phone, STATES.CAPTION_REQUESTED, {
        ...(session?.context || {}),
        caption_prompt: text,
      });

      // TODO: Call Claude API for 5 captions (when credits available)
      // const brandKit = await fetchBrandKit(phone);
      // const captions = await generateSmartCaptions(brandKit, 'post', text, 'instagram');
      // Store captions in session context and return numbered list

      return `Tumhara caption request ready hai: *"${text}"*

✍️ Claude API credits milte hi 5 captions generate honge:
1️⃣ Hinglish caption
2️⃣ Hinglish caption
3️⃣ Hinglish caption
4️⃣ English caption
5️⃣ English caption

Abhi ke liye ek test caption:
_"${text.charAt(0).toUpperCase() + text.slice(1)} ke saath apna business badhao! Aaj hi aaiye 🚀 #SmallBusiness #IndiaFirst"_

Number bhejo caption choose karne ke liye (1-5):`;
    }

    // ── CAPTION_REQUESTED + number (1-5) → save selection, go to POST_CONFIRM ─
    if (state === STATES.CAPTION_REQUESTED) {
      const num = parseInt(text, 10);
      console.log(`[CF] BRANCH: caption_requested | input="${text}" | parsed num=${num}`);

      if (!num || num < 1 || num > 5) {
        return '1 se 5 ke beech number bhejo caption choose karne ke liye 😊\n\n(Ya naya topic likho nayi captions ke liye)';
      }

      const context = {
        ...(session?.context || {}),
        selected_caption_index: num,
      };
      console.log('[CF] SAVING STATE: post_confirm | context:', JSON.stringify(context));
      await updateSession(phone, STATES.POST_CONFIRM, context);

      return `Caption #${num} selected! ✅

Kya karna hai?
1️⃣ Abhi post karo
2️⃣ Schedule karo
3️⃣ Flyer bhi banao iske saath`;
    }

    console.warn('[CF] No matching branch — state:', state, '| text:', text);
    return null;

  } catch (err) {
    console.error('[CF] ERROR:', err.message);
    return 'Kuch error aa gaya 😅 Thodi der baad try karo.\n*help* likho options ke liye.';
  }
}

module.exports = { handleCaptionRequest, isCaptionRequest };
