import { createEmbedding } from "./embedding.service.js";
import { vectorSearch } from "./vector.service.js";
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
    const results = await vectorSearch(embedding, 5);

    const context = results.map((r) => r.text).join("\n");

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
