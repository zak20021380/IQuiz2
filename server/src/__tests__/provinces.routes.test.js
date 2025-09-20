const { describe, before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.ENABLE_TRIVIA_POLLER = 'false';

function createInMemoryProvinceModel() {
  const { randomUUID } = require('node:crypto');

  const store = [];

  const clone = (doc) => ({
    _id: doc._id,
    name: doc.name,
    code: doc.code,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  });

  const matchesQuery = (doc, query = {}) => {
    return Object.entries(query).every(([key, value]) => {
      if (value && typeof value === 'object' && value.$regex) {
        const regex = new RegExp(value.$regex, value.$options || '');
        return regex.test(doc[key] || '');
      }
      return doc[key] === value;
    });
  };

  const sortResults = (items, sortSpec = {}) => {
    const entries = Object.entries(sortSpec);
    if (entries.length === 0) return items;
    return [...items].sort((a, b) => {
      for (const [field, direction] of entries) {
        const dir = direction >= 0 ? 1 : -1;
        const aValue = a[field] ?? 0;
        const bValue = b[field] ?? 0;
        if (aValue < bValue) return -1 * dir;
        if (aValue > bValue) return 1 * dir;
      }
      return 0;
    });
  };

  class ProvinceDocument {
    constructor(snapshot) {
      Object.defineProperty(this, '_snapshot', { value: snapshot, enumerable: false, writable: true });
      Object.assign(this, snapshot);
    }

    toObject() {
      return clone(this);
    }

    async save() {
      const index = store.findIndex((item) => item._id === this._id);
      if (index === -1) {
        throw new Error('Document not found');
      }

      const trimmedName = typeof this.name === 'string' ? this.name.trim() : '';
      if (!trimmedName) {
        const error = new Error('Validation error');
        error.code = 422;
        throw error;
      }

      const normalizedCode = typeof this.code === 'string' && this.code.trim() ? this.code.trim().toLowerCase() : null;

      const duplicateName = store.some((item) => item._id !== this._id && item.name === trimmedName);
      if (duplicateName) {
        const error = new Error('Duplicate name');
        error.code = 11000;
        throw error;
      }

      if (normalizedCode) {
        const duplicateCode = store.some((item) => item._id !== this._id && item.code === normalizedCode);
        if (duplicateCode) {
          const error = new Error('Duplicate code');
          error.code = 11000;
          throw error;
        }
      }

      this.name = trimmedName;
      this.code = normalizedCode;
      this.sortOrder = Number.isFinite(this.sortOrder) ? Math.max(0, Math.round(this.sortOrder)) : 0;
      this.isActive = this.isActive !== false;
      this.updatedAt = new Date();

      store[index] = clone(this);
      this._snapshot = clone(this);
      return this;
    }
  }

  const buildQuery = (results) => ({
    sort(sortSpec) {
      const sorted = sortResults(results, sortSpec);
      return buildQuery(sorted);
    },
    lean() {
      return Promise.resolve(results.map((item) => ({ ...item })));
    }
  });

  return {
    async create(payload) {
      const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        const error = new Error('Validation error');
        error.code = 422;
        throw error;
      }

      const code = typeof payload?.code === 'string' && payload.code.trim() ? payload.code.trim().toLowerCase() : null;
      if (store.some((item) => item.name === name || (code && item.code === code))) {
        const error = new Error('Duplicate');
        error.code = 11000;
        throw error;
      }

      const now = new Date();
      const doc = {
        _id: randomUUID(),
        name,
        code,
        sortOrder: Number.isFinite(payload?.sortOrder) ? Math.max(0, Math.round(payload.sortOrder)) : 0,
        isActive: payload?.isActive !== false,
        createdAt: now,
        updatedAt: now
      };

      store.push(clone(doc));
      return new ProvinceDocument(doc);
    },

    find(query = {}) {
      const results = store.filter((item) => matchesQuery(item, query));
      return buildQuery(results.map((item) => ({ ...item })));
    },

    async findById(id) {
      const found = store.find((item) => item._id === id);
      if (!found) return null;
      return new ProvinceDocument({ ...found });
    },

    async findByIdAndDelete(id) {
      const index = store.findIndex((item) => item._id === id);
      if (index === -1) return null;
      const [removed] = store.splice(index, 1);
      return new ProvinceDocument({ ...removed });
    }
  };
}

const overrideModule = (path, exportsValue) => {
  require.cache[path] = { exports: exportsValue };
};

overrideModule(require.resolve('../models/Province'), createInMemoryProvinceModel());
overrideModule(require.resolve('../middleware/auth'), {
  protect: (req, _res, next) => {
    req.user = { id: 'test-admin', role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next()
});

let app;
let server;
let baseUrl;
let createdProvinceId;

describe('Provinces API', () => {
  before(async () => {
    const { createApp } = require('../app');
    app = createApp();
    server = app.listen(0);
    await once(server, 'listening');
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  const authorizedFetch = (path, options = {}) => {
    const headers = { ...(options.headers || {}), Authorization: 'Bearer test-token' };
    if (options.body && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  };

  it('creates a province', async () => {
    const res = await authorizedFetch('/api/provinces', {
      method: 'POST',
      body: JSON.stringify({ name: 'تهران', code: 'tehran', sortOrder: 1, isActive: true })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.name, 'تهران');
    assert.equal(body.data.code, 'tehran');
    createdProvinceId = body.data.id;
    assert.ok(createdProvinceId);
  });

  it('lists provinces', async () => {
    const res = await authorizedFetch('/api/provinces');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].name, 'تهران');
  });

  it('updates a province', async () => {
    const res = await authorizedFetch(`/api/provinces/${createdProvinceId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'البرز', code: 'alborz', isActive: true, sortOrder: 2 })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.name, 'البرز');
    assert.equal(body.data.code, 'alborz');
    assert.equal(body.data.isActive, true);
  });

  it('exposes provinces via public route with database values', async () => {
    const res = await fetch(`${baseUrl}/api/public/provinces`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.equal(body[0].name, 'البرز');
  });

  it('deletes a province and falls back to defaults', async () => {
    const deleteRes = await authorizedFetch(`/api/provinces/${createdProvinceId}`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.ok, true);

    const listRes = await authorizedFetch('/api/provinces');
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.ok, true);
    assert.equal(listBody.data.length, 0);

    const publicRes = await fetch(`${baseUrl}/api/public/provinces`);
    assert.equal(publicRes.status, 200);
    const publicBody = await publicRes.json();
    assert.ok(Array.isArray(publicBody));
    assert.ok(publicBody.length > 0);
    const hasFallbackTehran = publicBody.some((item) => item && item.name === 'تهران');
    assert.equal(hasFallbackTehran, true);
  });
});
