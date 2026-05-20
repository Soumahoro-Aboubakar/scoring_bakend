const store = new Map();

const DEFAULT_TTL_MS = 60 * 1000;
const MAX_ITEMS = 250;

const getCacheKey = (req) => `${req.method}:${req.originalUrl}`;

const prune = () => {
  if (store.size <= MAX_ITEMS) return;
  const keys = [...store.keys()].slice(0, store.size - MAX_ITEMS);
  keys.forEach((key) => store.delete(key));
};

const publicCache = (ttlMs = DEFAULT_TTL_MS) => (req, res, next) => {
  if (req.method !== 'GET' || req.headers.authorization) return next();

  const key = getCacheKey(req);
  const cached = store.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.set('X-Cache', 'HIT');
    res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}, stale-while-revalidate=60`);
    return res.status(cached.status).json(cached.body);
  }

  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(key, { status: res.statusCode, body, expiresAt: now + ttlMs });
      prune();
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}, stale-while-revalidate=60`);
    }
    return json(body);
  };

  return next();
};

const clearPublicCache = () => store.clear();

module.exports = {
  publicCache,
  clearPublicCache,
};
