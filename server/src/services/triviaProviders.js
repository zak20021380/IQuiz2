const logger = require('../config/logger');
const { fetchWithRetry } = require('../lib/http');

const OPENTDB_CATEGORY_ENDPOINT = 'https://opentdb.com/api_category.php';

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number.parseInt(raw.id, 10);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!Number.isFinite(id) || id <= 0) return null;
  if (!name) return null;
  return { id, name };
}

async function fetchOpenTdbCategories() {
  let response;
  try {
    response = await fetchWithRetry(OPENTDB_CATEGORY_ENDPOINT, {
      timeout: 10000,
      retries: 2,
      retryDelay: ({ attempt }) => attempt * 500,
      headers: { Accept: 'application/json' }
    });
  } catch (err) {
    logger.error(`Failed to reach OpenTDB categories endpoint: ${err.message}`);
    throw new Error('Failed to reach OpenTDB categories endpoint');
  }

  if (!response.ok) {
    const error = new Error(`OpenTDB categories request failed with status ${response.status}`);
    logger.error(error.message);
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    logger.error('Failed to parse OpenTDB categories response as JSON', err);
    throw new Error('Failed to parse OpenTDB categories response as JSON');
  }

  const categoriesRaw = Array.isArray(payload?.trivia_categories)
    ? payload.trivia_categories
    : [];

  const seenIds = new Set();
  const normalized = [];
  for (const item of categoriesRaw) {
    const category = normalizeCategory(item);
    if (!category) continue;
    if (seenIds.has(category.id)) continue;
    seenIds.add(category.id);
    normalized.push(category);
  }

  normalized.sort((a, b) => a.name.localeCompare(b.name));

  return normalized;
}

module.exports = {
  fetchOpenTdbCategories,
};
