const fetch = require('node-fetch');

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 500;
const DEFAULT_RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function shouldRetryResponse(response, retryOn) {
  if (typeof retryOn === 'function') {
    try {
      return Boolean(retryOn(response));
    } catch (err) {
      return false;
    }
  }

  if (Array.isArray(retryOn)) {
    return retryOn.includes(response.status);
  }

  if (retryOn instanceof Set) {
    return retryOn.has(response.status);
  }

  return false;
}

function shouldRetryError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  if (error.type === 'system') return true;
  if (typeof error.code === 'string') return true;
  return false;
}

function resolveDelay(retryDelay, attempt, error) {
  if (typeof retryDelay === 'function') {
    return retryDelay({ attempt, error });
  }
  if (!Number.isFinite(retryDelay)) return DEFAULT_RETRY_DELAY;
  return retryDelay;
}

async function fetchWithRetry(url, options = {}) {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryOn = DEFAULT_RETRY_STATUS,
    timeout = DEFAULT_TIMEOUT,
    signal,
    ...fetchOptions
  } = options;

  let attempt = 0;

  const doFetch = async () => {
    const controller = new AbortController();
    const signals = [];

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        const onAbort = () => controller.abort();
        signal.addEventListener('abort', onAbort, { once: true });
        signals.push({ signal, onAbort });
      }
    }

    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeoutId);
      signals.forEach(({ signal: sig, onAbort }) => sig.removeEventListener('abort', onAbort));

      if (!response.ok && attempt < retries && shouldRetryResponse(response, retryOn)) {
        attempt += 1;
        const delay = resolveDelay(retryDelay, attempt, null);
        if (delay > 0) await sleep(delay);
        return doFetch();
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      signals.forEach(({ signal: sig, onAbort }) => sig.removeEventListener('abort', onAbort));

      if (attempt < retries && shouldRetryError(error)) {
        attempt += 1;
        const delay = resolveDelay(retryDelay, attempt, error);
        if (delay > 0) await sleep(delay);
        return doFetch();
      }

      throw error;
    }
  };

  return doFetch();
}

module.exports = {
  fetchWithRetry,
};
