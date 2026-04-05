/**
 * captionFlow.js — Caption Request & Selection
 * Handles: IDLE + caption keywords → CAPTION_REQUESTED → POST_CONFIRM
 */

const { STATES, updateSession } = require('../stateMachine');
const supabase = require('../../backend/supabase');

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

async function loadBrandData(phone, session) {
  console.log('[CF] loadBrandData for phone:', phone);
  if (session?.context?.brand_kit && session?.context?.business_name) {
    const bk = session.context.brand_kit;
    console.log('[CF] Using brand kit from session context');
    return {
      name: session.context.business_name,
      category: bk.business_type || 'general',
    };
  }
  if (!supabase) {
    console.warn('[CF] Supabase null — using default brand data');
    return { name: 'My Business', category: 'general' };
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('id, business_name, business_type')
    .eq('phone', phone)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[CF] loadBrandData DB error:', error.message);
  if (!user) {
    console.warn('[CF] User not found for phone:', phone, '— using defaults');
    return { name: 'My Business', category: 'general' };
  }
  console.log('[CF] Loaded user from DB:', user.business_name, user.business_type);
  return {
    name: user.business_name || 'My Business',
    category: user.business_type || 'general',
  };
}

async function generateCaptionsViaAiCredits(businessName, userMessage) {
  const baseUrl = process.env.AICREDITS_BASE_URL;
  const apiKey = process.env.AICREDITS_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('AICREDITS_BASE_URL or AICREDITS_API_KEY not set in .env');
  }

  const prompt = `Generate 5 Instagram captions in Hinglish for Indian small business.
Business: ${businessName}
Post idea: ${userMessage}

Styles: urgency, emotional, offer, curiosity, direct CTA
Each caption max 150 chars with CTA

Return ONLY a JSON array of exactly 5 objects, each with a "text" field. No explanation, no markdown.
Example format: [{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."}]`;

  console.log('[CF] Calling AiCredits API | business:', businessName, '| prompt:', userMessage.substring(0, 60));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AiCredits API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('[CF] AiCredits raw response:', content.substring(0, 300));

  // Extract JSON array from response (handles markdown code blocks too)
  const jsonMatch = content.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) throw new Error('No JSON array found in AiCredits response');

  const captions = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(captions) || captions.length === 0) {
    throw new Error('Invalid captions array from AiCredits');
  }

  return captions.slice(0, 5);
}

function formatCaptionsMessage(captions, isRegenerate = false) {
  const header = isRegenerate ? 'Naye captions ready! 🔄' : 'Yeh lo aapke 5 captions! 🎉';
  return `${header}

1️⃣ ${captions[0]?.text || ''}

2️⃣ ${captions[1]?.text || ''}

3️⃣ ${captions[2]?.text || ''}

4️⃣ ${captions[3]?.text || ''}

5️⃣ ${captions[4]?.text || ''}

---
Reply karo:
✅ 1-5 → caption approve karo
🔄 r → naye captions chahiye`;
}

async function handleCaptionRequest(phone, message, session, rawJid) {
  console.log('=== CAPTION FLOW ===', phone, rawJid, '| state:', session?.current_state || 'null', '| msg:', message);
  const text = message.trim();
  const state = session?.current_state || STATES.IDLE;

  try {
    // ── IDLE + caption keyword → call AiCredits API ───────────────────────────
    if (state === STATES.IDLE) {
      console.log('[CF] BRANCH: idle + caption keyword → calling AiCredits API');

      const userText = text || 'aapka post';
      const brandData = await loadBrandData(phone, session);

      let captions;
      try {
        captions = await generateCaptionsViaAiCredits(brandData.name, userText);
        console.log('[CF] Generated', captions.length, 'captions via AiCredits');
      } catch (apiErr) {
        console.error('[CF] AiCredits API error:', apiErr.message);
        return 'Caption generate karne mein thodi problem hui 😅 Ek baar aur try karo!';
      }

      await updateSession(phone, STATES.CAPTION_REQUESTED, {
        ...(session?.context || {}),
        caption_prompt: text,
        captions,
      });
      console.log('[CF] STATE SAVED: caption_requested | captions stored in context');

      return formatCaptionsMessage(captions);
    }

    // ── CAPTION_REQUESTED: selection (1-5) or regenerate (r) ────────────────
    if (state === STATES.CAPTION_REQUESTED) {
      console.log(`[CF] BRANCH: caption_requested | input="${text}"`);

      if (text.toLowerCase() === 'r' || text.toLowerCase() === 'regenerate') {
        console.log('[CF] Regenerate requested — calling AiCredits API again');
        const prompt = session?.context?.caption_prompt || text;
        const brandData = await loadBrandData(phone, session);

        let captions;
        try {
          captions = await generateCaptionsViaAiCredits(brandData.name, prompt);
          console.log('[CF] Regenerated', captions.length, 'captions via AiCredits');
        } catch (apiErr) {
          console.error('[CF] Regenerate API error:', apiErr.message);
          return 'Caption generate karne mein thodi problem hui 😅 Ek baar aur try karo!';
        }

        await updateSession(phone, STATES.CAPTION_REQUESTED, {
          ...(session?.context || {}),
          captions,
        });
        console.log('[CF] STATE SAVED: caption_requested | regenerated captions stored');

        return formatCaptionsMessage(captions, true);
      }

      // Number 1-5 → approve selected caption
      const num = parseInt(text, 10);
      console.log(`[CF] Selection attempt | parsed num=${num}`);

      if (!num || num < 1 || num > 5) {
        return '1 se 5 ke beech number bhejo caption choose karne ke liye 😊\n\nYa *r* likho naye captions ke liye';
      }

      const savedCaptions = session?.context?.captions;
      const selectedCaption = savedCaptions?.[num - 1];
      console.log('[CF] Selected caption:', selectedCaption?.text?.substring(0, 60));

      const context = {
        ...(session?.context || {}),
        selected_caption_index: num,
        selected_caption_text: selectedCaption?.text || '',
        selected_caption_hashtags: selectedCaption?.hashtags || [],
      };
      console.log('[CF] SAVING STATE: post_confirm');
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
