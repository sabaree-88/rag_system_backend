import { encodeText, decodeTokens } from './tokenizer.util.js'
import { openai } from '../config/openai.js'

export function chunkText (text, size = 500, overlap = 100) {
  const tokens = encodeText(text)

  const chunks = []

  for (let i = 0; i < tokens.length; i += size - overlap) {
    chunks.push(decodeTokens(tokens.slice(i, i + size)))
  }

  return chunks
}

export async function compressChunks(question, chunks) {
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

export function orderContextChunks(chunks) {
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
