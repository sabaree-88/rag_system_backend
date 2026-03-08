import { createEmbedding } from "./embedding.service.js";
import { hybridSearch, vectorSearch } from "./vector.service.js";
import { openai } from "../config/openai.js";
import Chat from "../models/chat.model.js";
import { rewriteQuery } from "./queryRewriter.service.js";
import { classifyQuery } from "../utils/query.util.js";
import { compressChunks, orderContextChunks } from "../utils/chunk.util.js";
import { reRankChunks } from "./ranking.service.js";

export async function askQuestion(question, sessionId) {
  try {
    // --------------------------------
    // 1️⃣ Query Classification
    // --------------------------------
    const type = classifyQuery(question);

    let rerankLimit = 8;
    let topChunksCount = 2;

    if (type === "medium") {
      rerankLimit = 10;
      topChunksCount = 3;
    }

    if (type === "complex") {
      rerankLimit = 15;
      topChunksCount = 4;
    }

    // --------------------------------
    // 2️⃣ Initial Single Query Retrieval
    // --------------------------------

    const initialEmbedding = await createEmbedding([question]);

    const initialResults = await hybridSearch(question, initialEmbedding[0], 5);

    const topScore = initialResults?.[0]?.score || 0;

    let finalResults = initialResults;

    // --------------------------------
    // 3️⃣ Confidence-Based Escalation
    // --------------------------------
    const HIGH_CONF = 0.85;
    const LOW_CONF = 0.75;

    let rewriteCount = 0;

    if (type === "simple") {
      if (topScore < LOW_CONF) rewriteCount = 2;
    }

    if (type === "medium") {
      if (topScore < LOW_CONF) rewriteCount = 3;
      else if (topScore < HIGH_CONF) rewriteCount = 2;
    }

    if (type === "complex") {
      if (topScore < LOW_CONF) rewriteCount = 5;
      else rewriteCount = 2;
    }

    // --------------------------------
    // 4️⃣ Multi-Query Retrieval
    // --------------------------------
    if (rewriteCount > 0) {
      let queries = await rewriteQuery(question);

      queries = queries.slice(0, rewriteCount);

      const embeddings = await createEmbedding(queries);

      const results = await Promise.all(
        queries.map((q, i) => hybridSearch(q, embeddings[i], 5)),
      );

      const merged = [...initialResults, ...results.flat()];

      // Deduplicate
      const map = new Map();

      for (const doc of merged) {
        if (!map.has(doc.text)) {
          map.set(doc.text, doc);
        }
      }

      finalResults = Array.from(map.values());
    }

    if (!finalResults.length) {
      return "No relevant information found.";
    }

    // --------------------------------
    // 5️⃣ Reranking
    // --------------------------------
    let reranked = finalResults;

    if (type !== "simple") {
      const limited = finalResults.slice(0, rerankLimit);

      reranked = await reRankChunks(question, limited);
    }

    const topChunks = reranked.slice(0, topChunksCount);

    const compressedChunks = await compressChunks(question, topChunks);

    const orderedChunks = orderContextChunks(compressedChunks);

    // --------------------------------
    // 6️⃣ Build Context
    // --------------------------------
    const context = orderedChunks
      .map((c, i) => `Chunk ${i + 1}:\n${c.text}`)
      .join("\n\n");

    // --------------------------------
    // 7️⃣ Load Memory
    // --------------------------------
    const previousChats = await Chat.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(5);

    const memoryMessages = previousChats.map((chat) => ({
      role: chat.role,
      content: chat.content,
    }));

    // --------------------------------
    // 8️⃣ Model Selection
    // --------------------------------
    let model = "openai/gpt-4o-mini";

    if (type === "complex") {
      model = "qwen/qwen3.5-35b-a3b";
    }

    // --------------------------------
    // 9️⃣ Final LLM Generation
    // --------------------------------
    const messages = [
      {
        role: "system",
        content:
          "Answer the question using only the provided context. If the context is insufficient, say so.",
      },
      {
        role: "system",
        content: `Question:\n${question}`,
      },
      {
        role: "system",
        content: `Context:\n${context}`,
      },
      ...memoryMessages,
      {
        role: "user",
        content: question,
      },
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    const answer = completion.choices[0].message.content;

    // --------------------------------
    // 🔟 Save Conversation
    // --------------------------------
    await Chat.create({
      sessionId,
      role: "user",
      content: question,
    });

    await Chat.create({
      sessionId,
      role: "assistant",
      content: answer,
    });

    return answer;
  } catch (error) {
    console.error("Error in askQuestion:", error);
    throw error;
  }
}

export async function askQuestionStream(question, sessionId, res) {
  try {
    const embedding = await createEmbedding(question);

    const results = await vectorSearch(embedding, 5);

    const context = results.map((r) => r.text).join("\n");

    const previousChats = await Chat.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(10);

    const memoryMessages = previousChats.map((chat) => ({
      role: chat.role,
      content: chat.content,
    }));

    const messages = [
      {
        role: "system",
        content: "Answer using only provided context",
      },
      {
        role: "system",
        content: `Context:\n${context}`,
      },
      ...memoryMessages,
      {
        role: "user",
        content: question,
      },
    ];

    const stream = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages,
      stream: true,
    });

    let fullAnswer = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullAnswer += content;
        res.write(content); // send instantly to frontend
      }
    }

    // Save memory after streaming completes
    await Chat.create({
      sessionId,
      role: "user",
      content: question,
    });

    await Chat.create({
      sessionId,
      role: "assistant",
      content: fullAnswer,
    });

    res.end();
  } catch (error) {
    res.end();
    throw error;
  }
}
