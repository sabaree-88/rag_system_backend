export function classifyQuery(question) {
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