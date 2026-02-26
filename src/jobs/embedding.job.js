import { chunkText } from '../utils/chunk.util.js'

import { createEmbedding } from '../services/embedding.service.js'

import { collection } from '../config/db.js'

import { logger } from '../utils/logger.util.js'

export async function runEmbeddingJob (text, source) {
  try {
    const chunks = chunkText(text)

    logger.info(`Processing ${chunks.length} chunks`)

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk)

      await collection.insertOne({
        text: chunk,

        embedding,

        source,

        createdAt: new Date()
      })
    }

    logger.info('Embedding job completed')
  } catch (error) {
    logger.error('Embedding job failed', error)
  }
}
