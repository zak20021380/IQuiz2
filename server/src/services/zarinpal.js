const fetch = require('node-fetch');
const crypto = require('crypto');
const env = require('../config/env');

const ZARINPAL_BASE = env.payments?.zarinpal?.sandbox
  ? 'https://sandbox.zarinpal.com/pg/v4/payment'
  : 'https://api.zarinpal.com/pg/v4/payment';

const START_PAY_BASE = env.payments?.zarinpal?.sandbox
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  const entries = Object.entries(metadata)
    .filter(([key, value]) => typeof key === 'string' && key && (typeof value === 'string' || typeof value === 'number'))
    .slice(0, 5);
  return Object.fromEntries(entries);
}

async function requestPayment({ merchantId, amountRial, description, callbackUrl, metadata }) {
  const body = {
    merchant_id: merchantId,
    amount: Math.round(amountRial),
    callback_url: callbackUrl,
    description: description || 'پرداخت سفارش',
    metadata: sanitizeMetadata(metadata),
  };

  const response = await fetch(`${ZARINPAL_BASE}/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 15000,
  });

  const payload = await response.json().catch(() => ({ data: null, errors: [{ message: 'invalid_response' }] }));
  const data = payload?.data || {};
  const errors = payload?.errors || [];

  if (Array.isArray(errors) && errors.length) {
    const message = errors.map((err) => err?.message).filter(Boolean).join(', ') || 'unknown_error';
    const code = errors[0]?.code;
    const error = new Error(`Zarinpal request failed: ${message}`);
    error.code = code || 'ZARINPAL_REQUEST_FAILED';
    error.errors = errors;
    throw error;
  }

  if (!data?.authority) {
    const error = new Error('Zarinpal request failed: missing authority');
    error.code = 'ZARINPAL_NO_AUTHORITY';
    throw error;
  }

  return {
    authority: data.authority,
    feeType: data.fee_type || null,
    fee: data.fee || null,
    paymentUrl: `${START_PAY_BASE}/${data.authority}`,
  };
}

async function verifyPayment({ merchantId, amountRial, authority }) {
  const body = {
    merchant_id: merchantId,
    amount: Math.round(amountRial),
    authority,
  };

  const response = await fetch(`${ZARINPAL_BASE}/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 15000,
  });

  const payload = await response.json().catch(() => ({ data: null, errors: [{ message: 'invalid_response' }] }));
  const data = payload?.data || {};
  const errors = payload?.errors || [];

  if (Array.isArray(errors) && errors.length) {
    const message = errors.map((err) => err?.message).filter(Boolean).join(', ') || 'unknown_error';
    const code = errors[0]?.code;
    const error = new Error(`Zarinpal verify failed: ${message}`);
    error.code = code || 'ZARINPAL_VERIFY_FAILED';
    error.errors = errors;
    throw error;
  }

  return {
    code: data.code,
    message: data.message,
    refId: data.ref_id || data.reference_id || null,
    cardPan: data.card_pan || null,
    feeType: data.fee_type || null,
    fee: data.fee || null,
  };
}

function generateCallbackToken() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = {
  requestPayment,
  verifyPayment,
  generateCallbackToken,
};
