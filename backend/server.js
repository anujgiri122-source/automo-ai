require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { generateSmartCaptions, generateCaptionsForUI } = require('./routes/captions');
const { handleFlyerRequest } = require('./routes/flyer');
const { deductCredits, getCredits } = require('./routes/credits');
const { logPost } = require('./routes/post');
const paymentRouter   = require('./routes/payment');
const bufferRouter    = require('./routes/buffer');
const whatsappRouter  = require('./routes/whatsapp');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://frontend-rosy-two-hkq9f9y87m.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));

// Webhook needs raw body for signature verification — MUST be before express.json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'automo-ai' }));

// POST /api/generate-captions — UI caption generator (businessType + topic + optional platform/postType)
app.post('/api/generate-captions', async (req, res) => {
  try {
    const { businessType, topic, platform, postType } = req.body;
    if (!businessType && !topic) return res.status(400).json({ error: 'businessType or topic is required' });
    const captions = await generateCaptionsForUI(businessType, topic, platform, postType);
    res.json({ captions });
  } catch (err) {
    console.error('generate-captions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/captions — generate AI captions for a post
app.post('/api/captions', async (req, res) => {
  try {
    const { brandData, postType, offer, platform, userId } = req.body;
    if (!offer) return res.status(400).json({ error: 'offer is required' });
    const captions = await generateSmartCaptions(brandData, postType, offer, platform);
    if (userId) await deductCredits(userId, 'caption_generated');
    res.json(captions);
  } catch (err) {
    console.error('Caption error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flyer/prepare — prepare Canva MCP flyer query
app.post('/api/flyer/prepare', handleFlyerRequest);

// GET /api/credits/:userId — get credit balance
app.get('/api/credits/:userId', async (req, res) => {
  try {
    const data = await getCredits(req.params.userId);
    if (!data) return res.status(404).json({ error: 'No credit account found' });
    res.json(data);
  } catch (err) {
    console.error('Credits error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/post/log — log a post to the database
app.post('/api/post/log', async (req, res) => {
  try {
    const { brandId, platform, caption, imageUrl, scheduledAt } = req.body;
    if (!brandId || !platform || !caption) {
      return res.status(400).json({ error: 'brandId, platform, and caption are required' });
    }
    const post = await logPost(brandId, platform, caption, imageUrl, scheduledAt);
    res.json(post);
  } catch (err) {
    console.error('Post log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Payment + Buffer OAuth + WhatsApp routes
app.use('/api/payment',   paymentRouter);
app.use('/api/buffer',    bufferRouter);
app.use('/api/whatsapp',  whatsappRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Automo AI server running on port ${PORT}`));
