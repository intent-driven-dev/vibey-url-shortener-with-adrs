const { generateSlug } = require('./slug-generator');

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
    let code = generateSlug();
    while (await this.store.hasCode(code)) {
      code = generateSlug();
    }
    return code;
  }
}

module.exports = { UrlRepository };
