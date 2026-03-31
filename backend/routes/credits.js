const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const CREDIT_COSTS = {
  flyer_generated:   5,
  caption_generated: 1,
  post_published:    2,
  brand_kit_created: 3,
  weekly_report:     0
};

async function deductCredits(userId, action) {
  const supabase = getSupabase();
  const cost = CREDIT_COSTS[action] || 0;
  if (cost === 0) return { success: true };

  const { data: credits } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!credits) return { success: false, error: 'No credit account found' };

  const remaining = credits.total_credits - credits.used_credits;
  if (remaining < cost) return { success: false, error: 'Insufficient credits' };

  await supabase
    .from('credits')
    .update({ used_credits: credits.used_credits + cost })
    .eq('user_id', userId);

  await supabase
    .from('credit_usage')
    .insert({ user_id: userId, action, credits_used: cost });

  return { success: true, credits_remaining: remaining - cost };
}

async function getCredits(userId) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

module.exports = { deductCredits, getCredits, CREDIT_COSTS };
