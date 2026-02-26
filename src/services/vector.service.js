import Document from "../models/document.model.js";
export async function vectorSearch(embedding, limit = 5) {
  const results = await Document.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 100,
        limit,
      },
    },

    {
      $project: {
        text: 1,
        source: 1,
        createdAt: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
}
