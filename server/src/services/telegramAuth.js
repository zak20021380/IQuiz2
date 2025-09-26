const crypto = require('crypto');

function toSearchParams(initDataUnsafe) {
  if (!initDataUnsafe) {
    return new URLSearchParams();
  }

  if (initDataUnsafe instanceof URLSearchParams) {
    return initDataUnsafe;
  }

  if (typeof initDataUnsafe === 'string') {
    const normalized = initDataUnsafe.trim().replace(/^\?/, '');
    return new URLSearchParams(normalized);
  }

  if (typeof initDataUnsafe === 'object') {
    if (typeof initDataUnsafe.initData === 'string') {
      return toSearchParams(initDataUnsafe.initData);
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(initDataUnsafe)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry === undefined || entry === null) continue;
          params.append(key, typeof entry === 'string' ? entry : JSON.stringify(entry));
        }
        continue;
      }

      if (typeof value === 'object') {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    }
    return params;
  }

  return new URLSearchParams();
}

function paramsToObject(params) {
  const payload = {};
  for (const [key, value] of params.entries()) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (Array.isArray(payload[key])) {
        payload[key].push(value);
      } else {
        payload[key] = [payload[key], value];
      }
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

function buildDataCheckString(params) {
  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push([key, value]);
  }

  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return pairs.map(([key, value]) => `${key}=${value}`).join('\n');
}

function verifyTelegramInitData(initDataUnsafe, botToken) {
  const params = toSearchParams(initDataUnsafe);
  const payload = paramsToObject(params);
  const hash = params.get('hash');

  if (!botToken) {
    return { ok: false, reason: 'BOT_TOKEN_MISSING', payload };
  }

  if (!hash) {
    return { ok: false, reason: 'HASH_MISSING', payload };
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  let provided;
  try {
    provided = Buffer.from(hash, 'hex');
  } catch (error) {
    return { ok: false, reason: 'HASH_INVALID', payload, dataCheckString };
  }

  const expected = Buffer.from(signature, 'hex');
  const valid =
    provided.length === expected.length &&
    expected.length > 0 &&
    crypto.timingSafeEqual(provided, expected);

  return {
    ok: valid,
    reason: valid ? undefined : 'SIGNATURE_MISMATCH',
    payload,
    dataCheckString
  };
}

function parseTelegramUser(userRaw) {
  if (!userRaw) return null;

  if (typeof userRaw === 'string') {
    try {
      return JSON.parse(userRaw);
    } catch (error) {
      return null;
    }
  }

  if (typeof userRaw === 'object') {
    return userRaw;
  }

  return null;
}

function normalizeTelegramProfile(initDataUnsafe) {
  const params = toSearchParams(initDataUnsafe);
  const payload = paramsToObject(params);
  const userData = parseTelegramUser(payload.user);

  const id = userData?.id;
  const telegramId = id !== undefined && id !== null ? String(id) : '';
  const telegramUsername = typeof userData?.username === 'string' ? userData.username.trim() : '';
  const firstName = typeof userData?.first_name === 'string' ? userData.first_name.trim() : '';
  const lastName = typeof userData?.last_name === 'string' ? userData.last_name.trim() : '';
  const languageCode = typeof userData?.language_code === 'string' ? userData.language_code.trim() : '';
  const avatar = typeof userData?.photo_url === 'string' ? userData.photo_url.trim() : '';
  const authDateSeconds = typeof payload.auth_date === 'string' ? Number.parseInt(payload.auth_date, 10) : Number(payload.auth_date);
  const authDate = Number.isFinite(authDateSeconds) ? new Date(authDateSeconds * 1000) : null;

  let name = `${firstName} ${lastName}`.trim();
  if (!name) {
    name = telegramUsername || firstName || lastName;
  }

  return {
    payload,
    profile: {
      telegramId,
      telegramUsername,
      name,
      avatar,
      languageCode
    },
    user: userData,
    authDate
  };
}

module.exports = {
  verifyTelegramInitData,
  normalizeTelegramProfile
};
