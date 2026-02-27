import Document from "../models/document.model.js";

export async function vectorSearch(embedding, limit = 5, filters = {}) {
  const results = await Document.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 100,
        limit,
        ...filters,
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

export async function hybridSearch(question, embedding, limit = 5) {
  // 1️⃣ Vector Search
  const vectorResults = await Document.aggregate([
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
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  // 2️⃣ Full Text Search
  const textResults = await Document.aggregate([
    {
      $search: {
        index: "text_index",
        text: {
          query: question,
          path: "text",
        },
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        text: 1,
        source: 1,
        score: { $meta: "searchScore" },
      },
    },
  ]);

  // 3️⃣ Merge results
  const combined = [...vectorResults, ...textResults];

  // 4️⃣ Remove duplicates by text
  const uniqueMap = new Map();

  for (const doc of combined) {
    if (!uniqueMap.has(doc.text)) {
      uniqueMap.set(doc.text, doc);
    }
  }

  const uniqueResults = Array.from(uniqueMap.values());

  // 5️⃣ Sort by score (descending)
  uniqueResults.sort((a, b) => b.score - a.score);

  return uniqueResults.slice(0, limit);
}
