const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const BASE_URL = process.env.BASE_URL || `http://${HOST}:${PORT}`;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_LENGTH = 6;

const linksByCode = new Map();

function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  try {
    return new URL(raw).toString();
  } catch {
    try {
      return new URL(`https://${raw}`).toString();
    } catch {
      return null;
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageTemplate(body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>URL Shortener</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f4f7fb;
      color: #102033;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 48px 20px;
    }
    h1 { margin: 0 0 12px; font-size: 2rem; }
    p { line-height: 1.5; }
    form, .panel {
      background: #fff;
      border: 1px solid #d9e2ef;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 6px 20px rgba(16, 32, 51, 0.06);
    }
    .field { display: grid; gap: 10px; margin-top: 12px; }
    label { font-weight: 600; }
    input[type="url"], input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      border: 1px solid #b8c4d6;
      border-radius: 10px;
      font-size: 1rem;
    }
    button, .button {
      display: inline-block;
      margin-top: 14px;
      padding: 12px 16px;
      border: 0;
      border-radius: 10px;
      background: #155eef;
      color: #fff;
      font-size: 1rem;
      text-decoration: none;
      cursor: pointer;
    }
    .error {
      margin: 16px 0 0;
      color: #b42318;
      background: #fff5f5;
      border: 1px solid #f5c2c7;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .success { margin-top: 18px; }
    .stack { display: grid; gap: 12px; }
    code {
      display: block;
      padding: 12px 14px;
      background: #f3f6fb;
      border: 1px solid #d9e2ef;
      border-radius: 10px;
      overflow-wrap: anywhere;
    }
    .muted { color: #55657d; }
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function homePage(errorMessage) {
  return pageTemplate(`
    <h1>URL Shortener</h1>
    <p class="muted">Paste a long URL and get a short link that redirects to it.</p>
    <form method="post" action="/shorten">
      <div class="field">
        <label for="longUrl">Long URL</label>
        <input id="longUrl" name="longUrl" type="url" placeholder="https://example.com/some/very/long/path" required>
      </div>
      <button type="submit">Create short URL</button>
      ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
    </form>
  `);
}

function resultPage(shortUrl, longUrl) {
  return pageTemplate(`
    <h1>Short URL created</h1>
    <p class="muted">This link redirects to the original URL.</p>
    <div class="panel stack">
      <div>
        <label class="muted">Short URL</label>
        <code id="shortUrl">${escapeHtml(shortUrl)}</code>
      </div>
      <div>
        <label class="muted">Original URL</label>
        <code>${escapeHtml(longUrl)}</code>
      </div>
      <div>
        <a class="button" href="/">Create another</a>
      </div>
    </div>
  `);
}

function notFoundPage() {
  return pageTemplate(`
    <h1>Not found</h1>
    <p class="muted">That short code does not exist.</p>
    <a class="button" href="/">Go home</a>
  `);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

function randomSlug() {
  const bytes = crypto.randomBytes(SLUG_LENGTH);
  let slug = '';

  for (let i = 0; i < SLUG_LENGTH; i += 1) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return slug;
}

function createShortUrl(longUrl) {
  let code = randomSlug();
  while (linksByCode.has(code)) {
    code = randomSlug();
  }

  linksByCode.set(code, longUrl);
  return code;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, BASE_URL);

    if (req.method === 'GET' && requestUrl.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(homePage(''));
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/shorten') {
      const body = await readBody(req);
      const { longUrl } = parseForm(body);
      const normalized = normalizeUrl(longUrl);

      if (!normalized) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(homePage('Please enter a valid URL.'));
        return;
      }

      const code = createShortUrl(normalized);
      const shortUrl = `${getRequestOrigin(req)}/${code}`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(resultPage(shortUrl, normalized));
      return;
    }

    if (req.method === 'GET') {
      const code = requestUrl.pathname.replace(/^\/+/, '');
      if (code && linksByCode.has(code)) {
        res.writeHead(302, { Location: linksByCode.get(code) });
        res.end();
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(notFoundPage());
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal Server Error: ${error.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`URL shortener running at ${BASE_URL}`);
});
