const crypto = require('crypto');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_LENGTH = 7;

class UrlRepository {
  constructor(store) {
    this.store = store;
  }

  async init() {
    await this.store.init();
  }

  async findByCode(code) {
    return this.store.findByCode(code);
  }

  async findByLongUrl(longUrl) {
    return this.store.findByLongUrl(longUrl);
  }

  async list() {
    return this.store.list();
  }

  async createOrGet(longUrl) {
    const existing = await this.findByLongUrl(longUrl);
    if (existing) {
      return existing;
    }

    const code = await this.#generateUniqueCode();
    return this.store.create(longUrl, code);
  }

  async seed(longUrl) {
    return this.createOrGet(longUrl);
  }

  async #generateUniqueCode() {
    let code = this.#randomSlug();
    while (await this.store.hasCode(code)) {
      code = this.#randomSlug();
    }
    return code;
  }

  #randomSlug() {
    const bytes = crypto.randomBytes(SLUG_LENGTH);
    let slug = '';

    for (let i = 0; i < SLUG_LENGTH; i += 1) {
      slug += ALPHABET[bytes[i] % ALPHABET.length];
    }

    return slug;
  }
}

module.exports = { UrlRepository };
