'use strict';

/**
 * Simple LRU cache with TTL support.
 */
class LruCache {
  /**
   * @param {object} [options]
   * @param {number} [options.max=200]
   * @param {number} [options.ttl=600000]
   */
  constructor(options = {}) {
    const { max = 200, ttl = 600000 } = options;
    this.max = Number.isFinite(max) && max > 0 ? Math.floor(max) : 200;
    this.ttl = Number.isFinite(ttl) && ttl > 0 ? ttl : 600000;
    /** @type {Map<string|number, {value: any, expiresAt: number}>} */
    this.store = new Map();
  }

  /** @returns {number} */
  _now() {
    return Date.now();
  }

  /**
   * Remove expired entries from cache.
   * @param {number} [nowTs]
   * @returns {{key: string|number, value: any}[]}
   */
  prune(nowTs = this._now()) {
    const removed = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= nowTs) {
        this.store.delete(key);
        removed.push({ key, value: entry.value });
      }
    }
    return removed;
  }

  /**
   * Store value in cache.
   * @param {string|number} key
   * @param {any} value
   * @returns {{key: string|number, value: any}[]}
   */
  set(key, value) {
    const removed = this.prune();
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, { value, expiresAt: this._now() + this.ttl });

    while (this.store.size > this.max) {
      const oldest = this.store.entries().next().value;
      if (!oldest) break;
      const [oldKey, oldEntry] = oldest;
      this.store.delete(oldKey);
      removed.push({ key: oldKey, value: oldEntry.value });
    }

    return removed;
  }

  /**
   * Retrieve value and mark as recently used.
   * @param {string|number} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this._now()) {
      this.store.delete(key);
      return null;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Read value without affecting recency.
   * @param {string|number} key
   * @returns {any|null}
   */
  peek(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this._now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Check whether cache contains key.
   * @param {string|number} key
   * @returns {boolean}
   */
  has(key) {
    return this.peek(key) !== null;
  }

  /**
   * Delete entry by key.
   * @param {string|number} key
   * @returns {any|null}
   */
  delete(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    this.store.delete(key);
    return entry.value;
  }

  /**
   * Clear cache.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cached values.
   * @returns {any[]}
   */
  values() {
    this.prune();
    return Array.from(this.store.values(), (entry) => entry.value);
  }

  /**
   * Number of stored items.
   * @returns {number}
   */
  size() {
    this.prune();
    return this.store.size;
  }
}

module.exports = LruCache;
