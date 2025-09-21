const logger = require('../config/logger');
const { fetchWithRetry } = require('../lib/http');

const OPENTDB_CATEGORY_ENDPOINT = 'https://opentdb.com/api_category.php';

const TRIVIA_PROVIDERS = [
  {
    id: 'opentdb',
    name: 'Open Trivia Database',
    shortName: 'OpenTDB',
    description: 'بانک سوالات عمومی با دسته‌بندی‌های متنوع و پشتیبانی از محدودسازی سطح دشواری.',
    capabilities: {
      amount: { min: 1, max: 200, default: 20 },
      categories: { selectable: true, remote: true },
      difficulties: { selectable: true, multiple: true },
      breakdown: true
    }
  },
  {
    id: 'the-trivia-api',
    name: 'The Trivia API',
    shortName: 'The Trivia API',
    description: 'مجموعه‌ای از سوالات انگلیسی با تنوع بالا و داده‌های ساخت‌یافته برای توسعه‌دهندگان.',
    capabilities: {
      amount: { min: 1, max: 50, default: 20 },
      categories: { selectable: false, remote: false },
      difficulties: { selectable: true, multiple: true },
      breakdown: true
    }
  }
];

const PROVIDER_ID_ALIASES = Object.freeze({
  opentdb: 'opentdb',
  'open-trivia-db': 'opentdb',
  'open_trivia_db': 'opentdb',
  'open trivia db': 'opentdb',
  'open trivia database': 'opentdb',
  'the-trivia-api': 'the-trivia-api',
  triviaapi: 'the-trivia-api',
  thetriviaapi: 'the-trivia-api',
  'the trivia api': 'the-trivia-api',
  'the-triviaapi': 'the-trivia-api',
  'the trivia-api': 'the-trivia-api'
});

function normalizeProviderId(value) {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  return PROVIDER_ID_ALIASES[normalized] || normalized;
}

function listTriviaProviders() {
  return TRIVIA_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    shortName: provider.shortName,
    description: provider.description,
    capabilities: provider.capabilities
  }));
}

function getTriviaProviderById(id) {
  const normalized = normalizeProviderId(id);
  return TRIVIA_PROVIDERS.find((provider) => provider.id === normalized) || null;
}

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
  listTriviaProviders,
  getTriviaProviderById,
  fetchOpenTdbCategories,
  normalizeProviderId,
};
