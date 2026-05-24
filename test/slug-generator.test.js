const test = require('node:test');
const assert = require('node:assert/strict');

const { ALPHABET, SLUG_LENGTH, generateSlug } = require('../storage/slug-generator');

test('generateSlug returns a 7 character slug', () => {
  const slug = generateSlug(() => Buffer.alloc(SLUG_LENGTH, 0));

  assert.equal(slug.length, SLUG_LENGTH);
});

test('generateSlug only uses mixed-case alphanumeric characters', () => {
  const slug = generateSlug(() => Buffer.from([0, 9, 10, 35, 36, 61, 62]));

  assert.match(slug, /^[0-9A-Za-z]{7}$/);
  for (const char of slug) {
    assert.ok(ALPHABET.includes(char));
  }
});

test('generateSlug is deterministic for a provided byte source', () => {
  const slug = generateSlug(() => Buffer.from([0, 1, 2, 3, 4, 5, 6]));

  assert.equal(slug, '0123456');
});
