import { chunkText } from '../utils/chunk.util.js'

import { createEmbedding } from '../services/embedding.service.js'

import Document from '../models/document.model.js'

import { logger } from '../utils/logger.util.js'

export async function runEmbeddingJob (text, source) {
  try {
    const chunks = chunkText(text)

    logger.info(`Processing ${chunks.length} chunks`)

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk)

      // create and save via mongoose model for validation
      await Document.create({
        text: chunk,
        embedding,
        source,
      })
    }

    logger.info('Embedding job completed')
  } catch (error) {
    logger.error('Embedding job failed', error)
  }
}
