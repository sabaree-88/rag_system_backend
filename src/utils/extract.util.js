export function extractJSONArray(text) {
  if (!text) return null;

  let content = text.trim();

  // Remove markdown fences
  const fenceMatch = content.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch) {
    content = fenceMatch[1].trim();
  }

  // Extract first JSON array
  const arrayMatch = content.match(/\[[\s\S]*?\]/);
  if (!arrayMatch) return null;

  try {
    const parsed = JSON.parse(arrayMatch[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
