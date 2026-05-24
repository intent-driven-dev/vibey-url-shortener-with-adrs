const fs = require('fs/promises');
const path = require('path');

class JsonUrlStore {
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(__dirname, '..', 'data', 'urls.json');
    this.now = options.now || (() => Date.now());
    this.expirationMs = options.expirationMs || 90 * 24 * 60 * 60 * 1000;
    this.state = {
      links: []
    };
    this.loaded = false;
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.state.links = Array.isArray(parsed.links)
          ? parsed.links
              .map(record => this.#normalizeRecord(record))
              .filter(record => record !== null)
          : [];
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.#persist();
    }

    this.loaded = true;
  }

  async findByCode(code) {
    this.#assertLoaded();
    const record = this.state.links.find(item => item.code === code);
    return record ? { ...record } : null;
  }

  async findByLongUrl(longUrl) {
    this.#assertLoaded();
    const record = this.state.links.find(item => item.longUrl === longUrl && !this.#isExpired(item));
    return record ? { ...record } : null;
  }

  async hasCode(code) {
    this.#assertLoaded();
    return this.state.links.some(item => item.code === code);
  }

  async list() {
    this.#assertLoaded();
    return this.state.links
      .filter(record => !this.#isExpired(record))
      .map(record => ({ ...record }));
  }

  async create(longUrl, code) {
    this.#assertLoaded();
    const existing = this.state.links.find(item => item.longUrl === longUrl && !this.#isExpired(item));
    if (existing) {
      return { ...existing };
    }

    const createdAt = this.now();
    const record = {
      code,
      longUrl,
      createdAt,
      expiresAt: createdAt + this.expirationMs
    };
    this.state.links.push(record);
    await this.#persist();
    return { ...record };
  }

  async seed(longUrl, codeFactory) {
    this.#assertLoaded();
    const existing = this.state.links.find(item => item.longUrl === longUrl && !this.#isExpired(item));
    if (existing) {
      return { ...existing };
    }

    const code = codeFactory();
    return this.create(longUrl, code);
  }

  getNextId() {
    this.#assertLoaded();
    return this.state.nextId;
  }

  async #persist() {
    const payload = JSON.stringify(
      {
        links: this.state.links
      },
      null,
      2
    );
    await fs.writeFile(this.filePath, payload);
  }

  #assertLoaded() {
    if (!this.loaded) {
      throw new Error('JSON URL store has not been initialized');
    }
  }

  #isValidRecord(record) {
    return Boolean(
      record &&
        typeof record === 'object' &&
        typeof record.code === 'string' &&
        record.code.trim() &&
        typeof record.longUrl === 'string' &&
        record.longUrl.trim()
    );
  }

  #normalizeRecord(record) {
    if (!this.#isValidRecord(record)) {
      return null;
    }

    const createdAt = Number.isFinite(record.createdAt) ? record.createdAt : this.now();
    const expiresAt = Number.isFinite(record.expiresAt) ? record.expiresAt : createdAt + this.expirationMs;

    return {
      code: record.code,
      longUrl: record.longUrl,
      createdAt,
      expiresAt
    };
  }

  #isExpired(record) {
    return Number.isFinite(record.expiresAt) ? record.expiresAt <= this.now() : false;
  }
}

module.exports = { JsonUrlStore };
