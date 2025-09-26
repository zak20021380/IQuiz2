const STORAGE_KEY = 'iquiz_guest_id_v1';

let cachedGuestId = '';

function generateGuestId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `g-${ts}-${rand}`;
}

export function getGuestId() {
  if (cachedGuestId) {
    return cachedGuestId;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (typeof stored === 'string' && stored.trim()) {
      cachedGuestId = stored.trim();
      return cachedGuestId;
    }
  } catch (_) {
    // localStorage might be unavailable (e.g. server-side rendering)
  }

  cachedGuestId = generateGuestId();

  try {
    localStorage.setItem(STORAGE_KEY, cachedGuestId);
  } catch (_) {
    // Ignore write errors; we'll regenerate next time if needed
  }

  return cachedGuestId;
}

export function refreshGuestId() {
  cachedGuestId = '';
  return getGuestId();
}

