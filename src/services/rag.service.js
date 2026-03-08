import { createEmbedding } from "./embedding.service.js";
import { hybridSearch, vectorSearch } from "./vector.service.js";
import { openai } from "../config/openai.js";
import { logger } from "../utils/logger.util.js";
import Document from "../models/document.model.js";
import Chat from "../models/chat.model.js";
import { rewriteQuery } from "./queryRewriter.service.js";
import { extractJSONArray } from "../utils/extract.util.js";

export async function storeDocument(chunk, embedding, source) {
  try {
    const doc = new Document({
      text: chunk,
      embedding,
      source,
    });

    await doc.save();
  } catch (error) {
    logger.error("Document store failed", error);

    throw error;
  }
}

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

export async function reRankChunks(question, chunks) {
  try {
    if (!chunks?.length) return chunks;

    const formattedChunks = chunks
      .map((c, i) => `Chunk ${i + 1}:\n${c.text.slice(0, 1500)}`)
      .join("\n\n");

    const prompt = `
You are a ranking system.

Rank the document chunks by relevance to the question.

Return ONLY a JSON array of chunk numbers in descending relevance.
Example: [3,1,2]

Question:
${question}

Chunks:
${formattedChunks}
`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You rank document chunks. Return only JSON array.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const content = response.choices[0].message.content;

    const order = extractJSONArray(content);

    if (!order) {
      throw new Error("No valid JSON array returned");
    }

    // Validate indices
    const validOrder = order.filter(
      (index) =>
        Number.isInteger(index) && index >= 1 && index <= chunks.length,
    );

    if (!validOrder.length) {
      throw new Error("No valid indices in ranking output");
    }

    const rankedChunks = validOrder.map((index) => chunks[index - 1]);

    return rankedChunks;
  } catch (error) {
    console.error(
      "Re-ranking failed, fallback to original order:",
      error.message,
    );
    return chunks;
  }
}

function classifyQuery(question) {
  const wordCount = question.trim().split(/\s+/).length;

  const complexKeywords = [
    "compare",
    "difference",
    "advantages",
    "disadvantages",
    "architecture",
    "how does",
    "why does",
    "explain in detail",
  ];

  const lower = question.toLowerCase();

  if (complexKeywords.some((kw) => lower.includes(kw))) {
    return "complex";
  }

  if (wordCount <= 4) return "simple";
  if (wordCount <= 10) return "medium";

  return "complex";
}

async function compressChunks(question, chunks) {
  const tasks = chunks.map((chunk) => {
    const prompt = `
Extract only the information from the text that helps answer the question.
Keep it concise.

Question:
${question}

Text:
${chunk.text}
`;

    return openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You compress context." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });
  });

  const results = await Promise.all(tasks);

  return results.map((r) => ({
    text: r.choices[0].message.content,
  }));
}

function orderContextChunks(chunks) {
  if (!chunks.length) return [];

  const ordered = [];

  // Primary evidence
  ordered.push({
    label: "Primary Evidence",
    text: chunks[0].text,
  });

  // Supporting evidence
  if (chunks[1]) {
    ordered.push({
      label: "Supporting Evidence",
      text: chunks[1].text,
    });
  }

  // Background / additional context
  for (let i = 2; i < chunks.length; i++) {
    ordered.push({
      label: "Additional Context",
      text: chunks[i].text,
    });
  }

  return ordered;
}
