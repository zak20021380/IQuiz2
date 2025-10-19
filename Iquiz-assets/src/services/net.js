import { getGuestId } from '../utils/guest.js';

let authToken = '';

export function setAuthToken(token = '') {
  authToken = token ? String(token) : '';
}

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  const guestId = getGuestId();
  if (guestId) {
    headers['x-guest-id'] = guestId;
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export function createRequestHeaders(extra = {}) {
  return buildHeaders(extra);
}

export async function jget(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: buildHeaders(),
    });
    const txt = await res.text();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function jpost(url, data, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function jpatch(url, data, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function jdel(url, data = null, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = buildHeaders(data ? { 'Content-Type': 'application/json' } : {});
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const Net = { jget, jpost, jpatch, jdel, setAuthToken };
export default Net;
