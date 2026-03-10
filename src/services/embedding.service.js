import { openai } from "../config/openai.js";
import {
  getEmbeddingCache,
  setEmbeddingCache,
} from "../utils/embeddingCache.util.js";

export async function createEmbedding(texts) {
  const embeddings = [];

  for (const text of texts) {
    const cached = getEmbeddingCache(text);

    if (cached) {
      embeddings.push(cached);
      continue;
    }

    const res = await openai.embeddings.create({
      model: "openai/text-embedding-3-small",
      input: text,
    });

    if (!res.data || !res.data[0] || !res.data[0].embedding) {
      throw new Error(
        `Invalid embedding response for text: "${text}". Response: ${JSON.stringify(res)}`
      );
    }

    const embedding = res.data[0].embedding;

    setEmbeddingCache(text, embedding);

    embeddings.push(embedding);
  }

  return embeddings;
}
