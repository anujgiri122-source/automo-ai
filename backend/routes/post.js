const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

async function logPost(brandId, platform, caption, imageUrl, scheduledAt) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      brand_id: brandId,
      platform,
      caption,
      image_url: imageUrl,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updatePostStatus(postId, status, postedAt) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('posts')
    .update({ status, posted_at: postedAt || new Date().toISOString() })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { logPost, updatePostStatus };
