const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/buffer/connect — returns Buffer OAuth URL
// Pass ?userId= to preserve it through the OAuth round-trip via state param
router.get('/connect', (req, res) => {
  const { userId } = req.query;
  const authUrl =
    `https://bufferapp.com/oauth2/authorize` +
    `?client_id=${process.env.BUFFER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.BUFFER_REDIRECT_URI)}` +
    `&response_type=code` +
    (userId ? `&state=${encodeURIComponent(userId)}` : '');

  res.json({ authUrl });
});

// GET /api/buffer/callback — Buffer redirects here with ?code=&state=userId
router.get('/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.status(400).json({ error: 'No OAuth code received from Buffer' });

    const tokenRes = await axios.post(
      'https://api.bufferapp.com/1/oauth2/token.json',
      null,
      {
        params: {
          client_id:     process.env.BUFFER_CLIENT_ID,
          client_secret: process.env.BUFFER_CLIENT_SECRET,
          redirect_uri:  process.env.BUFFER_REDIRECT_URI,
          code,
          grant_type:    'authorization_code'
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    if (userId) {
      await getSupabase()
        .from('users')
        .update({ buffer_access_token: accessToken })
        .eq('id', userId);
    }

    res.json({ success: true, message: 'Instagram connected!' });
  } catch (err) {
    console.error('Buffer callback error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
