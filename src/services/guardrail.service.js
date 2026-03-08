export function detectPromptInjection(query) {
  const patterns = [
    "ignore previous instructions",
    "reveal system prompt",
    "print hidden context",
    "show database",
    "display internal data",
    "bypass safety",
  ];

  const lower = query.toLowerCase();

  return patterns.some((p) => lower.includes(p));
}
