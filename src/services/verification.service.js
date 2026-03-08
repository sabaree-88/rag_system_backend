import { openai } from "../config/openai.js";

export async function verifyAnswer(question, context, answer) {
  const prompt = `
You are an answer verification system.

Verify whether the answer is fully supported by the context.

Rules:
- If the answer is correct, return it.
- If it contains unsupported information, correct it.
- If the context does not contain the answer, respond:
"I don't know based on the provided context."

Question:
${question}

Context:
${context}

Answer:
${answer}
`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: "You verify answers against context." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  return response.choices[0].message.content;
}
