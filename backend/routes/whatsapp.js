/**
 * whatsapp.js — WhatsApp webhook + test endpoint
 *
 * GET  /api/whatsapp/webhook  — Meta/AiSensy hub verification
 * POST /api/whatsapp/webhook  — GREEN-API incoming message handler
 * POST /api/whatsapp/test     — local testing without real WhatsApp
 */

const express = require('express');
const { processMessage }                = require('../../whatsapp/botEngine');
const { sendMessage, sendMediaMessage } = require('../services/aisensyService');

const router = express.Router();

// ── GET /webhook — hub verification ──────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[WH-VERIFY] mode:', mode, '| token:', token);

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[WH-VERIFY] ✅ Verified');
    return res.status(200).send(challenge);
  }

  console.warn('[WH-VERIFY] ❌ Token mismatch or wrong mode');
  res.status(403).send('Forbidden');
});

// ── POST /webhook — GREEN-API incoming messages ───────────────────────────────
router.post('/webhook', async (req, res) => {
  console.log('[WEBHOOK] Received:', JSON.stringify(req.body).substring(0, 200));
  // Always respond 200 immediately — GREEN-API requires fast ACK
  res.status(200).json({ status: 'received' });

  try {
    console.log('[WH-HOOK] Raw payload:', JSON.stringify(req.body));

    const { typeWebhook, senderData, messageData } = req.body;

    if (typeWebhook !== 'incomingMessageReceived') {
      console.log('[WH-HOOK] Skipping webhook type:', typeWebhook);
      return;
    }

    const typeMessage = messageData?.typeMessage;
    if (typeMessage !== 'textMessage' && typeMessage !== 'extendedTextMessage') {
      console.log('[WH-HOOK] Non-text message type:', typeMessage, '— skipping');
      return;
    }

    const phone    = senderData?.chatId?.replace('@c.us', '');
    const msgText  = typeMessage === 'extendedTextMessage'
      ? messageData?.extendedTextMessageData?.text
      : messageData?.textMessageData?.textMessage;
    const userName = senderData?.senderName || 'User';

    if (!phone || !msgText) {
      console.warn('[WH-HOOK] Could not extract phone/message — ignoring');
      return;
    }

    console.log(`[WH-HOOK] Parsed | phone=${phone} | user="${userName}" | msg="${msgText}"`);

    const reply = await processMessage(phone, msgText, phone);
    console.log('[WH-HOOK] Reply:', reply ? reply.substring(0, 100) : '(null)');

    if (reply) {
      await sendMessage(phone, reply);
    }

  } catch (err) {
    console.error('[WH-HOOK] Error:', err.message);
  }
});

// ── POST /test — local testing without real WhatsApp ─────────────────────────
// Usage:
//   curl -X POST http://localhost:5000/api/whatsapp/test \
//     -H "Content-Type: application/json" \
//     -d '{"phone":"919876543210","message":"hi"}'
router.post('/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    console.log('[WH-TEST] Incoming:', { phone, message });

    if (!phone || !message) {
      return res.status(400).json({ error: '"phone" and "message" are required' });
    }

    const reply = await processMessage(phone, message, phone);
    console.log('[WH-TEST] Reply:', reply ? reply.substring(0, 80) : '(null)');

    res.json({ reply: reply || '(no reply generated)' });
  } catch (err) {
    console.error('[WH-TEST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
