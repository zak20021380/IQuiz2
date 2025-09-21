'use strict';

const LruCache = require('../../lib/lruCache');

/**
 * Cache wrapper for JService clues with category indexing.
 */
class JServiceCache {
  /**
   * @param {object} [options]
   * @param {number} [options.maxSize=200]
   * @param {number} [options.ttl=600000]
   */
  constructor(options = {}) {
    const { maxSize = 200, ttl = 600000 } = options;
    this.cache = new LruCache({ max: maxSize, ttl });
    /** @type {Map<string, Set<number>>} */
    this.categoryIndex = new Map();
  }

  /**
   * @param {number|string|{categoryId?: number, category?: string}} source
   * @returns {string[]}
   */
  _categoryKeys(source) {
    if (source == null) return [];
    if (typeof source === 'number' && Number.isFinite(source)) {
      return [`id:${source}`];
    }
    if (typeof source === 'string') {
      const normalized = source.trim();
      if (!normalized) return [];
      if (/^id:\d+$/.test(normalized)) return [normalized];
      return [`name:${normalized.toLowerCase()}`];
    }
    const keys = [];
    const { categoryId, category } = source;
    if (Number.isFinite(categoryId)) {
      keys.push(`id:${categoryId}`);
    }
    if (typeof category === 'string' && category.trim()) {
      keys.push(`name:${category.trim().toLowerCase()}`);
    }
    return keys;
  }

  /**
   * Remove clue from category index.
   * @param {{id:number, categoryId?:number, category?:string}} clue
   */
  _removeFromIndex(clue) {
    const keys = this._categoryKeys(clue);
    keys.forEach((key) => {
      const set = this.categoryIndex.get(key);
      if (!set) return;
      set.delete(clue.id);
      if (set.size === 0) {
        this.categoryIndex.delete(key);
      }
    });
  }

  /**
   * Add clue to category index.
   * @param {{id:number, categoryId?:number, category?:string}} clue
   */
  _addToIndex(clue) {
    const keys = this._categoryKeys(clue);
    keys.forEach((key) => {
      if (!key) return;
      let set = this.categoryIndex.get(key);
      if (!set) {
        set = new Set();
        this.categoryIndex.set(key, set);
      }
      set.add(clue.id);
    });
  }

  _purgeExpired() {
    const removed = this.cache.prune();
    removed.forEach(({ value }) => {
      if (value && typeof value.id === 'number') {
        this._removeFromIndex(value);
      }
    });
  }

  /**
   * Store clue in cache.
   * @param {{id:number, categoryId?:number, category?:string}} clue
   */
  set(clue) {
    if (!clue || typeof clue.id !== 'number') return;
    this._purgeExpired();
    const existing = this.cache.peek(clue.id);
    if (existing) {
      this._removeFromIndex(existing);
    }
    const removed = this.cache.set(clue.id, clue);
    removed.forEach(({ value }) => {
      if (value) this._removeFromIndex(value);
    });
    this._addToIndex(clue);
  }

  /**
   * Check whether clue exists.
   * @param {number} id
   * @returns {boolean}
   */
  has(id) {
    this._purgeExpired();
    return this.cache.has(id);
  }

  /**
   * Get clue by id.
   * @param {number} id
   * @returns {object|null}
   */
  get(id) {
    this._purgeExpired();
    return this.cache.get(id);
  }

  /**
   * Return array of clues for category.
   * @param {number|string|{categoryId?:number, category?:string}} category
   * @param {object} [options]
   * @param {Set<number>|number[]} [options.exclude]
   * @returns {object[]}
   */
  getByCategory(category, options = {}) {
    this._purgeExpired();
    const keys = this._categoryKeys(category);
    if (keys.length === 0) return [];
    const excludeSet = options.exclude instanceof Set
      ? options.exclude
      : Array.isArray(options.exclude)
        ? new Set(options.exclude)
        : new Set();

    const results = [];
    const seen = new Set();

    keys.forEach((key) => {
      const ids = this.categoryIndex.get(key);
      if (!ids) return;
      ids.forEach((clueId) => {
        if (excludeSet.has(clueId) || seen.has(clueId)) return;
        const clue = this.cache.peek(clueId);
        if (!clue) {
          ids.delete(clueId);
          return;
        }
        seen.add(clueId);
        results.push(clue);
      });
      if (ids.size === 0) {
        this.categoryIndex.delete(key);
      }
    });

    return results;
  }

  /**
   * All cached clues.
   * @returns {object[]}
   */
  getAll() {
    this._purgeExpired();
    return this.cache.values();
  }

  /**
   * Current cache size.
   * @returns {number}
   */
  size() {
    this._purgeExpired();
    return this.cache.size();
  }
}

module.exports = JServiceCache;
