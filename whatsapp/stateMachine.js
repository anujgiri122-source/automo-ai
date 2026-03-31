const supabase = require('../backend/supabase');

const STATES = {
  IDLE:               'idle',
  ONBOARDING_NAME:    'onboarding_name',
  ONBOARDING_TYPE:    'onboarding_type',
  ONBOARDING_LINK:    'onboarding_link',
  CAPTION_REQUESTED:  'caption_requested',
  CAPTION_SELECTED:   'caption_selected',
  FLYER_REQUESTED:    'flyer_requested',
  POST_CONFIRM:       'post_confirm',
  SCHEDULE_TIME:      'schedule_time',
  PAYMENT_PENDING:    'payment_pending'
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function getSession(phone) {
  console.log('[SM] getSession for:', phone);
  if (!supabase) {
    console.warn('[SM] getSession: supabase is null — SUPABASE_URL not loaded. State will not persist.');
    return null;
  }
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .single();
  // PGRST116 = no rows found — normal for new users, not an error
  if (error && error.code !== 'PGRST116') {
    console.error('[SM] getSession SUPABASE ERROR:', error.message, '| code:', error.code);
  }
  console.log('[SM] SESSION FOUND:', data ? `state=${data.current_state} context=${JSON.stringify(data.context)}` : 'null');
  return data || null;
}

async function updateSession(phone, state, context = {}) {
  console.log('[SM] UPDATE SESSION:', phone, '→', state, JSON.stringify(context));
  if (!supabase) {
    console.warn('[SM] updateSession: supabase is null — state NOT saved to DB');
    return null;
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString();

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .upsert(
      { phone, current_state: state, context, last_message_at: now, expires_at: expiresAt },
      { onConflict: 'phone' }
    )
    .select()
    .single();

  if (error) {
    console.error('[SM] updateSession SUPABASE ERROR:', error.message, '| code:', error.code);
  }
  console.log('[SM] STATE SAVED:', data ? `ok (state=${data.current_state})` : 'FAILED — data is null');
  return data;
}

async function resetSession(phone) {
  return updateSession(phone, STATES.IDLE, {});
}

function isSessionExpired(session) {
  if (!session || !session.expires_at) return true;
  return new Date(session.expires_at) < new Date();
}

module.exports = { STATES, getSession, updateSession, resetSession, isSessionExpired };
