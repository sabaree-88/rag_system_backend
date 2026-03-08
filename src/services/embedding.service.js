import { openai } from "../config/openai.js";

import { logger } from "../utils/logger.util.js";

export async function createEmbedding(text) {
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",

      input: text,
    });

    return res.data.map((d) => d.embedding);
  } catch (error) {
    logger.error("Embedding creation failed", error);

    throw error;
  }
}
