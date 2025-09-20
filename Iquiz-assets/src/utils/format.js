export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const faNum = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('fa-IR');
};

export const faDecimal = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return numeric.toLocaleString('fa-IR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'کمتر از یک دقیقه';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${faNum(hours)} ساعت`);
  if (minutes > 0) parts.push(`${faNum(minutes)} دقیقه`);
  return parts.length ? parts.join(' و ') : 'کمتر از یک دقیقه';
}

export function formatRelativeTime(timestamp) {
  if (!Number.isFinite(timestamp)) return 'همین حالا';
  try {
    const diff = timestamp - Date.now();
    const abs = Math.abs(diff);
    const rtf =
      formatRelativeTime.rtf ||
      (formatRelativeTime.rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' }));
    const units = [
      { limit: 60 * 1000, divisor: 1000, unit: 'second' },
      { limit: 60 * 60 * 1000, divisor: 60 * 1000, unit: 'minute' },
      { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, unit: 'hour' },
      { limit: 7 * 24 * 60 * 60 * 1000, divisor: 24 * 60 * 60 * 1000, unit: 'day' },
      { limit: 30 * 24 * 60 * 60 * 1000, divisor: 7 * 24 * 60 * 60 * 1000, unit: 'week' },
      { limit: 365 * 24 * 60 * 60 * 1000, divisor: 30 * 24 * 60 * 60 * 1000, unit: 'month' },
      { limit: Infinity, divisor: 365 * 24 * 60 * 60 * 1000, unit: 'year' },
    ];
    for (const { limit, divisor, unit } of units) {
      if (abs < limit) {
        const value = Math.round(diff / divisor);
        return rtf.format(value, unit);
      }
    }
  } catch {}
  try {
    return new Date(timestamp).toLocaleString('fa-IR');
  } catch {
    return 'همین حالا';
  }
}
