const cache = new Map();

export function getCache(key) {
  return cache.get(key);
}

export function setCache(key, value, ttl = 3600) {
  cache.set(key, value);

  setTimeout(() => {
    cache.delete(key);
  }, ttl * 1000);
}
