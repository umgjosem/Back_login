const crypto = require('crypto');

async function simulateCharge(cardToken, amount, meta = {}) {
  if (!cardToken) return { success: false, reason: 'no_card_token' };
  if (cardToken.includes('fail')) return { success: false, reason: 'card_declined' };
  return {
    success: true,
    provider: 'simulated',
    transactionId: 'txn_' + crypto.randomBytes(8).toString('hex'),
    chargedAmount: parseFloat(amount),
    meta
  };
}

async function chargeWithStripe(cardToken, amount, meta = {}) {
  // cardToken is expected to be a Stripe PaymentMethod id or a token created by frontend
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2022-11-15' });
  try {
    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'gtq' === 'gtq' ? 'gtq' : 'usd', // adjust if needed
      payment_method: cardToken,
      confirm: true,
      off_session: true
    });
    return {
      success: true,
      provider: 'stripe',
      transactionId: paymentIntent.id,
      chargedAmount: parseFloat(amount),
      raw: paymentIntent
    };
  } catch (err) {
    return { success: false, provider: 'stripe', error: err.message };
  }
}

module.exports = { simulateCharge, chargeWithStripe };
