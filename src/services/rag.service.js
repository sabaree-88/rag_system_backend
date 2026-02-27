import { createEmbedding } from "./embedding.service.js";
import { hybridSearch, vectorSearch } from "./vector.service.js";
import { openai } from "../config/openai.js";
import { logger } from "../utils/logger.util.js";
import Document from "../models/document.model.js";
import Chat from "../models/chat.model.js";

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
    logger.info("Question received");

    // 1. Create embedding
    const embedding = await createEmbedding(question);

    // 2. Vector search
    // const results = await vectorSearch(embedding, 5);

    // For hybrid search, we can also do a text search and combine results
    const results = await hybridSearch(question, embedding, 5);

    if (!results.length) {
      return "No relevant information found.";
    }

    const reranked = await reRankChunks(question, results);

    // Select Top 3 most relevant
    const topChunks = reranked.slice(0, 3);

    const context = topChunks.map((r) => r.text).join("\n");

    // 3. Load chat memory
    const previousChats = await Chat.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(10);

    const memoryMessages = previousChats.map((chat) => ({
      role: chat.role,
      content: chat.content,
    }));

    // 4. Prepare messages
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

    // 5. Call LLM
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages,
    });

    const answer = completion.choices[0].message.content;

    // 6. Save user message
    await Chat.create({
      sessionId,
      role: "user",
      content: question,
    });

    // 7. Save assistant reply
    await Chat.create({
      sessionId,
      role: "assistant",
      content: answer,
    });

    return answer;
  } catch (error) {
    logger.error(error);
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

async function reRankChunks(question, chunks) {
  try {
    const formattedChunks = chunks
      .map((c, i) => `Chunk ${i + 1}:\n${c.text}`)
      .join("\n\n");

    const prompt = `
You are a ranking system.

Given the question and document chunks,
rank the chunks based on relevance to the question.

Return ONLY a JSON array of chunk numbers in order of relevance.

Question:
${question}

Chunks:
${formattedChunks}
`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a ranking assistant." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0].message.content;

    // Example output: [3,1,2,5,4]
    const order = JSON.parse(content);

    const rankedChunks = order.map((index) => chunks[index - 1]);

    return rankedChunks;
  } catch (error) {
    console.error("Re-ranking failed, fallback to original order");
    return chunks;
  }
}
