const { URL } = require('url');
const env = require('../config/env');
const Payment = require('../models/Payment');
const User = require('../models/User');
const logger = require('../config/logger');
const { findCoinPackage, findVipTier } = require('../services/shopConfig');
const { requestPayment, verifyPayment, generateCallbackToken } = require('../services/zarinpal');

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReturnUrl(raw, req) {
  const fallback = env.payments?.defaultReturnUrl
    || `${req.protocol}://${req.get('host')}/IQuiz-bot.html`;

  if (!raw) return fallback;

  try {
    const url = new URL(raw, `${req.protocol}://${req.get('host')}`);
    const baseOrigin = `${req.protocol}://${req.get('host')}`;
    if (url.origin !== baseOrigin) {
      return fallback;
    }
    return url.toString();
  } catch (err) {
    return fallback;
  }
}

function buildCallbackUrl(payment, req) {
  const base = env.payments?.zarinpal?.callbackBase
    || `${req.protocol}://${req.get('host')}`;
  const normalizedBase = base.replace(/\/$/, '');
  const url = new URL(`${normalizedBase}/payments/zarinpal/callback`);
  url.searchParams.set('pid', String(payment._id));
  url.searchParams.set('token', payment.callbackToken);
  return url.toString();
}

function buildReturnRedirect(payment, status, extra = {}) {
  const baseUrl = payment.returnUrl || env.payments?.defaultReturnUrl || '/IQuiz-bot.html';
  const url = new URL(baseUrl, 'http://localhost');
  url.searchParams.set('payment_status', status);
  url.searchParams.set('payment_id', String(payment._id));
  if (extra.refId) url.searchParams.set('ref_id', String(extra.refId));
  if (extra.message) url.searchParams.set('payment_message', extra.message);
  if (payment.sessionId) url.searchParams.set('payment_session', payment.sessionId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function computeTotalCoins(pkg) {
  const base = Number(pkg.amount) || 0;
  const bonusPercent = Number(pkg.bonus) || 0;
  const bonus = Math.floor((base * bonusPercent) / 100);
  return base + bonus;
}

exports.createZarinpalPayment = async (req, res, next) => {
  try {
    const merchantId = sanitizeString(env.payments?.zarinpal?.merchantId);
    if (!merchantId) {
      return res.status(503).json({ ok: false, error: 'payment_gateway_unavailable' });
    }

    const packageId = sanitizeString(req.body?.packageId);
    const sessionId = sanitizeString(req.body?.sessionId);
    const userId = sanitizeString(req.body?.userId);
    const returnUrl = normalizeReturnUrl(sanitizeString(req.body?.returnUrl), req);

    if (!packageId) {
      return res.status(400).json({ ok: false, error: 'missing_package_id' });
    }

    const pkg = findCoinPackage(packageId);
    if (!pkg) {
      return res.status(404).json({ ok: false, error: 'package_not_found' });
    }

    const amountToman = pkg.priceToman;
    if (!amountToman || amountToman <= 0) {
      return res.status(400).json({ ok: false, error: 'invalid_package_price' });
    }

    const totalCoins = computeTotalCoins(pkg);
    const amountRial = amountToman * 10;

    const payment = await Payment.create({
      type: 'external',
      sessionId: sessionId || null,
      user: userId || null,
      packageId: pkg.id,
      packageSnapshot: pkg,
      amountToman,
      amountRial,
      coins: pkg.amount,
      bonusPercent: pkg.bonus,
      totalCoins,
      description: `خرید بسته ${pkg.displayName || pkg.amount} سکه`,
      returnUrl,
      callbackToken: generateCallbackToken(),
    });

    try {
      const callbackUrl = buildCallbackUrl(payment, req);
      const requestResult = await requestPayment({
        merchantId,
        amountRial,
        description: payment.description,
        callbackUrl,
        metadata: {
          email: req.user?.email,
          mobile: req.user?.phone,
          orderId: String(payment._id),
        },
      });

      payment.authority = requestResult.authority;
      payment.status = 'pending';
      await payment.save();

      return res.json({
        ok: true,
        data: {
          paymentId: String(payment._id),
          authority: requestResult.authority,
          paymentUrl: requestResult.paymentUrl,
          sessionId: payment.sessionId,
        },
      });
    } catch (error) {
      payment.status = 'failed';
      payment.failReason = error.message;
      await payment.save();
      logger.error(`[payments] Failed to create Zarinpal request: ${error.message}`);
      return res.status(502).json({ ok: false, error: 'gateway_request_failed' });
    }
  } catch (error) {
    next(error);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessionId = sanitizeString(req.query?.sessionId);
    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'payment_not_found' });
    }

    if (payment.sessionId && sessionId && payment.sessionId !== sessionId) {
      return res.status(403).json({ ok: false, error: 'session_mismatch' });
    }

    const response = {
      status: payment.status,
      paymentId: String(payment._id),
      package: payment.packageSnapshot,
      coins: payment.totalCoins,
      refId: payment.refId,
      walletBalance: payment.walletBalanceAfter,
      message: payment.failReason,
      verifiedAt: payment.verifiedAt,
    };

    return res.json({ ok: true, data: response });
  } catch (error) {
    next(error);
  }
};

exports.createInternalPayment = async (req, res, next) => {
  try {
    const idempotencyKey = sanitizeString(req.body?.idempotencyKey);
    const typeRaw = sanitizeString(req.body?.type);
    const type = typeRaw.toLowerCase();

    if (!idempotencyKey) {
      return res.status(400).json({ ok: false, error: 'missing_idempotency_key' });
    }

    if (!['coins', 'vip'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'invalid_payment_type' });
    }

    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const existing = await Payment.findOne({ idempotencyKey });
    if (existing) {
      if (existing.status === 'paid') {
        return res.json({ ok: true, data: { txnId: String(existing._id) } });
      }
      return res.status(409).json({ ok: false, error: 'payment_in_progress', status: existing.status });
    }

    if (type === 'coins') {
      const packageId = sanitizeString(req.body?.packageId);
      if (!packageId) {
        return res.status(400).json({ ok: false, error: 'missing_package_id' });
      }

      const pkg = findCoinPackage(packageId);
      if (!pkg) {
        return res.status(404).json({ ok: false, error: 'package_not_found' });
      }

      if (!pkg.priceToman || pkg.priceToman <= 0) {
        return res.status(400).json({ ok: false, error: 'invalid_package_price' });
      }

      const totalCoins = computeTotalCoins(pkg);
      const newBalance = (req.user.coins || 0) + totalCoins;

      req.user.coins = newBalance;

      const paymentData = {
        idempotencyKey,
        type: 'coins',
        user: req.user._id,
        packageId: pkg.id,
        packageSnapshot: pkg,
        amountToman: pkg.priceToman,
        amountRial: pkg.priceToman * 10,
        coins: pkg.amount,
        bonusPercent: pkg.bonus,
        totalCoins,
        description: `خرید بسته ${pkg.displayName || pkg.amount} سکه`,
        status: 'paid',
        awardedCoins: totalCoins,
        walletBalanceAfter: newBalance,
        metadata: {
          internal: true,
          source: 'wallet_topup',
        },
      };

      const payment = await Payment.create(paymentData);
      if (typeof req.user.save === 'function') {
        await req.user.save();
      }

      const currentKeys = Number.isFinite(Number(req.user.keys)) ? Number(req.user.keys) : 0;
      return res.json({
        ok: true,
        data: {
          txnId: String(payment._id),
          wallet: {
            coins: newBalance,
            keys: currentKeys,
          },
        },
      });
    }

    const tierInput = sanitizeString(req.body?.tier);
    if (!tierInput) {
      return res.status(400).json({ ok: false, error: 'missing_vip_tier' });
    }

    const tier = tierInput.toLowerCase();
    const vipTier = findVipTier(tier);
    if (!vipTier) {
      return res.status(404).json({ ok: false, error: 'vip_tier_not_found' });
    }

    const now = new Date();
    const currentExpiry = req.user.subscription?.expiry ? new Date(req.user.subscription.expiry) : null;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const durationMs = Math.max(1, vipTier.durationDays || 0) * 24 * 60 * 60 * 1000;
    const expiry = new Date(baseDate.getTime() + durationMs);

    const payment = await Payment.create({
      idempotencyKey,
      type: 'vip',
      user: req.user._id,
      packageId: vipTier.id,
      packageSnapshot: vipTier,
      amountToman: vipTier.priceToman || 0,
      amountRial: (vipTier.priceToman || 0) * 10,
      coins: 0,
      bonusPercent: 0,
      totalCoins: 0,
      description: `خرید اشتراک ${vipTier.tier || tier}`,
      status: 'paid',
      metadata: {
        internal: true,
        source: 'vip_subscription',
        tier: vipTier.tier,
        durationDays: vipTier.durationDays,
      },
    });

    req.user.subscription = req.user.subscription || {};
    req.user.subscription.active = true;
    req.user.subscription.tier = vipTier.tier;
    req.user.subscription.plan = vipTier.id;
    req.user.subscription.expiry = expiry;
    req.user.subscription.autoRenew = false;
    req.user.subscription.lastTransaction = payment._id;
    if (req.user.role === 'user') {
      req.user.role = 'vip';
    }

    if (typeof req.user.save === 'function') {
      await req.user.save();
    }

    return res.json({
      ok: true,
      data: {
        txnId: String(payment._id),
        subscription: {
          active: true,
          tier: vipTier.tier,
          expiry: expiry.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.handleZarinpalCallback = async (req, res) => {
  const pid = sanitizeString(req.query?.pid);
  const authority = sanitizeString(req.query?.Authority || req.query?.authority);
  const statusParam = sanitizeString(req.query?.Status || req.query?.status);
  const token = sanitizeString(req.query?.token);

  if (!pid || !authority) {
    return res.status(400).send('Invalid callback parameters.');
  }

  const payment = await Payment.findById(pid);
  if (!payment) {
    return res.status(404).send('Payment not found.');
  }

  if (payment.callbackToken && token && payment.callbackToken !== token) {
    logger.warn(`[payments] Callback token mismatch for payment ${payment._id}`);
    return res.redirect(buildReturnRedirect(payment, 'failed', { message: 'token_mismatch' }));
  }

  if (statusParam !== 'OK') {
    payment.status = 'canceled';
    payment.failReason = `gateway_status_${statusParam || 'unknown'}`;
    await payment.save();
    return res.redirect(buildReturnRedirect(payment, 'canceled', { message: payment.failReason }));
  }

  if (payment.status === 'paid') {
    return res.redirect(buildReturnRedirect(payment, 'success', { refId: payment.refId }));
  }

  payment.status = 'verifying';
  await payment.save();

  const merchantId = sanitizeString(env.payments?.zarinpal?.merchantId);
  if (!merchantId) {
    payment.status = 'failed';
    payment.failReason = 'gateway_not_configured';
    await payment.save();
    return res.redirect(buildReturnRedirect(payment, 'failed', { message: payment.failReason }));
  }

  try {
    const verifyResult = await verifyPayment({
      merchantId,
      amountRial: payment.amountRial,
      authority,
    });

    if (verifyResult.code === 100 || verifyResult.code === 101) {
      payment.status = 'paid';
      payment.refId = verifyResult.refId;
      payment.cardPan = verifyResult.cardPan;
      payment.failReason = null;
      payment.verifiedAt = new Date();
      payment.awardedCoins = payment.totalCoins;

      if (payment.user) {
        try {
          const user = await User.findById(payment.user);
          if (user) {
            user.coins = (user.coins || 0) + payment.totalCoins;
            await user.save();
            payment.walletBalanceAfter = user.coins;
          }
        } catch (err) {
          logger.error(`[payments] Failed to update user balance for payment ${payment._id}: ${err.message}`);
        }
      }

      await payment.save();
      return res.redirect(buildReturnRedirect(payment, 'success', {
        refId: payment.refId,
      }));
    }

    payment.status = 'failed';
    payment.failReason = `verify_code_${verifyResult.code || 'unknown'}`;
    await payment.save();
    return res.redirect(buildReturnRedirect(payment, 'failed', { message: payment.failReason }));
  } catch (error) {
    payment.status = 'failed';
    payment.failReason = error.code || error.message || 'verify_failed';
    await payment.save();
    logger.error(`[payments] Verify failed for payment ${payment._id}: ${error.message}`);
    return res.redirect(buildReturnRedirect(payment, 'failed', { message: payment.failReason }));
  }
};
