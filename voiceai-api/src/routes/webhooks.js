const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');
const { callService } = require('../services/callService');
const { billingService } = require('../services/billingService');

// ─── LiveKit Webhooks ─────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/livekit
 * LiveKit sends room/participant events here
 */
router.post('/livekit', express.raw({ type: 'application/webhook+json' }), async (req, res) => {
  try {
    // Verify LiveKit webhook signature
    const authHeader = req.headers['authorization'];
    if (process.env.LIVEKIT_WEBHOOK_SECRET && authHeader) {
      const expected = crypto
        .createHmac('sha256', process.env.LIVEKIT_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');
      if (authHeader !== `Bearer ${expected}`) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body);
    const { event: eventType, room } = event;

    console.log('[LiveKit Webhook]', eventType, room?.name);

    // Handle room_finished — call ended
    if (eventType === 'room_finished' && room?.name?.startsWith('call-')) {
      // Find the active call with this room name
      const callRes = await db.query(
        `SELECT id FROM calls WHERE room_name = $1 AND status = 'active'`,
        [room.name]
      );
      if (callRes.rows.length) {
        const callId = callRes.rows[0].id;
        const duration = Math.floor((room.numSeconds || 0));
        await callService.endCall({ callId, durationSeconds: duration });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[LiveKit Webhook Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Razorpay Webhooks ────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/razorpay
 * Razorpay sends payment events here
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify Razorpay webhook signature
    const signature = req.headers['x-razorpay-signature'];
    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');
      if (signature !== expectedSig) {
        return res.status(400).json({ error: 'Invalid Razorpay signature' });
      }
    }

    const payload = JSON.parse(req.body);
    const { event, payload: data } = payload;

    console.log('[Razorpay Webhook]', event);

    if (event === 'payment.captured') {
      const payment = data.payment.entity;
      const invoiceId = payment.notes?.invoice_id;

      if (invoiceId) {
        await billingService.markPaid(invoiceId, {
          paymentMethod: 'razorpay',
          transactionId: payment.id,
          paidAt: new Date(payment.created_at * 1000),
        });
        console.log(`Invoice ${invoiceId} marked paid via Razorpay`);
      }
    }

    if (event === 'payment.failed') {
      const payment = data.payment.entity;
      console.warn(`Payment failed: ${payment.id} — ${payment.error_description}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Razorpay Webhook Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
