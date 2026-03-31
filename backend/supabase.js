const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseUrl.startsWith('http');

if (!isConfigured) {
  console.warn('⚠️  SUPABASE_URL not set in .env — brand kit routes will not work');
}

let supabase = null;
if (isConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('⚠️  Supabase createClient failed:', err.message);
  }
}

module.exports = supabase;
