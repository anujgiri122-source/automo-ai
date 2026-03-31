const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const PLAN_PRICES = {
  starter: 19900, // ₹199 in paise
  pro:     49900  // ₹499 in paise
};

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!userId || !plan) return res.status(400).json({ error: 'userId and plan are required' });
    if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan. Use starter or pro' });

    const order = await getRazorpay().orders.create({
      amount:   PLAN_PRICES[plan],
      currency: 'INR',
      receipt:  `automo_${userId}_${Date.now()}`
    });

    await getSupabase().from('payments').insert({
      user_id:           userId,
      razorpay_order_id: order.id,
      amount:            PLAN_PRICES[plan],
      plan,
      status:            'pending'
    });

    res.json({
      orderId:  order.id,
      amount:   PLAN_PRICES[plan],
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Payment create-order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/webhook — Razorpay sends raw body; must be registered before express.json()
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer — raw middleware applied in server.js

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody.toString());

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const supabase = getSupabase();

      const { data: paymentRecord } = await supabase
        .from('payments')
        .update({ razorpay_payment_id: payment.id, status: 'paid' })
        .eq('razorpay_order_id', payment.order_id)
        .select()
        .single();

      if (paymentRecord?.user_id && paymentRecord?.plan) {
        await supabase
          .from('users')
          .update({ plan: paymentRecord.plan })
          .eq('id', paymentRecord.user_id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Payment webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
