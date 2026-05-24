const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { JsonUrlStore } = require('../storage/json-url-store');
const { UrlRepository } = require('../storage/url-repository');

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function createStore(nowRef) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-url-shortener-'));
  const filePath = path.join(dir, 'urls.json');
  const store = new JsonUrlStore({
    filePath,
    now: () => nowRef.current
  });

  await store.init();

  return {
    store,
    cleanup: () => fs.rm(dir, { recursive: true, force: true })
  };
}

test('links expire after 90 days and are excluded from active lookups', async () => {
  const nowRef = { current: Date.UTC(2026, 0, 1) };
  const { store, cleanup } = await createStore(nowRef);

  try {
    const created = await store.create('https://example.com/', 'abc1234');

    assert.equal(created.createdAt, nowRef.current);
    assert.equal(created.expiresAt, nowRef.current + NINETY_DAYS_MS);

    assert.deepEqual(await store.findByCode('abc1234'), created);
    assert.deepEqual(await store.findByLongUrl('https://example.com/'), created);
    assert.equal((await store.list()).length, 1);

    nowRef.current += NINETY_DAYS_MS + 1;

    assert.deepEqual(await store.findByCode('abc1234'), created);
    assert.equal(await store.findByLongUrl('https://example.com/'), null);
    assert.equal((await store.list()).length, 0);
  } finally {
    await cleanup();
  }
});

test('repository creates a new short code after the original URL expires', async () => {
  const nowRef = { current: Date.UTC(2026, 0, 1) };
  const { store, cleanup } = await createStore(nowRef);
  const repository = new UrlRepository(store);

  try {
    const first = await repository.createOrGet('https://example.com/');
    assert.equal(first.longUrl, 'https://example.com/');

    nowRef.current += NINETY_DAYS_MS + 1;

    const second = await repository.createOrGet('https://example.com/');

    assert.notEqual(second.code, first.code);
    assert.equal((await store.list()).length, 1);
    assert.deepEqual(await store.findByCode(first.code), first);
    assert.deepEqual(await store.findByCode(second.code), second);
  } finally {
    await cleanup();
  }
});
