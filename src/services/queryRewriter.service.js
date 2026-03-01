import { openai } from "../config/openai.js";
import { extractJSONArray } from "../utils/extract.util.js";
import { logger } from "../utils/logger.util.js";

export async function rewriteQuery(question) {
  const prompt = `
You are a retrieval query generator.

Rewrite the user's question into 4 search-optimized variations.

Rules:
- Do NOT answer the question.
- Return ONLY a JSON array of strings.

User Question:
"${question}"
`;

  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate search queries. Return only JSON array.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;

    const variations = extractJSONArray(content);

    if (!variations) {
      logger.error("Query rewrite JSON parse failed", { raw: content });
      return [question];
    }

    const cleaned = variations
      .map((v) =>
        v
          .replace(/\r?\n+/g, " ")
          .replace(/[\u0000-\u001F\u007F]+/g, "")
          .trim(),
      )
      .filter(Boolean);

    logger.info("Query rewrite successful", {
      original: question,
      count: cleaned.length,
    });

    return [question, ...cleaned];
  } catch (error) {
    logger.error("Query rewrite failed, fallback to original", {
      error: error.message,
      question,
    });

    return [question];
  }
}
