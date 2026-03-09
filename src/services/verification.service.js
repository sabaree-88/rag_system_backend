import { openai } from "../config/openai.js";

export async function verifyAnswer(question, context, answer) {
  const prompt = `
You are an answer verification system.

Your job: compare the Answer against the Context and output a corrected answer.

CRITICAL RULES:
- If the answer is correct and supported by the context, output the EXACT SAME answer text with no changes. Do NOT say "the answer is correct" — just repeat the answer word for word.
- If the answer contains unsupported or incorrect information, output a CORRECTED version using only information from the context.
- If the context does not contain enough information to answer, output: "I don't know based on the provided context."
- NEVER output meta-commentary like "The answer is correct" or "The answer is supported." Always output the answer itself.

Question:
${question}

Context:
${context}

Answer to verify:
${answer}

Verified answer:
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
