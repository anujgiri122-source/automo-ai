const supabase = require('../../backend/supabase');
const { STATES, updateSession } = require('../stateMachine');

const BUSINESS_TYPES = {
  '1': 'cafe',
  '2': 'gym',
  '3': 'salon',
  '4': 'hotel',
  '5': 'coaching',
  '6': 'other',
  // also accept text names
  'cafe': 'cafe', 'restaurant': 'cafe', 'coffee': 'cafe',
  'gym': 'gym', 'fitness': 'gym', 'yoga': 'gym',
  'salon': 'salon', 'beauty': 'salon', 'parlour': 'salon', 'parlor': 'salon', 'spa': 'salon',
  'hotel': 'hotel',
  'coaching': 'coaching', 'tuition': 'coaching', 'classes': 'coaching', 'institute': 'coaching',
  'shop': 'other', 'store': 'other', 'dukaan': 'other', 'other': 'other',
};

const TYPE_LABELS = {
  cafe:     'Cafe/Restaurant',
  gym:      'Gym/Fitness',
  salon:    'Salon/Beauty',
  hotel:    'Hotel',
  coaching: 'Coaching Centre',
  other:    'Other'
};

async function handleOnboarding(phone, message, session, rawJid) {
  console.log('=== ONBOARDING ===', phone, rawJid, message, session?.current_state || 'null session');
  const state = session?.current_state || STATES.IDLE;
  const text = message.trim();

  // IDLE — first message from this phone → start onboarding
  if (state === STATES.IDLE || !session) {
    console.log('[OB] SAVING STATE: onboarding_name');
    const result = await updateSession(phone, STATES.ONBOARDING_NAME, {});
    console.log('[OB] STATE SAVED:', result ? 'ok' : 'FAILED — check Supabase');
    return 'Namaste! Main hoon Automo AI 🤖\n\nMain aapka WhatsApp pe social media manager hoon.\nEk message bhejo → captions + flyer banaunga → Instagram pe post kar dunga.\n\nKoi app nahi. Koi laptop nahi. Sirf WhatsApp. ✨\n\nShuru karte hain? Aapka naam kya hai?';
  }

  // Received business name
  if (state === STATES.ONBOARDING_NAME) {
    if (text.length < 2) {
      return 'Thoda sa aur batao — business ka poora naam likho 😊';
    }
    const context = { ...(session.context || {}), business_name: text };
    console.log('[OB] SAVING STATE: onboarding_type | context:', JSON.stringify(context));
    const result = await updateSession(phone, STATES.ONBOARDING_TYPE, context);
    console.log('[OB] STATE SAVED:', result ? 'ok' : 'FAILED — check Supabase');
    return `Badiya naam, *${text}*! 😄\n\nAapka business kya hai?\n1️⃣ Cafe/Restaurant\n2️⃣ Gym/Fitness\n3️⃣ Salon/Beauty\n4️⃣ Hotel\n5️⃣ Coaching Centre\n6️⃣ Dukaan/Other`;
  }

  // Received business type — accept number (1-6) or text name
  if (state === STATES.ONBOARDING_TYPE) {
    const businessType = BUSINESS_TYPES[text.toLowerCase()] || BUSINESS_TYPES[text];
    if (!businessType) {
      return '1 se 6 ke beech number bhejo yaar 😅\n\n1️⃣ Cafe/Restaurant\n2️⃣ Gym/Fitness\n3️⃣ Salon/Beauty\n4️⃣ Hotel\n5️⃣ Coaching Centre\n6️⃣ Other';
    }
    const context = { ...(session.context || {}), business_type: businessType };
    console.log('[OB] SAVING STATE: onboarding_link | context:', JSON.stringify(context));
    const result = await updateSession(phone, STATES.ONBOARDING_LINK, context);
    console.log('[OB] STATE SAVED:', result ? 'ok' : 'FAILED — check Supabase');
    return 'Aapna Instagram ya website link bhejo — main logo + colors le lunga! 🔗\nYa *skip* likho aage badhne ke liye';
  }

  // Received website link or "skip"
  if (state === STATES.ONBOARDING_LINK) {
    const link = text.toLowerCase() === 'skip' ? null : text;
    const context = { ...(session.context || {}), website_link: link };
    console.log('[OB] Onboarding complete — saving user to DB | context:', JSON.stringify(context));

    if (supabase) {
      try {
        const { data: user, error: userErr } = await supabase
          .from('users')
          .insert({
            whatsapp_number: phone,
            business_name:   context.business_name,
            category:        context.business_type || 'other',
          })
          .select()
          .single();

        if (userErr) {
          console.error('[OB] SUPABASE ERROR saving user:', userErr.message, '| code:', userErr.code);
        } else {
          console.log('[OB] User saved:', user?.id);
          const { error: bkErr } = await supabase.from('brand_kits').insert({
            user_id: user.id,
            tone:    context.business_type || 'professional',
          });
          if (bkErr) console.error('[OB] SUPABASE ERROR saving brand_kit:', bkErr.message);
          else console.log('[OB] Brand kit saved for user:', user.id);
        }
      } catch (err) {
        console.error('[OB] DB exception:', err.message);
        // Continue — don't block the user even if DB write fails
      }
    } else {
      console.warn('[OB] Supabase is null — user NOT saved to DB');
    }

    console.log('[OB] SAVING STATE: idle (onboarding complete)');
    await updateSession(phone, STATES.IDLE, {});
    return 'Brand Kit save ho gaya! ✅ Ab batao — aaj kya post banana hai?';
  }

  console.warn('[OB] No matching state branch for:', state, '— returning null');
  return null; // Not an onboarding state — caller handles this
}

module.exports = { handleOnboarding };
