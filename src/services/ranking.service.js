import { openai } from "../config/openai.js";
import { extractJSONArray } from "../utils/extract.util.js";

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