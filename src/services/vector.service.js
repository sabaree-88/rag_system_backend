import { collection } from '../config/db.js'

export async function vectorSearch (embedding, limit = 5) {
  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 100,
          limit
        }
      },

      {
        $project: {
          text: 1,
          source: 1,
          createdAt: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ])
    .toArray()

  return results
}
