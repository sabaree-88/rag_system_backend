const embeddingCache = new Map();

export function getEmbeddingCache(text) {
  return embeddingCache.get(text);
}

export function setEmbeddingCache(text, embedding) {
  embeddingCache.set(text, embedding);
}
