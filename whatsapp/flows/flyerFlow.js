/**
 * flyerFlow.js — Flyer / Poster Generation
 * Handles: IDLE + flyer keywords → build design prompt → save to DB → reset to IDLE
 */

const supabase = require('../../backend/supabase');
const { STATES, updateSession, resetSession } = require('../stateMachine');
const { createDesignPrompt } = require('../../backend/services/designArchitect');

// Words that signal a flyer/poster request
const FLYER_KEYWORDS = [
  'flyer', 'poster', 'banner', 'design', 'graphic', 'image', 'photo',
  'bana', 'banao', 'bana do', 'create poster', 'make poster',
  'diwali poster', 'offer poster', 'sale banner',
];

function isFlyerRequest(text) {
  const lower = text.toLowerCase();
  return FLYER_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Fetch user + brand kit from Supabase for a given phone number.
 * Returns brandKit object or a safe default if not found.
 */
async function fetchBrandKit(phone) {
  console.log('[FF] fetchBrandKit for phone:', phone);

  if (!supabase) {
    console.warn('[FF] Supabase null — returning default brand kit');
    return { business_name: 'Your Business', business_type: 'general', primary_color: '#FF6B35' };
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (userErr || !user) {
    console.warn('[FF] User not found:', userErr?.message);
    return { business_name: 'Your Business', business_type: 'general', primary_color: '#FF6B35' };
  }

  const { data: bk, error: bkErr } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (bkErr || !bk) {
    console.warn('[FF] Brand kit not found:', bkErr?.message);
    return { business_name: 'Your Business', business_type: 'general', primary_color: '#FF6B35' };
  }

  console.log('[FF] Brand kit loaded:', JSON.stringify({ name: bk.business_name, type: bk.business_type, color: bk.primary_color }));
  return bk;
}

async function handleFlyerRequest(phone, message, session, rawJid) {
  console.log('=== FLYER FLOW ===', phone, rawJid, '| state:', session?.current_state || 'null', '| msg:', message);
  const text = message.trim();

  try {
    // Mark state as FLYER_REQUESTED while processing
    console.log('[FF] BRANCH: flyer request → state → FLYER_REQUESTED');
    await updateSession(phone, STATES.FLYER_REQUESTED, {
      ...(session?.context || {}),
      flyer_prompt: text,
    });

    // Step 1: Fetch brand kit
    const brandKit = await fetchBrandKit(phone);

    // Step 2: Build detailed design prompt
    console.log('[FF] Building design prompt...');
    const designResult = createDesignPrompt(text, brandKit, 'instagram_post');
    console.log('[FF] Design prompt ready — length:', designResult.prompt.length);

    // TODO: Call Claude API to refine prompt + Canva MCP generate-design (when credits available)
    // const canvaDesign = await canvaMcp.generateDesign({
    //   query:     designResult.canvaParams.query,
    //   asset_ids: designResult.canvaParams.asset_ids,
    // });
    // const imageUrl = canvaDesign.result.imageUrl;

    // Step 3: Save flyer record to Supabase
    if (supabase) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('phone', phone)
          .single();

        if (user) {
          const { error: flyerErr } = await supabase.from('flyers').insert({
            user_id:          user.id,
            type:             'instagram_post',
            prompt:           designResult.prompt,
            image_url:        null, // TODO: set after Canva MCP returns image URL
            canva_design_url: null, // TODO: set after Canva MCP returns design URL
          });
          if (flyerErr) console.error('[FF] SUPABASE ERROR saving flyer:', flyerErr.message);
          else console.log('[FF] Flyer record saved to DB');
        }
      } catch (dbErr) {
        console.error('[FF] DB save exception:', dbErr.message);
        // Don't block user if DB write fails
      }
    }

    // Step 4: Reset session to IDLE
    await resetSession(phone);
    console.log('[FF] Session reset to IDLE');

    const bk = brandKit;
    const colorLine = bk.secondary_color
      ? `${bk.primary_color || '#FF6B35'} + ${bk.secondary_color}`
      : (bk.primary_color || '#FF6B35');
    const promptPreview = designResult.prompt.substring(0, 200);

    return `🎨 Design prompt ready!

*Business:* ${bk.business_name}
*Colors:* ${colorLine}

*Prompt preview:*
_${promptPreview}..._

Canva MCP se poster ban jayega jab API credits aayenge! 🚀

Abhi kuch aur banana hai? *help* likho options ke liye.`;

  } catch (err) {
    console.error('[FF] ERROR:', err.message);
    await resetSession(phone).catch(() => {});
    return 'Flyer banane mein dikkat aayi 😅 Thodi der baad try karo.\n*help* likho options ke liye.';
  }
}

module.exports = { handleFlyerRequest, isFlyerRequest };
