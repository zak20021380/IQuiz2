export async function jget(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
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
      headers: { 'Content-Type': 'application/json' },
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

const Net = { jget, jpost };
export default Net;
