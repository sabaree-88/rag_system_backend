import { createEmbedding } from './embedding.service.js'
import { vectorSearch } from './vector.service.js'
import { openai } from '../config/openai.js'
import { logger } from '../utils/logger.util.js'
import Document from '../models/document.model.js'
import { collection } from '../config/db.js'

export async function storeDocument (chunk, embedding, source) {
  try {
    const doc = new Document({
      text: chunk,
      embedding,
      source
    })

    await collection.insertOne(doc)
  } catch (error) {
    logger.error('Document store failed', error)

    throw error
  }
}

export async function askQuestion (question) {
  try {
    logger.info('Question received', question)

    const embedding = await createEmbedding(question)

    const results = await vectorSearch(embedding, 5)

    if (!results.length) {
      logger.warn('No vector matches found')

      return 'No relevant information found.'
    }

    const context = results.map(r => r.text).join('\n')

    logger.info('Context retrieved')

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',

      messages: [
        {
          role: 'system',
          content: 'Answer using only the provided context'
        },

        {
          role: 'user',
          content: `Context:
${context}

Question:
${question}`
        }
      ]
    })

    logger.info('LLM response generated')

    return completion.choices[0].message.content
  } catch (error) {
    logger.error('Ask question failed', error)

    throw error
  }
}
