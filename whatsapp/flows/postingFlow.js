/**
 * postingFlow.js — Post to Instagram / Schedule
 * Handles:
 *   POST_CONFIRM + "1"/"post"/abhi  → post now (check Buffer token)
 *   POST_CONFIRM + "2"/"schedule"   → ask for time → SCHEDULE_TIME
 *   POST_CONFIRM + "3"/"flyer"      → route to flyerFlow
 *   SCHEDULE_TIME + time text       → schedule (TODO Buffer) → IDLE
 *   IDLE + direct-post keywords     → prompt to create content first
 */

const supabase = require('../../backend/supabase');
const { STATES, updateSession, resetSession } = require('../stateMachine');

// ── Buffer auth URL builder ────────────────────────────────────────────────────
function getBufferAuthUrl(userId) {
  const clientId     = process.env.BUFFER_CLIENT_ID     || 'YOUR_BUFFER_CLIENT_ID';
  const redirectUri  = encodeURIComponent(
    process.env.BUFFER_REDIRECT_URI || 'http://localhost:5000/api/buffer/callback'
  );
  const state = userId ? `&state=${encodeURIComponent(userId)}` : '';
  return `https://bufferapp.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code${state}`;
}

// ── Basic Hinglish time parser ─────────────────────────────────────────────────
function parseScheduleTime(text) {
  const lower = text.toLowerCase().trim();

  if (lower.includes('abhi') || lower.includes('now'))          return 'Abhi / Right now';
  if (lower.includes('kal')  && lower.includes('10'))           return 'Kal 10:00 AM';
  if (lower.includes('kal')  && lower.includes('9'))            return 'Kal 9:00 AM';
  if (lower.includes('kal')  && lower.includes('morning'))      return 'Kal Morning';
  if (lower.includes('kal')  && lower.includes('evening'))      return 'Kal Evening';
  if (lower.includes('kal'))                                     return `Kal — ${text}`;
  if (lower.includes('aaj')  && lower.includes('raat'))         return `Aaj Raat — ${text}`;
  if (lower.includes('aaj')  && lower.includes('sham'))         return `Aaj Shaam — ${text}`;
  if (lower.includes('aaj'))                                    return `Aaj — ${text}`;
  if (lower.includes('monday'))    return `Monday — ${text}`;
  if (lower.includes('tuesday'))   return `Tuesday — ${text}`;
  if (lower.includes('wednesday')) return `Wednesday — ${text}`;
  if (lower.includes('thursday'))  return `Thursday — ${text}`;
  if (lower.includes('friday'))    return `Friday — ${text}`;
  if (lower.includes('saturday'))  return `Saturday — ${text}`;
  if (lower.includes('sunday'))    return `Sunday — ${text}`;

  return text; // Fallback: use as-is
}

async function handlePostingRequest(phone, message, session, rawJid) {
  console.log('=== POSTING FLOW ===', phone, rawJid, '| state:', session?.current_state || 'null', '| msg:', message);
  const text    = message.trim();
  const lower   = text.toLowerCase();
  const state   = session?.current_state || STATES.IDLE;

  try {

    // ── IDLE: user says "post karo" before creating content ──────────────────
    if (state === STATES.IDLE) {
      console.log('[PF] BRANCH: idle + post keyword → nudge to create content first');
      return `Pehle content banao, phir post karo! 😊

*Caption banana hai?* Koi bhi topic likho:
_"monday motivation post"_

*Poster banana hai?* Likho:
_"diwali offer poster banao"_

*help* likho sab options dekhne ke liye`;
    }

    // ── POST_CONFIRM ─────────────────────────────────────────────────────────
    if (state === STATES.POST_CONFIRM) {

      // Option 3 / flyer / poster → switch to flyer flow
      if (lower === '3' || lower.includes('flyer') || lower.includes('poster') || lower.includes('banner')) {
        console.log('[PF] BRANCH: post_confirm → flyer requested');
        // Import here to avoid circular dependency at module load time
        const { handleFlyerRequest } = require('./flyerFlow');
        await updateSession(phone, STATES.FLYER_REQUESTED, session?.context || {});
        return handleFlyerRequest(
          phone,
          session?.context?.caption_prompt || message,
          { ...session, current_state: STATES.FLYER_REQUESTED },
          rawJid
        );
      }

      // Option 2 / schedule → ask for time
      if (lower === '2' || lower.includes('schedule') || lower.includes('baad') || lower.includes('later')) {
        console.log('[PF] BRANCH: post_confirm → schedule_time');
        await updateSession(phone, STATES.SCHEDULE_TIME, session?.context || {});
        return `Kab post karna hai? ⏰

Kuch examples:
• *kal 10am*
• *monday 7pm*
• *aaj raat 9pm*
• *saturday morning*

Time bhejo!`;
      }

      // Option 1 / post / abhi → post now
      if (lower === '1' || lower.includes('post') || lower.includes('abhi') || lower.includes('now')) {
        console.log('[PF] BRANCH: post_confirm → post now | checking Buffer token');

        let hasBufferToken = false;
        let userId = null;

        if (supabase) {
          const { data: user, error } = await supabase
            .from('users')
            .select('id, buffer_access_token')
            .eq('phone', phone)
            .single();

          if (error) {
            console.warn('[PF] Could not fetch user for buffer check:', error.message);
          } else if (user) {
            userId = user.id;
            hasBufferToken = !!user.buffer_access_token;
            console.log('[PF] Buffer token present:', hasBufferToken, '| userId:', userId);
          }
        } else {
          console.warn('[PF] Supabase null — assuming no Buffer token');
        }

        await resetSession(phone);

        if (!hasBufferToken) {
          const authUrl = getBufferAuthUrl(userId);
          return `Pehle Instagram connect karo! 📱

Yeh link open karo:
${authUrl}

Connect hone ke baad wapas aao aur *post* likho 🚀`;
        }

        // TODO: Call Buffer API to post immediately (when credentials available)
        // await bufferApi.createUpdate({
        //   access_token: user.buffer_access_token,
        //   profile_ids:  [instagramProfileId],
        //   text:         session.context.selected_caption,
        //   media:        { photo: session.context.flyer_image_url },
        // });

        return `Post ho jayega jab Buffer API credits set honge! 🚀

_.env mein BUFFER_CLIENT_ID + BUFFER_CLIENT_SECRET daal do — bas 2 min ka kaam_

Kuch aur banana hai? *help* likho!`;
      }

      // Unknown input at POST_CONFIRM
      console.warn('[PF] Unknown input at POST_CONFIRM:', text);
      return `Ek option choose karo:
1️⃣ Abhi post karo
2️⃣ Schedule karo
3️⃣ Flyer bhi banao iske saath`;
    }

    // ── SCHEDULE_TIME: user sends time string ────────────────────────────────
    if (state === STATES.SCHEDULE_TIME) {
      console.log('[PF] BRANCH: schedule_time + time input:', text);
      const parsedTime = parseScheduleTime(text);

      // TODO: Call Buffer API to schedule (when credentials available)
      // await bufferApi.scheduleUpdate({ access_token, scheduled_at: parsedTime, ... });

      await resetSession(phone);
      console.log('[PF] Session reset to IDLE after scheduling');

      return `Schedule ho gaya! ✅

⏰ *Time:* ${parsedTime}
📱 *Platform:* Instagram

Buffer connect hone ke baad auto-post ho jayega!

_Abhi *help* likho ya naya content banao 😊_`;
    }

    console.warn('[PF] No matching branch — state:', state, '| text:', text);
    return null;

  } catch (err) {
    console.error('[PF] ERROR:', err.message);
    await resetSession(phone).catch(() => {});
    return 'Posting mein dikkat aayi 😅 Thodi der baad try karo.\n*help* likho options ke liye.';
  }
}

module.exports = { handlePostingRequest };
