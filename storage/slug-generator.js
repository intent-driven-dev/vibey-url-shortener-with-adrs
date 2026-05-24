const crypto = require('crypto');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_LENGTH = 7;

function generateSlug(randomBytes = crypto.randomBytes) {
  const bytes = randomBytes(SLUG_LENGTH);
  let slug = '';

  for (let i = 0; i < SLUG_LENGTH; i += 1) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return slug;
}

module.exports = {
  ALPHABET,
  SLUG_LENGTH,
  generateSlug
};
